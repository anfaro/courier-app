import { describe, expect, test } from "vitest";
import { APP_VERSION, getCommitHash } from "@/lib/version";

describe("APP_VERSION", () => {
  test("matches package.json version", () => {
    const pkg = require("../../package.json");
    expect(APP_VERSION).toBe(pkg.version);
  });

  test("is a string", () => {
    expect(typeof APP_VERSION).toBe("string");
  });
});

describe("getCommitHash", () => {
  const OLD_ENV = process.env;

  test('returns "dev" when VERCEL_GIT_COMMIT_SHA is not set', () => {
    expect(getCommitHash()).toBe("dev");
  });

  test('returns 7-char hash when VERCEL_GIT_COMMIT_SHA is set', () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
    expect(getCommitHash()).toBe("abcdef1");
    expect(getCommitHash()).toHaveLength(7);
  });
});
