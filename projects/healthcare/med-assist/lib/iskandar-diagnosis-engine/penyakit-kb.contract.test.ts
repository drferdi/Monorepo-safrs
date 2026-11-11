// Designed and constructed by Drferdi.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type PenyakitRecord = {
  id: string;
  nama: string;
  icd10: string;
  source: string;
  gejala_klinis?: string[];
  diagnosis_banding?: unknown;
  structured_criteria?: unknown;
};

type PenyakitKb = {
  _metadata?: {
    version?: string;
    total_diseases?: number;
    kb_repair_note?: string;
  };
  penyakit?: PenyakitRecord[];
};

const REPAIRED_IDS = [
  'DIS-001',
  'DIS-003',
  'DIS-006',
  'DIS-008',
  'DIS-019',
  'DIS-026',
  'DIS-028',
  'DIS-029',
  'DIS-032',
  'DIS-034',
  'DIS-039',
  'DIS-041',
  'DIS-046',
  'DIS-053',
  'DIS-054',
  'DIS-057',
  'DIS-058',
  'DIS-062',
  'DIS-067',
  'DIS-068',
  'DIS-083',
  'DIS-085',
  'DIS-086',
  'DIS-090',
  'DIS-092',
  'DIS-103',
  'DIS-113',
  'DIS-116',
  'DIS-122',
  'DIS-132',
  'DIS-133',
  'DIS-135',
  'DIS-137',
] as const;

/** Phrases that made B76 win on nonspecific malaise (kb-hygiene-2026-09-23). */
const B76_FORBIDDEN_GENERIC_PHRASES = [
  /^Lemas dan mudah lelah$/i,
  /^Pusing dan sakit kepala$/i,
  /^Penurunan berat badan$/i,
];

/** Mid-sentence / scrape fragments that must not reappear in gejala_klinis. */
const FORBIDDEN_FRAGMENT_PATTERNS = [
  /^jam\)/i,
  /^jam\. Gejala/i,
  /^ulang\. Pasien/i,
  /^stadium yaitu:/i,
  /^minggu\./i,
  /^Kelainan awal hanya$/i,
  /^anyangan,/i,
  /^Tidak terdapat riwayat kelainan sistemik/i,
  /^Adanya riwayat kontak dengan orang yang mengalami dermatofitosis/i,
  /^kunang,/i,
  /^kadang membasah/i,
  /^- /,
  /^Anamnesis dimulai/i,
  /^Allo dan Auto Anamnesis/i,
  /^Lemas dan pusing$/i,
  /^Penurunan berat badan$/i,
  /^Badan lemah/i,
];

function loadKb(): PenyakitKb {
  const kbPath = path.resolve(process.cwd(), 'public/data/penyakit.json');
  return JSON.parse(readFileSync(kbPath, 'utf8')) as PenyakitKb;
}

describe('penyakit.json contract', () => {
  it('loads versioned KB with 159 diseases and source on each entry', () => {
    const raw = loadKb();

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

  it('keeps Chief-repaired entries free of scrape fragments and thin gejala', () => {
    const raw = loadKb();
    const byId = new Map((raw.penyakit ?? []).map((item) => [item.id, item]));

    for (const id of REPAIRED_IDS) {
      const entry = byId.get(id);
      expect(entry, `missing repaired id ${id}`).toBeTruthy();
      const gejala = entry?.gejala_klinis ?? [];
      expect(gejala.length, `${id} gejala count`).toBeGreaterThanOrEqual(3);
      for (const symptom of gejala) {
        expect(symptom.trim().length, `${id} empty symptom`).toBeGreaterThan(2);
        for (const pattern of FORBIDDEN_FRAGMENT_PATTERNS) {
          expect(pattern.test(symptom), `${id} fragment: ${symptom}`).toBe(false);
        }
      }
    }

    expect(byId.get('DIS-067')?.nama).toBe('Uretritis gonore dan nongonore');
    expect(byId.get('DIS-046')?.gejala_klinis?.join(' ')).toMatch(/umbilikus/i);
    expect(byId.get('DIS-046')?.gejala_klinis?.join(' ')).not.toMatch(/suprapubik/i);

    const b76 = byId.get('DIS-054');
    expect(b76?.icd10).toBe('B76');
    const b76Gejala = b76?.gejala_klinis ?? [];
    expect(b76Gejala.join(' ')).toMatch(/ground itch/i);
    expect(b76Gejala.join(' ')).toMatch(/endemis|tanah/i);
    for (const symptom of b76Gejala) {
      for (const pattern of B76_FORBIDDEN_GENERIC_PHRASES) {
        expect(pattern.test(symptom), `B76 generic phrase: ${symptom}`).toBe(false);
      }
    }
  });

  it('does not share identical gejala_klinis arrays across different disease ids', () => {
    const raw = loadKb();
    const signatureToIds = new Map<string, string[]>();

    for (const item of raw.penyakit ?? []) {
      const gejala = item.gejala_klinis ?? [];
      if (gejala.length === 0) continue;
      const signature = JSON.stringify(gejala);
      const bucket = signatureToIds.get(signature) ?? [];
      bucket.push(item.id);
      signatureToIds.set(signature, bucket);
    }

    const duplicates = [...signatureToIds.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([signature, ids]) => ({ signature, ids }));

    expect(duplicates, JSON.stringify(duplicates, null, 2)).toEqual([]);
  });
});

// AGENTS.md domain rules: every rule needs differential exclusions and input criteria. Today's
// gaps are listed in penyakit-kb.gaps.json and the list may only shrink (audit 2026-10-06): a
// new entry without them fails, and a filled gap must leave the list.
describe('penyakit.json completeness ratchet', () => {
  const gaps = JSON.parse(
    readFileSync(
      path.resolve(process.cwd(), 'lib/iskandar-diagnosis-engine/penyakit-kb.gaps.json'),
      'utf8'
    )
  ) as Record<'diagnosis_banding' | 'structured_criteria', string[]>;
  const filled = (value: unknown): boolean =>
    Array.isArray(value)
      ? value.length > 0
      : typeof value === 'object' && value !== null && Object.keys(value).length > 0;

  it.each(['diagnosis_banding', 'structured_criteria'] as const)(
    'lists exactly the entries without %s',
    (field) => {
      const open = (loadKb().penyakit ?? [])
        .filter((item) => !filled(item[field]))
        .map((item) => item.id)
        .sort();
      expect(open).toEqual([...gaps[field]].sort());
    }
  );
});
