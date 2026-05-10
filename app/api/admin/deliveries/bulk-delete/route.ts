// app/api/admin/deliveries/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { logActivity, logServerAccess } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    await db.delete(deliveries).where(inArray(deliveries.id, ids));

    await logActivity({
      userId: token.id as number,
      userName: token.name as string,
      action: "DELIVERY_DELETED",
      details: `Bulk deleted ${ids.length} waybills.`,
    });

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
