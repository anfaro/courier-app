// app/api/admin/customers/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";
import { inArray } from "drizzle-orm";
import { logActivity, logServerAccess } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  try {
    // 1. SECURITY FORTRESS: Decrypt the session token directly from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // 2. BOUNCER CHECK: Are they logged in AND a superadmin?
    if (!token || token.role !== "superadmin") {
      console.warn(`Unauthorized bulk delete attempt by: ${token?.email || 'Unknown'}`);
      return NextResponse.json(
        { error: "Forbidden: Only Superadmins can perform bulk deletions." },
        { status: 403 }
      );
    }

    await logServerAccess(req, token);

    // 3. Extract the IDs from the incoming request body
    const body = await req.json();
    const { ids } = body;

    // Validate the data
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Bad Request: No customer IDs provided." },
        { status: 400 }
      );
    }

    // 4. THE EXECUTION: Tell Drizzle to delete all records where the ID is in our array
    await db.delete(customers).where(inArray(customers.id, ids));

    // 5. LOG THE ACTIVITY
    await logActivity({
      userId: token.id as number,
      userName: token.name as string,
      action: "CUSTOMER_DELETED",
      details: `Bulk deleted ${ids.length} customers and their linked data.`,
    });

    // 6. Success!
    return NextResponse.json(
      { message: `Successfully deleted ${ids.length} customers.` },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal Server Error while deleting records." },
      { status: 500 }
    );
  }
}
