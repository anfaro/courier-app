// app/api/admin/system/logs/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { logs, errorLogs, accessLogs } from "@/lib/schema";
import { sql, gte, count } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());

    const [activityToday] = await db.select({ value: count() }).from(logs).where(gte(logs.createdAt, today));
    const [activityWeek] = await db.select({ value: count() }).from(logs).where(gte(logs.createdAt, thisWeek));
    const [activityTotal] = await db.select({ value: count() }).from(logs);

    const [errorsToday] = await db.select({ value: count() }).from(errorLogs).where(gte(errorLogs.createdAt, today));
    const [errorsWeek] = await db.select({ value: count() }).from(errorLogs).where(gte(errorLogs.createdAt, thisWeek));
    const [errorsTotal] = await db.select({ value: count() }).from(errorLogs);

    const [accessToday] = await db.select({ value: count() }).from(accessLogs).where(gte(accessLogs.createdAt, today));
    const [accessWeek] = await db.select({ value: count() }).from(accessLogs).where(gte(accessLogs.createdAt, thisWeek));
    const [accessTotal] = await db.select({ value: count() }).from(accessLogs);

    return NextResponse.json({
      activity: { today: Number(activityToday.value), week: Number(activityWeek.value), total: Number(activityTotal.value) },
      errors: { today: Number(errorsToday.value), week: Number(errorsWeek.value), total: Number(errorsTotal.value) },
      access: { today: Number(accessToday.value), week: Number(accessWeek.value), total: Number(accessTotal.value) },
    });
  } catch (error: any) {
    await logError({ errorName: "LogStatsFetchError", errorMessage: error.message });
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
