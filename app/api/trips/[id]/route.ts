import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const resolvedParams = await params;
    const tripId = resolvedParams.id;

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });
    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchTripError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await logServerAccess(req, token);
    const resolvedParams = await params;
    const tripId = resolvedParams.id;

    const trip = await db.query.trips.findFirst({
      where: eq(trips.id, tripId),
    });
    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }
    if (trip.userId !== (token.id as string) && token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(trips).where(eq(trips.id, tripId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "TRIP_DELETED",
      details: `Deleted saved route: ${trip.name}`,
      targetId: tripId,
    });

    return NextResponse.json({ message: "Trip deleted" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteTripError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete trip" }, { status: 500 });
  }
}
