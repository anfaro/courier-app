import { describe, expect, test } from "vitest";
import { generateId } from "@/lib/utils";

describe("generateId", () => {
  test("returns a 7-character string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id).toHaveLength(7);
  });

  test("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  test("uses alphanumeric characters only", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9A-Za-z]+$/);
  });

  test("no two consecutive IDs are the same", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});
