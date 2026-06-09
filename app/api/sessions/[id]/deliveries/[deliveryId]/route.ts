import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, sessionDeliveries, customerVisits, customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const { id: sessionId, deliveryId } = resolvedParams;

    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existing.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existing[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const body = await req.json();
    const { status, splitCount, latitude, longitude } = body;

    if (!["delivered", "returned", "rescheduled"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const delivery = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery.length) return NextResponse.json({ message: "Delivery not found" }, { status: 404 });
    if (delivery[0].sessionId !== sessionId) return NextResponse.json({ message: "Delivery does not belong to this session" }, { status: 400 });

    const d = delivery[0];
    const currentPackages = Number(d.packages) || 1;
    const prevStatus = d.status;
    let deliveredDelta = 0;

    if (splitCount && splitCount > 0 && splitCount < currentPackages) {
      // Split: decrement original, insert new row with splitCount
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
      // Full status change (no split)
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
      const newDelivered = Math.max(0, (Number(existing[0].deliveredPackages) || 0) + deliveredDelta);
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

      // Save location to customer if provided and customer doesn't already have coordinates
      if (latitude && longitude) {
        const cust = await db.select({ latitude: customers.latitude, longitude: customers.longitude })
          .from(customers)
          .where(eq(customers.id, d.customerId))
          .limit(1);
        if (cust.length && !cust[0].latitude && !cust[0].longitude) {
          await db.update(customers)
            .set({ latitude: latitude.toString(), longitude: longitude.toString() })
            .where(eq(customers.id, d.customerId));
        }
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
