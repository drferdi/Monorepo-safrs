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

export type PrefetchEntry = { status: 'pending' } | { status: 'done'; result: EngineResult };

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

export function resetPrefetchMemory(): void {
  entries.clear();
}
