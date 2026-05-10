// app/api/forgot-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { logActivity } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ message: "If that email exists, a reset link was sent." }, { status: 200 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600 * 1000);

    await db.insert(passwordResetTokens).values({ email, token, expires });
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    console.log("=========================================");
    console.log(`PASSWORD RESET LINK FOR ${email}: ${resetUrl}`);
    console.log("=========================================");

    // Log the request (anonymized/targeted by email)
    await logActivity({
      action: "USER_UPDATED", // We'll use USER_UPDATED for security logs
      details: `Password reset requested for ${email}`,
    });

    return NextResponse.json({ message: "If that email exists, a reset link was sent." }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
