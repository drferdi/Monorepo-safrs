// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import {
  buildCanonicalRequestId,
  buildCanonicalTriageInput,
  type BuildCanonicalTriageInputArgs,
} from './canonical-triage-builder';

// ============================================================================
// HELPERS
// ============================================================================

const baseArgs: BuildCanonicalTriageInputArgs = {
  requestId: 'assist-RM001-1234567890',
  requestTime: '2026-04-07T10:00:00.000Z',
  patientName: 'Pasien Test',
  patientGender: 'L',
  patientAge: 45,
  patientRM: 'RM001',
  vitals: { sbp: 130, dbp: 85, hr: 80, rr: 18, temp: 36.8, spo2: 97, glucose: 110 },
  keluhanUtama: 'Kontrol rutin hipertensi',
};

// ============================================================================
// buildCanonicalRequestId
// ============================================================================

describe('buildCanonicalRequestId', () => {
  it('generates ID with assist- prefix and RM number', () => {
    const id = buildCanonicalRequestId('RM-123');
    expect(id).toMatch(/^assist-RM-123-\d+$/);
  });

  it('uses unknown when RM is empty', () => {
    const id = buildCanonicalRequestId('');
    expect(id).toMatch(/^assist-unknown-\d+$/);
  });
});

// ============================================================================
// buildCanonicalTriageInput — structure
// ============================================================================

describe('buildCanonicalTriageInput — base structure', () => {
  it('builds valid payload with all required top-level keys', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.request_id).toBe(baseArgs.requestId);
    expect(result.request_time).toBe(baseArgs.requestTime);
    expect(result.source.app).toBe('med-assist');
    expect(result.source.engine_mode).toBe('canonical');
  });

  it('maps patient fields correctly', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.patient.rm).toBe('RM001');
    expect(result.patient.name).toBe('Pasien Test');
    expect(result.patient.gender).toBe('L');
    expect(result.patient.age).toBe(45);
  });

  it('maps 7 core vitals correctly', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.sbp).toBe(130);
    expect(result.vitals.dbp).toBe(85);
    expect(result.vitals.hr).toBe(80);
    expect(result.vitals.rr).toBe(18);
    expect(result.vitals.temp).toBe(36.8);
    expect(result.vitals.spo2).toBe(97);
  });
});

// ============================================================================
// buildCanonicalTriageInput — glucose handling
// ============================================================================

describe('buildCanonicalTriageInput — glucose', () => {
  it('includes glucose as GDS object when > 0', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.glucose).toEqual({ value: 110, type: 'GDS' });
  });

  it('omits glucose when value is 0', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, glucose: 0 },
    });
    expect(result.vitals.glucose).toBeUndefined();
  });
});

// ============================================================================
// buildCanonicalTriageInput — GAP-001 new fields
// ============================================================================

describe('buildCanonicalTriageInput — GAP-001 clinical fields', () => {
  it('includes avpu when provided and not "A"', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, avpu: 'V' },
    });
    expect(result.vitals.avpu).toBe('V');
  });

  it('includes avpu "A" (Alert) when explicitly set', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, avpu: 'A' },
    });
    expect(result.vitals.avpu).toBe('A');
  });

  it('omits avpu when not provided', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.avpu).toBeUndefined();
  });

  it('includes supplemental_o2 when true', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, supplemental_o2: true },
    });
    expect(result.vitals.supplemental_o2).toBe(true);
  });

  it('includes supplemental_o2 false when explicitly set', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, supplemental_o2: false },
    });
    expect(result.vitals.supplemental_o2).toBe(false);
  });

  it('omits supplemental_o2 when not provided', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.supplemental_o2).toBeUndefined();
  });

  it('includes pain_score when provided', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      vitals: { ...baseArgs.vitals, pain_score: 7 },
    });
    expect(result.vitals.pain_score).toBe(7);
  });

  it('omits pain_score when not provided', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.pain_score).toBeUndefined();
  });

  it('sets has_copd from hasCopd arg', () => {
    const withCopd = buildCanonicalTriageInput({ ...baseArgs, hasCopd: true });
    const withoutCopd = buildCanonicalTriageInput({ ...baseArgs, hasCopd: false });
    expect(withCopd.vitals.has_copd).toBe(true);
    expect(withoutCopd.vitals.has_copd).toBe(false);
  });

  it('defaults has_copd to false when hasCopd not provided', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.vitals.has_copd).toBe(false);
  });
});

// ============================================================================
// buildCanonicalTriageInput — bedside_signs
// ============================================================================

describe('buildCanonicalTriageInput — bedside_signs', () => {
  it('uses structuredSignsText when explicitly provided', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      structuredSignsText: 'KU: sesak | AVPU: V | Nyeri: 8/10',
    });
    expect(result.bedside_signs?.structured_signs_text).toBe('KU: sesak | AVPU: V | Nyeri: 8/10');
  });

  it('composes structured signs text from available fields', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      keluhanUtama: 'Sesak napas',
      vitals: { ...baseArgs.vitals, avpu: 'C', pain_score: 6, supplemental_o2: true },
    });
    const text = result.bedside_signs?.structured_signs_text ?? '';
    expect(text).toContain('KU: Sesak napas');
    expect(text).toContain('AVPU: C');
    expect(text).toContain('Nyeri: 6/10');
    expect(text).toContain('O2 Suplemen: Ya');
  });

  it('omits bedside_signs when all composed parts are empty/default', () => {
    // No symptomTextRaw, AVPU is A (default), no pain, no O2, minimal keluhan
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      keluhanUtama: '',
      symptomTextRaw: '',
    });
    // KU is empty, so nothing to compose
    expect(result.bedside_signs).toBeUndefined();
  });

  it('does NOT include AVPU in bedside_signs when avpu is "A" (normal)', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      keluhanUtama: 'Kontrol rutin',
      vitals: { ...baseArgs.vitals, avpu: 'A' },
    });
    const text = result.bedside_signs?.structured_signs_text ?? '';
    expect(text).not.toContain('AVPU');
  });
});

