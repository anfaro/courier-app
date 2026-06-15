import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

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
      .where(eq(sessions.userId, token.id as string))
      .orderBy(desc(sessions.date))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ sessions: allSessions }, { status: 200 });
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
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const body = await req.json();
    const { date } = body;
    const sessionDate = date || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

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

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CreateSessionError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
  }
}
