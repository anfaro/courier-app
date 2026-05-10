// app/api/admin/system/logs/record-error/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { name, message, stack, pathname } = await req.json();

    await logError({
      userId: token?.id ? parseInt(token.id as string) : undefined,
      userName: token?.name as string,
      errorName: name,
      errorMessage: message,
      stackTrace: stack,
      pathname
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
