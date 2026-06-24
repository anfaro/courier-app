// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/schema";
import { eq, desc, between, and, sql } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { getCutoffPeriod } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Run all queries in parallel
    const [customerCountResult, clusterCountResult, recentVisitsResult, earningsResult, userResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) AS count FROM customers`),
      db.execute(sql`SELECT COUNT(*) AS count FROM clusters`),
      db.execute(sql`
        SELECT DISTINCT ON (cv.customer_id)
          cv.id, cv.customer_id, cv.user_id, cv.user_name,
          cv.visited_at, cv.checked_out_at, cv.notes,
          c.name AS customer_name, c.address AS customer_address
        FROM customer_visits cv
        LEFT JOIN customers c ON c.id = cv.customer_id
        ORDER BY cv.customer_id, cv.visited_at DESC
        LIMIT 5
      `),
      fetchEarnings(token.id as string),
      db.select({ rate: users.rate }).from(users).where(eq(users.id, token.id as string)).limit(1),
    ]);

    const totalCustomers = Number((customerCountResult as any[])[0]?.count ?? 0);
    const totalClusters = Number((clusterCountResult as any[])[0]?.count ?? 0);
    const rows = Array.isArray(recentVisitsResult) ? recentVisitsResult : (recentVisitsResult as any)?.rows || [];
    const recentVisits = rows.slice(0, 5).map((v: any) => ({
      id: v.id,
      customer_id: v.customer_id,
      user_id: v.user_id,
      user_name: v.user_name,
      visited_at: v.visited_at,
      checked_out_at: v.checked_out_at,
      notes: v.notes,
      customerName: v.customer_name || "Unknown",
      customerAddress: v.customer_address,
    }));

    const ratePerPackage = userResult.length ? (userResult[0].rate ?? 1500) : 1500;

    return NextResponse.json({
      totalCustomers,
      totalClusters,
      recentVisits,
      earnings: earningsResult,
      ratePerPackage,
    });
  } catch (error) {
    await logError({
      errorName: "FetchDashboardError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

async function fetchEarnings(userId: string) {
  try {
    const period = getCutoffPeriod();
    const cutoffStart = period.start;
    const cutoffEnd = period.end;

    const userResult = await db
      .select({ rate: users.rate })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const ratePerPackage = userResult.length ? (userResult[0].rate ?? 1500) : 1500;

    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          between(sessions.date, cutoffStart, cutoffEnd)
        )
      )
      .orderBy(desc(sessions.date));

    let totalDelivered = 0;
    const dailyBreakdown: { date: string; delivered: number; earnings: number }[] = [];
    for (const s of userSessions) {
      const delivered = Number(s.deliveredPackages) || 0;
      totalDelivered += delivered;
      dailyBreakdown.push({ date: s.date, delivered, earnings: delivered * ratePerPackage });
    }
    const totalEarnings = totalDelivered * ratePerPackage;

    return { totalDelivered, totalEarnings, ratePerPackage, cutoffStart, cutoffEnd, dailyBreakdown };
  } catch {
    return { totalDelivered: 0, totalEarnings: 0, ratePerPackage: 1500, cutoffStart: "", cutoffEnd: "", dailyBreakdown: [] };
  }
}
