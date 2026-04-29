// app/api/deliveries/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // NEW: Extract status from the body
    const { waybillNumber, customerId, codAmount, receiverName, proofOfDeliveryUrl, status } = body;

    if (!waybillNumber || !customerId) {
      return NextResponse.json({ message: "Waybill number and customer ID are required" }, { status: 400 });
    }

    // NEW: Use the status sent from the frontend, default to Pending if missing
    const finalStatus = status || "Pending";

    await db.insert(deliveries).values({
      waybillNumber,
      customerId,
      codAmount: Number(codAmount) || 0,
      receiverName,
      proofOfDeliveryUrl,
      status: finalStatus,
    });

    return NextResponse.json({ message: "Delivery added successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating delivery:", error);
    return NextResponse.json({ message: "Failed to add delivery" }, { status: 500 });
  }
}

