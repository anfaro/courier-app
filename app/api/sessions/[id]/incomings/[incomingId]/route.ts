import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

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
    const { packages: packagesCount, customerAssignments } = body;

    if (!packagesCount || !customerAssignments || !Array.isArray(customerAssignments) || customerAssignments.length === 0) {
      return NextResponse.json({ message: "Packages count and customer assignments are required" }, { status: 400 });
    }

    const totalAssigned = customerAssignments.reduce((sum: number, a: any) => sum + (Number(a.packages) || 0), 0);
    if (totalAssigned !== Number(packagesCount)) {
      return NextResponse.json({ message: "Sum of assigned packages must match total packages count" }, { status: 400 });
    }

    for (const a of customerAssignments) {
      if (!a.customerId || !a.packages || Number(a.packages) < 1) {
        return NextResponse.json({ message: "Each assignment must have customerId and packages >= 1" }, { status: 400 });
      }
    }

    await db.update(incomings)
      .set({ packages: String(packagesCount) })
      .where(eq(incomings.id, incomingId));

    const oldDeliveries = await db.select().from(sessionDeliveries).where(eq(sessionDeliveries.incomingId, incomingId));
    const oldAssigned = oldDeliveries.reduce((sum, d) => sum + Number(d.packages), 0);

    await db.delete(sessionDeliveries).where(eq(sessionDeliveries.incomingId, incomingId));

    const deliveryRows = customerAssignments.map((a: { customerId: string; packages: number }) => ({
      id: generateId(),
      sessionId,
      incomingId,
      customerId: a.customerId,
      packages: String(a.packages),
      status: "pending",
    }));

    await db.insert(sessionDeliveries).values(deliveryRows);

    const prevTotal = Number(existingSession[0].totalPackages) || 0;
    const newTotal = prevTotal - oldAssigned + Number(packagesCount);
    await db.update(sessions)
      .set({
        totalPackages: String(newTotal),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "INCOMING_UPDATED",
      details: `Updated incoming ${incomingId} with ${packagesCount} packages`,
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
