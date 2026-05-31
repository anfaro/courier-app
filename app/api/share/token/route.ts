import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return NextResponse.json({ message: "Customer ID is required" }, { status: 400 });
    }

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });

    if (!customer) {
      return NextResponse.json({ message: "Customer not found" }, { status: 404 });
    }

    if (customer.shareToken && customer.shareTokenExpiresAt) {
      const expiresAt = new Date(customer.shareTokenExpiresAt);
      if (expiresAt > new Date()) {
        return NextResponse.json({ shareToken: customer.shareToken });
      }
    }

    const shareToken = crypto.randomBytes(8).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await db.update(customers)
      .set({ shareToken, shareTokenExpiresAt: expiresAt })
      .where(eq(customers.id, customerId));

    return NextResponse.json({ shareToken });
  } catch (error) {
    return NextResponse.json({ message: "Failed to generate share token" }, { status: 500 });
  }
}
