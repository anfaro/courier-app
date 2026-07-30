import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { getCached, setCache, clearCache } from "@/lib/cache";

beforeEach(() => {
  clearCache();
});

describe("setCache / getCached", () => {
  test("stores and retrieves a value", () => {
    setCache("key1", { data: 42 });
    expect(getCached("key1")).toEqual({ data: 42 });
  });

  test("returns undefined for non-existent key", () => {
    expect(getCached("nonexistent")).toBeUndefined();
  });

  test("stores different types", () => {
    setCache("str", "hello");
    setCache("num", 123);
    setCache("arr", [1, 2, 3]);
    expect(getCached("str")).toBe("hello");
    expect(getCached("num")).toBe(123);
    expect(getCached("arr")).toEqual([1, 2, 3]);
  });

  test("overwrites existing key", () => {
    setCache("key", "old");
    setCache("key", "new");
    expect(getCached("key")).toBe("new");
  });
});

describe("TTL expiration", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test("returns value before TTL expires", () => {
    setCache("key", "value", 10000);
    vi.advanceTimersByTime(5000);
    expect(getCached("key")).toBe("value");
  });

  test("returns undefined after TTL expires", () => {
    setCache("key", "value", 10000);
    vi.advanceTimersByTime(10001);
    expect(getCached("key")).toBeUndefined();
  });

  test("uses default TTL of 15000ms", () => {
    setCache("key", "value");
    vi.advanceTimersByTime(15001);
    expect(getCached("key")).toBeUndefined();
  });
});

describe("clearCache", () => {
  test("clears all keys when called without pattern", () => {
    setCache("a", 1);
    setCache("b", 2);
    clearCache();
    expect(getCached("a")).toBeUndefined();
    expect(getCached("b")).toBeUndefined();
  });

  test("clears keys matching pattern", () => {
    setCache("user:1", "alice");
    setCache("user:2", "bob");
    setCache("config", "dark");
    clearCache("user");
    expect(getCached("user:1")).toBeUndefined();
    expect(getCached("user:2")).toBeUndefined();
    expect(getCached("config")).toBe("dark");
  });

  test("pattern match is substring-based", () => {
    setCache("abc", 1);
    setCache("xyz", 2);
    clearCache("ab");
    expect(getCached("abc")).toBeUndefined();
    expect(getCached("xyz")).toBe(2);
  });
});
