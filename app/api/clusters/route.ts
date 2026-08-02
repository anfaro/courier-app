// app/api/clusters/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import { getCached, setCache, clearCache } from "@/lib/cache";
import { clusterSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const cacheKey = req.url;
    const cached = getCached<{ clusters: any[]; hasMore: boolean; limit: number; offset: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    const allClusters = await db
      .select({
        id: clusters.id,
        name: clusters.name,
        notes: clusters.notes,
        createdAt: clusters.createdAt,
        // Scalar subqueries avoid the multiplicative clusters × links × visits join.
        // The cluster_id index (customer_clusters_cluster_id_idx) backs the first;
        // the visits index (visits_customer_visited_idx) backs the second.
        // ${clusters}.id qualifies the outer column so nested subqueries don't
        // resolve "id" to customer_visits.id.
        customerCount: sql<number>`(
          SELECT COUNT(*)::int FROM customer_clusters cc WHERE cc.cluster_id = ${clusters}.id
        )`.mapWith(Number),
        lastActivity: sql<string | null>`(
          SELECT MAX(cv.visited_at) FROM customer_visits cv
          WHERE cv.customer_id IN (
            SELECT cc.customer_id FROM customer_clusters cc WHERE cc.cluster_id = ${clusters}.id
          )
        )`.mapWith(String),
      })
      .from(clusters)
      .orderBy(clusters.name)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = allClusters.length > limit;
    if (hasMore) allClusters.pop();

    const totalResult = await db.execute(sql`SELECT COUNT(*) AS count FROM clusters`);
    const total = Number(Array.isArray(totalResult) ? totalResult[0]?.count ?? 0 : (totalResult as any)?.rows?.[0]?.count ?? 0);

    const body = { clusters: allClusters, hasMore, limit, offset, total };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    await logError({
      errorName: "FetchClustersError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch clusters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);
    const body = await req.json();
    const parsed = clusterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, notes } = parsed.data;
    const { customerIds } = body;

    const [newCluster] = await db
      .insert(clusters)
      .values({ 
        id: generateId(),
        name: name.trim(),
        notes: notes || null,
      })
      .returning({ id: clusters.id });

    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const joinRecords = customerIds.map((customerId: string) => ({
        customerId: customerId,
        clusterId: newCluster.id,
      }));
      await db.insert(customerClusters).values(joinRecords);
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "CLUSTER_CREATED",
      details: `Created new cluster: ${name}`,
      targetId: newCluster.id
    });

    clearCache("/api/clusters");
    clearCache("/api/dashboard");

    return NextResponse.json({ message: "Cluster created successfully" }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to create cluster" }, { status: 500 });
  }
}
