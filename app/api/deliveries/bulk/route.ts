import { logServerAccess } from "@/lib/logger";

import { db } from "@/lib/db"; // Adjusted to your path
import { deliveries } from "@/lib/schema";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logActivity } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const body = await req.json();
    // Body: Array of { waybillNumber, customerId, codAmount, status }

    const result = await db.insert(deliveries).values(body).returning();

    if (token) {
        await logActivity({
          userId: token.id as number,
          userName: token.name as string,
          action: "BULK_DELIVERY_SAVE",
          details: `Saved ${result.length} deliveries in bulk`,
        });
    }

    return NextResponse.json({
      success: true,
      message: `${result.length} deliveries created.`
    });
  } catch (error: any) {
    console.error("Bulk Delivery Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
