// app/api/clusters/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";
import { getCached, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const cacheKey = req.url;
    const cached = getCached<{ clusters: any[]; hasMore: boolean; limit: number; offset: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 500, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    const allClusters = await db
      .select({
        id: clusters.id,
        name: clusters.name,
        notes: clusters.notes,
        customerCount: sql<number>`count(${customerClusters.customerId})`.mapWith(Number),
      })
      .from(clusters)
      .leftJoin(customerClusters, eq(clusters.id, customerClusters.clusterId))
      .groupBy(clusters.id)
      .orderBy(clusters.name)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = allClusters.length > limit;
    if (hasMore) allClusters.pop();

    const totalResult = await db.execute(sql`SELECT COUNT(*) AS count FROM clusters`);
    const total = Number(Array.isArray(totalResult) ? totalResult[0]?.count ?? 0 : (totalResult as any)?.rows?.[0]?.count ?? 0);

    const body = { clusters: allClusters, hasMore, limit, offset, total };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchClustersError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to fetch clusters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    const { name, notes, customerIds } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });
    }

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

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CLUSTER_CREATED",
        details: `Created new cluster: ${name}`,
        targetId: newCluster.id
      });
    }

    return NextResponse.json({ message: "Cluster created successfully" }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to create cluster" }, { status: 500 });
  }
}
