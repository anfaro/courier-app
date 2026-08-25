// app/api/gallery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { getCLIToken } from "@/lib/getCLIToken";
import { getCached, setCache } from "@/lib/cache";
import { parseHousePictures, sanitizePhotoUrls } from "@/lib/gallery";
import { logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 30, 60);
    const offset = Number(searchParams.get("offset")) || 0;

    const cacheKey = `gallery:${limit}:${offset}`;
    const cached = getCached<{ customers: any[]; hasMore: boolean; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
    }

    const rows = await db.select({
      id: customers.id,
      name: customers.name,
      phoneNumber: customers.phoneNumber,
      housePictureUrl: customers.housePictureUrl,
      housePictures: customers.housePictures,
      total: sql<number>`count(*) OVER() AS total`,
    })
      .from(customers)
      .where(sql`(${customers.housePictureUrl} IS NOT NULL OR ${customers.housePictures} IS NOT NULL)`)
      .orderBy(sql`${customers.name} ASC`)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    const customerList = rows
      .map((r) => {
        const photos = sanitizePhotoUrls(parseHousePictures(r.housePictures, r.housePictureUrl));
        return {
          id: r.id,
          name: r.name,
          phoneNumber: r.phoneNumber,
          housePictures: photos,
          photoCount: photos.length,
        };
      })
      .filter((c) => c.housePictures.length > 0);

    const total = rows[0]?.total ?? customerList.length;
    const body = { customers: customerList, hasMore, total };
    setCache(cacheKey, body, 15000);

    return NextResponse.json(body, { status: 200, headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    await logError({
      errorName: "FetchGalleryError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch gallery" }, { status: 500 });
  }
}