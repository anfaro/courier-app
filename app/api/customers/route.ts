// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers } from "@/lib/schema";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { getCached, setCache } from "@/lib/cache";
import { sql, eq, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const cacheKey = req.url;
    const cached = getCached<{ customers: any[]; hasMore: boolean; limit: number; offset: number; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 200);
    const offset = Number(searchParams.get("offset")) || 0;
    const clusterId = searchParams.get("clusterId");
    const sort = searchParams.get("sort") || "newest";

    let customerIds: string[] | undefined;
    if (clusterId) {
      const memberRows = await db
        .select({ customerId: customerClusters.customerId })
        .from(customerClusters)
        .where(eq(customerClusters.clusterId, clusterId));
      customerIds = memberRows.map(r => r.customerId);
      if (customerIds.length === 0) {
        return NextResponse.json({ customers: [], hasMore: false, limit, offset, total: 0 }, { status: 200 });
      }
    }

    const where = customerIds ? inArray(customers.id, customerIds) : undefined;

    const orderBy = sort === "oldest" ? sql`${customers.createdAt} ASC` :
      sort === "recent_visit" ? sql`visit_stats.last_visited_at DESC NULLS LAST` :
      sort === "oldest_visit" ? sql`visit_stats.last_visited_at ASC NULLS FIRST` :
      sort === "most_visited" ? sql`visit_stats.visit_count DESC NULLS LAST` :
      sort === "least_visited" ? sql`visit_stats.visit_count ASC NULLS FIRST` :
      sql`${customers.createdAt} DESC`;

    const allCustomers = await db.select({
      id: customers.id,
      name: customers.name,
      phoneNumber: customers.phoneNumber,
      address: customers.address,
      housePictureUrl: customers.housePictureUrl,
      housePictures: customers.housePictures,
      landmark: customers.landmark,
      accessInfo: customers.accessInfo,
      createdAt: customers.createdAt,
      latitude: customers.latitude,
      longitude: customers.longitude,
      notes: customers.notes,
      lastVisitedAt: sql<string | null>`visit_stats.last_visited_at`,
      visitCount: sql<number>`COALESCE(visit_stats.visit_count, 0)`,
    })
      .from(customers)
      .leftJoin(
        sql`(
          SELECT customer_id, MAX(visited_at) AS last_visited_at, COUNT(*)::int AS visit_count
          FROM customer_visits
          GROUP BY customer_id
        ) visit_stats`,
        sql`visit_stats.customer_id = ${customers.id}`
      )
      .where(where)
      .orderBy(orderBy)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = allCustomers.length > limit;
    if (hasMore) allCustomers.pop();

    // Batch-load cluster relations to avoid N+1
    const customerIdList = allCustomers.map(c => c.id);
    const clusterRows = customerIdList.length > 0 ? await db.select({
      customerId: customerClusters.customerId,
      clusterId: customerClusters.clusterId,
      clusterName: sql<string>`cluster_rel.name`,
    })
      .from(customerClusters)
      .innerJoin(sql`clusters cluster_rel`, sql`cluster_rel.id = ${customerClusters.clusterId}`)
      .where(inArray(customerClusters.customerId, customerIdList)) : [];

    const clustersByCustomer: Record<string, { cluster: { id: string; name: string } }[]> = {};
    for (const row of clusterRows) {
      if (!clustersByCustomer[row.customerId]) clustersByCustomer[row.customerId] = [];
      clustersByCustomer[row.customerId].push({ cluster: { id: row.clusterId, name: row.clusterName } });
    }

    const customersWithClusters = allCustomers.map(c => ({
      ...c,
      clusters: clustersByCustomer[c.id] || [],
    }));

    let total: number;
    if (customerIds) {
      total = customerIds.length;
    } else {
      const totalResult = await db.execute(sql`SELECT COUNT(*) AS count FROM customers`);
      total = Number(totalResult[0]?.count ?? 0);
    }

    const body = { customers: customersWithClusters, hasMore, limit, offset, total };
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
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, housePictures, landmark, accessInfo, notes, clusterIds } = body;

    if (!name || !address) {
      return NextResponse.json({ message: "Name and address are required" }, { status: 400 });
    }

    const photos = housePictures && Array.isArray(housePictures) ? housePictures : [];
    const [newCustomer] = await db.insert(customers).values({
      id: generateId(),
      name,
      phoneNumber,
      address,
      latitude: latitude ? latitude.toString() : null,
      longitude: longitude ? longitude.toString() : null,
      housePictureUrl: housePictureUrl || photos[0] || null,
      housePictures: photos.length > 0 ? JSON.stringify(photos) : null,
      landmark,
      accessInfo,
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
