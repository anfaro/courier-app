// app/api/admin/system/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logError } from "@/lib/logger";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const DATA_DIR = process.env.VERCEL ? "/tmp/data" : path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "db-settings.json");

async function readSettings(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeSettings(settings: Record<string, string>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await readSettings();

    // Merge with current env values as defaults
    return NextResponse.json({
      database: settings.database || process.env.DATABASE || "",
      host: settings.host || process.env.HOST || "",
      port: settings.port || process.env.PORT || "5432",
      user: settings.user || process.env.USER || "",
      password: settings.password ? "••••••" : "",
      hasPassword: !!settings.password,
      databaseUrl: settings.databaseUrl || process.env.DATABASE_URL || "",
    });
  } catch (error: any) {
    await logError({ errorName: "SettingsReadError", errorMessage: error.message });
    return NextResponse.json({ error: "Failed to read settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const settings = await readSettings();

    if (body.databaseUrl !== undefined) settings.databaseUrl = body.databaseUrl;
    if (body.host !== undefined) settings.host = body.host;
    if (body.port !== undefined) settings.port = body.port;
    if (body.database !== undefined) settings.database = body.database;
    if (body.user !== undefined) settings.user = body.user;
    if (body.password !== undefined) settings.password = body.password;

    await writeSettings(settings);

    return NextResponse.json({ message: "Settings saved. Restart the server to apply changes." });
  } catch (error: any) {
    await logError({ errorName: "SettingsWriteError", errorMessage: error.message });
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
