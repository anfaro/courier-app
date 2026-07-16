// app/api/search/global/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { customers, users, clusters } from "@/lib/schema";
import { or, eq, sql } from "drizzle-orm";
import { logActivity, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ customers: [], users: [], clusters: [] });
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "SEARCH_QUERIED",
      details: `Global search query: "${q}"${type ? ` (filter: ${type})` : ""}`,
    });

    let foundCustomers: any[] = [];
    let foundClusters: any[] = [];
    let foundUsers: any[] = [];

    const pattern = `%${q}%`;

    if (!type || type === "customer") {
      foundCustomers = await db.select().from(customers).where(
          or(
            sql`${customers.name} ILIKE ${pattern}`,
            sql`${customers.phoneNumber} ILIKE ${pattern}`,
            sql`${customers.address} ILIKE ${pattern}`,
            sql`${customers.landmark} ILIKE ${pattern}`
          )
      ).limit(5);
    }

    if (!type || type === "cluster") {
      foundClusters = await db.select().from(clusters).where(
          sql`${clusters.name} ILIKE ${pattern}`
      ).limit(5);
    }

    if (!type || type === "staff") {
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
            sql`${users.name} ILIKE ${pattern}`,
            sql`${users.email} ILIKE ${pattern}`
          )
        )
        .limit(5);
      }
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
