// app/api/admin/system/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { logs, errorLogs, accessLogs } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "activity";

    let data;
    if (type === "errors") {
      data = await db.query.errorLogs.findMany({
        orderBy: [desc(errorLogs.createdAt)],
        limit: 50,
      });
    } else if (type === "access") {
      data = await db.query.accessLogs.findMany({
        orderBy: [desc(accessLogs.createdAt)],
        limit: 50,
      });
    } else {
      data = await db.query.logs.findMany({
        orderBy: [desc(logs.createdAt)],
        limit: 50,
      });
    }

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    await logError({
      errorName: "SystemLogsFetchError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
