import { describe, expect, it } from 'vitest';

import { bedsideFindingLine, findingChoicesFor, toggleFinding } from './bedsideFindings';

describe('findingChoicesFor', () => {
  it('offers lung findings, Normal first, for a lung auscultation in either language', () => {
    for (const item of ['Auskultasi paru', 'lung auscultation', 'Periksa suara napas']) {
      const choice = findingChoicesFor({ kind: 'exam', item });
      expect(choice.options.slice(0, 4)).toEqual(['Normal', 'Ronki basah halus', 'Ronki basah kasar', 'Wheezing']);
      expect(choice).toMatchObject({ normal: 'Normal', single: false });
    }
  });

  it('answers a named clinical sign Positif or Negatif, one choice', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Rovsing sign' })).toEqual({ options: ['Positif', 'Negatif'], normal: null, single: true });
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda Murphy' }).options).toEqual(['Positif', 'Negatif']);
  });

  it('does not read "tanda vital" or "tanda dehidrasi" as a named sign', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda dehidrasi' }).options).toContain('Turgor kulit menurun');
    expect(findingChoicesFor({ kind: 'exam', item: 'Tanda vital serial' }).options).toEqual(['Normal', 'Abnormal']);
  });

  it('matches flank tenderness to the CVA entry, not the abdomen', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'flank tenderness' }).options).toEqual(['Normal', 'Nyeri ketok CVA kanan', 'Nyeri ketok CVA kiri']);
  });

  it('offers test results for a matching test', () => {
    expect(findingChoicesFor({ kind: 'test', item: 'complete blood count' }).options).toEqual(['Normal', 'Leukositosis', 'Leukopenia', 'Anemia', 'Trombositopenia']);
    expect(findingChoicesFor({ kind: 'test', item: 'EKG 12 sadapan' }).options).toContain('ST elevasi');
  });

  it('falls back by kind when nothing matches', () => {
    expect(findingChoicesFor({ kind: 'exam', item: 'Periksa tonus otot' })).toEqual({ options: ['Normal', 'Abnormal'], normal: null, single: true });
    expect(findingChoicesFor({ kind: 'test', item: 'Kultur darah' })).toEqual({ options: ['Normal', 'Abnormal'], normal: null, single: true });
    expect(findingChoicesFor({ kind: 'question', item: 'Ada riwayat bepergian?' })).toEqual({ options: ['Ya', 'Tidak'], normal: null, single: true });
  });
});

describe('toggleFinding', () => {
  const lung = findingChoicesFor({ kind: 'exam', item: 'Auskultasi paru' });

  it('ticks several findings, and Normal clears them (and is cleared by them)', () => {
    let selected = toggleFinding(lung, [], 'Ronki basah halus');
    selected = toggleFinding(lung, selected, 'Wheezing');
    expect(selected).toEqual(['Ronki basah halus', 'Wheezing']);
    selected = toggleFinding(lung, selected, 'Normal');
    expect(selected).toEqual(['Normal']);
    expect(toggleFinding(lung, selected, 'Stridor')).toEqual(['Stridor']);
  });

  it('keeps one answer for a single choice, and unticks on a second tap', () => {
    const sign = findingChoicesFor({ kind: 'exam', item: 'Rovsing sign' });
    expect(toggleFinding(sign, ['Positif'], 'Negatif')).toEqual(['Negatif']);
    expect(toggleFinding(sign, ['Negatif'], 'Negatif')).toEqual([]);
  });
});

describe('bedsideFindingLine', () => {
  it('reads "<step>: <findings>"', () => {
    expect(bedsideFindingLine({ kind: 'exam', item: 'Auskultasi paru', findings: ['Ronki basah halus', 'Wheezing'] })).toBe('Auskultasi paru: Ronki basah halus, Wheezing');
  });
});
