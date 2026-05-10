// app/api/search/global/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, deliveries, users } from "@/lib/schema";
import { ilike, or, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ customers: [], deliveries: [], users: [] });
    }

    console.log(`[Global Search] Query: "${q}" (Role: ${token.role})`);

    // 1. Search in Customers table
    const foundCustomers = await db.select().from(customers).where(
        or(
          ilike(customers.name, `%${q}%`),
          ilike(customers.phoneNumber, `%${q}%`),
          ilike(customers.address, `%${q}%`)
        )
    ).limit(5);

    // 2. Search in Deliveries table + Join with customers
    const foundDeliveries = await db.select({
        id: deliveries.id,
        waybillNumber: deliveries.waybillNumber,
        receiverName: deliveries.receiverName,
        customerName: customers.name,
    })
    .from(deliveries)
    .leftJoin(customers, eq(deliveries.customerId, customers.id))
    .where(
        or(
          ilike(deliveries.waybillNumber, `%${q}%`),
          ilike(deliveries.receiverName, `%${q}%`),
          ilike(customers.name, `%${q}%`)
        )
    ).limit(5);

    // 3. Search in Users table - ONLY if superadmin
    let foundUsers: any[] = [];
    if (token.role === "superadmin") {
      foundUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(
        or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`)
        )
      )
      .limit(5);
    }

    console.log(`[Global Search] Results: ${foundCustomers.length} customers, ${foundDeliveries.length} deliveries, ${foundUsers.length} users.`);

    return NextResponse.json({
      customers: foundCustomers,
      deliveries: foundDeliveries,
      users: foundUsers
    });

  } catch (error: any) {
    console.error("[Global Search] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
