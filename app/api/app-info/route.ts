// app/api/app-info/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    const version = pkg.version || "0.0.0";

    let commit = "unknown";
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      commit = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    } else {
      commit = execSync("git rev-parse --short HEAD").toString().trim();
    }

    return NextResponse.json({ version, commit });
  } catch {
    return NextResponse.json({ version: "0.1.0", commit: "unknown" });
  }
}