// ============================================================================
// buildCanonicalTriageInput — pregnancy status
// ============================================================================

describe('buildCanonicalTriageInput — pregnancy', () => {
  it('sets tidak_relevan for male patients', () => {
    const result = buildCanonicalTriageInput({ ...baseArgs, patientGender: 'L' });
    expect(result.context.pregnancy_status).toBe('tidak_relevan');
  });

  it('sets hamil when female and pregnancyStatus true', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      patientGender: 'P',
      pregnancyStatus: true,
    });
    expect(result.context.pregnancy_status).toBe('hamil');
  });

  it('sets tidak_hamil when female and pregnancyStatus false', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      patientGender: 'P',
      pregnancyStatus: false,
    });
    expect(result.context.pregnancy_status).toBe('tidak_hamil');
  });

  it('sets tidak_diisi when female and pregnancyStatus null', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      patientGender: 'P',
      pregnancyStatus: null,
    });
    expect(result.context.pregnancy_status).toBe('tidak_diisi');
  });
});

// ============================================================================
// buildCanonicalTriageInput — extended context + metadata
// ============================================================================

describe('buildCanonicalTriageInput — extended context + metadata', () => {
  it('maps payer, BPJS, kelurahan, DOB, and facility metadata to patient payload', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      patientDOB: '1980-01-02',
      patientBPJSStatus: 'aktif',
      patientKelurahan: 'Ciumbuleuit',
      patientFacilityName: 'Puskesmas Sentra',
      patientPayerLabel: 'BPJS PBI',
      autosenPreset: 'hypertension',
    });

    expect(result.patient.dob).toBe('1980-01-02');
    expect(result.patient.bpjs_status).toBe('aktif');
    expect(result.patient.kelurahan).toBe('Ciumbuleuit');
    expect(result.patient.facility_name).toBe('Puskesmas Sentra');
    expect(result.patient.payer_label).toBe('BPJS PBI');
    expect(result.narrative.autosen_preset).toBe('hypertension');
  });

  it('maps allergies, pregnancy risk, disability, obesity, and special conditions into context', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      patientGender: 'P',
      allergies: ['Penicillin', 'Seafood'],
      pregnancyStatus: true,
      extractedPregnancyRisk: 'Risiko tinggi',
      extractedSpecialConditions: ['geriatri', 'obesitas'],
      disabilityType: 'Daksa',
      obesityConfirmation: 'confirmed',
    });

    expect(result.context.allergies).toEqual(['Penicillin', 'Seafood']);
    expect(result.context.pregnancy_status).toBe('hamil');
    expect(result.context.pregnancy_risk).toBe('Risiko tinggi');
    expect(result.context.special_conditions).toEqual(['geriatri', 'obesitas']);
    expect(result.context.disability_type).toBe('Daksa');
    expect(result.context.obesity_confirmation).toBe('confirmed');
  });

  it('maps obesity confirmation negative state without inventing disability data', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      obesityConfirmation: 'not_confirmed',
      disabilityType: '',
    });

    expect(result.context.obesity_confirmation).toBe('not_confirmed');
    expect(result.context.disability_type).toBeUndefined();
  });
});

// ============================================================================
// buildCanonicalTriageInput — chronic history
// ============================================================================

describe('buildCanonicalTriageInput — chronic history', () => {
  it('splits chronicHistorySummary into array', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      chronicHistorySummary: 'DM, HT, Jantung',
    });
    expect(result.context.chronic_diseases).toEqual(['DM', 'HT', 'Jantung']);
  });

  it('returns empty array when chronicHistorySummary is empty', () => {
    const result = buildCanonicalTriageInput({ ...baseArgs, chronicHistorySummary: '' });
    expect(result.context.chronic_diseases).toEqual([]);
  });

  it('ignores "Menunggu Input" placeholder', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      chronicHistorySummary: 'Menunggu Input',
    });
    expect(result.context.chronic_diseases).toEqual([]);
  });
});

// ============================================================================
// buildCanonicalTriageInput — visit history
// ============================================================================

describe('buildCanonicalTriageInput — visit history', () => {
  it('maps prefetchedVisits to history section', () => {
    const result = buildCanonicalTriageInput({
      ...baseArgs,
      prefetchedVisits: [
        {
          id: 1,
          patient_id: 'RM001',
          encounter_id: 'ENC-001',
          timestamp: '2026-03-01T08:00:00Z',
          vitals: { sbp: 150, dbp: 95, hr: 82, rr: 18, temp: 36.5, glucose: 120 },
          keluhan_utama: 'HT kontrol',
          source: 'scrape',
        },
      ],
    });
    expect(result.history).toBeDefined();
    expect(result.history!.visits_used).toBe(1);
    expect(result.history!.prefetched_visits![0].encounter_id).toBe('ENC-001');
    expect(result.history!.prefetched_visits![0].vitals.sbp).toBe(150);
  });

  it('returns empty history when no visits provided', () => {
    const result = buildCanonicalTriageInput(baseArgs);
    expect(result.history).toBeDefined();
    expect(result.history!.visits_used).toBe(0);
    expect(result.history!.prefetched_visits).toHaveLength(0);
  });
});
