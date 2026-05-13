// app/api/admin/system/logs/record-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logAccess } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname, method } = await req.json();
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    await logAccess({
      userId: token?.id as string | undefined,
      userName: token?.name as string,
      pathname,
      method,
      ipAddress: ip,
      userAgent
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
