// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { logs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the 50 most recent logs
    const recentLogs = await db.query.logs.findMany({
      orderBy: [desc(logs.createdAt)],
      limit: 50,
      with: {
        user: true, // Pull in user details (optional as we have userName denormalized)
      }
    });

    return NextResponse.json({ logs: recentLogs });
  } catch (error: any) {
    await logError({
      errorName: "LogsFetchError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
