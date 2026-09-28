import { describe, expect, it } from 'vitest';

import { compareAssessments, placeLabel, snapshotAssessment, type AssessmentSnapshot } from './assessmentDelta';
import type { DiagnosisCandidateView } from './diagnosisViewModel';

function card(code: string, name: string, over: Partial<DiagnosisCandidateView> = {}): DiagnosisCandidateView {
  return { id: code, rank: 1, code, name, displayLabel: `${code} - ${name} · MIRA`, confidenceLabel: '', source: 'suggested', isSelected: false, isSelectionBlocked: false, supports: [], against: [], missing: [], review: [], ...over };
}

const I50 = card('I50', 'Heart failure', { supports: ['Edema tungkai'], missing: ['Auskultasi paru', 'EKG'] });
const J18 = card('J18.9', 'Community Acquired Pneumonia', { supports: ['Demam'], missing: ['Auskultasi paru', 'SpO2'] });
const J06 = card('J06.9', 'ISPA');
const K65 = card('K65.0', 'Acute peritonitis', { displayLabel: 'K65.0 - Acute peritonitis · MIRA · jangan terlewat' });

const before: AssessmentSnapshot = snapshotAssessment({ primary: I50, mustNotMiss: [K65], differentials: [J18, J06] }, 'Auskultasi paru');

describe('snapshotAssessment', () => {
  it('keeps the page order, places, evidence, Data kurang counts and the Next best step', () => {
    expect(before.cards.map((c) => [c.code, placeLabel(c.place)])).toEqual([
      ['I50', 'Diagnosis utama'],
      ['K65.0', 'Must not miss'],
      ['J18.9', 'Diagnosis banding 1'],
      ['J06.9', 'Diagnosis banding 2'],
    ]);
    expect(before.cards[0]).toMatchObject({ label: 'I50 - Heart failure', supports: ['Edema tungkai'], missing: 2 });
    expect(before.nextStep).toBe('Auskultasi paru');
  });
});

describe('compareAssessments', () => {
  const after = snapshotAssessment(
    {
      primary: { ...J18, supports: ['Demam', 'Ronki basah halus'], missing: ['SpO2'] },
      mustNotMiss: [],
      differentials: [{ ...I50, against: ['Tidak ditemukan edema perifer'] }, card('J20.9', 'Bronkitis akut')],
    },
    'SpO2'
  );
  const delta = compareAssessments(before, after);

  it('detects a diagnosis moving from the differential to primary, and the primary changing', () => {
    expect(delta.cards['J18.9']).toMatchObject({ move: 'up', before: { kind: 'banding', n: 1 } });
    expect(delta.primary).toEqual({ before: 'I50', after: 'J18.9' });
  });

  it('detects a diagnosis moving down', () => {
    expect(delta.cards.I50).toMatchObject({ move: 'down', before: { kind: 'primary' } });
  });

  it('detects a diagnosis newly appearing and one disappearing', () => {
    expect(delta.cards['J20.9']).toMatchObject({ move: 'new', before: null });
    expect(delta.gone).toEqual([
      { code: 'K65.0', label: 'K65.0 - Acute peritonitis', before: { kind: 'mustNotMiss' } },
      { code: 'J06.9', label: 'J06.9 - ISPA', before: { kind: 'banding', n: 2 } },
    ]);
  });

  it('detects new supporting and new opposing evidence, and only what is new', () => {
    expect(delta.cards['J18.9'].newSupports).toEqual(['Ronki basah halus']);
    expect(delta.cards['J18.9'].newAgainst).toEqual([]);
    expect(delta.cards.I50.newAgainst).toEqual(['Tidak ditemukan edema perifer']);
    expect(delta.cards.I50.newSupports).toEqual([]);
  });

  it('detects a changed Data kurang count', () => {
    expect(delta.cards['J18.9'].missingBefore).toBe(2);
    expect(after.cards.find((c) => c.code === 'J18.9')?.missing).toBe(1);
  });

  it('detects a changed Next best step, and reports none when it stayed', () => {
    expect(delta.nextStep).toEqual({ before: 'Auskultasi paru', after: 'SpO2' });
    expect(compareAssessments(before, before).nextStep).toBeNull();
  });

  it('reports nothing for an unchanged assessment', () => {
    const same = compareAssessments(before, before);
    expect(Object.values(same.cards).every((c) => c.move === 'same' && c.newSupports.length === 0 && c.newAgainst.length === 0)).toBe(true);
    expect(same.gone).toEqual([]);
    expect(same.primary).toBeNull();
  });

  it('calls a move into or out of MUST NOT MISS "moved", not up or down', () => {
    const moved = compareAssessments(before, snapshotAssessment({ primary: I50, mustNotMiss: [J18], differentials: [J06] }, 'Auskultasi paru'));
    expect(moved.cards['J18.9']).toMatchObject({ move: 'moved', before: { kind: 'banding', n: 1 } });
  });
});
