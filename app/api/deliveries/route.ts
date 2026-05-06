
// app/api/deliveries/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";

// NEW: GET function to fetch all deliveries for the dashboard
export async function GET(req: Request) {
  try {
    const allDeliveries = await db.query.deliveries.findMany({
      with: {
        customer: true, // Pulls the linked customer data automatically
      },
      orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
    });

    return NextResponse.json({ deliveries: allDeliveries }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch deliveries:", error);
    return NextResponse.json({ message: "Failed to fetch deliveries" }, { status: 500 });
  }
}

// YOUR EXISTING POST FUNCTION STAYS EXACTLY THE SAME
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { waybillNumber, customerId, codAmount, receiverName, proofOfDeliveryUrl, status } = body;

    if (!waybillNumber || !customerId) {
      return NextResponse.json({ message: "Waybill number and customer ID are required" }, { status: 400 });
    }

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

