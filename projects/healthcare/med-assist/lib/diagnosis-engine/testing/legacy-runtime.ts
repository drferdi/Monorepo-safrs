/**
 * Node runtime for the legacy diagnosis engine, used by the golden tests and the Gate 1
 * benchmark runner. Never imported by extension code.
 *
 * It provides what the service worker normally provides:
 * - `fetch` for the bundled reference data (`/data/*.json`), served from `public/data/`;
 * - an in-memory `browser.storage.local` with no OpenAI key, so the LLM rerank is skipped and
 *   the output is deterministic (KB-only);
 * - the ICD-10 lookup, seeded through the production loader.
 *
 * Callers must also replace `@/lib/rag/icd10-db` with `./memory-icd10-db` via `vi.mock`.
 *
 * @module lib/diagnosis-engine/testing/legacy-runtime
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { vi } from 'vitest';

import { ICD10Loader } from '@/lib/rag/icd10-loader';
import type { PenyakitRawData } from '@/lib/rag/types';

const PUBLIC_DATA_DIR = resolve(__dirname, '../../../public/data');

function readPublicData(fileName: string): string {
  return readFileSync(resolve(PUBLIC_DATA_DIR, fileName), 'utf-8');
}

function createMemoryStorageArea() {
  const store = new Map<string, unknown>();
  return {
    async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
      if (keys === undefined || keys === null) return Object.fromEntries(store);
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(
        list.filter((key) => store.has(key)).map((key) => [key, store.get(key)])
      );
    },
    async set(items: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(items)) store.set(key, value);
    },
    async remove(keys: string | string[]): Promise<void> {
      for (const key of Array.isArray(keys) ? keys : [keys]) store.delete(key);
    },
  };
}

/**
 * Install the stubs and seed the ICD-10 lookup. Call once in `beforeAll`.
 */
export async function installLegacyRuntime(): Promise<void> {
  vi.stubEnv('VITE_USE_MOCK', 'false');
  vi.stubGlobal('browser', { storage: { local: createMemoryStorageArea() } });
  vi.stubGlobal('fetch', async (url: string) => {
    const match = /^\/data\/([\w.-]+\.json)$/.exec(String(url));
    if (!match) throw new Error(`Unexpected fetch in legacy runtime: ${String(url)}`);
    const body = readPublicData(match[1]);
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
  });

  const kb = JSON.parse(readPublicData('penyakit.json')) as { penyakit: PenyakitRawData[] };
  await new ICD10Loader().loadFromArray(kb.penyakit);
}
