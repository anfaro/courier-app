// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const body = await req.json();
    const { name, email, password, role } = body;

    const validRoles = ["courier", "dispatcher", "hubmanager", "superadmin"];

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role selected" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      id: generateId(),
      name,
      email,
      password: hashedPassword,
      role,
    }).returning();

    // Log the activity
    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_CREATED",
      details: `Created user ${name} (${email}) with role ${role}`,
      targetId: newUser.id
    });

    // Return the new user (excluding password)
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });

  } catch (error: any) {
    await logError({
      errorName: "UserCreationError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
