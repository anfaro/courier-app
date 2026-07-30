// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await db.update(users).set({ isActive: false }).where(eq(users.id, token.id as string));

    return NextResponse.json({ message: "Logged out" });
  } catch {
    return NextResponse.json({ message: "Failed to update status" }, { status: 500 });
  }
}
