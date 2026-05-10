import { logServerAccess } from "@/lib/logger";
// app/api/customers/bulk/route.ts
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { logActivity } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token) await logServerAccess(req, token);
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid format" }, { status: 400 });
    }

    const formattedData = body.map((item: any) => ({
      name: item.name,
      phoneNumber: item.phoneNumber,
      address: item.address,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      housePictureUrl: item.housePictureUrl || null,
      notes: item.notes || null,
    }));

    const result = await db.insert(customers).values(formattedData);

    if (token) {
      await logActivity({
        userId: token.id as number,
        userName: token.name as string,
        action: "CUSTOMER_CREATED",
        details: `Bulk added ${body.length} customers`,
      });
    }

    return NextResponse.json({
      message: `Successfully added ${body.length} customers`,
      result
    });

  } catch (error: any) {
    console.error("Bulk Insert Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to process bulk upload." },
      { status: 500 }
    );
  }
}
