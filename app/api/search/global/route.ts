// app/api/search/global/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, users, clusters } from "@/lib/schema";
import { ilike, or, eq } from "drizzle-orm";
import { logActivity, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ customers: [], users: [], clusters: [] });
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_LOGIN",
      details: `Global search query: "${q}"`,
    });

    // 1. Search in Customers table
    const foundCustomers = await db.select().from(customers).where(
        or(
          ilike(customers.name, `%${q}%`),
          ilike(customers.phoneNumber, `%${q}%`),
          ilike(customers.address, `%${q}%`)
        )
    ).limit(5);

    // 2. Search in Clusters table
    const foundClusters = await db.select().from(clusters).where(
        ilike(clusters.name, `%${q}%`)
    ).limit(5);

    // 4. Search in Users table - ONLY if superadmin
    let foundUsers: any[] = [];
    // @ts-expect-error - role check
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

    return NextResponse.json({
      customers: foundCustomers,
      clusters: foundClusters,
      users: foundUsers
    });

  } catch (error: any) {
    await logError({
      errorName: "GlobalSearchError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
