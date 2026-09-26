// Designed and constructed by Drferdi.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type PenyakitRecord = {
  id: string;
  nama: string;
  icd10: string;
  source: string;
};

describe('penyakit.json contract', () => {
  it('loads versioned KB with 159 diseases and source on each entry', () => {
    const kbPath = path.resolve(process.cwd(), 'public/data/penyakit.json');
    const raw = JSON.parse(readFileSync(kbPath, 'utf8')) as {
      _metadata?: { version?: string; total_diseases?: number };
      penyakit?: PenyakitRecord[];
    };

    expect(raw._metadata?.version).toBe('2.0.0');
    expect(raw._metadata?.total_diseases).toBe(159);
    expect(Array.isArray(raw.penyakit)).toBe(true);
    expect(raw.penyakit).toHaveLength(159);
    expect(
      raw.penyakit?.every(
        (item) =>
          Boolean(item.id?.trim()) &&
          Boolean(item.nama?.trim()) &&
          Boolean(item.icd10?.trim()) &&
          Boolean(item.source?.trim())
      )
    ).toBe(true);
  });
});
