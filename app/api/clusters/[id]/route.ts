import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    if (limit) {
      const cluster = await db.query.clusters.findFirst({
        where: eq(clusters.id, id),
        columns: { id: true, name: true, notes: true },
      });
      if (!cluster) return NextResponse.json({ message: "Cluster not found" }, { status: 404 });

      const pageSize = Math.max(1, parseInt(limit));
      const pageOffset = Math.max(0, parseInt(offset || "0"));

      const customerLinks = await db.query.customerClusters.findMany({
        where: eq(customerClusters.clusterId, id),
        limit: pageSize,
        offset: pageOffset,
        with: { customer: { columns: { id: true, name: true, address: true } } },
      });

      const totalResult = await db.execute(
        sql`SELECT COUNT(*)::int AS count FROM customer_clusters WHERE cluster_id = ${id}`
      );

      return NextResponse.json({
        ...cluster,
        customers: customerLinks,
        total: totalResult[0]?.count ?? 0,
      }, { status: 200 });
    }

    const data = await db.query.clusters.findFirst({
      where: eq(clusters.id, id),
      with: {
        customers: {
          with: {
            customer: true,
          },
        },
      },
    });
    if (!data) return NextResponse.json({ message: "Cluster not found" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch cluster" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { name, notes, customerIds } = await req.json();

    if (!name) return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });

    await db.update(clusters).set({ 
      name, 
      notes,
      updatedAt: new Date() 
    }).where(eq(clusters.id, id));
    await db.delete(customerClusters).where(eq(customerClusters.clusterId, id));

    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const newLinks = customerIds.map((custId: string) => ({
        clusterId: id,
        customerId: custId,
      }));
      await db.insert(customerClusters).values(newLinks);
    }

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CLUSTER_UPDATED",
        details: `Updated cluster ${name} (ID: ${id})`,
        targetId: id
      });
    }

    return NextResponse.json({ message: "Cluster updated successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update cluster" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await db.delete(clusters).where(eq(clusters.id, id));

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CLUSTER_DELETED",
        details: `Deleted cluster ID: ${id}`,
        targetId: id
      });
    }

    return NextResponse.json({ message: "Cluster deleted successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete cluster" }, { status: 500 });
  }
}
