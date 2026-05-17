// app/api/admin/system/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { logs, errorLogs, accessLogs } from "@/lib/schema";
import { desc, and, gte, lte, or, like } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "activity";
    const q = searchParams.get("q") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const page = Math.max(0, parseInt(searchParams.get("page") || "0"));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") || "50")));

    const whereClauses: any[] = [];
    if (q) {
      if (type === "errors") {
        whereClauses.push(or(like(errorLogs.errorName, `%${q}%`), like(errorLogs.errorMessage, `%${q}%`)));
      } else if (type === "access") {
        whereClauses.push(or(like(accessLogs.pathname, `%${q}%`), like(accessLogs.ipAddress, `%${q}%`), like(accessLogs.userName, `%${q}%`)));
      } else {
        whereClauses.push(or(like(logs.action, `%${q}%`), like(logs.details, `%${q}%`), like(logs.userName, `%${q}%`)));
      }
    }
    if (from) whereClauses.push(gte(
      type === "errors" ? errorLogs.createdAt : type === "access" ? accessLogs.createdAt : logs.createdAt,
      new Date(from),
    ));
    if (to) whereClauses.push(lte(
      type === "errors" ? errorLogs.createdAt : type === "access" ? accessLogs.createdAt : logs.createdAt,
      new Date(to),
    ));

    const queryOpts: any = { orderBy: [desc(type === "errors" ? errorLogs.createdAt : type === "access" ? accessLogs.createdAt : logs.createdAt)], limit: pageSize + 1, offset: page * pageSize };
    if (whereClauses.length > 0) queryOpts.where = and(...whereClauses);

    let data: any[];

    if (type === "errors") {
      data = await db.query.errorLogs.findMany(queryOpts);
    } else if (type === "access") {
      data = await db.query.accessLogs.findMany(queryOpts);
    } else {
      data = await db.query.logs.findMany(queryOpts);
    }

    const hasMore = data.length > pageSize;
    if (hasMore) data.pop();

    return NextResponse.json({ logs: data, hasMore, page, pageSize });
  } catch (error: any) {
    await logError({
      errorName: "SystemLogsFetchError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
