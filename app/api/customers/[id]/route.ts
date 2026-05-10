import { logServerAccess } from "@/lib/logger";
// app/api/customers/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, customerClusters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const data = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: { clusters: { with: { cluster: true } } },
    });
    if (!data) return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ message: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await req.json();
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, notes, clusterIds } = body;

    if (!name || !address) return NextResponse.json({ message: "Name and address are required" }, { status: 400 });

    await db.update(customers)
      .set({
        name,
        phoneNumber,
        address,
        latitude: latitude ? latitude.toString() : null,
        longitude: longitude ? longitude.toString() : null,
        housePictureUrl,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    await db.delete(customerClusters).where(eq(customerClusters.customerId, id));
    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const newClusterLinks = clusterIds.map((clusterId: number) => ({
        customerId: id,
        clusterId: clusterId,
      }));
      await db.insert(customerClusters).values(newClusterLinks);
    }

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CUSTOMER_UPDATED",
        details: `Updated customer ${name}`,
        targetId: id.toString()
      });
    }

    return NextResponse.json({ message: "Customer updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json({ message: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await db.delete(customers).where(eq(customers.id, id));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CUSTOMER_DELETED",
        details: `Deleted customer ID: ${id}`,
        targetId: id.toString()
      });
    }

    return NextResponse.json({ message: "Customer deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Customer Error:", error);
    return NextResponse.json({ message: "Failed to delete customer" }, { status: 500 });
  }
}
