// app/api/settings/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logServerAccess, logActivity, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await logServerAccess(req, token);

    const user = await db
      .select({ name: users.name, email: users.email, rate: users.rate, targetSystem: users.targetSystem })
      .from(users)
      .where(eq(users.id, token.id as string))
      .limit(1);

    if (!user.length) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user[0], { status: 200 });
  } catch (error) {
    await logError({
      errorName: "SettingsFetchError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred fetching settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await logServerAccess(req, token);
    const { newName, rate, targetSystem } = await req.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (newName !== undefined) {
      if (!newName) {
        return NextResponse.json({ message: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = newName;
    }

    if (rate !== undefined) {
      const parsed = Number(rate);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json({ message: "Invalid rate value" }, { status: 400 });
      }
      updateData.rate = parsed;
    }

    if (targetSystem !== undefined) {
      updateData.targetSystem = Boolean(targetSystem);
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, token.id as string));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_UPDATED",
      details: `Settings updated: ${Object.keys(updateData).filter(k => k !== 'updatedAt').join(", ")}`,
      targetId: token.id as string
    });

    return NextResponse.json({ message: "Settings updated successfully" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "SettingsUpdateError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "An error occurred updating settings" }, { status: 500 });
  }
}
