// app/api/deliveries/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { getCached, setCache } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const cacheKey = req.url;
    const cached = getCached<{ deliveries: any[]; limit: number; offset: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    const allDeliveries = await db.query.deliveries.findMany({
      with: { customer: true },
      limit,
      offset,
      orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
    });

    const body = { deliveries: allDeliveries, limit, offset };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchDeliveriesError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch deliveries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    const { waybillNumber, customerId, codAmount, receiverName, proofOfDeliveryUrl, status } = body;

    if (!waybillNumber || !customerId) {
      return NextResponse.json({ message: "Waybill number and customer ID are required" }, { status: 400 });
    }

    const [newDelivery] = await db.insert(deliveries).values({
      id: generateId(),
      waybillNumber,
      customerId,
      codAmount: codAmount?.toString() || "0",
      receiverName,
      proofOfDeliveryUrl,
      status: status || "Pending",
    }).returning();

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "DELIVERY_CREATED",
        details: `Added new waybill: ${waybillNumber}`,
        targetId: newDelivery.id
      });
    }

    return NextResponse.json({ message: "Delivery added successfully" }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateDeliveryError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to add delivery" }, { status: 500 });
  }
}
