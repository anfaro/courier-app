// app/api/deliveries/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);
    const body = await req.json();
    const { status, proofOfDeliveryDataUrl, codAmount, receiverName } = body;

    if (!status) {
      return NextResponse.json({ message: "Status is required" }, { status: 400 });
    }

    // Prepare update object. Include conditional updates if provided.
    const updateData: any = { status };
    if (proofOfDeliveryDataUrl) updateData.proofOfDeliveryUrl = proofOfDeliveryDataUrl;
    if (receiverName !== undefined) updateData.receiverName = receiverName;
    if (codAmount !== undefined) updateData.codAmount = codAmount.toString();

    // Perform the update
    await db
      .update(deliveries)
      .set(updateData)
      .where(eq(deliveries.id, deliveryId));

    return NextResponse.json({ message: "Waybill updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ message: "Failed to update waybill" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const deliveryId = parseInt(resolvedParams.id);

    await db.delete(deliveries).where(eq(deliveries.id, deliveryId));

    return NextResponse.json({ message: "Delivery deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json({ message: "Failed to delete delivery" }, { status: 500 });
  }
}

// NEW: Add PATCH to handle updates
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        updatedAt: new Date(), // Always good to update the timestamp
      })
      .where(eq(deliveries.id, deliveryId));

    return NextResponse.json({ message: "Delivery updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ message: "Failed to update delivery" }, { status: 500 });
  }
}
