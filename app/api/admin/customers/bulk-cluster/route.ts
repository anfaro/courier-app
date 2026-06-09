import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { customerClusters } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logServerAccess, logActivity, logError } from "@/lib/logger";

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role as string) !== "superadmin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    await logServerAccess(req, token);

    const body = await req.json();
    const { customerIds, clusterId, action } = body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ message: "customerIds array is required" }, { status: 400 });
    }
    if (!clusterId) {
      return NextResponse.json({ message: "clusterId is required" }, { status: 400 });
    }
    if (action !== "add" && action !== "remove") {
      return NextResponse.json({ message: "action must be 'add' or 'remove'" }, { status: 400 });
    }

    if (action === "add") {
      for (const customerId of customerIds) {
        await db
          .insert(customerClusters)
          .values({ customerId, clusterId })
          .onConflictDoNothing();
      }
    } else {
      await db
        .delete(customerClusters)
        .where(
          and(
            inArray(customerClusters.customerId, customerIds),
            eq(customerClusters.clusterId, clusterId),
          )
        );
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: `BULK_CLUSTER_${action.toUpperCase()}`,
      details: `${action === "add" ? "Assigned" : "Removed"} ${customerIds.length} customers ${action === "add" ? "to" : "from"} cluster ${clusterId}`,
    });

    return NextResponse.json({ message: `Customers ${action === "add" ? "added to" : "removed from"} cluster` });
  } catch (error) {
    await logError({
      errorName: "BulkClusterError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update cluster assignments" }, { status: 500 });
  }
}
