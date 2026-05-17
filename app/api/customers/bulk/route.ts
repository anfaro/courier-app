// app/api/customers/bulk/route.ts
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { generateId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid format" }, { status: 400 });
    }

    const formattedData = body.map((item: any) => ({
      id: generateId(),
      name: item.name,
      phoneNumber: item.phoneNumber,
      address: item.address,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      housePictureUrl: item.housePictureUrl || null,
      notes: item.notes || null,
    }));

    const result = await db.insert(customers).values(formattedData).returning();

    if (token) {
      await logActivity({
        userId: token.id as string,
        userName: token.name as string,
        action: "CUSTOMER_CREATED",
        details: `Bulk added ${body.length} customers`,
      });
    }

    return NextResponse.json({
      message: `Successfully added ${body.length} customers`,
      customers: result,
    });

  } catch (error: any) {
    await logError({
      errorName: "BulkInsertError",
      errorMessage: error.message,
    });
    return NextResponse.json(
      { message: error.message || "Failed to process bulk upload." },
      { status: 500 }
    );
  }
}
