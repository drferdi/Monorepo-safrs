import { beforeEach, describe, expect, it } from 'vitest';

import {
  forgetConsultMiraDifferentials,
  getConsultMiraDifferential,
  rememberConsultMiraDifferential,
  toConsultMiraDifferential,
} from './consult-mira-differential';
import { MIRA_CANNOT_MISS_TAG, MIRA_TAG } from './run-diagnosis';

import type { CDSSResponse, DiagnosisSuggestion } from '@/types/api';

const GENERATED_AT = '2026-10-04T08:00:00.000Z';

function suggestion(over: Partial<DiagnosisSuggestion>): DiagnosisSuggestion {
  return {
    rank: 1,
    icd_x: 'J18.9',
    icd10_code: 'J18.9',
    nama: 'Pneumonia',
    confidence: 0.7,
    rationale: 'Demam; ronki',
    ...over,
  };
}

function response(
  suggestions: DiagnosisSuggestion[],
  over: Partial<CDSSResponse> = {}
): CDSSResponse {
  return {
    diagnosis_suggestions: suggestions,
    medication_recommendations: [],
    alerts: [],
    next_best_actions: [{ kind: 'exam', item: 'Auskultasi paru', reason: 'Cari ronki fokal' }],
    missing_information: ['Riwayat perjalanan'],
    ...over,
  };
}

describe('toConsultMiraDifferential', () => {
  it('forwards MIRA suggestions with the cannot-miss flag and the follow-up lists', () => {
    const differential = toConsultMiraDifferential(
      response([
        suggestion({ engine_tag: MIRA_TAG }),
        suggestion({
          rank: 2,
          icd_x: 'I26.9',
          icd10_code: 'I26.9',
          nama: 'Emboli paru',
          confidence: 0.2,
          rationale: 'Takikardia',
          engine_tag: MIRA_CANNOT_MISS_TAG,
        }),
      ]),
      GENERATED_AT
    );

    expect(differential).toEqual({
      engine: 'MIRA',
      generated_at: GENERATED_AT,
      items: [
        {
          rank: 1,
          icd10: 'J18.9',
          nama: 'Pneumonia',
          confidence: 0.7,
          cannot_miss: false,
          rationale: 'Demam; ronki',
        },
        {
          rank: 2,
          icd10: 'I26.9',
          nama: 'Emboli paru',
          confidence: 0.2,
          cannot_miss: true,
          rationale: 'Takikardia',
        },
      ],
      next_best_actions: [{ kind: 'exam', item: 'Auskultasi paru', reason: 'Cari ronki fokal' }],
      missing_information: ['Riwayat perjalanan'],
    });
  });

  it('never forwards legacy suggestions as MIRA output', () => {
    expect(
      toConsultMiraDifferential(response([suggestion({ engine_tag: undefined })]), GENERATED_AT)
    ).toBeNull();
  });
});

describe('consult MIRA differential memory', () => {
  beforeEach(() => forgetConsultMiraDifferentials());

  it('returns the latest differential only for the same encounter', () => {
    const differential = toConsultMiraDifferential(
      response([suggestion({ engine_tag: MIRA_TAG })]),
      GENERATED_AT
    );
    rememberConsultMiraDifferential('enc-1', differential);

    expect(getConsultMiraDifferential('enc-1')).toEqual(differential);
    expect(getConsultMiraDifferential('enc-2')).toBeNull();
  });

  it('a later run without MIRA output clears the earlier differential', () => {
    rememberConsultMiraDifferential(
      'enc-1',
      toConsultMiraDifferential(response([suggestion({ engine_tag: MIRA_TAG })]), GENERATED_AT)
    );
    rememberConsultMiraDifferential('enc-1', null);

    expect(getConsultMiraDifferential('enc-1')).toBeNull();
  });
});
