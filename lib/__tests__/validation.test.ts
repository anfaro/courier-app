import { describe, expect, test } from "vitest";
import {
  loginSchema,
  registerSchema,
  customerSchema,
  sessionCreateSchema,
  sessionUpdateSchema,
  incomingCreateSchema,
  deliveryStatusSchema,
  clusterSchema,
  settingsSchema,
} from "@/lib/validation";

describe("loginSchema", () => {
  test("accepts valid login", () => {
    expect(loginSchema.safeParse({ usernameOrEmail: "admin", password: "secret" }).success).toBe(true);
  });

  test("rejects empty usernameOrEmail", () => {
    const result = loginSchema.safeParse({ usernameOrEmail: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  test("rejects empty password", () => {
    const result = loginSchema.safeParse({ usernameOrEmail: "admin", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = { name: "John", email: "john@test.com", password: "password123" };

  test("accepts valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects short password", () => {
    const result = registerSchema.safeParse({ ...valid, password: "123" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  test("rejects empty name", () => {
    const result = registerSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });
});

describe("customerSchema", () => {
  const valid = { name: "Budi", address: "Jl. Merdeka No. 1" };

  test("accepts valid customer", () => {
    expect(customerSchema.safeParse(valid).success).toBe(true);
  });

  test("accepts optional fields", () => {
    const result = customerSchema.safeParse({
      ...valid,
      phoneNumber: "08123456789",
      latitude: "-6.2",
      longitude: "106.8",
      landmark: "Near mosque",
      accessInfo: "Green gate",
      notes: "Regular customer",
      housePictures: ["https://example.com/pic1.jpg"],
      clusterIds: ["abc123"],
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing name", () => {
    const result = customerSchema.safeParse({ address: "Jl. Sudirman" });
    expect(result.success).toBe(false);
  });

  test("rejects missing address", () => {
    const result = customerSchema.safeParse({ name: "Budi" });
    expect(result.success).toBe(false);
  });

  test("accepts null lat/lng", () => {
    const result = customerSchema.safeParse({ ...valid, latitude: null, longitude: null });
    expect(result.success).toBe(true);
  });
});

describe("sessionCreateSchema", () => {
  test("accepts empty body", () => {
    expect(sessionCreateSchema.safeParse({}).success).toBe(true);
  });

  test("accepts optional date", () => {
    expect(sessionCreateSchema.safeParse({ date: "2026-07-30" }).success).toBe(true);
  });
});

describe("sessionUpdateSchema", () => {
  test("accepts partial update", () => {
    expect(sessionUpdateSchema.safeParse({ finalized: true }).success).toBe(true);
  });

  test("accepts all fields", () => {
    const result = sessionUpdateSchema.safeParse({
      finalized: false,
      date: "2026-07-30",
      totalPackages: "10",
      deliveredPackages: "5",
    });
    expect(result.success).toBe(true);
  });
});

describe("incomingCreateSchema", () => {
  test("accepts empty body", () => {
    expect(incomingCreateSchema.safeParse({}).success).toBe(true);
  });

  test("accepts customer assignments", () => {
    const result = incomingCreateSchema.safeParse({
      packages: "5",
      customerAssignments: [
        { customerId: "c1", packages: "2" },
        { customerId: "c2", packages: "3" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("transforms packages number to string", () => {
    const result = incomingCreateSchema.safeParse({ packages: 5 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.packages).toBe("5");
  });
});

describe("deliveryStatusSchema", () => {
  test("accepts valid status", () => {
    expect(deliveryStatusSchema.safeParse({ status: "delivered" }).success).toBe(true);
    expect(deliveryStatusSchema.safeParse({ status: "returned" }).success).toBe(true);
    expect(deliveryStatusSchema.safeParse({ status: "rescheduled" }).success).toBe(true);
    expect(deliveryStatusSchema.safeParse({ status: "pending" }).success).toBe(true);
  });

  test("rejects invalid status", () => {
    const result = deliveryStatusSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });

  test("accepts optional splitCount", () => {
    expect(deliveryStatusSchema.safeParse({ status: "pending", splitCount: 3 }).success).toBe(true);
  });

  test("accepts optional coordinates", () => {
    expect(deliveryStatusSchema.safeParse({ status: "delivered", latitude: "-6.2", longitude: "106.8" }).success).toBe(true);
  });
});

describe("clusterSchema", () => {
  test("accepts valid cluster", () => {
    expect(clusterSchema.safeParse({ name: "Cluster A" }).success).toBe(true);
  });

  test("accepts notes", () => {
    expect(clusterSchema.safeParse({ name: "Cluster A", notes: "Near market" }).success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = clusterSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("settingsSchema", () => {
  test("accepts empty body", () => {
    expect(settingsSchema.safeParse({}).success).toBe(true);
  });

  test("accepts valid fields", () => {
    const result = settingsSchema.safeParse({
      newName: "John",
      rate: 2000,
      targetSystem: true,
      getGeocode: false,
    });
    expect(result.success).toBe(true);
  });

  test("rejects negative rate", () => {
    const result = settingsSchema.safeParse({ rate: -1 });
    expect(result.success).toBe(false);
  });
});
