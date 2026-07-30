import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { createTestDb, destroyTestDb } from "../helpers/test-db";
import { users, customers, sessions, incomings, sessionDeliveries } from "@/lib/schema";
import { generateId } from "@/lib/utils";
import { eq, sql, and } from "drizzle-orm";

let client: any;
let db: any;
let userId: string;
let customerIds: string[];

beforeAll(async () => {
  const testDb = await createTestDb();
  client = testDb.client;
  db = testDb.db;

  userId = generateId();
  await db.insert(users).values({
    id: userId, name: "Test Courier", email: "test@courier.com", password: "hashed123",
  });

  customerIds = [generateId(), generateId()];
  await db.insert(customers).values([
    { id: customerIds[0], name: "Customer A", address: "Jl. A No. 1" },
    { id: customerIds[1], name: "Customer B", address: "Jl. B No. 2" },
  ]);
});

afterAll(async () => {
  await destroyTestDb(client);
});

describe("session lifecycle", () => {
  const sessionId = generateId();
  const incomingId = generateId();
  const deliveryIds = [generateId(), generateId()];

  test("creates a session", async () => {
    await db.insert(sessions).values({
      id: sessionId,
      userId,
      date: "2026-07-30",
      totalPackages: "0",
      deliveredPackages: "0",
      finalized: false,
    });

    const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-07-30");
    expect(result[0].finalized).toBe(false);
  });

  test("adds an incoming to the session", async () => {
    await db.insert(incomings).values({
      id: incomingId,
      sessionId,
      time: new Date("2026-07-30T08:00:00"),
      packages: "5",
    });

    const result = await db.select().from(incomings).where(eq(incomings.sessionId, sessionId));
    expect(result).toHaveLength(1);
    expect(result[0].packages).toBe("5");
  });

  test("adds deliveries to the incoming", async () => {
    await db.insert(sessionDeliveries).values([
      { id: deliveryIds[0], sessionId, incomingId, customerId: customerIds[0], packages: "3", status: "pending" },
      { id: deliveryIds[1], sessionId, incomingId, customerId: customerIds[1], packages: "2", status: "pending" },
    ]);

    const result = await db.select().from(sessionDeliveries)
      .where(and(eq(sessionDeliveries.sessionId, sessionId), eq(sessionDeliveries.incomingId, incomingId)));
    expect(result).toHaveLength(2);
  });

  test("updates delivery status to delivered", async () => {
    await db.update(sessionDeliveries)
      .set({ status: "delivered" })
      .where(eq(sessionDeliveries.id, deliveryIds[0]));

    const result = await db.select().from(sessionDeliveries).where(eq(sessionDeliveries.id, deliveryIds[0])).limit(1);
    expect(result[0].status).toBe("delivered");

    const pending = await db.select().from(sessionDeliveries)
      .where(and(eq(sessionDeliveries.sessionId, sessionId), eq(sessionDeliveries.status, "pending")));
    expect(pending).toHaveLength(1);
  });

  test("updates delivery status to returned", async () => {
    await db.update(sessionDeliveries)
      .set({ status: "returned" })
      .where(eq(sessionDeliveries.id, deliveryIds[1]));

    const result = await db.select().from(sessionDeliveries).where(eq(sessionDeliveries.id, deliveryIds[1])).limit(1);
    expect(result[0].status).toBe("returned");
  });

  test("finalizes the session", async () => {
    await db.update(sessions)
      .set({ finalized: true })
      .where(eq(sessions.id, sessionId));

    const result = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    expect(result[0].finalized).toBe(true);
  });

  test("queries session deliveries", async () => {
    const sdel = await db.select().from(sessionDeliveries).where(eq(sessionDeliveries.sessionId, sessionId));
    expect(sdel).toHaveLength(2);

    const inc = await db.select().from(incomings).where(eq(incomings.sessionId, sessionId));
    expect(inc).toHaveLength(1);
  });

  test("counts sessions with aggregate query", async () => {
    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM sessions WHERE user_id = ${userId}`
    );
    const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
    expect(Number(rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
