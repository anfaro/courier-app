import { logServerAccess } from "@/lib/logger";
// app/api/deliveries/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { status, proofOfDeliveryDataUrl, codAmount, receiverName } = body;

    if (!status) return NextResponse.json({ message: "Status is required" }, { status: 400 });

    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    if (proofOfDeliveryDataUrl) updateData.proofOfDeliveryUrl = proofOfDeliveryDataUrl;
    if (receiverName !== undefined) updateData.receiverName = receiverName;
    if (codAmount !== undefined) updateData.codAmount = codAmount.toString();

    await db.update(deliveries).set(updateData).where(eq(deliveries.id, deliveryId));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "DELIVERY_UPDATED",
        details: `Updated waybill status to ${status}`,
        targetId: deliveryId.toString()
      });
    }

    return NextResponse.json({ message: "Waybill updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ message: "Failed to update waybill" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);

    await db.delete(deliveries).where(eq(deliveries.id, deliveryId));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "DELIVERY_DELETED",
        details: `Deleted waybill ID: ${deliveryId}`,
        targetId: deliveryId.toString()
      });
    }

    return NextResponse.json({ message: "Delivery deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json({ message: "Failed to delete delivery" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { waybillNumber, receiverName, codAmount, status, proofOfDeliveryUrl } = body;

    await db.update(deliveries)
      .set({
        waybillNumber,
        receiverName,
        codAmount: parseInt(codAmount) || 0,
        status,
        proofOfDeliveryUrl,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "DELIVERY_UPDATED",
        details: `Patched waybill ${waybillNumber}`,
        targetId: deliveryId.toString()
      });
    }

    return NextResponse.json({ message: "Delivery updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ message: "Failed to update delivery" }, { status: 500 });
  }
}
