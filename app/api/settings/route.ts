import { logServerAccess } from "@/lib/logger";
// app/api/settings/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const { email, newName } = await req.json();

    if (!email || !newName) {
      return NextResponse.json({ message: "Email and new name are required" }, { status: 400 });
    }

    await db.update(users)
      .set({ 
        name: newName,
        updatedAt: new Date()
      })
      .where(eq(users.email, email));

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "USER_UPDATED",
        details: `User updated display name to: ${newName}`,
        targetId: token.id?.toString()
      });
    }

    return NextResponse.json({ message: "Profile updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ message: "An error occurred updating the profile" }, { status: 500 });
  }
}
