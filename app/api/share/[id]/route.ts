import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, id),
      with: {
        clusters: {
          with: {
            cluster: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch customer" }, { status: 500 });
  }
}
