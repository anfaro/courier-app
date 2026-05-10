// app/api/clusters/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity, logServerAccess } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
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
    console.error("GET Cluster Error:", error);
    return NextResponse.json({ message: "Failed to fetch cluster" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const { name, notes, customerIds } = await req.json();

    if (!name) return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });

    await db.update(clusters).set({ 
      name, 
      notes,
      updatedAt: new Date() 
    }).where(eq(clusters.id, id));
    await db.delete(customerClusters).where(eq(customerClusters.clusterId, id));

    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const newLinks = customerIds.map((custId: number) => ({
        clusterId: id,
        customerId: custId,
      }));
      await db.insert(customerClusters).values(newLinks);
    }

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CLUSTER_UPDATED",
        details: `Updated cluster ${name} (ID: ${id})`,
        targetId: id.toString()
      });
    }

    return NextResponse.json({ message: "Cluster updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT Cluster Error:", error);
    return NextResponse.json({ message: "Failed to update cluster" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await db.delete(clusters).where(eq(clusters.id, id));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CLUSTER_DELETED",
        details: `Deleted cluster ID: ${id}`,
        targetId: id.toString()
      });
    }

    return NextResponse.json({ message: "Cluster deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Cluster Error:", error);
    return NextResponse.json({ message: "Failed to delete cluster" }, { status: 500 });
  }
}
