// lib/gallery.ts

export function parseHousePictures(raw: string | null, primaryUrl: string | null): string[] {
  if (!raw && !primaryUrl) return [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return primaryUrl ? [primaryUrl] : [];
}

export function sanitizePhotoUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const u of urls) {
    if (!u) continue;
    const trimmed = u.trim();
    if (!/^https?:\/\//i.test(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    clean.push(trimmed);
  }
  return clean;
}

const RATIOS = ["3/4", "1/1", "4/5", "3/5", "9/16"] as const;

export function galleryAspectRatio(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return RATIOS[hash % RATIOS.length];
}

export function filterGalleryByName<T extends { name: string }>(
  customers: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((c) => c.name.toLowerCase().includes(q));
}