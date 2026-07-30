import { NextRequest, NextResponse } from "next/server";
import { getCLIToken } from "@/lib/getCLIToken";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getCLIToken(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const recentSessions = await db.query.sessions.findMany({
      where: eq(sessions.userId, token.id as string),
      orderBy: [desc(sessions.date), desc(sessions.createdAt)],
      limit: 5,
      with: {
        incomings: {
          with: {
            deliveries: {
              with: {
                customer: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    const result = recentSessions.map((s) => ({
      id: s.id,
      date: s.date,
      totalPackages: s.totalPackages,
      finalized: s.finalized,
      incomings: s.incomings.map((inc) => ({
        id: inc.id,
        time: inc.time,
        packages: inc.packages,
        deliveries: inc.deliveries.map((d) => ({
          customerId: d.customerId,
          customerName: d.customer?.name || "Unknown",
          packages: d.packages,
        })),
      })),
    }));

    return NextResponse.json({ sessions: result }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "FetchRecentSessionsError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to fetch recent sessions" }, { status: 500 });
  }
}
