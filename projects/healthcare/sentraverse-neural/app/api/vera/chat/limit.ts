// Each visitor (by client IP) gets MESSAGE_LIMIT messages per 24 hours. The counter lives in
// Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN) so it survives cold starts and is shared
// across instances; only a hash of the IP is stored. Without the store, or when it cannot be
// reached, each server instance keeps a best-effort count in memory instead.
import { createHash } from 'node:crypto';

export const MESSAGE_LIMIT = 10;
const WINDOW_S = 24 * 60 * 60;
const memory = new Map<string, { count: number; resetAt: number }>();

type Store = { url: string; token: string } | null;

function storeFromEnv(): Store {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

const resultOf = (entry: unknown) => (entry && typeof entry === 'object' && 'result' in entry ? entry.result : undefined);

function takeFromMemory(visitor: string, now: number): number | null {
  if (memory.size > 5000) {
    for (const [key, entry] of memory) if (entry.resetAt <= now) memory.delete(key);
  }
  const entry = memory.get(visitor);
  if (!entry || entry.resetAt <= now) {
    memory.set(visitor, { count: 1, resetAt: now + WINDOW_S * 1000 });
    return null;
  }
  if (entry.count >= MESSAGE_LIMIT) return Math.ceil((entry.resetAt - now) / 1000);
  entry.count += 1;
  return null;
}

/** Counts one message; returns the seconds until the visitor may send again, or null when allowed. */
export async function takeMessage(visitor: string, now = Date.now(), store: Store = storeFromEnv(), fetchFn: typeof fetch = fetch): Promise<number | null> {
  if (store) {
    try {
      const key = `vera:msgs:${createHash('sha256').update(visitor).digest('hex').slice(0, 32)}`;
      const response = await fetchFn(`${store.url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${store.token}` },
        body: JSON.stringify([['SET', key, '0', 'EX', String(WINDOW_S), 'NX'], ['INCR', key], ['TTL', key]]),
        signal: AbortSignal.timeout(2000),
      });
      const body: unknown = response.ok ? await response.json() : null;
      if (Array.isArray(body)) {
        const count = resultOf(body[1]);
        const ttl = resultOf(body[2]);
        if (typeof count === 'number' && typeof ttl === 'number') return count > MESSAGE_LIMIT ? Math.max(ttl, 1) : null;
      }
    } catch {
      // Store unreachable: fall back to this instance's memory below.
    }
  }
  return takeFromMemory(visitor, now);
}
