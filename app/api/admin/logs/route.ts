// app/api/admin/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { logs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
