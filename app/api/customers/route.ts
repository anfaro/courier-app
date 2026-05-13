// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers } from "@/lib/schema";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const allCustomers = await db.query.customers.findMany({
      with: {
        clusters: {
          with: {
            cluster: true,
          },
        },
      },
      orderBy: (customers, { desc }) => [desc(customers.createdAt)],
    });

    return NextResponse.json({ customers: allCustomers }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchCustomersError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch customers" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, notes, clusterIds } = body;

    if (!name || !address) {
      return NextResponse.json({ message: "Name and address are required" }, { status: 400 });
    }

    const [newCustomer] = await db.insert(customers).values({
      id: generateId(),
      name,
      phoneNumber,
      address,
      latitude: latitude ? latitude.toString() : null,
      longitude: longitude ? longitude.toString() : null,
      housePictureUrl,
      notes,
    }).returning();

    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const clusterLinks = clusterIds.map((clusterId: string) => ({
        customerId: newCustomer.id,
        clusterId: clusterId,
      }));

      await db.insert(customerClusters).values(clusterLinks)
    }

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_CREATED",
        details: `Created customer: ${name}`,
        targetId: newCustomer.id
      });
    }

    return NextResponse.json({ message: "Customer added successfully" }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateCustomerError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to add customer" }, { status: 500 });
  }
}
