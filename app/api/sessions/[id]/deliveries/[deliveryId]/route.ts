import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sql, eq } from "drizzle-orm";
import { sessions, incomings, sessionDeliveries, customerVisits } from "@/lib/schema";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const { id: sessionId, deliveryId } = resolvedParams;

    const [existing] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existing.finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const body = await req.json();
    const { status, splitCount, latitude, longitude } = body;

    if (!["delivered", "returned", "rescheduled"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const [delivery] = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });
    if (delivery.sessionId !== sessionId) return NextResponse.json({ message: "Delivery does not belong to this session" }, { status: 400 });

    const d = delivery;
    const currentPackages = Number(d.packages) || 1;
    const prevStatus = d.status;
    let deliveredDelta = 0;

    if (splitCount && splitCount > 0 && splitCount < currentPackages) {
      await db.update(sessionDeliveries)
        .set({ packages: String(currentPackages - splitCount) })
        .where(eq(sessionDeliveries.id, deliveryId));

      await db.insert(sessionDeliveries).values({
        id: generateId(),
        sessionId,
        incomingId: d.incomingId,
        customerId: d.customerId,
        packages: String(splitCount),
        status,
      });

      if (status === "delivered") deliveredDelta = splitCount;
    } else {
      await db.update(sessionDeliveries)
        .set({ status })
        .where(eq(sessionDeliveries.id, deliveryId));

      if (status === "delivered" && prevStatus !== "delivered") {
        deliveredDelta = currentPackages;
      } else if (prevStatus === "delivered" && status !== "delivered") {
        deliveredDelta = -currentPackages;
      }
    }

    if (deliveredDelta !== 0) {
      // Use SQL aggregate to recalculate delivered count
      const [aggRow] = await db.execute(sql`
        SELECT COALESCE(SUM(CASE WHEN status = 'delivered' THEN NULLIF(packages, '')::int ELSE 0 END), 0)::int AS new_delivered
        FROM session_deliveries WHERE session_id = ${sessionId}
      `);
      const newDelivered = aggRow.new_delivered;
      await db.update(sessions)
        .set({
          deliveredPackages: String(newDelivered),
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    }

    if (status === "delivered") {
      await db.insert(customerVisits).values({
        id: generateId(),
        customerId: d.customerId,
        userId: token.id as string,
        userName: token.name as string,
        visitedAt: new Date(),
        checkedOutAt: new Date(),
      }).onConflictDoNothing();

      // Conditional update: saves coordinates only if customer has none
      if (latitude && longitude) {
        await db.execute(sql`
          UPDATE customers
          SET latitude = ${latitude.toString()}, longitude = ${longitude.toString()}
          WHERE id = ${d.customerId} AND latitude IS NULL AND longitude IS NULL
        `);
      }
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "DELIVERY_STATUS_CHANGED",
      details: splitCount
        ? `Delivery ${deliveryId} split: ${splitCount}/${currentPackages} marked as ${status}`
        : `Delivery ${deliveryId} status changed from ${prevStatus} to ${status}`,
      targetId: sessionId,
    });

    return NextResponse.json({ message: "Status updated" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateDeliveryStatusError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update delivery status" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const { id: sessionId, deliveryId } = resolvedParams;

    const [existing] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existing) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existing.finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const [delivery] = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });
    if (delivery.sessionId !== sessionId) return NextResponse.json({ message: "Delivery does not belong to this session" }, { status: 400 });

    const pkgCount = Number(delivery.packages) || 1;
    const incomingId = delivery.incomingId;

    await db.delete(sessionDeliveries)
      .where(eq(sessionDeliveries.id, deliveryId));

    // Update the incoming's packages count
    const [incoming] = await db.select().from(incomings)
      .where(eq(incomings.id, incomingId))
      .limit(1);

    if (incoming) {
      const newIncomingPackages = Math.max(0, (Number(incoming.packages) || 0) - pkgCount);
      await db.update(incomings)
        .set({ packages: String(newIncomingPackages) })
        .where(eq(incomings.id, incomingId));
    }

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
      action: "DELIVERY_DELETED",
      details: `Removed delivery ${deliveryId} (${pkgCount} packages) from session ${sessionId}`,
      targetId: sessionId,
    });

    return NextResponse.json({ message: "Delivery removed" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteDeliveryError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to remove delivery" }, { status: 500 });
  }
}
