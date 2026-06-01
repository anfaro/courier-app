
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
      },
    });

    const finalUrl = response.url;

    // PATTERN 1: The "Data" pattern found in your screenshot (!3dLAT!4dLNG)
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return NextResponse.json({ lat: dataMatch[1], lng: dataMatch[2] });
    }

    // PATTERN 2: Standard /@lat,lng
    const standardMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (standardMatch) {
      return NextResponse.json({ lat: standardMatch[1], lng: standardMatch[2] });
    }

    // PATTERN 3: Query params ?q=lat,lng
    const urlObj = new URL(finalUrl);
    const q = urlObj.searchParams.get("q") || urlObj.searchParams.get("ll");
    if (q && q.includes(",")) {
      const [lat, lng] = q.split(",");
      return NextResponse.json({ lat: lat.trim(), lng: lng.trim() });
    }

    // PATTERN 4: Fallback to HTML body meta tags
    const html = await response.text();
    const metaMatch = html.match(/ll=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
    if (metaMatch) {
      return NextResponse.json({ lat: metaMatch[1], lng: metaMatch[2] });
    }

    // PATTERN 5: Query params in the original or final URL (destination, query, api-1)
    for (const u of [url, finalUrl]) {
      try {
        const parsed = new URL(u);
        const param = parsed.searchParams.get("destination") || parsed.searchParams.get("query");
        if (param && param.includes(",")) {
          const [lat, lng] = param.split(",");
          return NextResponse.json({ lat: lat.trim(), lng: lng.trim() });
        }
      } catch {}
    }

    return NextResponse.json({
      error: "Could not find coordinates in the generated Google URL.",
      debugUrl: finalUrl
    }, { status: 422 });

  } catch (error) {
    await logError({
      errorName: "ResolveMapsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to connect to Google" }, { status: 500 });
  }
}

