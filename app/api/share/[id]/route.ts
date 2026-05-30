// app/api/share/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const data = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: { clusters: { with: { cluster: true } } },
    });

    if (!data) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      housePictureUrl: data.housePictureUrl,
      notes: data.notes,
      clusters: data.clusters,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch customer" }, { status: 500 });
  }
}
