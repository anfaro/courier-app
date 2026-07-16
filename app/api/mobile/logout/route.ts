// app/api/mobile/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getMobileUserId } from "@/lib/mobile-auth";
import { logActivity, logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    let userId: string;
    try {
      userId = await getMobileUserId(req);
    } catch {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await db.update(users).set({ apiToken: null, isActive: false }).where(eq(users.id, userId));

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    await logError({
      errorName: "MobileLogoutError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred during logout" }, { status: 500 });
  }
}
