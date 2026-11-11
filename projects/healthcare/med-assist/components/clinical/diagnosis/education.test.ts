import { describe, expect, it } from 'vitest';

import { buildEducationItems } from './education';
import type { DiseaseNote } from './useDiseaseNotes';

const note = (over: Partial<DiseaseNote>): DiseaseNote => ({
  definition: 'x',
  complications: [],
  exam: [],
  referral: '',
  ...over,
});

const SHARED = 'Minum air putih minimal 2 liter/hari.';

describe('buildEducationItems', () => {
  const notes = new Map<string, DiseaseNote>([
    ['J02', note({ education: [SHARED, 'Istirahat cukup.'], followUp: 'Kontrol jika tidak membaik dalam 7-10 hari.' })],
    ['J06', note({ education: [SHARED, 'Cuci tangan.'] })],
    ['I50', note({})],
  ]);

  // Migrated (2026-09-29): the follow-up left Edukasi for its own Tindak lanjut section.
  it('lists each chosen diagnosis\'s points, in order, a shared point once, and no follow-up', () => {
    expect(buildEducationItems(['J02', 'J06.9'], notes).map((item) => item.text)).toEqual([
      SHARED,
      'Istirahat cukup.',
      'Cuci tangan.',
    ]);
  });

  it('composes nothing for a code without education in the knowledge base', () => {
    expect(buildEducationItems(['I50', 'K65.0'], notes)).toEqual([]);
  });
});
