// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, newName } = await req.json();

    if (!email || !newName) {
      return NextResponse.json({ message: "Email and new name are required" }, { status: 400 });
    }

    // Update the user's name in the database where the email matches
    await db
      .update(users)
      .set({ name: newName })
      .where(eq(users.email, email));

    return NextResponse.json({ message: "Profile updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ message: "An error occurred updating the profile" }, { status: 500 });
  }
}

