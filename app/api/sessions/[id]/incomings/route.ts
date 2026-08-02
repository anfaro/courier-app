import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { clearCache } from "@/lib/cache";
import { incomingCreateSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;

    const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existing.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existing[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = incomingCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { packages: packagesCount, customerAssignments } = parsed.data;
    const pkgCount = packagesCount ? Number(packagesCount) : 0;

    const now = new Date();
    const [sy, sm, sd] = existing[0].date.split("-").map(Number);
    now.setFullYear(sy, sm - 1, sd);
    const [incoming] = await db.insert(incomings).values({
      id: generateId(),
      sessionId,
      time: now,
      packages: String(pkgCount),
    }).returning();

    let deliveryRows: any[] = [];
    if (customerAssignments.length > 0) {
      deliveryRows = customerAssignments.map((a: { customerId: string; packages: number }) => ({
        id: generateId(),
        sessionId,
        incomingId: incoming.id,
        customerId: a.customerId,
        packages: String(a.packages),
        status: "pending",
      }));
      await db.insert(sessionDeliveries).values(deliveryRows);

      const prevTotal = Number(existing[0].totalPackages) || 0;
      await db.update(sessions)
        .set({
          totalPackages: String(prevTotal + pkgCount),
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId));
    }

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "INCOMING_ADDED",
      details: `Added incoming with ${packagesCount} packages to session ${sessionId}`,
      targetId: sessionId,
    });

    clearCache("/api/dashboard");

    return NextResponse.json({
      message: "Incoming recorded",
      incoming,
      deliveriesCount: deliveryRows.length,
    }, { status: 201 });
  } catch (error) {
    await logError({
      errorName: "AddIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to add incoming" }, { status: 500 });
  }
}
