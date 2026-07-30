// app/api/search/global/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { customers, users, clusters, customerClusters, customerVisits } from "@/lib/schema";
import { or, eq, sql, desc, and } from "drizzle-orm";
import { logActivity, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ customers: [], clusters: [], users: [] });
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "SEARCH_QUERIED",
      details: `Global search query: "${q}"${type ? ` (filter: ${type})` : ""}`,
    });

    const sanitized = q.replace(/[%_\\]/g, '\\$&');
    const pattern = `%${sanitized}%`;
    const limit = 20;

    let foundCustomers: any[] = [];
    let foundClusters: any[] = [];
    let foundUsers: any[] = [];

    if (!type || type === "customer") {
      const rawCustomers = await db.query.customers.findMany({
        where: or(
          sql`${customers.name} ILIKE ${pattern}`,
          sql`${customers.phoneNumber} ILIKE ${pattern}`,
          sql`${customers.address} ILIKE ${pattern}`,
          sql`${customers.landmark} ILIKE ${pattern}`,
        ),
        limit,
        with: {
          clusters: { with: { cluster: { columns: { id: true, name: true } } } },
          visits: { columns: { visitedAt: true }, orderBy: [desc(customerVisits.visitedAt)], limit: 1 },
        },
      });

      const visitCounts = await db
        .select({ customerId: customerVisits.customerId, count: sql<number>`count(*)` })
        .from(customerVisits)
        .groupBy(customerVisits.customerId);

      const visitCountMap = new Map(visitCounts.map((v) => [v.customerId, Number(v.count)]));

      foundCustomers = rawCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude,
        housePictureUrl: c.housePictureUrl,
        landmark: c.landmark,
        notes: c.notes,
        createdAt: c.createdAt,
        clusters: c.clusters.map((cc) => cc.cluster.name),
        lastVisitedAt: c.visits?.[0]?.visitedAt || null,
        visitCount: visitCountMap.get(c.id) || 0,
      }));
    }

    if (!type || type === "cluster") {
      const rawClusters = await db.query.clusters.findMany({
        where: sql`${clusters.name} ILIKE ${pattern}`,
        limit,
        with: { customers: { columns: { customerId: true } } },
      });

      foundClusters = rawClusters.map((cl) => ({
        id: cl.id,
        name: cl.name,
        notes: cl.notes,
        createdAt: cl.createdAt,
        customerCount: cl.customers.length,
      }));
    }

    if (!type || type === "staff") {
      if (token.role === "superadmin") {
        foundUsers = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(
            or(
              sql`${users.name} ILIKE ${pattern}`,
              sql`${users.email} ILIKE ${pattern}`
            )
          )
          .limit(limit);
      }
    }

    return NextResponse.json({ customers: foundCustomers, clusters: foundClusters, users: foundUsers });
  } catch (error: any) {
    await logError({ errorName: "GlobalSearchError", errorMessage: error.message });
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
