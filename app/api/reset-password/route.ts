// app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Missing token or password" }, { status: 400 });
    }

    // 1. Find the token in the database
    const tokenResult = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    const resetToken = tokenResult[0];

    // 2. Check if token exists and is not expired
    if (!resetToken) {
      return NextResponse.json({ message: "Invalid token" }, { status: 400 });
    }

    if (new Date() > new Date(resetToken.expires)) {
      // If expired, delete it to clean up the database
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id));
      return NextResponse.json({ message: "Token has expired. Please request a new one." }, { status: 400 });
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the user's password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, resetToken.email));

    // 5. Delete the token so it cannot be used again
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}

