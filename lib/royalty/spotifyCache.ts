// In-memory cache + exponential backoff retry for Spotify API calls.
// Cache TTL is 10 minutes — enough to survive repeated dashboard refreshes without
// burning through Spotify's rate limits.

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

/** Calls fn(), retrying up to maxRetries times on Spotify 429.
 *  Honors the Retry-After header value if present; otherwise uses exponential backoff. */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  let backoff = 2000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const is429 = String(e?.message ?? "").includes("429");
      if (is429 && attempt < maxRetries) {
        // Use Retry-After from Spotify if available (in seconds), else exponential backoff
        const retryAfterMs = e?.retryAfter ? e.retryAfter * 1000 : backoff;
        await new Promise((r) => setTimeout(r, retryAfterMs));
        backoff = Math.min(backoff * 2, 30_000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}
