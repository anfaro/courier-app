// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const { id } = await params;
    const body = await req.json();
    const { role, password } = body;

    const userId = id;

    const updateData: any = {};
    if (role) {
      const validRoles = ["courier", "dispatcher", "hubmanager", "superadmin"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.tokenVersion = sql`token_version + 1`;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No data provided for update" }, { status: 400 });
    }

    updateData.updatedAt = new Date();

    await db.update(users).set(updateData).where(eq(users.id, userId));

    // Log activity
    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_UPDATED",
      details: `Updated user (ID: ${userId}) with fields: ${Object.keys(updateData).join(", ")}`,
      targetId: userId
    });

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: any) {
    await logError({
      errorName: "UserUpdateError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const { id } = await params;
    const userId = id;

    // Prevent deleting yourself
    if (token.sub && token.sub === userId) {
        return NextResponse.json({ error: "You cannot delete yourself." }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, userId));

    // Log activity
    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_DELETED",
      details: `Deleted user (ID: ${userId})`,
      targetId: userId
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    await logError({
      errorName: "UserDeleteError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
