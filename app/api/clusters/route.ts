import { logServerAccess } from "@/lib/logger";
// app/api/clusters/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema";
import { logActivity } from "@/lib/logger";

import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const allClusters = await db
      .select({
        id: clusters.id,
        name: clusters.name,
        customerCount: sql<number>`count(${customerClusters.customerId})`.mapWith(Number),
      })
      .from(clusters)
      .leftJoin(customerClusters, eq(clusters.id, customerClusters.clusterId))
      .groupBy(clusters.id)
      .orderBy(clusters.name);

    return NextResponse.json({ clusters: allClusters }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch clusters:", error);
    return NextResponse.json({ error: "Failed to fetch clusters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    const { name, customerIds } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });
    }

    const [newCluster] = await db
      .insert(clusters)
      .values({ name: name.trim() })
      .returning({ id: clusters.id });

    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const joinRecords = customerIds.map((customerId: number) => ({
        customerId: customerId,
        clusterId: newCluster.id,
      }));
      await db.insert(customerClusters).values(joinRecords);
    }

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CLUSTER_CREATED",
        details: `Created new cluster: ${name}`,
        targetId: newCluster.id.toString()
      });
    }

    return NextResponse.json({ message: "Cluster created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating cluster:", error);
    return NextResponse.json({ message: "Failed to create cluster" }, { status: 500 });
  }
}
