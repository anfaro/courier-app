// app/api/admin/system/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sql, count } from "drizzle-orm";
import { customers, deliveries, clusters, users, logs } from "@/lib/schema";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [[{ total: cust }], [{ total: del }], [{ total: cl }], [{ total: usr }], [{ total: log }]] =
      await Promise.all([
        db.select({ total: count() }).from(customers),
        db.select({ total: count() }).from(deliveries),
        db.select({ total: count() }).from(clusters),
        db.select({ total: count() }).from(users),
        db.select({ total: count() }).from(logs),
      ]);

    return NextResponse.json({
      stats: [
        { label: "Customers", value: cust, icon: "🏠" },
        { label: "Deliveries", value: del, icon: "📦" },
        { label: "Clusters", value: cl, icon: "📍" },
        { label: "Users", value: usr, icon: "👥" },
        { label: "Log Entries", value: log, icon: "📋" },
      ],
    });
  } catch {
    return NextResponse.json({ error: "Health check failed" }, { status: 500 });
  }
}
