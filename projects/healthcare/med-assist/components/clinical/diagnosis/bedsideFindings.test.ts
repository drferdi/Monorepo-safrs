import { describe, expect, it } from 'vitest';

import { bedsideFindingLine, findingChoicesFor, nextState, recordedFindingLines } from './bedsideFindings';

describe('findingChoicesFor', () => {
  it('lists lung findings for a lung auscultation in either language', () => {
    for (const item of ['Auskultasi paru', 'lung auscultation', 'Periksa suara napas']) {
      const choice = findingChoicesFor({ kind: 'exam', item });
      expect(choice.type).toBe('list');
      if (choice.type === 'list') expect(choice.findings.slice(0, 3)).toEqual(['Ronki basah halus', 'Ronki basah kasar', 'Wheezing']);
    }
  });

  it('answers a named clinical sign Positif or Negatif, as one finding: the sign itself', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Rovsing sign' })).toEqual({ type: 'answer', finding: 'Rovsing sign', present: 'Positif', absent: 'Negatif' });
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda Murphy' })).toMatchObject({ present: 'Positif', absent: 'Negatif' });
  });

  it('does not read "tanda vital" or "tanda dehidrasi" as a named sign', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda dehidrasi' })).toMatchObject({ type: 'list', findings: expect.arrayContaining(['Turgor kulit menurun']) });
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda vital serial' })).toMatchObject({ type: 'answer', finding: 'Kelainan' });
  });

  it('matches flank tenderness to the CVA entry, not the abdomen', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'flank tenderness' })).toEqual({ type: 'list', findings: ['Nyeri ketok CVA kanan', 'Nyeri ketok CVA kiri'] });
  });

  it('lists test results for a matching test', () => {
    expect(findingChoicesFor({ kind: 'test', item: 'complete blood count' })).toEqual({ type: 'list', findings: ['Leukositosis', 'Leukopenia', 'Anemia', 'Trombositopenia'] });
    expect(findingChoicesFor({ kind: 'test', item: 'EKG 12 sadapan' })).toMatchObject({ findings: expect.arrayContaining(['ST elevasi']) });
  });

  it('falls back to one answer when nothing matches: Kelainan for an exam or test, Ya/Tidak for a question', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Periksa tonus otot' })).toEqual({ type: 'answer', finding: 'Kelainan', present: 'Abnormal', absent: 'Normal' });
    expect(findingChoicesFor({ kind: 'test', item: 'Kultur darah' })).toEqual({ type: 'answer', finding: 'Kelainan', present: 'Abnormal', absent: 'Normal' });
    expect(findingChoicesFor({ kind: 'question', item: 'Ada riwayat bepergian?' })).toEqual({ type: 'answer', finding: 'Ada riwayat bepergian?', present: 'Ya', absent: 'Tidak' });
  });
});

describe('nextState', () => {
  it('cycles belum diperiksa -> ditemukan -> tidak ditemukan -> belum diperiksa', () => {
    expect(nextState('unknown')).toBe('present');
    expect(nextState('present')).toBe('absent');
    expect(nextState('absent')).toBe('unknown');
  });
});

describe('bedsideFindingLine and recordedFindingLines', () => {
  const lung = {
    kind: 'exam' as const,
    item: 'Auskultasi paru',
    findings: [
      { name: 'Ronki basah halus', state: 'present' as const },
      { name: 'Wheezing', state: 'absent' as const },
      { name: 'Stridor', state: 'unknown' as const },
    ],
  };

  it('shows ditemukan as "+", tidak ditemukan as "−", and leaves belum diperiksa out', () => {
    expect(bedsideFindingLine(lung)).toBe('Auskultasi paru: + Ronki basah halus, − Wheezing');
    expect(recordedFindingLines(lung)).toEqual(['✓ Ronki basah halus ditemukan', '− Wheezing tidak ditemukan']);
  });

  it('names the step for a one-finding answer that is not the step itself', () => {
    const sign = { kind: 'exam' as const, item: 'Rovsing sign', findings: [{ name: 'Rovsing sign', state: 'absent' as const }] };
    const other = { kind: 'exam' as const, item: 'Palpasi hepar', findings: [{ name: 'Kelainan', state: 'present' as const }] };
    expect(bedsideFindingLine(sign)).toBe('− Rovsing sign');
    expect(bedsideFindingLine(other)).toBe('+ Palpasi hepar: Kelainan');
    expect(recordedFindingLines(other)).toEqual(['✓ Palpasi hepar: Kelainan ditemukan']);
  });
});
