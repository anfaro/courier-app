// app/api/clusters/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clusters, customerClusters } from "@/lib/schema"; // FIXED: Import the join table

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, customerIds } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Cluster name is required" }, { status: 400 });
    }

    // 1. Insert the new cluster and return its generated ID
    const [newCluster] = await db
      .insert(clusters)
      .values({ name: name.trim() })
      .returning({ id: clusters.id });

    // 2. FIXED: Insert into the Many-to-Many join table instead of updating the customers table
    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      const joinRecords = customerIds.map((customerId: number) => ({
        customerId: customerId,
        clusterId: newCluster.id,
      }));

      await db.insert(customerClusters).values(joinRecords);
    }

    return NextResponse.json({ message: "Cluster created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating cluster:", error);
    return NextResponse.json({ message: "Failed to create cluster" }, { status: 500 });
  }
}

