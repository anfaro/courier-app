import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { savedRoutes } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { logServerAccess, logError } from "@/lib/logger";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (token) await logServerAccess(req, token);

    const resolvedParams = await params;
    const id = resolvedParams.id;

    await db
      .delete(savedRoutes)
      .where(and(eq(savedRoutes.id, id), eq(savedRoutes.userId, token.id as string)));

    return NextResponse.json({ message: "Route deleted" });
  } catch (error) {
    await logError({
      errorName: "DeleteSavedRouteError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete route" }, { status: 500 });
  }
}
