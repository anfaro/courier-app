import { NextRequest, NextResponse } from "next/server";
import { APP_VERSION, getCommitHash } from "@/lib/version";
import { getCLIToken } from "@/lib/getCLIToken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = await getCLIToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ version: APP_VERSION, commit: getCommitHash() });
}
