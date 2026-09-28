/**
 * In-memory map of MIRA prefetches by request hash, shared by `mira-prefetch.ts` (which fills it)
 * and `run-diagnosis.ts` (which reads it). Its only import is type-only, from the import-free
 * `types.ts`, so `run-diagnosis.ts` can read it without importing `mira-prefetch.ts` (which
 * imports `run-diagnosis.ts`). Lives for one service-worker lifetime.
 *
 * @module lib/diagnosis-engine/prefetch-store
 */
import type { EngineResult } from './types';

/** `storage.local` key the background writes once per finished prefetch: `{ hash, at }`. */
export const MIRA_PREFETCH_READY_KEY = 'sentra:mira-prefetch-ready';

/** Upper bound for a candidate engine, whatever its own client timeout is. */
export const CANDIDATE_TIMEOUT_MS = 20_000;

/**
 * How long the diagnosis page waits for the ready record before asking again anyway (the ready
 * write can fail, or the service worker can stop mid-step): the candidate bound plus a margin.
 */
export const PREFETCH_FALLBACK_MS = CANDIDATE_TIMEOUT_MS + 5_000;

/**
 * Keyed by the request hash; `caseKey` is the hash of the full case (request plus the encounter's
 * conditions, allergies and pregnancy), so an entry only serves the patient it was made for.
 */
export type PrefetchEntry =
  | { status: 'pending'; caseKey: string }
  | { status: 'done'; caseKey: string; result: EngineResult };

const MAX_ENTRIES = 20;
const entries = new Map<string, PrefetchEntry>();

export function peekPrefetch(hash: string): PrefetchEntry | undefined {
  return entries.get(hash);
}

/** Stores the entry as the newest one and drops the oldest past `MAX_ENTRIES`. */
export function rememberPrefetch(hash: string, entry: PrefetchEntry): void {
  entries.delete(hash);
  entries.set(hash, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
}

export function forgetPrefetch(hash: string): void {
  entries.delete(hash);
}

export function resetPrefetchMemory(): void {
  entries.clear();
}
