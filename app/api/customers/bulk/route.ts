import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid format" }, { status: 400 });
    }

    // MAP the frontend keys to the schema keys explicitly 
    // to avoid the "Failed Query" mismatch
    const formattedData = body.map((item: any) => ({
      name: item.name,
      phoneNumber: item.phoneNumber, // Drizzle will map this to phone_number
      address: item.address,
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      housePictureUrl: item.housePictureUrl || null,
      notes: item.notes || null,
    }));

    const result = await db.insert(customers).values(formattedData);

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

