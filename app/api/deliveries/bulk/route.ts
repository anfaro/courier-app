
import { db } from "@/lib/db"; // Adjusted to your path
import { deliveries } from "@/lib/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Body: Array of { waybillNumber, customerId, codAmount, status }

    const result = await db.insert(deliveries).values(body).returning();

    return NextResponse.json({
      success: true,
      message: `${result.length} deliveries created.`
    });
  } catch (error: any) {
    console.error("Bulk Delivery Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
