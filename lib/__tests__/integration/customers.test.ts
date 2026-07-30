import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { createTestDb, destroyTestDb } from "../helpers/test-db";
import { customers, clusters, customerClusters } from "@/lib/schema";
import { generateId } from "@/lib/utils";
import { eq, sql, inArray } from "drizzle-orm";

let client: any;
let db: any;

beforeAll(async () => {
  const testDb = await createTestDb();
  client = testDb.client;
  db = testDb.db;
});

afterAll(async () => {
  await destroyTestDb(client);
});

describe("customers CRUD", () => {
  const customerId = generateId();

  test("creates a customer", async () => {
    await db.insert(customers).values({
      id: customerId,
      name: "Budi Santoso",
      phoneNumber: "08123456789",
      address: "Jl. Merdeka No. 123, Jakarta",
      latitude: "-6.2",
      longitude: "106.8",
      landmark: "Near Al-Hidayah mosque",
      accessInfo: "Green gate, alleyway",
      notes: "Regular customer, prefers morning delivery",
    });

    const result = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Budi Santoso");
    expect(result[0].phoneNumber).toBe("08123456789");
    expect(result[0].address).toBe("Jl. Merdeka No. 123, Jakarta");
    expect(result[0].landmark).toBe("Near Al-Hidayah mosque");
    expect(result[0].createdAt).toBeTruthy();
  });

  test("queries customer by name with ILIKE", async () => {
    const result = await db.select().from(customers)
      .where(sql`${customers.name} ILIKE ${"%budi%"}`)
      .limit(5);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Budi Santoso");
  });

  test("queries customer by phone with ILIKE", async () => {
    const result = await db.select().from(customers)
      .where(sql`${customers.phoneNumber} ILIKE ${"%0812%"}`)
      .limit(5);
    expect(result).toHaveLength(1);
  });

  test("queries customer by address with ILIKE", async () => {
    const result = await db.select().from(customers)
      .where(sql`${customers.address} ILIKE ${"%merdeka%"}`)
      .limit(5);
    expect(result).toHaveLength(1);
  });

  test("queries customer by landmark with ILIKE", async () => {
    const result = await db.select().from(customers)
      .where(sql`${customers.landmark} ILIKE ${"%mosque%"}`)
      .limit(5);
    expect(result).toHaveLength(1);
  });

  test("updates customer details", async () => {
    await db.update(customers)
      .set({ phoneNumber: "08765432198", landmark: "Behind the market" })
      .where(eq(customers.id, customerId));

    const result = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    expect(result[0].phoneNumber).toBe("08765432198");
    expect(result[0].landmark).toBe("Behind the market");
  });

  test("creates multiple customers and lists them", async () => {
    const ids = [generateId(), generateId()];
    await db.insert(customers).values([
      { id: ids[0], name: "Siti Nurhaliza", address: "Jl. Sudirman No. 45" },
      { id: ids[1], name: "Ahmad Dhani", address: "Jl. Gatot Subroto No. 78" },
    ]);

    const result = await db.select().from(customers).where(inArray(customers.id, ids));
    expect(result).toHaveLength(2);
  });

  test("deletes a customer", async () => {
    const deleteId = generateId();
    await db.insert(customers).values({ id: deleteId, name: "Temp", address: "Jl. Delete" });
    await db.delete(customers).where(eq(customers.id, deleteId));

    const result = await db.select().from(customers).where(eq(customers.id, deleteId));
    expect(result).toHaveLength(0);
  });
});

describe("customer cluster assignments", () => {
  const customerId = generateId();
  const clusterId = generateId();
  const clusterId2 = generateId();

  test("creates clusters", async () => {
    await db.insert(clusters).values([
      { id: clusterId, name: "Cluster A - North Jakarta" },
      { id: clusterId2, name: "Cluster B - South Jakarta" },
    ]);

    const result = await db.select().from(clusters).where(inArray(clusters.id, [clusterId, clusterId2]));
    expect(result).toHaveLength(2);
  });

  test("assigns customer to clusters", async () => {
    await db.insert(customers).values({ id: customerId, name: "Test Customer", address: "Jl. Test" });
    await db.insert(customerClusters).values([
      { customerId, clusterId },
      { customerId, clusterId: clusterId2 },
    ]);

    const links = await db.select().from(customerClusters).where(eq(customerClusters.customerId, customerId));
    expect(links).toHaveLength(2);
  });

  test("cascading delete removes cluster links", async () => {
    await db.delete(customers).where(eq(customers.id, customerId));

    const links = await db.select().from(customerClusters).where(eq(customerClusters.customerId, customerId));
    expect(links).toHaveLength(0);
  });
});

describe("customers with GPS pins", () => {
  test("stores coordinates as text", async () => {
    const id = generateId();
    await db.insert(customers).values({
      id,
      name: "GPS Customer",
      address: "Jl. GPS",
      latitude: "-6.21462",
      longitude: "106.84513",
    });

    const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    expect(result[0].latitude).toBe("-6.21462");
    expect(result[0].longitude).toBe("106.84513");
    expect(typeof result[0].latitude).toBe("string");
  });

  test("filters customers with GPS pins", async () => {
    const withGps = await db.select().from(customers)
      .where(sql`${customers.latitude} IS NOT NULL AND ${customers.longitude} IS NOT NULL`);
    expect(withGps.length).toBeGreaterThanOrEqual(1);
  });
});
