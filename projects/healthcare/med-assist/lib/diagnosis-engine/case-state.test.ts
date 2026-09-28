// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState, normalizeBedsideFinding } from './case-state';

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
  const lung = {
    kind: 'exam' as const,
    item: 'Auskultasi paru',
    findings: [
      { name: 'Ronki basah halus', state: 'present' as const },
      { name: 'Wheezing', state: 'absent' as const },
      { name: 'Egophony', state: 'unknown' as const },
    ],
  };
  const withFindings = (bedside_findings: NonNullable<typeof CASE.context.bedside_findings>) =>
    encounterToCaseState(CASE.encounter, { ...CASE.context, bedside_findings });

  it('sends a PRESENT finding as DITEMUKAN', () => {
    expect(withFindings([lung]).physicalExam).toContain('Auskultasi paru: Ronki basah halus — DITEMUKAN');
  });

  it('sends an ABSENT finding explicitly as TIDAK DITEMUKAN, negative evidence', () => {
    expect(withFindings([lung]).physicalExam).toContain('Auskultasi paru: Wheezing — TIDAK DITEMUKAN');
  });

  it('never sends an UNKNOWN finding, so it cannot read as negative evidence', () => {
    const state = withFindings([lung]);
    expect(state.physicalExam).toEqual([
      'Auskultasi paru: Ronki basah halus — DITEMUKAN',
      'Auskultasi paru: Wheezing — TIDAK DITEMUKAN',
    ]);
    expect(JSON.stringify(state)).not.toContain('Egophony');
    // A step with nothing recorded sends nothing at all.
    const untouched = { ...lung, findings: lung.findings.map((f) => ({ ...f, state: 'unknown' as const })) };
    expect(withFindings([untouched]).physicalExam).toEqual([]);
  });

  it('answers a yes/no question Ya or Tidak, a sign as the step itself, and a test with every recorded result', () => {
    const state = withFindings([
      { kind: 'question', item: 'Nyeri berpindah dari pusar?', findings: [{ name: 'Nyeri berpindah dari pusar?', state: 'absent' }] },
      { kind: 'exam', item: 'Rovsing sign', findings: [{ name: 'Rovsing sign', state: 'present' }] },
      {
        kind: 'test',
        item: 'complete blood count',
        findings: [
          { name: 'Leukositosis', state: 'present' },
          { name: 'Anemia', state: 'absent' },
          { name: 'Trombositopenia', state: 'unknown' },
        ],
      },
      { kind: 'test', item: 'SpO2', findings: [{ name: 'SpO2 < 90%', state: 'absent' }] },
    ]);
    expect(state.anamnesis.qa).toEqual([{ question: 'Nyeri berpindah dari pusar?', answer: 'Tidak' }]);
    expect(state.physicalExam).toEqual(['Rovsing sign — DITEMUKAN']);
    expect(state.results).toEqual([
      { name: 'complete blood count', value: 'Leukositosis — DITEMUKAN; Anemia — TIDAK DITEMUKAN', flag: 'abnormal' },
      { name: 'SpO2', value: 'SpO2 < 90% — TIDAK DITEMUKAN', flag: 'normal' },
    ]);
    expect(state.anamnesis.freeText).toBe(CASE.context.keluhan_tambahan);
  });

  it('reads an earlier checkbox record conservatively: ticked is PRESENT, unticked stays unknown, never ABSENT', () => {
    const state = withFindings([
      { kind: 'exam', item: 'Auskultasi paru', findings: ['Ronki basah halus'] },
      { kind: 'test', item: 'Urinalisis', findings: ['Normal'] },
      { kind: 'question', item: 'Ada riwayat bepergian?', findings: ['Tidak'] },
    ]);
    expect(normalizeBedsideFinding({ kind: 'exam', item: 'Auskultasi paru', findings: ['Ronki basah halus'] })).toEqual({
      kind: 'exam',
      item: 'Auskultasi paru',
      findings: [{ name: 'Ronki basah halus', state: 'present' }],
    });
    expect(state.physicalExam).toEqual(['Auskultasi paru: Ronki basah halus — DITEMUKAN']);
    expect(JSON.stringify(state)).not.toContain('TIDAK DITEMUKAN');
    expect(state.results).toEqual([{ name: 'Urinalisis', value: 'Normal — DITEMUKAN', flag: 'normal' }]);
    // The ticked answer is kept as it was ticked.
    expect(state.anamnesis.qa).toEqual([{ question: 'Ada riwayat bepergian?', answer: 'Tidak' }]);
  });

  it('sends empty exam and results, and no qa, when nothing was recorded', () => {
    const state = encounterToCaseState(CASE.encounter, CASE.context);
    expect(state.physicalExam).toEqual([]);
    expect(state.results).toEqual([]);
    expect('qa' in state.anamnesis).toBe(false);
  });
});
