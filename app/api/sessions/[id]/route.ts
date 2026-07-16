import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";
import { sessionUpdateSchema } from "@/lib/validation";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const [sessionRows, incomingsRows, deliveriesRows] = await Promise.all([
      db.select().from(sessions).where(eq(sessions.id, id)).limit(1),
      db.query.incomings.findMany({
        where: eq(incomings.sessionId, id),
        orderBy: (i, { desc }) => [desc(i.time)],
        with: {
          deliveries: true,
        },
      }),
      db.query.sessionDeliveries.findMany({
        where: eq(sessionDeliveries.sessionId, id),
        orderBy: (sd, { desc }) => [desc(sd.createdAt)],
        with: {
          customer: true,
          incoming: true,
        },
      }),
    ]);

    if (!sessionRows.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    const session = { ...sessionRows[0], incomings: incomingsRows, deliveries: deliveriesRows };

    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (session.userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchSessionError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const parsed = sessionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!existing.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (body.finalized !== undefined) {
      if (body.finalized) {
        await db.update(sessions)
          .set({ finalized: true, updatedAt: new Date() })
          .where(eq(sessions.id, id));

        await logActivity({
          userId: token.id as string,
          userName: token.name as string,
          action: "SESSION_FINALIZED",
          details: `Finalized session ${id}`,
          targetId: id,
        });

        return NextResponse.json({ message: "Session finalized" }, { status: 200 });
      } else if (!isSuperAdmin) {
        return NextResponse.json({ message: "Only superadmin can unfinalize" }, { status: 403 });
      } else {
        await db.update(sessions)
          .set({ finalized: false, updatedAt: new Date() })
          .where(eq(sessions.id, id));

        await logActivity({
          userId: token.id as string,
          userName: token.name as string,
          action: "SESSION_UNFINALIZED",
          details: `Unfinalized session ${id}`,
          targetId: id,
        });

        return NextResponse.json({ message: "Session unfinalized" }, { status: 200 });
      }
    }

    if (existing[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (parsed.data.totalPackages !== undefined) {
      updateData.totalPackages = String(parsed.data.totalPackages);
    }

    if (parsed.data.deliveredPackages !== undefined) {
      updateData.deliveredPackages = String(parsed.data.deliveredPackages);
    }

    if (parsed.data.date !== undefined) {
      updateData.date = parsed.data.date;
    }

    await db.update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "SESSION_UPDATED",
      details: `Updated session ${id}`,
      targetId: id,
    });

    return NextResponse.json({ message: "Session updated" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateSessionError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const existing = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!existing.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existing[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    await db.delete(sessions).where(eq(sessions.id, id));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "SESSION_DELETED",
      details: `Deleted session ${id}`,
      targetId: id,
    });

    return NextResponse.json({ message: "Session deleted" }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "DeleteSessionError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to delete session" }, { status: 500 });
  }
}
