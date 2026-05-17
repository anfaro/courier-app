// lib/cache.ts
interface CacheEntry {
  data: unknown;
  expires: number;
}

const store = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (entry && Date.now() < entry.expires) {
    return entry.data as T;
  }
  store.delete(key);
  return undefined;
}

export function setCache(key: string, data: unknown, ttlMs = 15000): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function clearCache(pattern?: string): void {
  if (!pattern) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}
