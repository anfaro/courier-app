// app/api/customers-page/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers, clusters as clustersTable } from "@/lib/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 200);
    const offset = Number(searchParams.get("offset")) || 0;
    const clusterId = searchParams.get("clusterId");
    const sort = searchParams.get("sort") || "newest";

    // Run customers query, clusters query, and visits query in parallel
    const [customersResult, allClusters] = await Promise.all([
      fetchCustomers(limit, offset, clusterId, sort),
      db.select({ id: clustersTable.id, name: clustersTable.name }).from(clustersTable).limit(200),
    ]);

    // Get visit data for the "visited" quick filter
    const customerIds = customersResult.customers.map(c => c.id);
    let visitsMap: Record<string, string> = {};
    if (customerIds.length > 0) {
      try {
        const visitRows = await db.execute(sql`
          SELECT DISTINCT ON (cv.customer_id)
            cv.customer_id, cv.visited_at
          FROM customer_visits cv
          WHERE cv.customer_id IN (${sql.join(customerIds.map(id => sql`${id}`), sql`, `)})
          ORDER BY cv.customer_id, cv.visited_at DESC
        `);
        const rows = Array.isArray(visitRows) ? visitRows : (visitRows as any)?.rows || [];
        for (const row of rows) {
          visitsMap[row.customer_id] = row.visited_at;
        }
      } catch { /* visits data is optional */ }
    }

    return NextResponse.json({
      customers: customersResult.customers,
      hasMore: customersResult.hasMore,
      total: customersResult.total,
      clusters: allClusters,
      visitsMap,
    });
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

  return { customers: customersWithClusters, hasMore, total };
}
