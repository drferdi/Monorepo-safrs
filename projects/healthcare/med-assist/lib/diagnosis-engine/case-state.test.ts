// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState } from './case-state';

const CASE = GOLDEN_CASES.find((c) => c.id === 'appendicitis-like')!;

describe('encounterToCaseState knownConditions', () => {
  it('appends recurrent diagnoses as "name (ICD)" without duplicating chronic entries', () => {
    const encounter = { ...CASE.encounter, diagnosa: { ...CASE.encounter.diagnosa, penyakit_kronis: ['Hipertensi (I10)'] } };
    const state = encounterToCaseState(encounter, {
      ...CASE.context,
      recurrent_diagnoses: [{ icd: 'I10', name: 'Hipertensi' }, { icd: 'E11.9', name: 'DM tipe 2' }],
    });
    expect(state.knownConditions).toEqual(['Hipertensi (I10)', 'DM tipe 2 (E11.9)']);
  });

  it('keeps knownConditions unchanged when no recurrent diagnoses are sent', () => {
    expect(encounterToCaseState(CASE.encounter, CASE.context).knownConditions).toEqual([...(CASE.encounter.diagnosa?.penyakit_kronis ?? [])]);
  });
});
