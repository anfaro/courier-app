// app/api/deliveries/bulk/route.ts
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logServerAccess, logActivity, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const body = await req.json();
    // Body: Array of { waybillNumber, customerId, codAmount, status }

    const formattedData = body.map((item: any) => ({
      ...item,
      id: generateId(),
      codAmount: item.codAmount?.toString() || "0"
    }));

    const result = await db.insert(deliveries).values(formattedData).returning();

    if (token) {
        await logActivity({
          userId: token.id as string,
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
    await logError({
      errorName: "BulkDeliveryError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
