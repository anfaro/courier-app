// app/api/mobile/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";
import { generateApiToken } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiToken = generateApiToken();
    const [newUser] = await db.insert(users).values({
      id: generateId(),
      name,
      email,
      password: hashedPassword,
      apiToken,
    }).returning();

    await logActivity({
      userId: newUser.id,
      userName: newUser.name || "New User",
      action: "USER_CREATED",
      details: `Mobile registration: ${email}`,
      targetId: newUser.id,
    });

    return NextResponse.json({
      token: apiToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "MobileRegistrationError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred during registration" }, { status: 500 });
  }
}
