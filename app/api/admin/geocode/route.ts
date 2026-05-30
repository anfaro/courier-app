import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq, or, isNull, sql } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "CourierSuperApp/1.0 (courier-app)";
const RATE_LIMIT_DELAY = 1100;

async function geocodeAddress(address: string): Promise<{ lat: string; lng: string } | null> {
  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return { lat: data[0].lat, lng: data[0].lon };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const ungeocoded = await db.query.customers.findMany({
      where: or(
        isNull(customers.latitude),
        isNull(customers.longitude),
        eq(customers.latitude, ""),
        eq(customers.longitude, ""),
      ),
      columns: { id: true, address: true, latitude: true, longitude: true },
    });

    if (ungeocoded.length === 0) {
      return NextResponse.json({ message: "All customers already have coordinates", processed: 0, total: 0 }, { status: 200 });
    }

    let successCount = 0;
    const errors: { id: string; address: string; error: string }[] = [];

    for (let i = 0; i < ungeocoded.length; i++) {
      const customer = ungeocoded[i];
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      const coords = await geocodeAddress(customer.address);
      if (coords) {
        await db.update(customers)
          .set({ latitude: coords.lat, longitude: coords.lng })
          .where(eq(customers.id, customer.id));
        successCount++;
      } else {
        errors.push({ id: customer.id, address: customer.address, error: "No coordinates found" });
      }
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "GEOCODE_BULK",
      details: `Geocoded ${successCount}/${ungeocoded.length} customers`,
    });

    return NextResponse.json({
      message: `Geocoded ${successCount} of ${ungeocoded.length} customers`,
      processed: successCount,
      total: ungeocoded.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 200 });
  } catch (error: any) {
    await logError({
      errorName: "BulkGeocodeError",
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
