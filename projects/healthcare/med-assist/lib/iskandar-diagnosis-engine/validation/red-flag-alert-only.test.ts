// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AIDiagnosisSuggestion } from '@/lib/api/ai-types';

import type { RedFlag } from '../red-flags';
import { runValidationPipeline } from './index';

vi.mock('../../rag/icd10-db', () => ({
  icd10DB: {
    getByCode: vi.fn(async (code: string) => {
      if (code === 'J06' || code === 'J06.9') {
        return {
          code: 'J06',
          name: 'ISPA',
          red_flags: ['Sesak berat'],
          terapi: [],
          kriteria_rujukan: '',
        };
      }
      if (code === 'A41.9') {
        return {
          code: 'A41.9',
          name: 'Sepsis',
          red_flags: ['qSOFA'],
          terapi: [],
          kriteria_rujukan: '',
        };
      }
      return null;
    }),
  },
}));

function makeSuggestion(
  overrides: Partial<AIDiagnosisSuggestion> = {}
): AIDiagnosisSuggestion {
  return {
    rank: 1,
    diagnosis_name: 'ISPA',
    icd10_code: 'J06',
    confidence: 0.55,
    reasoning: 'Demam batuk pilek sesuai kandidat KB matcher.',
    red_flags: [],
    recommended_actions: ['Observasi'],
    ...overrides,
  };
}

function makeSepsisRedFlag(): RedFlag {
  return {
    id: 'rf-sepsis-qssoa',
    severity: 'emergency',
    condition: 'Suspected Sepsis (qSOFA)',
    action: 'Stabilisasi + rujuk segera',
    icd_codes: ['A41.9'],
    criteria_met: ['RR >= 22', 'SBP <= 100'],
    source: 'qSOFA',
  };
}

describe('runValidationPipeline — red flags stay alerts, not dx list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not inject emergency red-flag ICD into filtered suggestions', async () => {
    const result = await runValidationPipeline([makeSuggestion()], {
      patient_age: 40,
      patient_gender: 'L',
      is_pregnant: false,
      keluhan_utama: 'Demam batuk pilek',
      existing_red_flags: [makeSepsisRedFlag()],
    });

    const codes = result.filtered_suggestions.map((s) => s.icd10_code);
    expect(codes).not.toContain('A41.9');
    expect(codes).toEqual(['J06']);
    expect(result.filtered_suggestions.some((s) => /RED FLAG:/i.test(s.reasoning))).toBe(
      false
    );
    // Safety still surfaces via validation result (engine maps these to alerts).
    expect(result.red_flags.map((f) => f.id)).toContain('rf-sepsis-qssoa');
    expect(result.red_flags[0]?.icd_codes).toContain('A41.9');
  });

  it('keeps a matcher suggestion that already is the red-flag ICD (no invent, no drop)', async () => {
    const sepsisFromMatcher = makeSuggestion({
      diagnosis_name: 'Sepsis',
      icd10_code: 'A41.9',
      confidence: 0.7,
      reasoning: 'Matcher already surfaced sepsis from symptoms.',
    });

    const result = await runValidationPipeline([sepsisFromMatcher], {
      patient_age: 60,
      patient_gender: 'P',
      is_pregnant: false,
      keluhan_utama: 'Demam menggigil sesak',
      existing_red_flags: [makeSepsisRedFlag()],
    });

    expect(result.filtered_suggestions.map((s) => s.icd10_code)).toEqual(['A41.9']);
    expect(result.red_flags).toHaveLength(1);
  });
});
