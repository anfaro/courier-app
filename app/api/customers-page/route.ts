// app/api/customers-page/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers, clusters as clustersTable } from "@/lib/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { getCLIToken } from "@/lib/getCLIToken";
import { getCached, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const cacheKey = req.url;
    const cached = getCached<{
      customers: any[]; hasMore: boolean; total: number; clusters: any[]; visitsMap: Record<string, string>;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 200);
    const offset = Number(searchParams.get("offset")) || 0;
    const clusterId = searchParams.get("clusterId");
    const sort = searchParams.get("sort") || "newest";

    // Run customers query and clusters query in parallel (2 network batches total:
    // this one + the cluster-relations batch inside fetchCustomers).
    const [customersResult, allClusters] = await Promise.all([
      fetchCustomers(limit, offset, clusterId, sort),
      db.select({ id: clustersTable.id, name: clustersTable.name }).from(clustersTable).limit(200),
    ]);

    // visitsMap powers the "visited" quick filter; lastVisitedAt is already in the
    // customers payload, so derive it here instead of a separate DB round-trip.
    const visitsMap: Record<string, string> = {};
    for (const c of customersResult.customers) {
      if (c.lastVisitedAt) visitsMap[c.id] = c.lastVisitedAt;
    }

    const body = {
      customers: customersResult.customers,
      hasMore: customersResult.hasMore,
      total: customersResult.total,
      clusters: allClusters,
      visitsMap,
    };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    await logError({
      errorName: "FetchCustomersPageError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch customers page data" }, { status: 500 });
  }
}

async function fetchCustomers(limit: number, offset: number, clusterId: string | null, sort: string) {
  let customerIds: string[] | undefined;
  if (clusterId) {
    const memberRows = await db
      .select({ customerId: customerClusters.customerId })
      .from(customerClusters)
      .where(eq(customerClusters.clusterId, clusterId));
    customerIds = memberRows.map(r => r.customerId);
    if (customerIds.length === 0) {
      return { customers: [], hasMore: false, total: 0 };
    }
  }

  const where = customerIds ? sql`${customers.id} = ANY(${sql`ARRAY[${sql.join(customerIds.map(id => sql`${id}`), sql`, `)}]`})` : undefined;

  const orderBy = sort === "oldest" ? sql`${customers.createdAt} ASC` :
    sort === "recent_visit" ? sql`last_visited_at DESC NULLS LAST` :
    sort === "oldest_visit" ? sql`last_visited_at ASC NULLS FIRST` :
    sort === "most_visited" ? sql`visit_count DESC NULLS LAST` :
    sort === "least_visited" ? sql`visit_count ASC NULLS FIRST` :
    sql`${customers.createdAt} DESC`;

  // Single round-trip: page-scoped correlated subqueries (index-backed) + window total.
  // ${customers}.id qualifies the outer column; explicit AS aliases let the
  // visit-based ORDER BY expressions resolve.
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    phoneNumber: customers.phoneNumber,
    address: customers.address,
    housePictureUrl: customers.housePictureUrl,
    landmark: customers.landmark,
    createdAt: customers.createdAt,
    latitude: customers.latitude,
    longitude: customers.longitude,
    total: sql<number>`count(*) OVER() AS total`,
    lastVisitedAt: sql<string | null>`(
      SELECT MAX(v.visited_at) FROM customer_visits v WHERE v.customer_id = ${customers}.id
    ) AS last_visited_at`,
    visitCount: sql<number>`(
      SELECT COUNT(*)::int FROM customer_visits v WHERE v.customer_id = ${customers}.id
    ) AS visit_count`,
  })
    .from(customers)
    .where(where)
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = allCustomers.length > limit;
  if (hasMore) allCustomers.pop();

  const total = customerIds ? customerIds.length : Number(allCustomers[0]?.total ?? 0);

  // Batch-load cluster relations
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

  const customersWithClusters = allCustomers.map(({ total: _total, ...c }) => ({
    ...c,
    clusters: clustersByCustomer[c.id] || [],
  }));

  return { customers: customersWithClusters, hasMore, total };
}
