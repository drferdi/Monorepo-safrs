// Designed and constructed by Drferdi.
/**
 * pii-guard — RED test suite.
 *
 * Fail-closed tripwire between Assist and the platform API. Reuses anonymizer
 * primitives (`containsPII`, `validateAnonymization`) from
 * `lib/iskandar-diagnosis-engine/anonymizer.ts` to avoid duplicating PII
 * detection logic.
 *
 * Invariants under test:
 *  - Any outbound payload serializing to PII must throw before the network
 *    call is attempted.
 *  - An already-anonymized clinical context must pass through unchanged.
 *  - `hashPatientRef()` must produce deterministic 64-char lowercase hex
 *    SHA-256 digests, including when the input looks like raw PII.
 *  - Realistic vital-sign payloads must NOT false-positive against BPJS or
 *    NIK regexes (3-digit values inside typed keys cannot match 13/16-digit
 *    consecutive-digit patterns).
 */

import { describe, expect, it } from 'vitest';

import type { AnonymizedClinicalContext } from './ai-types';
import { assertNoPII, hashPatientRef, PIILeakError } from './pii-guard';

describe('pii-guard :: assertNoPII', () => {
  it('throws PIILeakError on raw NIK (16 digits)', () => {
    const body = { notes: 'Pasien dengan NIK 1234567890123456 hadir.' };
    expect(() => assertNoPII(body)).toThrow(PIILeakError);
  });

  it('throws PIILeakError on Indonesian phone numbers', () => {
    const body1 = { contact: 'HP pasien 081234567890' };
    const body2 = { contact: 'WA +6281234567890' };
    expect(() => assertNoPII(body1)).toThrow(PIILeakError);
    expect(() => assertNoPII(body2)).toThrow(PIILeakError);
  });

  it('throws PIILeakError on RM (rekam medis) identifiers', () => {
    const body1 = { header: 'RM: ABC12345' };
    const body2 = { header: 'No. RM 98765-XYZ' };
    expect(() => assertNoPII(body1)).toThrow(PIILeakError);
    expect(() => assertNoPII(body2)).toThrow(PIILeakError);
  });

  it('throws PIILeakError on BPJS numbers (13 digits)', () => {
    const body = { bpjs: '1234567890123' };
    expect(() => assertNoPII(body)).toThrow(PIILeakError);
  });

  it('throws PIILeakError on Indonesian address markers', () => {
    const cases = [
      { alamat: 'Jl. Merdeka No. 12' },
      { alamat: 'RT 003/RW 005' },
      { alamat: 'Kel. Sukamaju' },
      { alamat: 'Kec. Tanah Abang' },
    ];
    for (const body of cases) {
      expect(() => assertNoPII(body), JSON.stringify(body)).toThrow(PIILeakError);
    }
  });

  it('throws PIILeakError on Indonesian honorific names', () => {
    const cases = [{ patient: 'Tn. Budi Santoso' }, { patient: 'Ny. Siti Aminah' }];
    for (const body of cases) {
      expect(() => assertNoPII(body), JSON.stringify(body)).toThrow(PIILeakError);
    }
  });

  it('passes through an already-anonymized AnonymizedClinicalContext', () => {
    const ctx: AnonymizedClinicalContext = {
      keluhan_utama: 'Demam tinggi 3 hari',
      keluhan_tambahan: 'Nyeri kepala',
      usia_tahun: 35,
      jenis_kelamin: 'L',
      vital_signs: {
        systolic: 120,
        diastolic: 80,
        heart_rate: 90,
        respiratory_rate: 18,
        spo2: 98,
        temperature: 38.5,
      },
    };
    const body = { context: ctx };
    expect(() => assertNoPII(body, ctx)).not.toThrow();
  });

  it('does NOT false-positive on a realistic vital-signs payload', () => {
    const body = {
      vital_signs: {
        systolic: 120,
        diastolic: 80,
        heart_rate: 90,
        respiratory_rate: 18,
        spo2: 98,
        temperature: 36.7,
        glucose_mg_dl: 120,
      },
      map_mmhg: 93,
    };
    expect(() => assertNoPII(body)).not.toThrow();
  });
});

describe('pii-guard :: hashPatientRef', () => {
  it('returns a 64-char lowercase hex SHA-256 digest', async () => {
    const hash = await hashPatientRef('ID-0001');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', async () => {
    const a = await hashPatientRef('ID-0001');
    const b = await hashPatientRef('ID-0001');
    expect(a).toBe(b);
  });

  it('produces distinct digests for distinct inputs', async () => {
    const a = await hashPatientRef('ID-0001');
    const b = await hashPatientRef('ID-0002');
    expect(a).not.toBe(b);
  });

  it('hashes a PII-looking ref without rejecting it (hash is the defense)', async () => {
    const hash = await hashPatientRef('1234567890123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
