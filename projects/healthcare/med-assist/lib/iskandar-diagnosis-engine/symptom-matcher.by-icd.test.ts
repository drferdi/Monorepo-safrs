import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearMatcherCache, getPenyakitByIcd } from './symptom-matcher';

const KB_PATH = path.resolve(__dirname, '../../public/data/penyakit.json');
const kbData = JSON.parse(readFileSync(KB_PATH, 'utf-8')) as unknown;

beforeEach(() => {
  clearMatcherCache();
  vi.stubGlobal('fetch', async (url: string | URL | Request) => {
    if (String(url).includes('penyakit.json')) {
      return { ok: true, json: async () => kbData } as Response;
    }
    throw new Error(`Unexpected fetch: ${String(url)}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearMatcherCache();
});

describe('getPenyakitByIcd', () => {
  it('returns the full KB entry for an exact ICD-10 match', async () => {
    const entry = await getPenyakitByIcd('I10');
    expect(entry).not.toBeNull();
    expect(entry?.icd10.toUpperCase()).toBe('I10');
    expect(entry?.kompetensi).toBeTruthy();
    expect(Array.isArray(entry?.red_flags)).toBe(true);
  });

  it('ignores dots and casing when matching', async () => {
    const entry = await getPenyakitByIcd('i10.0');
    expect(entry?.icd10.toUpperCase()).toBe('I10');
  });

  it('falls back to a category match when the exact code is absent', async () => {
    const entry = await getPenyakitByIcd('I10.9');
    expect(entry).not.toBeNull();
    expect(entry?.icd10.toUpperCase().startsWith('I1')).toBe(true);
  });

  it('returns null for an empty or unknown code', async () => {
    expect(await getPenyakitByIcd('')).toBeNull();
    expect(await getPenyakitByIcd('ZZZ99')).toBeNull();
  });
});
