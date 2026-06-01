import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const results = await db.select().from(customers)
      .where(or(
        ilike(customers.name, `%${q}%`),
        ilike(customers.phoneNumber, `%${q}%`)
      ))
      .limit(10);

    return NextResponse.json(results);
  } catch (error) {
    await logError({
      errorName: "CustomerSearchError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
