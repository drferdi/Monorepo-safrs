/**
 * In-memory stand-in for `lib/rag/icd10-db.ts`, used only by tests and the benchmark runner.
 *
 * The production database is IndexedDB, which Node does not provide. Tests replace the module
 * with this one (`vi.mock('@/lib/rag/icd10-db', ...)`) and seed it through the production
 * `ICD10Loader.loadFromArray`, so the legacy engine's ICD-10 validation and display-name lookup
 * follow the same code path as in the extension.
 *
 * @module lib/diagnosis-engine/testing/memory-icd10-db
 */

import type { ICD10Entry, RAGDatabaseStats, RAGDatabaseStatus } from '@/lib/rag/types';

const entries = new Map<string, ICD10Entry>();
const metadata = new Map<string, string>();

export const icd10DB = {
  async init(): Promise<void> {},
  async getByCode(code: string): Promise<ICD10Entry | null> {
    return entries.get(code.toUpperCase()) ?? null;
  },
  async getByCodes(codes: string[]): Promise<ICD10Entry[]> {
    return codes
      .map((code) => entries.get(code.toUpperCase()))
      .filter((entry): entry is ICD10Entry => Boolean(entry));
  },
  async exists(code: string): Promise<boolean> {
    return entries.has(code.toUpperCase());
  },
  async bulkPut(list: ICD10Entry[]): Promise<number> {
    for (const entry of list) entries.set(entry.code.toUpperCase(), entry);
    return list.length;
  },
  async clear(): Promise<void> {
    entries.clear();
    metadata.clear();
  },
  async count(): Promise<number> {
    return entries.size;
  },
  async setMetadata(key: string, value: string): Promise<void> {
    metadata.set(key, value);
  },
  async getMetadata(key: string): Promise<string | null> {
    return metadata.get(key) ?? null;
  },
  async getStatus(): Promise<RAGDatabaseStatus> {
    return { ready: entries.size > 0, entry_count: entries.size, version: 1, last_updated: '' };
  },
  async getStats(): Promise<RAGDatabaseStats> {
    const leafCodes = [...entries.values()].filter((entry) => entry.code.includes('.')).length;
    return {
      total_entries: entries.size,
      leaf_codes: leafCodes,
      header_codes: entries.size - leafCodes,
      chapters: 0,
      keywords_indexed: 0,
      size_bytes: 0,
    };
  },
};

export async function initICD10Database(): Promise<RAGDatabaseStatus> {
  return icd10DB.getStatus();
}

export async function isICD10DatabaseReady(): Promise<boolean> {
  return entries.size > 0;
}
