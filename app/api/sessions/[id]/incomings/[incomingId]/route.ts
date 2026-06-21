import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries, customerVisits } from "@/lib/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id: sessionId, incomingId } = resolvedParams;

    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!sessionRow) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (sessionRow.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const [incoming] = await db.select().from(incomings).where(eq(incomings.id, incomingId)).limit(1);
    if (!incoming) return NextResponse.json({ message: "Incoming not found" }, { status: 404 });

    const deliveries = await db.query.sessionDeliveries.findMany({
      where: and(eq(sessionDeliveries.incomingId, incomingId), eq(sessionDeliveries.sessionId, sessionId)),
      orderBy: (sd, { desc }) => [desc(sd.createdAt)],
      with: { customer: true },
    });

    return NextResponse.json({ incoming, deliveries }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch incoming" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const incomingId = resolvedParams.incomingId;

    const [existingSession] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existingSession) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existingSession.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existingSession.finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const body = await req.json();

    if (body.time !== undefined) {
      await db.update(incomings)
        .set({ time: new Date(body.time) })
        .where(eq(incomings.id, incomingId));

      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "INCOMING_TIME_UPDATED",
        details: `Updated time for incoming ${incomingId}`,
        targetId: sessionId,
      });
    }

    return NextResponse.json({ message: "Incoming updated" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update incoming" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const incomingId = resolvedParams.incomingId;

    const [existingSession] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existingSession) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existingSession.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existingSession.finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    // Collect delivered customer IDs from this incoming to clean up visits
    const deliveredDeliveries = await db.select({ customerId: sessionDeliveries.customerId })
      .from(sessionDeliveries)
      .where(and(
        eq(sessionDeliveries.incomingId, incomingId),
        eq(sessionDeliveries.sessionId, sessionId),
        eq(sessionDeliveries.status, "delivered")
      ));

    const deliveredCustomerIds = [...new Set(deliveredDeliveries.map(d => d.customerId))];

    // Delete related customer visits (by customer + user on session date)
    if (deliveredCustomerIds.length > 0) {
      const sessionDate = existingSession.date;
      await db.delete(customerVisits)
        .where(and(
          inArray(customerVisits.customerId, deliveredCustomerIds),
          eq(customerVisits.userId, token.id as string),
          sql`${customerVisits.visitedAt}::date = ${sessionDate}::date`
        ));
    }

    // Delete the incoming (cascades to all its deliveries via FK)
    await db.delete(incomings)
      .where(and(eq(incomings.id, incomingId), eq(incomings.sessionId, sessionId)));

    // Recalculate session totals
    const [aggRow] = await db.execute(sql`
      SELECT
        COALESCE(SUM(NULLIF(packages, '')::int), 0)::int AS total_pkgs,
        COALESCE(SUM(NULLIF(packages, '')::int) FILTER (WHERE status = 'delivered'), 0)::int AS deliv_pkgs
      FROM session_deliveries
      WHERE session_id = ${sessionId}
    `);

    await db.update(sessions)
      .set({
        totalPackages: String(aggRow.total_pkgs),
        deliveredPackages: String(aggRow.deliv_pkgs),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "INCOMING_DELETED",
      details: `Deleted incoming ${incomingId} from session ${sessionId}`,
      targetId: sessionId,
    });

    return NextResponse.json({ message: "Incoming deleted" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete incoming" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const incomingId = resolvedParams.incomingId;

    const existingSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existingSession.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existingSession[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existingSession[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const existingIncoming = await db.select().from(incomings).where(eq(incomings.id, incomingId)).limit(1);
    if (!existingIncoming.length) return NextResponse.json({ message: "Incoming not found" }, { status: 404 });

    const body = await req.json();
    const { packages: packagesCount, customerAssignments, time } = body;

    // Allow empty customerAssignments (means: delete all pending, keep non-pending)
    const hasAssignments = customerAssignments && Array.isArray(customerAssignments) && customerAssignments.length > 0;
    if (hasAssignments) {
      const totalAssigned = customerAssignments.reduce((sum: number, a: any) => sum + (Number(a.packages) || 0), 0);
      if (totalAssigned !== Number(packagesCount)) {
        return NextResponse.json({ message: "Sum of assigned packages must match total packages count" }, { status: 400 });
      }
      for (const a of customerAssignments) {
        if (!a.customerId || !a.packages || Number(a.packages) < 1) {
          return NextResponse.json({ message: "Each assignment must have customerId and packages >= 1" }, { status: 400 });
        }
      }
    }

    // Fetch all existing deliveries for this incoming
    const allOldDeliveries = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.incomingId, incomingId));

    // Separate non-pending (preserved) and pending (to be replaced)
    const nonPendingDeliveries = allOldDeliveries.filter(d => d.status !== "pending");
    const preservedPackages = nonPendingDeliveries.reduce((sum, d) => sum + Number(d.packages), 0);

    // Delete only pending deliveries (preserve delivered/returned/rescheduled)
    await db.delete(sessionDeliveries)
      .where(and(
        eq(sessionDeliveries.incomingId, incomingId),
        eq(sessionDeliveries.status, "pending")
      ));

    // Insert new pending deliveries from the form (if any)
    let deliveryRows: any[] = [];
    if (hasAssignments) {
      deliveryRows = customerAssignments.map((a: { customerId: string; packages: number }) => ({
        id: generateId(),
        sessionId,
        incomingId,
        customerId: a.customerId,
        packages: String(a.packages),
        status: "pending",
      }));
      await db.insert(sessionDeliveries).values(deliveryRows);
    }

    // Update incoming's total packages (preserved non-pending + new pending)
    const newIncomingTotal = preservedPackages + (hasAssignments ? Number(packagesCount) : 0);
    const incomingUpdate: Record<string, any> = { packages: String(newIncomingTotal) };
    if (time && isSuperAdmin) {
      incomingUpdate.time = new Date(time);
    }
    await db.update(incomings)
      .set(incomingUpdate)
      .where(eq(incomings.id, incomingId));

    // Recalculate session totals using SQL aggregates
    const [aggRow] = await db.execute(sql`
      SELECT
        COALESCE(SUM(NULLIF(packages, '')::int), 0)::int AS total_pkgs,
        COALESCE(SUM(NULLIF(packages, '')::int) FILTER (WHERE status = 'delivered'), 0)::int AS deliv_pkgs
      FROM session_deliveries
      WHERE session_id = ${sessionId}
    `);
    const totalPkgs = aggRow.total_pkgs;
    const delivPkgs = aggRow.deliv_pkgs;

    await db.update(sessions)
      .set({
        totalPackages: String(totalPkgs),
        deliveredPackages: String(delivPkgs),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "INCOMING_UPDATED",
      details: `Updated incoming ${incomingId} with ${packagesCount} packages (${preservedPackages} preserved non-pending)`,
      targetId: sessionId,
    });

    return NextResponse.json({
      message: "Incoming updated",
      deliveriesCount: deliveryRows.length,
    }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update incoming" }, { status: 500 });
  }
}
