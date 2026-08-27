// app/api/gallery/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { parseHousePictures, sanitizePhotoUrls } from "@/lib/gallery";
import { getCached, setCache } from "@/lib/cache";
import { logServerAccess, logError } from "@/lib/logger";

const CACHE_KEY = "gallery:analytics";
const CACHE_TTL = 300000; // 5 minutes

async function checkUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkUrlsBatch(urls: string[], concurrency = 10): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const checks = await Promise.all(batch.map(async (url) => {
      const ok = await checkUrl(url);
      return { url, ok };
    }));
    for (const { url, ok } of checks) {
      results.set(url, ok);
    }
  }
  return results;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    await logServerAccess(req, token);

    const cached = getCached<{ total: number; withPhotos: number; brokenUrls: number; noPhotos: number }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rows = await db.select({
      id: customers.id,
      housePictureUrl: customers.housePictureUrl,
      housePictures: customers.housePictures,
    }).from(customers);

    const total = rows.length;

    const candidates: { id: string; firstUrl: string }[] = [];
    let noPhotos = 0;

    for (const row of rows) {
      const photos = sanitizePhotoUrls(parseHousePictures(row.housePictures, row.housePictureUrl));
      if (photos.length === 0) {
        noPhotos++;
      } else {
        candidates.push({ id: row.id, firstUrl: photos[0] });
      }
    }

    const uniqueUrls = [...new Set(candidates.map((c) => c.firstUrl))];
    const urlResults = await checkUrlsBatch(uniqueUrls);

    let withPhotos = 0;
    let brokenUrls = 0;

    for (const candidate of candidates) {
      if (urlResults.get(candidate.firstUrl)) {
        withPhotos++;
      } else {
        brokenUrls++;
      }
    }

    const result = { total, withPhotos, brokenUrls, noPhotos };
    setCache(CACHE_KEY, result, CACHE_TTL);

    return NextResponse.json(result);
  } catch (error) {
    await logError({
      errorName: "GalleryAnalyticsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch analytics" }, { status: 500 });
  }
}
