import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { getCutoffPeriod, shiftPeriod, isCurrentPeriod, isAfterToday } from "@/lib/earnings";

describe("getCutoffPeriod", () => {
  test("days 7-20 map to Period A (7th-20th)", () => {
    const result = getCutoffPeriod(new Date("2026-07-15"));
    expect(result).toEqual({ start: "2026-07-07", end: "2026-07-20" });
  });

  test("day 7 is start of Period A", () => {
    const result = getCutoffPeriod(new Date("2026-07-07"));
    expect(result).toEqual({ start: "2026-07-07", end: "2026-07-20" });
  });

  test("day 20 is end of Period A", () => {
    const result = getCutoffPeriod(new Date("2026-07-20"));
    expect(result).toEqual({ start: "2026-07-07", end: "2026-07-20" });
  });

  test("days 21+ map to Period B (21st-6th)", () => {
    const result = getCutoffPeriod(new Date("2026-07-25"));
    expect(result).toEqual({ start: "2026-07-21", end: "2026-08-06" });
  });

  test("day 21 is start of Period B", () => {
    const result = getCutoffPeriod(new Date("2026-07-21"));
    expect(result).toEqual({ start: "2026-07-21", end: "2026-08-06" });
  });

  test("day 31 maps to Period B", () => {
    const result = getCutoffPeriod(new Date("2026-07-31"));
    expect(result).toEqual({ start: "2026-07-21", end: "2026-08-06" });
  });

  test("days 1-6 map to previous Period B", () => {
    const result = getCutoffPeriod(new Date("2026-07-05"));
    expect(result).toEqual({ start: "2026-06-21", end: "2026-07-06" });
  });

  test("day 6 is end of previous Period B", () => {
    const result = getCutoffPeriod(new Date("2026-07-06"));
    expect(result).toEqual({ start: "2026-06-21", end: "2026-07-06" });
  });

  test("day 1 maps to previous Period B", () => {
    const result = getCutoffPeriod(new Date("2026-07-01"));
    expect(result).toEqual({ start: "2026-06-21", end: "2026-07-06" });
  });

  test("December-January year boundary in Period B", () => {
    const result = getCutoffPeriod(new Date("2026-12-25"));
    expect(result).toEqual({ start: "2026-12-21", end: "2027-01-06" });
  });

  test("January 1-6 maps to previous December Period B (year rollback)", () => {
    const result = getCutoffPeriod(new Date("2027-01-03"));
    expect(result).toEqual({ start: "2026-12-21", end: "2027-01-06" });
  });

  test("January 7 maps to Period A of same month", () => {
    const result = getCutoffPeriod(new Date("2027-01-07"));
    expect(result).toEqual({ start: "2027-01-07", end: "2027-01-20" });
  });
});

describe("shiftPeriod", () => {
  test("shifts Period A to previous Period B", () => {
    const result = shiftPeriod("2026-07-07", "2026-07-20", "prev");
    expect(result).toEqual({ start: "2026-06-21", end: "2026-07-06" });
  });

  test("shifts Period A to next Period B", () => {
    const result = shiftPeriod("2026-07-07", "2026-07-20", "next");
    expect(result).toEqual({ start: "2026-07-21", end: "2026-08-06" });
  });

  test("shifts Period B to previous Period A", () => {
    const result = shiftPeriod("2026-07-21", "2026-08-06", "prev");
    expect(result).toEqual({ start: "2026-07-07", end: "2026-07-20" });
  });

  test("shifts Period B to next Period A", () => {
    const result = shiftPeriod("2026-07-21", "2026-08-06", "next");
    expect(result).toEqual({ start: "2026-08-07", end: "2026-08-20" });
  });

  test("handles year rollback in shiftPeriod A ← prev", () => {
    const result = shiftPeriod("2026-01-07", "2026-01-20", "prev");
    expect(result).toEqual({ start: "2025-12-21", end: "2026-01-06" });
  });

  test("handles year rollover in shiftPeriod B → next", () => {
    // Period B Dec 21 → Jan 6. Next Period A starts Jan 7 of the next year.
    const periodBStart = "2026-12-21";
    const periodBEnd = "2027-01-06";
    // shiftPeriod uses start date to determine current period
    const result = shiftPeriod("2026-12-21", "2027-01-06", "next");
    // Going "next" from Period B should yield the next Period A
    // The start date Dec 21 is day 21, so it's Period B → next → Period A
    expect(result).toEqual({ start: "2027-01-07", end: "2027-01-20" });
  });
});

describe("isCurrentPeriod", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test("returns true when today is within period", () => {
    vi.setSystemTime(new Date("2026-07-15"));
    expect(isCurrentPeriod("2026-07-07", "2026-07-20")).toBe(true);
  });

  test("returns false when today is before period", () => {
    vi.setSystemTime(new Date("2026-07-01"));
    expect(isCurrentPeriod("2026-07-07", "2026-07-20")).toBe(false);
  });

  test("returns false when today is after period", () => {
    vi.setSystemTime(new Date("2026-07-25"));
    expect(isCurrentPeriod("2026-07-07", "2026-07-20")).toBe(false);
  });

  test("returns true on start boundary", () => {
    vi.setSystemTime(new Date("2026-07-07"));
    expect(isCurrentPeriod("2026-07-07", "2026-07-20")).toBe(true);
  });

  test("returns true on end boundary", () => {
    vi.setSystemTime(new Date("2026-07-20"));
    expect(isCurrentPeriod("2026-07-07", "2026-07-20")).toBe(true);
  });
});

describe("isAfterToday", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test("returns true for future date", () => {
    vi.setSystemTime(new Date("2026-07-15"));
    expect(isAfterToday("2026-07-20")).toBe(true);
  });

  test("returns false for past date", () => {
    vi.setSystemTime(new Date("2026-07-15"));
    expect(isAfterToday("2026-07-10")).toBe(false);
  });

  test("returns false for today", () => {
    vi.setSystemTime(new Date("2026-07-15"));
    expect(isAfterToday("2026-07-15")).toBe(false);
  });
});
