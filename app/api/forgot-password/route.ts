// app/api/forgot-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // 1. Check if the user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      // Security best practice: Don't reveal if an email is registered or not
      return NextResponse.json({ message: "If that email exists, a reset link was sent." }, { status: 200 });
    }

    // 2. Generate a secure random token and expiration date (e.g., 1 hour from now)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600 * 1000);

    // 3. Save the token to the database
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expires,
    });

    // 4. Create the reset URL (we will build the /reset-password page next time)
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    // MOCK EMAIL SENDING:
    // Since we don't have an email provider yet, we will print it to the server console.
    // When you test this on your phone, look at your terminal output to find this link!
    console.log("=========================================");
    console.log(`PASSWORD RESET LINK FOR ${email}:`);
    console.log(resetUrl);
    console.log("=========================================");

    return NextResponse.json({ message: "If that email exists, a reset link was sent." }, { status: 200 });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
