// app/api/customers/bulk/route.ts
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { NextResponse, NextRequest } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { clearCache } from "@/lib/cache";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid format" }, { status: 400 });
    }

    const formattedData = body.map((item: any) => {
      const photos = item.housePictures && Array.isArray(item.housePictures) ? item.housePictures : [];
      return {
        id: generateId(),
        name: item.name,
        phoneNumber: item.phoneNumber,
        address: item.address,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        housePictureUrl: item.housePictureUrl || photos[0] || null,
        housePictures: photos.length > 0 ? JSON.stringify(photos) : null,
        landmark: item.landmark || null,
        accessInfo: item.accessInfo || null,
        notes: item.notes || null,
      };
    });

    const result = await db.insert(customers).values(formattedData).returning();

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "CUSTOMER_CREATED",
      details: `Bulk added ${body.length} customers`,
    });

    clearCache("/api/customers");
    clearCache("/api/dashboard");

    return NextResponse.json({
      message: `Successfully added ${body.length} customers`,
      customers: result,
    });

  } catch (error) {
    await logError({
      errorName: "BulkInsertError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { message: "Failed to process bulk upload." },
      { status: 500 }
    );
  }
}
