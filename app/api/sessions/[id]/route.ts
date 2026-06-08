import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
      with: {
        incomings: {
          orderBy: (incomings, { desc }) => [desc(incomings.time)],
          with: {
            deliveries: {
              with: {
                customer: true,
              },
            },
          },
        },
        deliveries: {
          orderBy: (sd, { desc }) => [desc(sd.createdAt)],
          with: {
            customer: true,
            incoming: true,
          },
        },
      },
    });

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
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();

    const existing = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!existing.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existing[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (body.finalized !== undefined) {
      if (body.finalized === true) {
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

    if (body.totalPackages !== undefined) {
      const val = String(body.totalPackages);
      if (val === "" || isNaN(Number(val))) {
        return NextResponse.json({ message: "Invalid totalPackages" }, { status: 400 });
      }
      updateData.totalPackages = val;
    }

    if (body.deliveredPackages !== undefined) {
      const val = String(body.deliveredPackages);
      if (val === "" || isNaN(Number(val))) {
        return NextResponse.json({ message: "Invalid deliveredPackages" }, { status: 400 });
      }
      updateData.deliveredPackages = val;
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
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
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
