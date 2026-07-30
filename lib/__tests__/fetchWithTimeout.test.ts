import { describe, expect, test, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  test("resolves when fetch completes before timeout", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("https://example.com", {}, 5000);
    expect(result.status).toBe(200);
  });

  test("rejects when timeout exceeds", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, opts: any) => new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
      })
    );

    await expect(fetchWithTimeout("https://example.com", {}, 10)).rejects.toThrow("Aborted");
  }, 10000);

  test("calls clearTimeout on successful fetch", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));

    await fetchWithTimeout("https://example.com", {}, 5000);
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test("works without options", async () => {
    const mockResponse = new Response("ok");
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("https://example.com");
    expect(result.status).toBe(200);
  });
});
