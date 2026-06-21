import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const incomingId = resolvedParams.incomingId;

    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!sessionRow) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (sessionRow.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (sessionRow.finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const [incoming] = await db.select().from(incomings).where(eq(incomings.id, incomingId)).limit(1);
    if (!incoming) return NextResponse.json({ message: "Incoming not found" }, { status: 404 });

    const body = await req.json();
    const { customerAssignments } = body;

    if (!customerAssignments || !Array.isArray(customerAssignments) || customerAssignments.length === 0) {
      return NextResponse.json({ message: "customerAssignments array is required" }, { status: 400 });
    }

    for (const a of customerAssignments) {
      if (!a.customerId || !a.packages || Number(a.packages) < 1) {
        return NextResponse.json({ message: "Each assignment must have customerId and packages >= 1" }, { status: 400 });
      }
    }

    const addPackages = customerAssignments.reduce((sum: number, a: any) => sum + (Number(a.packages) || 0), 0);

    const deliveryRows = customerAssignments.map((a: { customerId: string; packages: number }) => ({
      id: generateId(),
      sessionId,
      incomingId,
      customerId: a.customerId,
      packages: String(a.packages),
      status: "pending",
    }));

    await db.insert(sessionDeliveries).values(deliveryRows);

    const newIncomingPackages = (Number(incoming.packages) || 0) + addPackages;
    await db.update(incomings)
      .set({ packages: String(newIncomingPackages) })
      .where(eq(incomings.id, incomingId));

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
      action: "DELIVERIES_ADDED",
      details: `Added ${addPackages} packages to incoming ${incomingId}`,
      targetId: sessionId,
    });

    return NextResponse.json({
      message: "Deliveries added",
      deliveriesCount: deliveryRows.length,
    }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "AddDeliveriesError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to add deliveries" }, { status: 500 });
  }
}
