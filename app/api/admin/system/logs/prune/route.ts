// app/api/admin/system/logs/prune/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { logs, errorLogs, accessLogs } from "@/lib/schema";
import { lte, sql } from "drizzle-orm";
import { logError, logActivity } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const type: string = body.type || "all";
    const olderThanDays: number = body.olderThanDays || 90;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let deleted = 0;

    const countAndDelete = async (table: any, createdAtCol: any) => {
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(table).where(lte(createdAtCol, cutoff));
      const toDelete = Number(countResult?.count || 0);
      if (toDelete > 0) {
        await db.delete(table).where(lte(createdAtCol, cutoff));
      }
      return toDelete;
    };

    if (type === "activity" || type === "all") {
      deleted += await countAndDelete(logs, logs.createdAt);
    }
    if (type === "errors" || type === "all") {
      deleted += await countAndDelete(errorLogs, errorLogs.createdAt);
    }
    if (type === "access" || type === "all") {
      deleted += await countAndDelete(accessLogs, accessLogs.createdAt);
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "LOGS_PRUNED",
      details: `Deleted ${deleted} ${type} log entries older than ${olderThanDays} days`,
    });

    return NextResponse.json({ deleted, message: `Deleted ${deleted} log entries` });
  } catch (error: any) {
    await logError({ errorName: "LogPruneError", errorMessage: error.message });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
