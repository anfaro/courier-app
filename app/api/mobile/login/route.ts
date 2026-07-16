// app/api/mobile/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, logError } from "@/lib/logger";
import { generateApiToken } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const apiToken = generateApiToken();
    await db.update(users).set({ apiToken, isActive: true, lastActiveAt: new Date() }).where(eq(users.id, user.id));

    await logActivity({
      userId: user.id,
      userName: user.name || "Unknown",
      action: "USER_LOGIN",
      details: "Mobile login",
      targetId: user.id,
    });

    return NextResponse.json({
      token: apiToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    await logError({
      errorName: "MobileLoginError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred during login" }, { status: 500 });
  }
}
