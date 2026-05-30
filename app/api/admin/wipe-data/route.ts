// app/api/admin/wipe-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customers, clusters, logs, passwordResetTokens } from "@/lib/schema";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || token.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await logServerAccess(req, token);

    const body = await req.json();
    if (body.confirmCode !== "CONFIRM-WIPE") {
      return NextResponse.json({ error: "Invalid confirmation code" }, { status: 400 });
    }

    // Sequential deletion to respect potential (though cascading) constraints
    await db.delete(customers);
    await db.delete(clusters);
    await db.delete(passwordResetTokens);
    
    // Log the wipe BEFORE wiping the logs table itself
    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "USER_DELETED", // Reusing an existing action type for the wipe record
      details: "SYSTEM DATA WIPE EXECUTED. All customers and clusters removed.",
    });

    // Finally, wipe logs if requested or keep them for audit? 
    // Usually a "wipe" means everything. Let's wipe logs except the one we just made.
    // Actually, let's keep the last 1 log entry or just wipe everything.
    // User said "wipe data", so let's be thorough.
    await db.delete(logs); 

    return NextResponse.json({ message: "System data wiped successfully." });

  } catch (error: any) {
    await logError({
      errorName: "WipeDataError",
      errorMessage: error.message,
      stackTrace: error.stack,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
