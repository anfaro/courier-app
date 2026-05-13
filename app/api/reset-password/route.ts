// app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, logError } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ message: "Missing token or password" }, { status: 400 });

    const tokenResult = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
    const resetToken = tokenResult[0];

    if (!resetToken) return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    if (new Date() > new Date(resetToken.expires)) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));
      return NextResponse.json({ message: "Token has expired. Please request a new one." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, resetToken.email));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));

    // Log the successful reset
    await logActivity({
      action: "USER_UPDATED",
      details: `Password successfully reset for ${resetToken.email}`,
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "ResetPasswordError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
