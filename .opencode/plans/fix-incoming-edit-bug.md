# Fix: Incoming Edit Resets Delivery Statuses

## Bug Summary

Editing an incoming delivery causes non-pending deliveries (delivered/returned/rescheduled) to be deleted and re-inserted with `status: "pending"`, causing them to reappear in the pending list and breaking the progress bar.

## Files to Change

### 1. `app/api/sessions/[id]/incomings/[incomingId]/route.ts`

**Import change** (line 5):
```typescript
import { eq, and } from "drizzle-orm";
```

**Logic change** (lines 49-76): Replace the wholesale delete + insert with:
1. Fetch only existing **pending** deliveries for this incoming
2. Calculate package count from preserved non-pending deliveries
3. Delete only pending deliveries
4. Insert new deliveries from the form
5. Recalculate session totals by scanning all sessionDeliveries

Full new handler code:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";
import { logActivity, logServerAccess, logError } from "@/lib/logger";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; incomingId: string }> }) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    await logServerAccess(req, token);

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const incomingId = resolvedParams.incomingId;

    const existingSession = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!existingSession.length) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (existingSession[0].userId !== token.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const isSuperAdmin = (token as any)?.role === "superadmin";
    if (existingSession[0].finalized && !isSuperAdmin) {
      return NextResponse.json({ message: "Session is finalized" }, { status: 403 });
    }

    const existingIncoming = await db.select().from(incomings).where(eq(incomings.id, incomingId)).limit(1);
    if (!existingIncoming.length) return NextResponse.json({ message: "Incoming not found" }, { status: 404 });

    const body = await req.json();
    const { packages: packagesCount, customerAssignments } = body;

    if (!packagesCount || !customerAssignments || !Array.isArray(customerAssignments) || customerAssignments.length === 0) {
      return NextResponse.json({ message: "Packages count and customer assignments are required" }, { status: 400 });
    }

    const totalAssigned = customerAssignments.reduce((sum: number, a: any) => sum + (Number(a.packages) || 0), 0);
    if (totalAssigned !== Number(packagesCount)) {
      return NextResponse.json({ message: "Sum of assigned packages must match total packages count" }, { status: 400 });
    }

    for (const a of customerAssignments) {
      if (!a.customerId || !a.packages || Number(a.packages) < 1) {
        return NextResponse.json({ message: "Each assignment must have customerId and packages >= 1" }, { status: 400 });
      }
    }

    // Fetch only pending deliveries for this incoming (preserve non-pending)
    const allOldDeliveries = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.incomingId, incomingId));

    const nonPendingDeliveries = allOldDeliveries.filter(d => d.status !== "pending");
    const preservedPackages = nonPendingDeliveries.reduce((sum, d) => sum + Number(d.packages), 0);

    // Delete only pending deliveries
    await db.delete(sessionDeliveries)
      .where(and(
        eq(sessionDeliveries.incomingId, incomingId),
        eq(sessionDeliveries.status, "pending")
      ));

    // Insert new pending deliveries from the form
    const deliveryRows = customerAssignments.map((a: { customerId: string; packages: number }) => ({
      id: generateId(),
      sessionId,
      incomingId,
      customerId: a.customerId,
      packages: String(a.packages),
      status: "pending",
    }));

    await db.insert(sessionDeliveries).values(deliveryRows);

    // Update incoming's total packages (preserved non-pending + new pending)
    const newIncomingTotal = preservedPackages + Number(packagesCount);
    await db.update(incomings)
      .set({ packages: String(newIncomingTotal) })
      .where(eq(incomings.id, incomingId));

    // Recalculate session totals by scanning ALL deliveries in this session
    const allSessionDeliveries = await db.select().from(sessionDeliveries)
      .where(eq(sessionDeliveries.sessionId, sessionId));

    const newTotalPackages = allSessionDeliveries.reduce((sum, d) => sum + Number(d.packages), 0);
    const newDeliveredPackages = allSessionDeliveries
      .filter(d => d.status === "delivered")
      .reduce((sum, d) => sum + Number(d.packages), 0);

    await db.update(sessions)
      .set({
        totalPackages: String(newTotalPackages),
        deliveredPackages: String(newDeliveredPackages),
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    await logActivity({
      userId: token.id as string,
      userName: token.name as string,
      action: "INCOMING_UPDATED",
      details: `Updated incoming ${incomingId} with ${packagesCount} packages (${preservedPackages} preserved non-pending)`,
      targetId: sessionId,
    });

    return NextResponse.json({
      message: "Incoming updated",
      deliveriesCount: deliveryRows.length,
    }, { status: 200 });
  } catch (error) {
    await logError({
      errorName: "UpdateIncomingError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ message: "Failed to update incoming" }, { status: 500 });
  }
}
```

### 2. `app/progress/[sessionId]/page.tsx` (lines 622-625)

Change the edit pre-population to filter only pending deliveries and use actual package counts:

```typescript
onClick={() => {
  if (isFinalized && !isSuperAdmin) return;
  const assignments: Record<string, number> = {};
  (inc.deliveries || [])
    .filter((d: any) => d.status === "pending")
    .forEach((d: any) => {
      assignments[d.customerId] = (assignments[d.customerId] || 0) + Number(d.packages);
    });
  setCustomerAssignments(assignments);
  setEditingIncoming(inc);
  setShowIncomingModal(true);
}}
```
