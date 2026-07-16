// lib/mobile-auth.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function generateApiToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function getMobileUserId(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new NextResponse(JSON.stringify({ message: "Missing or invalid Authorization header" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const token = authHeader.slice(7);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.apiToken, token))
    .limit(1);

  if (!user) {
    throw new NextResponse(JSON.stringify({ message: "Invalid or expired token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return user.id;
}
