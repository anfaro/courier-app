import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const { id: customerId, visitId } = resolvedParams;
    const body = await req.json();
    const { notes } = body;

    const existingVisit = await db.query.visits.findFirst({
      where: eq(visits.id, visitId),
    });
    if (!existingVisit) {
      return NextResponse.json({ message: "Visit not found" }, { status: 404 });
    }
    if (existingVisit.checkOutAt) {
      return NextResponse.json({ message: "Visit already checked out" }, { status: 409 });
    }

    const [updatedVisit] = await db.update(visits)
      .set({
        checkOutAt: new Date(),
        notes: notes !== undefined ? notes : existingVisit.notes,
      })
      .where(eq(visits.id, visitId))
      .returning();

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "VISIT_CHECKED_OUT",
        details: `Checked out from customer visit`,
        targetId: customerId,
      });
    }

    return NextResponse.json({ message: "Checked out successfully", visit: updatedVisit }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "CheckOutVisitError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to check out" }, { status: 500 });
  }
}
