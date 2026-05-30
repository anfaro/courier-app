import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits, customers } from "@/lib/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    const customerExists = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { id: true },
    });
    if (!customerExists) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const allVisits = await db.query.visits.findMany({
      where: eq(visits.customerId, customerId),
      orderBy: [desc(visits.checkInAt)],
    });

    return NextResponse.json({ visits: allVisits }, { status: 200 });
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

    const customerExists = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { id: true, name: true },
    });
    if (!customerExists) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const existingOpenVisit = await db.query.visits.findFirst({
      where: and(eq(visits.customerId, customerId), isNull(visits.checkOutAt)),
    });
    if (existingOpenVisit) {
      return NextResponse.json({ message: "Customer already has an active visit. Check out first." }, { status: 409 });
    }

    const [newVisit] = await db.insert(visits).values({
      id: generateId(),
      customerId,
      userId: (token?.id as string) || "unknown",
      userName: (token?.name as string) || "Unknown User",
      checkInAt: new Date(),
      notes: notes || null,
    }).returning();

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "VISIT_CHECKED_IN",
        details: `Checked in at customer: ${customerExists.name}`,
        targetId: customerId,
      });
    }

    return NextResponse.json({ message: "Checked in successfully", visit: newVisit }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "CheckInVisitError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to check in" }, { status: 500 });
  }
}
