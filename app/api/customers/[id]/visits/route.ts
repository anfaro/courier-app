import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customerVisits } from "@/lib/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logServerAccess, logActivity, logError } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const visits = await db
      .select()
      .from(customerVisits)
      .where(eq(customerVisits.customerId, id))
      .orderBy(desc(customerVisits.visitedAt))
      .limit(50);

    const activeVisits = await db
      .select()
      .from(customerVisits)
      .where(and(eq(customerVisits.customerId, id), isNull(customerVisits.checkedOutAt)))
      .orderBy(desc(customerVisits.visitedAt))
      .limit(1);

    return NextResponse.json({ visits, activeVisit: activeVisits[0] || null });
  } catch (error) {
    await logError({
      errorName: "FetchVisitsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch visits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const resolvedParams = await params;
    const customerId = resolvedParams.id;
    const body = await req.json();
    const { notes } = body;

    const visit = {
      id: generateId(),
      customerId,
      userId: (token?.id as string) || null,
      userName: (token?.name as string) || null,
      visitedAt: new Date(),
      checkedOutAt: null,
      notes: notes || null,
    };

    await db.insert(customerVisits).values(visit);

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_CHECKED_IN",
        details: `Checked in at customer ${customerId}${notes ? `: ${notes}` : ""}`,
        targetId: customerId,
      });
    }

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "RecordVisitError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to check in" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    const activeVisits = await db
      .select()
      .from(customerVisits)
      .where(and(eq(customerVisits.customerId, customerId), isNull(customerVisits.checkedOutAt)))
      .orderBy(desc(customerVisits.visitedAt))
      .limit(1);

    const activeVisit = activeVisits[0];
    if (!activeVisit) {
      return NextResponse.json({ message: "No active visit found" }, { status: 404 });
    }

    const now = new Date();
    await db
      .update(customerVisits)
      .set({ checkedOutAt: now })
      .where(eq(customerVisits.id, activeVisit.id));

    if (token) {
      const duration = Math.round((now.getTime() - new Date(activeVisit.visitedAt).getTime()) / 60000);
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_CHECKED_OUT",
        details: `Checked out at customer ${customerId} (${duration} min visit)`,
        targetId: customerId,
      });
    }

    return NextResponse.json({ ...activeVisit, checkedOutAt: now });
  } catch (error) {
    await logError({
      errorName: "CheckOutError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to check out" }, { status: 500 });
  }
}
