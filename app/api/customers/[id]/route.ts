// app/api/customers/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers, customerClusters } from "@/lib/schema"; // NEW: Added customerClusters
import { eq } from "drizzle-orm";

// 1. GET: Fetch the existing customer data to pre-fill the form
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // NEW: Fetch customer WITH their connected clusters
    const data = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        clusters: {
          with: {
            cluster: true,
          },
        },
      },
    });

    if (!data) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ message: "Failed to fetch customer" }, { status: 500 });
  }
}

// 2. PUT: Update the customer in the database
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await req.json();

    // NEW: Extract clusterIds from the request body
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, notes, clusterIds } = body;

    if (!name || !address) {
      return NextResponse.json({ message: "Name and address are required" }, { status: 400 });
    }

    // 1. Update the main customer record
    await db.update(customers)
      .set({
        name,
        phoneNumber,
        address,
        latitude: latitude ? latitude.toString() : null,
        longitude: longitude ? longitude.toString() : null,
        housePictureUrl,
        notes,
        // Optional: If you don't have updatedAt in schema, remove this line.
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    // 2. Clear old cluster assignments for this customer
    await db.delete(customerClusters).where(eq(customerClusters.customerId, id));

    // 3. Insert new cluster assignments
    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const newClusterLinks = clusterIds.map((clusterId: number) => ({
        customerId: id,
        clusterId: clusterId,
      }));

      await db.insert(customerClusters).values(newClusterLinks);
    }

    return NextResponse.json({ message: "Customer updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ message: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    // Drizzle will delete the customer. 
    // If you have onDelete: "cascade" set up in your schema for customer_clusters, 
    // the join records will be automatically cleaned up.
    await db.delete(customers).where(eq(customers.id, id));

    return NextResponse.json({ message: "Customer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Customer Error:", error);
    return NextResponse.json({ message: "Failed to delete customer" }, { status: 500 });
  }
}


