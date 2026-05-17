// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers } from "@/lib/schema";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { getCached, setCache } from "@/lib/cache";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const cacheKey = req.url;
    const cached = getCached<{ customers: any[]; hasMore: boolean; limit: number; offset: number; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    const allCustomers = await db.query.customers.findMany({
      limit: limit + 1,
      offset,
      orderBy: (customers, { desc }) => [desc(customers.createdAt)],
      columns: {
        id: true,
        name: true,
        phoneNumber: true,
        address: true,
        housePictureUrl: true,
        createdAt: true,
      },
    });

    const hasMore = allCustomers.length > limit;
    if (hasMore) allCustomers.pop();

    const totalResult = await db.execute(sql`SELECT COUNT(*) AS count FROM customers`);
    const total = Number(totalResult[0]?.count ?? 0);

    const body = { customers: allCustomers, hasMore, limit, offset, total };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchCustomersError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch customers" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, notes, clusterIds } = body;

    if (!name || !address) {
      return NextResponse.json({ message: "Name and address are required" }, { status: 400 });
    }

    const [newCustomer] = await db.insert(customers).values({
      id: generateId(),
      name,
      phoneNumber,
      address,
      latitude: latitude ? latitude.toString() : null,
      longitude: longitude ? longitude.toString() : null,
      housePictureUrl,
      notes,
    }).returning();

    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const clusterLinks = clusterIds.map((clusterId: string) => ({
        customerId: newCustomer.id,
        clusterId: clusterId,
      }));

      await db.insert(customerClusters).values(clusterLinks)
    }

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_CREATED",
        details: `Created customer: ${name}`,
        targetId: newCustomer.id
      });
    }

    return NextResponse.json({
      message: "Customer added successfully",
      customer: newCustomer,
    }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateCustomerError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to add customer" }, { status: 500 });
  }
}
