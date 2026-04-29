// app/api/clusters/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema"; // Added customerClusters
import { eq } from "drizzle-orm";

// 1. GET: Fetch cluster data with its current customers
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Using relational query to get the cluster AND its linked customers
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

// 2. PUT: Update cluster details and membership
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const { name, notes, customerIds } = await req.json();

    if (!name) return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });

    // Step A: Update the basic cluster info
    await db.update(clusters)
      .set({
        name,
        notes,
        // Remove updatedAt if not in your schema, or ensure it exists in lib/schema.ts
        // updatedAt: new Date() 
      })
      .where(eq(clusters.id, id));

    // Step B: Many-to-Many Sync
    // 1. Wipe current links for this cluster
    await db.delete(customerClusters).where(eq(customerClusters.clusterId, id));

    // 2. Re-insert the new selection
    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const newLinks = customerIds.map((custId: number) => ({
        clusterId: id,
        customerId: custId,
      }));
      await db.insert(customerClusters).values(newLinks);
    }

    return NextResponse.json({ message: "Cluster updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT Cluster Error:", error);
    return NextResponse.json({ message: "Failed to update cluster" }, { status: 500 });
  }
}

// Add this at the bottom of app/api/clusters/[id]/route.ts

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Because of the 'CASCADE' delete rule in our schema, deleting a cluster 
    // will automatically delete all the join table records in 'customer_clusters' too!
    await db.delete(clusters).where(eq(clusters.id, id));

    return NextResponse.json({ message: "Cluster deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Cluster Error:", error);
    return NextResponse.json({ message: "Failed to delete cluster" }, { status: 500 });
  }
}

