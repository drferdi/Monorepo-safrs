// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildDiagnosisRequestContext, hashDiagnosisContext } from './request-context';

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
    const findings = [{ kind: 'exam' as const, item: 'Auskultasi paru', findings: ['Ronki basah halus'] }];
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
});
