
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const results = await db.select().from(customers)
    .where(or(
      ilike(customers.name, `%${q}%`),
      ilike(customers.phoneNumber, `%${q}%`)
    ))
    .limit(10);

  return NextResponse.json(results);
}
