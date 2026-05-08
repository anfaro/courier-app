// app/api/admin/clusters/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { clusters } from "@/lib/schema";
import { inArray } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "Bad Request" }, { status: 400 });

    await db.delete(clusters).where(inArray(clusters.id, ids));
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
