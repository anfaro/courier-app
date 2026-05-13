// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await db.update(users).set({ isActive: false }).where(eq(users.id, token.id as string));

    return NextResponse.json({ message: "Logged out" });
  } catch {
    return NextResponse.json({ message: "Failed to update status" }, { status: 500 });
  }
}
