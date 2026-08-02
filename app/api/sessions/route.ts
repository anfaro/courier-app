import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { clearCache } from "@/lib/cache";
import { sessionCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const filters = [eq(sessions.userId, token.id as string)];
    if (dateFrom) filters.push(gte(sessions.date, dateFrom));
    if (dateTo) filters.push(lte(sessions.date, dateTo));
    if (search) filters.push(like(sessions.date, `%${search.replace(/[%_\\]/g, '\\$&')}%`));

    const allSessions = await db
      .select({
        id: sessions.id,
        date: sessions.date,
        totalPackages: sessions.totalPackages,
        deliveredPackages: sessions.deliveredPackages,
        finalized: sessions.finalized,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(and(...filters))
      .orderBy(desc(sessions.date))
      .limit(limit)
      .offset(offset);

    const analyticsConditions = [sql`user_id = ${token.id as string}`];
    if (dateFrom) analyticsConditions.push(sql`date >= ${dateFrom}`);
    if (dateTo) analyticsConditions.push(sql`date <= ${dateTo}`);

    const analyticsRows = await db.execute(sql`
      SELECT
        date,
        SUBSTRING(date, 1, 7) AS month,
        COALESCE(NULLIF(total_packages, '')::int, 0)::int AS total,
        COALESCE(NULLIF(delivered_packages, '')::int, 0)::int AS delivered
      FROM sessions
      WHERE ${sql.join(analyticsConditions, sql` AND `)}
      ORDER BY date ASC
    `);

    const dailyAnalytics = (Array.isArray(analyticsRows) ? analyticsRows : (analyticsRows as any)?.rows || []).map((r: any) => ({
      date: r.date,
      month: r.month,
      total: r.total,
      delivered: r.delivered,
    }));

    return NextResponse.json(
      { sessions: allSessions, analytics: dailyAnalytics },
      { status: 200 }
    );
  } catch (error) {
    await logError({
      errorName: "FetchSessionsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const body = await req.json();
    const parsed = sessionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const sessionDate = parsed.data.date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

    const [session] = await db.insert(sessions).values({
      id: generateId(),
      userId: token.id as string,
      date: sessionDate,
    }).returning();

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "SESSION_CREATED",
      details: `Created session for ${sessionDate}`,
      targetId: session.id,
    });

    clearCache("/api/dashboard");

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateSessionError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
  }
}
