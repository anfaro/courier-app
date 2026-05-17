// app/api/admin/system/database/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { count } from "drizzle-orm";
import { customers, deliveries, clusters, users, logs, errorLogs, accessLogs } from "@/lib/schema";

async function safeCount(table: any): Promise<number> {
  try {
    const [r] = await db.select({ total: count() }).from(table);
    return r?.total ?? 0;
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = await Promise.allSettled([
      safeCount(customers), safeCount(deliveries), safeCount(clusters),
      safeCount(users), safeCount(logs), safeCount(errorLogs), safeCount(accessLogs),
    ]);

    const names = ["customers", "deliveries", "clusters", "users", "logs", "error_logs", "access_logs"];
    const tables = names.map((name, i) => ({
      table_name: name,
      row_count: results[i].status === "fulfilled" ? results[i].value : 0,
    }));

    return NextResponse.json({
      tables,
      totalRows: tables.reduce((s, t) => s + t.row_count, 0),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch database stats" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, table } = await req.json();

    if (action === "vacuum") {
      const tableName = table || "";
      if (tableName) {
        await db.execute(sql`VACUUM ANALYZE ${sql.identifier(tableName)}`);
      } else {
        await db.execute(sql`VACUUM ANALYZE`);
      }
      return NextResponse.json({ message: `VACUUM ANALYZE completed on ${tableName || "all tables"}.` });
    }

    if (action === "reindex") {
      const tableName = table || "";
      if (tableName) {
        await db.execute(sql`REINDEX TABLE ${sql.identifier(tableName)}`);
      } else {
        await db.execute(sql`REINDEX DATABASE current_database()`);
      }
      return NextResponse.json({ message: `REINDEX completed on ${tableName || "database"}.` });
    }

    if (action === "analyze") {
      await db.execute(sql`ANALYZE`);
      return NextResponse.json({ message: "ANALYZE completed on all tables." });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Maintenance action failed" }, { status: 500 });
  }
}
