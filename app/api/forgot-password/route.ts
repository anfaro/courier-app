// app/api/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { logActivity, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ message: "If that email exists, a reset link was sent." }, { status: 200 });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 3600 * 1000);

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    await db.insert(passwordResetTokens).values({ 
      id: generateId(),
      email, 
      token: hashedToken, 
      expires 
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`;

    console.warn("=========================================");
    console.warn(`PASSWORD RESET LINK FOR ${email}: ${resetUrl}`);
    console.warn("=========================================");

    await logActivity({
      action: "PASSWORD_RESET_REQUESTED",
      details: `Password reset requested for ${email}`,
    });

    return NextResponse.json({ 
      message: "If that email exists, a reset link was sent.",
    }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "ForgotPasswordError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
