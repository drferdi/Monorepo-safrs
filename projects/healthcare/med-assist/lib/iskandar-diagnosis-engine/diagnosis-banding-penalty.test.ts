// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import {
  BANDING_SOFT_PENALTY,
  applyDiagnosisBandingSoftPenalty,
} from './diagnosis-banding-penalty';
import type { MatchedCandidate } from './symptom-matcher';

function makeCandidate(overrides: Partial<MatchedCandidate>): MatchedCandidate {
  return {
    diseaseId: 'DIS-X',
    nama: 'Placeholder',
    icd10: 'Z99',
    kompetensi: '4A',
    bodySystem: 'other',
    matchScore: 0.5,
    rawMatchScore: 0.5,
    matchedSymptoms: [],
    totalSymptoms: 1,
    redFlags: [],
    terpiData: [],
    kriteria_rujukan: '',
    definisi: '',
    diagnosisBanding: [],
    ...overrides,
  };
}

describe('H9 — diagnosis_banding soft penalty', () => {
  it('down-ranks a weaker candidate listed in a stronger peer diagnosis_banding', () => {
    const migren = makeCandidate({
      diseaseId: 'DIS-MIG',
      nama: 'Migren',
      icd10: 'G43',
      matchScore: 0.55,
      rawMatchScore: 0.55,
      diagnosisBanding: ['Tension headache', 'Cluster-type headache'],
    });
    const tension = makeCandidate({
      diseaseId: 'DIS-TEN',
      nama: 'Tension headache',
      icd10: 'G44',
      matchScore: 0.52,
      rawMatchScore: 0.52,
      diagnosisBanding: ['Migren'],
    });

    const ranked = applyDiagnosisBandingSoftPenalty([tension, migren]);

    expect(ranked[0]?.icd10).toBe('G43');
    const tensionOut = ranked.find((c) => c.icd10 === 'G44');
    expect(tensionOut).toBeDefined();
    expect(tensionOut!.bandingSoftPenalty).toBe(BANDING_SOFT_PENALTY);
    expect(tensionOut!.matchScore).toBeCloseTo(0.52 * BANDING_SOFT_PENALTY, 5);
    expect(tensionOut!.matchScore).toBeLessThan(migren.matchScore);

    const migrenOut = ranked.find((c) => c.icd10 === 'G43');
    expect(migrenOut!.bandingSoftPenalty ?? 1).toBe(1);
    expect(migrenOut!.matchScore).toBe(0.55);
  });

  it('does not invent ICD codes outside the candidate set', () => {
    const only = makeCandidate({
      nama: 'ISPA',
      icd10: 'J06',
      matchScore: 0.7,
      diagnosisBanding: ['Pneumonia', 'Z99.9 Imaginary'],
    });
    const ranked = applyDiagnosisBandingSoftPenalty([only]);
    expect(ranked).toHaveLength(1);
    expect(ranked.map((c) => c.icd10)).toEqual(['J06']);
    expect(ranked[0].bandingSoftPenalty ?? 1).toBe(1);
  });
});
