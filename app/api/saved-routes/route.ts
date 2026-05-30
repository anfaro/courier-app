import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { savedRoutes } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const routes = await db
      .select()
      .from(savedRoutes)
      .where(eq(savedRoutes.userId, token.id as string))
      .orderBy(desc(savedRoutes.createdAt))
      .limit(50);

    return NextResponse.json({ routes });
  } catch (error) {
    await logError({
      errorName: "FetchSavedRoutesError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch saved routes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (token) await logServerAccess(req, token);

    const body = await req.json();
    const { name, customerIds, startLat, startLng, endLat, endLng } = body;

    if (!name || !customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ message: "Name and customer IDs are required" }, { status: 400 });
    }

    const route = {
      id: generateId(),
      userId: token.id as string,
      name: name.trim(),
      customerIds: JSON.stringify(customerIds),
      startLat: startLat ?? null,
      startLng: startLng ?? null,
      endLat: endLat ?? null,
      endLng: endLng ?? null,
    };

    await db.insert(savedRoutes).values(route);

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "SaveRouteError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to save route" }, { status: 500 });
  }
}
