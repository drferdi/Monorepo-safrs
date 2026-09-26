import { describe, expect, it } from 'vitest';

import {
  assessVitalGuardrails,
  normalizeVitalInput,
  type VitalGuardrailState,
} from './vital-guardrails';

const baseState = (overrides: Partial<VitalGuardrailState> = {}): VitalGuardrailState => ({
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  pregnancyStatus: null,
  painScore: '',
  ...overrides,
});

describe('vital guardrails', () => {
  it('auto-corrects common temperature decimal omission', () => {
    expect(normalizeVitalInput('temp', '365')).toEqual({
      value: '36.5',
      corrected: true,
      message: 'Suhu 365 dikoreksi otomatis menjadi 36.5 C.',
    });
  });

  it('hard-stops impossible blood pressure and reversed systolic/diastolic', () => {
    const result = assessVitalGuardrails(baseState({ sbp: '80', dbp: '80' }), {
      age: 45,
      gender: 'L',
    });

    expect(result.hasHardStop).toBe(true);
    expect(result.fieldStatus.sbp.hardStop).toContain('Sistolik harus lebih besar');
    expect(result.fieldStatus.dbp.hardStop).toContain('Sistolik harus lebih besar');
  });

  it('hard-stops impossible single vital values', () => {
    const result = assessVitalGuardrails(
      baseState({
        sbp: '301',
        dbp: '80',
        hr: '301',
        rr: '101',
        temp: '46',
        spo2: '101',
        glucose: '1501',
      }),
      { age: 45, gender: 'L' }
    );

    expect(result.hasHardStop).toBe(true);
    expect(result.hardStops.map((stop) => stop.field)).toEqual(
      expect.arrayContaining(['sbp', 'hr', 'rr', 'temp', 'spo2', 'glucose'])
    );
  });

  it('classifies soft flags and code red cues from adult vitals', () => {
    const result = assessVitalGuardrails(
      baseState({
        sbp: '205',
        dbp: '90',
        hr: '145',
        rr: '32',
        spo2: '89',
        glucose: '45',
        temp: '40.5',
      }),
      { age: 45, gender: 'L' }
    );

    expect(result.hasHardStop).toBe(false);
    expect(result.fieldStatus.sbp.severity).toBe('critical');
    expect(result.fieldStatus.hr.severity).toBe('critical');
    expect(result.fieldStatus.rr.severity).toBe('critical');
    expect(result.fieldStatus.spo2.severity).toBe('critical');
    expect(result.fieldStatus.glucose.severity).toBe('critical');
    expect(result.codeRedCues.map((cue) => cue.field)).toEqual(
      expect.arrayContaining(['sbp', 'hr', 'rr', 'spo2', 'glucose'])
    );
  });

  it('flags preeclampsia when pregnancy and BP are elevated', () => {
    const result = assessVitalGuardrails(
      baseState({ sbp: '142', dbp: '88', pregnancyStatus: true }),
      { age: 30, gender: 'P' }
    );

    expect(result.softFlags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'pregnancy',
          severity: 'critical',
          title: 'WASPADA PREEKLAMPSIA',
        }),
      ])
    );
  });

  it('flags urgent pain and symptom code red phrases', () => {
    const result = assessVitalGuardrails(
      baseState({ painScore: '7', symptomText: 'Nyeri dada dan sesak berat sejak pagi' }),
      { age: 45, gender: 'L' }
    );

    expect(result.softFlags).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'pain', severity: 'critical' })])
    );
    expect(result.codeRedCues).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'symptom', codeRedCue: true })])
    );
  });

  it('uses infant thresholds and locks numeric pain scale for children under three', () => {
    const result = assessVitalGuardrails(
      baseState({ hr: '55', rr: '70', sbp: '65', painScore: '5' }),
      { age: 0, gender: 'L' }
    );

    expect(result.hasHardStop).toBe(true);
    expect(result.hardStops).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'hr' })])
    );
    expect(result.fieldStatus.rr.severity).toBe('warning');
    expect(result.fieldStatus.sbp.severity).toBe('warning');
    expect(result.uiLocks.painScore).toBe('Gunakan Skala FLACC, bukan angka 0-10');
  });

  it('uses child thresholds and cuff warning for pediatric hypertension', () => {
    const result = assessVitalGuardrails(baseState({ hr: '125', rr: '31', sbp: '125' }), {
      age: 8,
      gender: 'P',
    });

    expect(result.fieldStatus.hr.severity).toBe('warning');
    expect(result.fieldStatus.rr.severity).toBe('warning');
    expect(result.fieldStatus.sbp.recommendation).toContain('Manset Anak');
  });

  it('uses geriatric fever and fall-risk thresholds and recommends ADL preset', () => {
    const result = assessVitalGuardrails(baseState({ temp: '37.3', sbp: '98' }), {
      age: 70,
      gender: 'L',
    });

    expect(result.fieldStatus.temp.severity).toBe('warning');
    expect(result.fieldStatus.sbp.recommendation).toContain('Risiko jatuh tinggi');
    expect(result.uiDefaults.autosenPreset).toBe('adl');
  });

  it('requires pregnancy verification for reproductive-age symptom signals', () => {
    const result = assessVitalGuardrails(
      baseState({ symptomText: 'Mual muntah dan nyeri perut bawah', pregnancyStatus: null }),
      { age: 25, gender: 'P' }
    );

    expect(result.hasHardStop).toBe(true);
    expect(result.uiRequired.pregnancyStatus).toBe(true);
    expect(result.hardStops).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'pregnancy' })])
    );
  });

  it('requires glucose and locks pain scale for reduced consciousness symptoms', () => {
    const result = assessVitalGuardrails(baseState({ symptomText: 'Pasien koma' }), {
      age: 45,
      gender: 'L',
    });

    expect(result.hasHardStop).toBe(true);
    expect(result.uiRequired.glucose).toBe(true);
    expect(result.uiLocks.painScore).toBe('Tidak relevan - Pasien tidak sadar');
    expect(result.codeRedCues).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'symptom' })])
    );
  });

  it('adds obesity and disability contextual notes', () => {
    const result = assessVitalGuardrails(
      baseState({
        sbp: '130',
        dbp: '80',
        spo2: '94',
        obesityConfirmation: 'morbid_obesity',
        disabilityType: 'Daksa',
      }),
      { age: 45, gender: 'L' }
    );

    expect(result.contextNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'obesity', title: 'Validasi manset tensi' }),
        expect.objectContaining({ field: 'obesity', title: 'Risiko sleep apnea' }),
        expect.objectContaining({ field: 'disability', title: 'Catatan antropometri' }),
      ])
    );
  });
});
