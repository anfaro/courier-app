import { describe, expect, test } from "vitest";
import { parseHousePictures, galleryAspectRatio, filterGalleryByName, sanitizePhotoUrls } from "@/lib/gallery";

describe("parseHousePictures", () => {
  test("returns [] when nothing is given", () => {
    expect(parseHousePictures(null, null)).toEqual([]);
  });

  test("parses a valid JSON array", () => {
    const raw = JSON.stringify(["https://a/img1.jpg", "https://a/img2.jpg"]);
    expect(parseHousePictures(raw, "https://primary.jpg")).toEqual([
      "https://a/img1.jpg",
      "https://a/img2.jpg",
    ]);
  });

  test("falls back to the primary URL for non-array JSON", () => {
    expect(parseHousePictures('"not-an-array"', "https://primary.jpg")).toEqual(["https://primary.jpg"]);
  });

  test("falls back to the primary URL for invalid JSON", () => {
    expect(parseHousePictures("{broken", "https://primary.jpg")).toEqual(["https://primary.jpg"]);
  });

  test("uses primary URL when raw is null", () => {
    expect(parseHousePictures(null, "https://primary.jpg")).toEqual(["https://primary.jpg"]);
  });

  test("falls back to primary URL when the array is empty", () => {
    expect(parseHousePictures("[]", "https://primary.jpg")).toEqual(["https://primary.jpg"]);
  });
});

describe("galleryAspectRatio", () => {
  const VALID = ["3/4", "1/1", "4/5", "3/5", "9/16"];

  test("is deterministic for the same id", () => {
    expect(galleryAspectRatio("abc1234")).toBe(galleryAspectRatio("abc1234"));
  });

  test("always returns a valid ratio", () => {
    for (const id of ["a", "abcdefg", "1234567", "XYZ1234", "g-000"] ) {
      expect(VALID).toContain(galleryAspectRatio(id));
    }
  });
});

describe("sanitizePhotoUrls", () => {
  test("keeps only http(s) urls and trims whitespace", () => {
    expect(sanitizePhotoUrls(["  https://a/img1.jpg  ", "ftp://bad", "javascript:alert(1)", "not-a-url"])).toEqual([
      "https://a/img1.jpg",
    ]);
  });

  test("drops empty strings and null-ish values", () => {
    expect(sanitizePhotoUrls(["", "   ", "https://ok/x.png"])).toEqual(["https://ok/x.png"]);
  });

  test("dedupes repeated urls", () => {
    expect(sanitizePhotoUrls(["https://a/x.png", "https://a/x.png", "http://a/x.png"])).toEqual([
      "https://a/x.png",
      "http://a/x.png",
    ]);
  });

  test("returns [] for empty input", () => {
    expect(sanitizePhotoUrls([])).toEqual([]);
  });
});

describe("filterGalleryByName", () => {
  const customers = [{ name: "Budi Santoso" }, { name: "Ani Wijaya" }, { name: "Siti Aminah" }];

  test("returns everything for an empty query", () => {
    expect(filterGalleryByName(customers, "")).toHaveLength(3);
    expect(filterGalleryByName(customers, "   ")).toHaveLength(3);
  });

  test("filters case-insensitively", () => {
    expect(filterGalleryByName(customers, "BUDI")).toHaveLength(1);
    expect(filterGalleryByName(customers, "santoso")).toHaveLength(1);
  });

  test("matches partial names", () => {
    expect(filterGalleryByName(customers, "Sit")).toHaveLength(1);
  });

  test("returns no matches for an unknown name", () => {
    expect(filterGalleryByName(customers, "zzz")).toEqual([]);
  });
});