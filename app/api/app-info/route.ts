import { NextResponse } from "next/server";
import { APP_VERSION, getCommitHash } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const commit = await getCommitHash();
    return NextResponse.json({ version: APP_VERSION, commit });
  } catch {
    return NextResponse.json({ version: APP_VERSION, commit: "unknown" });
  }
}
