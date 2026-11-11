// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildDiagnosisRequestContext, hashDiagnosisContext, latestVisitBloodPressure } from './request-context';

const source = {
  keluhanUtama: 'nyeri kepala',
  keluhanTambahan: '',
  patientAge: 54,
  patientGender: 'L' as const,
  vitals: { sbp: 168, dbp: 102, hr: 88, rr: 0, temp: 36.7 },
  recurrent: [{ icd: 'I10', name: 'Hipertensi esensial' }],
};

describe('request-context', () => {
  it('builds the same context from equal inputs and drops zero vitals', () => {
    const a = buildDiagnosisRequestContext(source);
    const b = buildDiagnosisRequestContext({ ...source, vitals: { ...source.vitals } });
    expect(a).toEqual(b);
    expect(a.vital_signs).toEqual({ systolic: 168, diastolic: 102, heart_rate: 88, temperature: 36.7 });
    expect(a.patient_gender).toBe('M');
    expect(a.recurrent_diagnoses).toEqual([{ icd: 'I10', name: 'Hipertensi esensial' }]);
  });

  it('hashes equal contexts equally and different ones differently', () => {
    const a = hashDiagnosisContext(buildDiagnosisRequestContext(source));
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(hashDiagnosisContext(buildDiagnosisRequestContext(source))).toBe(a);
    expect(hashDiagnosisContext(buildDiagnosisRequestContext({ ...source, keluhanUtama: 'batuk' }))).not.toBe(a);
  });

  it('adds recorded bedside findings, and without any keeps the prefetch payload and hash', () => {
    const plain = buildDiagnosisRequestContext(source);
    expect(buildDiagnosisRequestContext({ ...source, bedsideFindings: [] })).toEqual(plain);
    expect('bedside_findings' in plain).toBe(false);
    const findings = [
      { kind: 'exam' as const, item: 'Auskultasi paru', findings: [{ name: 'Ronki basah halus', state: 'present' as const }] },
    ];
    const withFindings = buildDiagnosisRequestContext({ ...source, bedsideFindings: findings });
    expect(withFindings.bedside_findings).toEqual(findings);
    expect(hashDiagnosisContext(withFindings)).not.toBe(hashDiagnosisContext(plain));
  });

  it('hashes independently of key order', () => {
    const ctx = buildDiagnosisRequestContext(source);
    const { patient_age, ...rest } = ctx;
    const reordered = { patient_age, ...rest };
    expect(Object.keys(reordered)).not.toEqual(Object.keys(ctx));
    expect(hashDiagnosisContext(reordered)).toBe(hashDiagnosisContext(ctx));
  });

  // Chief, 2026-09-30: the BP algorithm runs on the latest visit's reading when the RME has none.
  it('carries the latest visit blood pressure, and without one keeps the payload and hash', () => {
    const plain = buildDiagnosisRequestContext(source);
    expect('previous_blood_pressure' in plain).toBe(false);
    const previous = { systolic: 150, diastolic: 95, when: '12 hari lalu' };
    expect(buildDiagnosisRequestContext({ ...source, previousBloodPressure: previous }).previous_blood_pressure).toEqual(previous);
  });

  it('takes the latest visit with a measured blood pressure', () => {
    const visit = (timestamp: string, sbp: number, dbp: number) => ({
      patient_id: 'RM-SYN',
      encounter_id: timestamp,
      timestamp,
      vitals: { sbp, dbp, hr: 80, rr: 18, temp: 36.6, glucose: 0 },
      keluhan_utama: 'kontrol',
      source: 'scrape' as const,
    });
    const now = new Date(2026, 8, 30);
    expect(
      latestVisitBloodPressure([visit('2026-09-10', 140, 90), visit('2026-09-25', 0, 0), visit('2026-09-18', 150, 95)], now)
    ).toEqual({ systolic: 150, diastolic: 95, when: '12 hari lalu' });
    expect(latestVisitBloodPressure([visit('2026-09-25', 0, 0)], now)).toBeUndefined();
    expect(latestVisitBloodPressure([], now)).toBeUndefined();
  });
});
