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

describe('encounterToCaseState bedside findings', () => {
  it('routes ticked results by kind: exam to physicalExam, test to results, question to anamnesis.qa', () => {
    const state = encounterToCaseState(CASE.encounter, {
      ...CASE.context,
      bedside_findings: [
        { kind: 'exam', item: 'Rovsing sign', findings: ['Positif'] },
        { kind: 'test', item: 'complete blood count', findings: ['Leukositosis'] },
        { kind: 'test', item: 'Urinalisis', findings: ['Normal'] },
        { kind: 'question', item: 'Nyeri berpindah dari pusar?', findings: ['Ya'] },
      ],
    });
    expect(state.physicalExam).toEqual(['Rovsing sign: Positif']);
    expect(state.results).toEqual([
      { name: 'complete blood count', value: 'Leukositosis', flag: 'abnormal' },
      { name: 'Urinalisis', value: 'Normal', flag: 'normal' },
    ]);
    expect(state.anamnesis.qa).toEqual([{ question: 'Nyeri berpindah dari pusar?', answer: 'Ya' }]);
    expect(state.anamnesis.freeText).toBe(CASE.context.keluhan_tambahan);
  });

  it('sends empty exam and results, and no qa, when nothing was recorded', () => {
    const state = encounterToCaseState(CASE.encounter, CASE.context);
    expect(state.physicalExam).toEqual([]);
    expect(state.results).toEqual([]);
    expect('qa' in state.anamnesis).toBe(false);
  });
});
