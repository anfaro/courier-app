import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getDbStatus, updateDbConfig, resetToEnvVar, saveProfile, deleteProfile, applyProfile } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const status = await getDbStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to get status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Delete profile
    if (body.deleteProfile) {
      if (!body.name) return NextResponse.json({ error: "Profile name required" }, { status: 400 });
      await deleteProfile(body.name);
      return NextResponse.json({ message: `Profile "${body.name}" deleted.` });
    }

    // Apply profile (load and connect)
    if (body.applyProfile) {
      if (!body.name) return NextResponse.json({ error: "Profile name required" }, { status: 400 });
      await applyProfile(body.name);
      const status = await getDbStatus();
      return NextResponse.json({ message: `Profile "${body.name}" applied and hot-reloaded.`, status });
    }

    // Save a standalone profile (no connect)
    if (body.saveToProfiles) {
      if (!body.name) return NextResponse.json({ error: "Profile name required" }, { status: 400 });
      if (!body.config) return NextResponse.json({ error: "Profile config required" }, { status: 400 });
      await saveProfile(body.name, body.config);
      return NextResponse.json({ message: `Profile "${body.name}" saved.` });
    }

    // Save and connect (existing behavior, optionally save as profile)
    if (!body.host && !body.databaseUrl) {
      return NextResponse.json({ error: "Provide host + database or databaseUrl" }, { status: 400 });
    }

    await updateDbConfig(body);

    if (body.profileName) {
      await saveProfile(body.profileName, body);
    }

    const status = await getDbStatus();
    return NextResponse.json({ message: "Connection updated and hot-reloaded.", status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update config" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.name) {
      await deleteProfile(body.name);
      return NextResponse.json({ message: `Profile "${body.name}" deleted.` });
    }

    await resetToEnvVar();

    const status = await getDbStatus();
    return NextResponse.json({ message: "Reset to DATABASE_URL env var.", status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reset" }, { status: 500 });
  }
}
