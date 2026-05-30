// app/api/visits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerVisits } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (customerId) {
      const visits = await db
        .select()
        .from(customerVisits)
        .where(sql`${customerVisits.customerId} = ${customerId}`)
        .orderBy(desc(customerVisits.visitedAt))
        .limit(1);
      return NextResponse.json({ visits });
    }

    // Return the most recent visit per customer (for map markers)
    const recentVisits = await db.execute(sql`
      SELECT DISTINCT ON (customer_id) id, customer_id, user_id, user_name, visited_at, checked_out_at, notes
      FROM customer_visits
      ORDER BY customer_id, visited_at DESC
    `);

    const rows = Array.isArray(recentVisits) ? recentVisits : (recentVisits as any)?.rows || [];
    return NextResponse.json({ visits: rows });
  } catch (error) {
    await logError({
      errorName: "FetchVisitsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch visits" }, { status: 500 });
  }
}
