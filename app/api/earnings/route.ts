import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/schema";
import { eq, desc, between, and } from "drizzle-orm";
import { logError } from "@/lib/logger";
import { getCutoffPeriod } from "@/lib/earnings";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const overrideStart = searchParams.get("start");
    const overrideEnd = searchParams.get("end");

    let cutoffStart: string;
    let cutoffEnd: string;

    if (overrideStart && overrideEnd) {
      cutoffStart = overrideStart;
      cutoffEnd = overrideEnd;
    } else {
      const period = getCutoffPeriod();
      cutoffStart = period.start;
      cutoffEnd = period.end;
    }

    const userResult = await db
      .select({ rate: users.rate })
      .from(users)
      .where(eq(users.id, token.id as string))
      .limit(1);

    const ratePerPackage = userResult.length ? (userResult[0].rate ?? 1500) : 1500;

    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, token.id as string),
          between(sessions.date, cutoffStart, cutoffEnd)
        )
      )
      .orderBy(desc(sessions.date));

    let totalDelivered = 0;
    const dailyBreakdown: { date: string; delivered: number; earnings: number }[] = [];

    for (const s of userSessions) {
      const delivered = Number(s.deliveredPackages) || 0;
      totalDelivered += delivered;
      dailyBreakdown.push({
        date: s.date,
        delivered,
        earnings: delivered * ratePerPackage,
      });
    }

    const totalEarnings = totalDelivered * ratePerPackage;

    return NextResponse.json({
      totalDelivered,
      totalEarnings,
      ratePerPackage,
      cutoffStart,
      cutoffEnd,
      dailyBreakdown,
    }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchEarningsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch earnings" }, { status: 500 });
  }
}
