import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);

    const userId = (token?.id as string) || "";
    const allTrips = userId
      ? await db.query.trips.findMany({
          where: eq(trips.userId, userId),
          orderBy: [desc(trips.createdAt)],
          limit: 50,
        })
      : [];

    return NextResponse.json({ trips: allTrips }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchTripsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await logServerAccess(req, token);

    const body = await req.json();
    const { name, customerIds, startLat, startLng, startAddress, totalDistance, totalDuration, routeGeometry, stopCount } = body;

    if (!name || !customerIds || customerIds.length === 0) {
      return NextResponse.json({ message: "Name and customer IDs are required" }, { status: 400 });
    }

    const [newTrip] = await db.insert(trips).values({
      id: generateId(),
      name,
      userId: token.id as string,
      userName: token.name as string,
      customerIds: JSON.stringify(customerIds),
      startLat: startLat ? String(startLat) : null,
      startLng: startLng ? String(startLng) : null,
      startAddress: startAddress || null,
      totalDistance: totalDistance ? String(totalDistance) : null,
      totalDuration: totalDuration ? String(totalDuration) : null,
      routeGeometry: routeGeometry ? JSON.stringify(routeGeometry) : null,
      stopCount: stopCount ? String(stopCount) : null,
    }).returning();

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "TRIP_CREATED",
      details: `Saved route: ${name} (${stopCount || customerIds.length} stops)`,
      targetId: newTrip.id,
    });

    return NextResponse.json({ message: "Route saved", trip: newTrip }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "SaveTripError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to save route" }, { status: 500 });
  }
}
