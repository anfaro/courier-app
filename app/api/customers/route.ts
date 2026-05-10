import { logServerAccess } from "@/lib/logger";
// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerClusters, customers } from "@/lib/schema";
import { getToken } from "next-auth/jwt";
import { logActivity } from "@/lib/logger";

// app/api/customers/route.ts (Replace the GET function)
export async function GET(req: NextRequest) {
  try {
    // Using Drizzle's Relational Query to grab the customer AND their clusters
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
    console.error("Failed to fetch customers:", error);
    return NextResponse.json({ message: "Failed to fetch customers" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();
    // NEW: Extract notes
    const { name, phoneNumber, address, latitude, longitude, housePictureUrl, notes, clusterIds } = body;

    if (!name || !address) {
      return NextResponse.json({ message: "Name and address are required" }, { status: 400 });
    }

    const [newCustomer] = await db.insert(customers).values({
      name,
      phoneNumber,
      address,
      latitude: latitude ? latitude.toString() : null,
      longitude: longitude ? longitude.toString() : null,
      housePictureUrl,
      notes, // NEW: Insert notes into the database
    }).returning();

    // 2. If they selected clusters, insert them into the Many-to-Many join table
    if (clusterIds && Array.isArray(clusterIds) && clusterIds.length > 0) {
      const clusterLinks = clusterIds.map((clusterId) => ({
        customerId: newCustomer.id,
        clusterId: clusterId,
      }));

      await db.insert(customerClusters).values(clusterLinks)
    }

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CUSTOMER_CREATED",
        details: `Created customer: ${name}`,
        targetId: newCustomer.id.toString()
      });
    }

    return NextResponse.json({ message: "Customer added successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json({ message: "Failed to add customer" }, { status: 500 });
  }
}

