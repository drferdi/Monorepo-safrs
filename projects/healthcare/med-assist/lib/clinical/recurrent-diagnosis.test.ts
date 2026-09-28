// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { findRecurrentDiagnoses, normalizeRecurrentIcd } from './recurrent-diagnosis';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const TODAY = new Date('2026-09-28T00:00:00.000Z');

function visit(timestamp: string, icd?: string, nama = 'Dx', encounter_id = `e-${timestamp}`): VisitRecord {
  return {
    patient_id: 'RM-SYN-1',
    encounter_id,
    timestamp,
    vitals: { sbp: 120, dbp: 80, hr: 80, rr: 18, temp: 36.5, glucose: 0 },
    keluhan_utama: 'kontrol',
    diagnosa: icd ? { icd_x: icd, nama } : undefined,
    source: 'scrape',
  } as VisitRecord;
}

describe('findRecurrentDiagnoses', () => {
  it('needs at least two visits with the same ICD inside 12 months', () => {
    expect(findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi')], TODAY)).toEqual([]);
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi'), visit('2026-05-01', 'I10', 'Hipertensi')], TODAY);
    expect(result).toEqual([
      { icd: 'I10', name: 'Hipertensi', count: 2, visitsConsidered: 2, lastSeen: '2026-08-01', label: 'Kronis' },
    ]);
  });

  it('ignores visits older than the window and visits without an ICD', () => {
    const result = findRecurrentDiagnoses(
      [visit('2026-08-01', 'J06.9', 'ISPA'), visit('2025-09-27', 'J06.9', 'ISPA'), visit('2026-07-01')],
      TODAY
    );
    expect(result).toEqual([]);
  });

  it('normalises ICD spelling and labels non-chronic codes Berulang', () => {
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'j06.9 ', 'ISPA'), visit('2026-06-01', 'J06.9', 'ISPA')], TODAY);
    expect(result[0]).toMatchObject({ icd: 'J06.9', label: 'Berulang', count: 2 });
    expect(normalizeRecurrentIcd(' e11.9 ')).toBe('E11.9');
  });

  it('orders Kronis first, then by count, then by recency', () => {
    const visits = [
      visit('2026-09-01', 'J06.9', 'ISPA'), visit('2026-08-01', 'J06.9', 'ISPA'), visit('2026-07-01', 'J06.9', 'ISPA'),
      visit('2026-06-01', 'I10', 'Hipertensi'), visit('2026-05-01', 'I10', 'Hipertensi'),
      visit('2026-04-01', 'K30', 'Dispepsia'), visit('2026-03-01', 'K30', 'Dispepsia'),
    ];
    expect(findRecurrentDiagnoses(visits, TODAY).map((c) => c.icd)).toEqual(['I10', 'J06.9', 'K30']);
  });

  it('excludes the current encounter from the count', () => {
    const visits = [visit('2026-09-28', 'I10', 'Hipertensi', 'current'), visit('2026-05-01', 'I10', 'Hipertensi')];
    expect(findRecurrentDiagnoses(visits, TODAY, { currentEncounterId: 'current' })).toEqual([]);
  });

  it('uses the most recent name for the ICD', () => {
    const result = findRecurrentDiagnoses([visit('2026-08-01', 'I10', 'Hipertensi esensial'), visit('2026-05-01', 'I10', 'HT')], TODAY);
    expect(result[0].name).toBe('Hipertensi esensial');
  });

  it('groups by ICD root so sub-code variants of the same diagnosis merge', () => {
    const result = findRecurrentDiagnoses(
      [visit('2026-08-12', 'E11.9', 'Diabetes melitus tipe 2'), visit('2026-03-01', 'E11', 'Diabetes')],
      TODAY
    );
    expect(result).toEqual([
      { icd: 'E11.9', name: 'Diabetes melitus tipe 2', count: 2, visitsConsidered: 2, lastSeen: '2026-08-12', label: 'Kronis' },
    ]);
  });

  it('dedupes a repeated encounter_id so it only counts once', () => {
    const result = findRecurrentDiagnoses(
      [visit('2026-08-01', 'I10', 'Hipertensi', 'dup-1'), visit('2026-08-01', 'I10', 'Hipertensi', 'dup-1')],
      TODAY
    );
    expect(result).toEqual([]);
  });

  it('includes a visit exactly on the window start (inclusive lower boundary)', () => {
    const result = findRecurrentDiagnoses(
      [visit('2026-08-01', 'I10', 'Hipertensi'), visit('2025-09-28T00:00:00.000Z', 'I10', 'Hipertensi')],
      TODAY
    );
    expect(result).toEqual([
      { icd: 'I10', name: 'Hipertensi', count: 2, visitsConsidered: 2, lastSeen: '2026-08-01', label: 'Kronis' },
    ]);
  });
});
