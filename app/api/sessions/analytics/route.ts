import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const fromDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const rows = await db
      .select({
        date: sessions.date,
        totalPackages: sessions.totalPackages,
        deliveredPackages: sessions.deliveredPackages,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, token.id as string), gte(sessions.date, fromDate)))
      .orderBy(asc(sessions.date));

    const data = rows.map((r) => ({
      date: r.date,
      total: Number(r.totalPackages) || 0,
      delivered: Number(r.deliveredPackages) || 0,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "AnalyticsFetchError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch analytics" }, { status: 500 });
  }
}
