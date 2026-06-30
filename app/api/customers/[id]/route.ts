// app/api/customers/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, customerClusters } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const data = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: { clusters: { with: { cluster: true } } },
    });
    if (!data) return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchCustomerError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, housePictures, landmark, accessInfo, notes, clusterIds } = body;

    if (!name || !address) return NextResponse.json({ message: "Name and address are required" }, { status: 400 });

    const photos = housePictures && Array.isArray(housePictures) ? housePictures : [];
    await db.update(customers)
      .set({
        name,
        phoneNumber,
        address,
        latitude: latitude ? latitude.toString() : null,
        longitude: longitude ? longitude.toString() : null,
        housePictureUrl: housePictureUrl || photos[0] || null,
        housePictures: photos.length > 0 ? JSON.stringify(photos) : null,
        landmark,
        accessInfo,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    await db.delete(customerClusters).where(eq(customerClusters.customerId, id));
    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const newClusterLinks = clusterIds.map((clusterId: string) => ({
        customerId: id,
        clusterId: clusterId,
      }));
      await db.insert(customerClusters).values(newClusterLinks);
    }

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_UPDATED",
        details: `Updated customer ${name}`,
        targetId: id
      });
    }

    return NextResponse.json({ message: "Customer updated successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateCustomerError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await db.delete(customers).where(eq(customers.id, id));

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_DELETED",
        details: `Deleted customer ID: ${id}`,
        targetId: id
      });
    }

    return NextResponse.json({ message: "Customer deleted successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteCustomerError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete customer" }, { status: 500 });
  }
}
