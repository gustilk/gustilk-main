/**
 * Lightweight in-process TTL cache.
 *
 * Each entry stores the value + an absolute expiry timestamp. A single
 * setInterval sweeps expired entries every 2 minutes to prevent unbounded
 * memory growth.  No external dependencies needed.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

// Periodic GC — removes entries that have already expired.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 2 * 60 * 1000).unref();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDel(key: string): void {
  store.delete(key);
}

/** Delete all keys that start with `prefix`. */
export function cacheDelPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const TTL = {
  USER:        120_000,  // 2 min  — user objects (busted on every write)
  DISCOVER:    300_000,  // 5 min  — discover profiles (busted on like/dislike/update)
  MATCHES:      90_000,  // 90 s   — match list (busted on new message/block/match)
  MATCH:       120_000,  // 2 min  — individual match record
  EVENTS:      300_000,  // 5 min  — events list (rarely changes)
  ADMIN_STATS:  60_000,  // 60 s   — dashboard COUNT queries
  VERIF:        60_000,  // 60 s   — pending verifications list
};
