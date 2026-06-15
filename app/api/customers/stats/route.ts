import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sql, count } from "drizzle-orm";
import { customers, customerVisits, clusters, sessionDeliveries } from "@/lib/schema";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const [
      totalCustomers,
      pinned,
      visited,
      withPhone,
      noCluster,
      totalClusters,
      totalVisits,
      totalDeliveries,
      clusterBreakdown,
      tierBreakdown,
      topVisited,
    ] = await Promise.all([
      safeQuery(
        () => db.select({ total: count() }).from(customers).then(r => r[0].total),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COUNT(*)::int AS pinned
          FROM customers
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `).then(r => (r[0] as { pinned: number }).pinned),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COUNT(DISTINCT customer_id)::int AS visited
          FROM customer_visits
        `).then(r => (r[0] as { visited: number }).visited),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COUNT(*)::int AS with_phone
          FROM customers
          WHERE phone_number IS NOT NULL AND phone_number != ''
        `).then(r => (r[0] as { with_phone: number }).with_phone),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COUNT(*)::int AS no_cluster
          FROM customers c
          WHERE NOT EXISTS (
            SELECT 1 FROM customer_clusters cc WHERE cc.customer_id = c.id
          )
        `).then(r => (r[0] as { no_cluster: number }).no_cluster),
        0,
      ),
      safeQuery(
        () => db.select({ total: count() }).from(clusters).then(r => r[0].total),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COUNT(*)::int AS total_visits
          FROM customer_visits
        `).then(r => (r[0] as { total_visits: number }).total_visits),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT COALESCE(SUM(NULLIF(packages, '')::int), 0)::int AS total_deliveries
          FROM session_deliveries
        `).then(r => (r[0] as { total_deliveries: number }).total_deliveries),
        0,
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT cl.id, cl.name, COUNT(cc.customer_id)::int AS customer_count
          FROM clusters cl
          LEFT JOIN customer_clusters cc ON cc.cluster_id = cl.id
          GROUP BY cl.id, cl.name
          ORDER BY customer_count DESC
        `).then(r => r as { id: string; name: string; customer_count: number }[]),
        [] as { id: string; name: string; customer_count: number }[],
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE vc = 0)::int AS tier_new,
            COUNT(*) FILTER (WHERE vc BETWEEN 1 AND 3)::int AS tier_regular,
            COUNT(*) FILTER (WHERE vc > 3)::int AS tier_frequent
          FROM (
            SELECT COALESCE(v.visit_count, 0) AS vc
            FROM customers c
            LEFT JOIN (
              SELECT customer_id, COUNT(*)::int AS visit_count
              FROM customer_visits
              GROUP BY customer_id
            ) v ON v.customer_id = c.id
          ) sub
        `).then(r => r[0] as { tier_new: number; tier_regular: number; tier_frequent: number }),
        { tier_new: 0, tier_regular: 0, tier_frequent: 0 },
      ),
      safeQuery(
        () => db.execute(sql`
          SELECT c.id, c.name, COUNT(cv.id)::int AS visit_count
          FROM customers c
          INNER JOIN customer_visits cv ON cv.customer_id = c.id
          GROUP BY c.id, c.name
          ORDER BY visit_count DESC
          LIMIT 5
        `).then(r => r as { id: string; name: string; visit_count: number }[]),
        [] as { id: string; name: string; visit_count: number }[],
      ),
    ]);

    const unpinned = totalCustomers - pinned;
    const unvisited = totalCustomers - visited;
    const withoutPhone = totalCustomers - withPhone;
    const avgVisits = totalCustomers > 0 ? (totalVisits / totalCustomers).toFixed(1) : "0";

    return NextResponse.json({
      totalCustomers,
      pinned,
      unpinned,
      visited,
      unvisited,
      withPhone,
      withoutPhone,
      noCluster,
      totalClusters,
      totalVisits,
      totalDeliveries,
      avgVisits,
      clusterBreakdown,
      tierBreakdown,
      topVisited,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
