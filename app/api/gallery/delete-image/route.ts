// app/api/gallery/delete-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { parseHousePictures } from "@/lib/gallery";
import { clearCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const body = await req.json();
    const { customerId, imageUrl } = body;

    if (!customerId || !imageUrl) {
      return NextResponse.json({ message: "customerId and imageUrl are required" }, { status: 400 });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    const currentPhotos = parseHousePictures(customer.housePictures, customer.housePictureUrl);
    const updatedPhotos = currentPhotos.filter((url) => url !== imageUrl);

    await db.update(customers)
      .set({
        housePictureUrl: updatedPhotos[0] || null,
        housePictures: updatedPhotos.length > 0 ? JSON.stringify(updatedPhotos) : null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "IMAGE_REMOVED",
      details: `Removed image from customer ${customer.name}`,
      targetId: customerId,
    });

    clearCache("gallery:");

    return NextResponse.json({ photos: updatedPhotos }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteImageError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete image" }, { status: 500 });
  }
}
