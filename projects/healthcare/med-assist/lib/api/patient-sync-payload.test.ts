import { describe, expect, it } from 'vitest';

import { assertNoPII, PIILeakError } from './pii-guard';
import {
  buildPatientSyncPayload,
  inferStructuredSignsFromPatientSyncInput,
} from './patient-sync-payload';

describe('patient-sync-payload', () => {
  it('infers respiratory, glucose crisis, and perfusion flags from scraped assist context', () => {
    const payload = buildPatientSyncPayload({
      patient: {
        name: 'Pasien Demo',
        age: 46,
        gender: 'L',
        rm: 'RM-001',
      },
      vitals: {
        rr: 32,
        glucose: 356,
      },
      narrative: {
        keluhan_utama: 'Sesak berat, tidak bisa bicara kalimat panjang, mual muntah',
        keluhan_tambahan: 'keringat dingin, akral dingin, hampir pingsan',
      },
    });

    expect(payload.structuredSigns?.respiratoryDistress?.unableToSpeakFullSentences).toBe(true);
    expect(payload.structuredSigns?.respiratoryDistress?.distressObserved).toBe(true);
    expect(payload.structuredSigns?.dkaHhs?.nausea_vomiting).toBe(true);
    expect(payload.structuredSigns?.dkaHhs?.extreme_hyperglycemia).toBe(true);
    expect(payload.structuredSigns?.perfusionShock?.presyncope).toBe(true);
    expect(payload.structuredSigns?.perfusionShock?.clammySkin).toBe(true);
    expect(payload.structuredSigns?.perfusionShock?.coldExtremities).toBe(true);
  });

  it('infers HMOD flags from complaint text without manual checkbox input', () => {
    const signs = inferStructuredSignsFromPatientSyncInput({
      patient: {
        name: 'Pasien Demo',
        age: 58,
        gender: 'P',
      },
      vitals: {},
      narrative: {
        keluhan_utama: 'Nyeri dada dan pandangan kabur',
        keluhan_tambahan: 'Sakit kepala hebat, bingung',
      },
      medicalHistory: ['Hipertensi lama'],
    });

    expect(signs?.hmod?.chest_pain).toBe(true);
    expect(signs?.hmod?.vision_changes).toBe(true);
    expect(signs?.hmod?.severe_headache).toBe(true);
    expect(signs?.hmod?.altered_mental_status).toBe(true);
  });

  it('upgrades structured signs from assist alert IDs when bedside form already flagged severity', () => {
    const payload = buildPatientSyncPayload({
      patient: {
        name: 'Pasien Demo',
        age: 50,
        gender: 'L',
        rm: 'RM-ALERT',
      },
      vitals: {
        rr: 29,
        glucose: 420,
      },
      narrative: {
        keluhan_utama: 'Keluhan singkat',
        keluhan_tambahan: '',
      },
      alertIds: ['gate6-critical-tachypnea', 'gate3-hyperglycemia-crisis'],
    });

    expect(payload.structuredSigns?.respiratoryDistress?.distressObserved).toBe(true);
    expect(payload.structuredSigns?.dkaHhs?.extreme_hyperglycemia).toBe(true);
  });

  it('omits structured signs when no clinical signal is available', () => {
    const payload = buildPatientSyncPayload({
      patient: {
        name: 'Pasien Demo',
        age: 30,
        gender: 'L',
      },
      vitals: {
        rr: 18,
        glucose: 102,
      },
      narrative: {
        keluhan_utama: 'Kontrol rutin',
        keluhan_tambahan: '',
      },
    });

    expect(payload).not.toHaveProperty('structuredSigns');
  });

  // Chief, 2026-10-03: the crew portal may receive the identity with parts of the name hidden.
  describe('identity sent to the crew portal', () => {
    const input = {
      patient: {
        name: 'Ferdi Iskandar',
        age: 40,
        gender: 'L' as const,
        rm: '0012345',
        noBpjs: '0001234567890',
      },
      vitals: { rr: 18 },
      narrative: { keluhan_utama: 'Batuk tiga hari', keluhan_tambahan: '' },
    };

    it('masks the name and the BPJS number and keeps the RM readable', () => {
      const payload = buildPatientSyncPayload(input);

      expect(payload.patient).toEqual({
        name: 'F**di I*****ar',
        age: 40,
        gender: 'L',
        rm: '0012345',
        noBpjs: '*********7890',
      });
    });

    it('passes the outbound PII guard, which blocks the unmasked BPJS number', () => {
      expect(() => assertNoPII(JSON.stringify(buildPatientSyncPayload(input)))).not.toThrow();
      expect(() => assertNoPII(JSON.stringify(input))).toThrow(PIILeakError);
    });
  });
});
