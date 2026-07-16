// app/api/settings/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logServerAccess, logActivity, logError } from "@/lib/logger";
import { settingsSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await logServerAccess(req, token);

    const user = await db
      .select({ name: users.name, email: users.email, rate: users.rate, targetSystem: users.targetSystem, getGeocode: users.getGeocode })
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
    const token = await getCLIToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await logServerAccess(req, token);
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.newName !== undefined) {
      updateData.name = parsed.data.newName;
    }

    if (parsed.data.rate !== undefined) {
      updateData.rate = parsed.data.rate;
    }

    if (parsed.data.targetSystem !== undefined) {
      updateData.targetSystem = parsed.data.targetSystem;
    }

    if (parsed.data.getGeocode !== undefined) {
      updateData.getGeocode = parsed.data.getGeocode;
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
