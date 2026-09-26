// Designed and constructed by Drferdi.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosisSuggestion } from '@/types/api';
import {
  compareDiagnosisVersions,
  isDiagnosisV2ShadowEnabled,
  runDiagnosisV2Shadow,
  shadowComparisonToAuditMetadata,
} from './diagnosis-v2';

const baseSuggestions: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'J18.9',
    nama: 'Pneumonia',
    confidence: 0.74,
    rationale: 'Demam, batuk, dan sesak.',
    red_flags: ['sesak_berat'],
    recommended_actions: ['Pantau saturasi'],
  },
  {
    rank: 2,
    icd_x: 'J06.9',
    nama: 'ISPA',
    confidence: 0.72,
    rationale: 'Batuk pilek.',
    red_flags: [],
    recommended_actions: ['Terapi suportif'],
  },
  {
    rank: 3,
    icd_x: 'A41.9',
    nama: 'Sepsis, unspecified organism',
    confidence: 0.55,
    rationale: 'Infeksi sistemik perlu dieksklusi.',
    red_flags: ['demam_tinggi', 'takikardia'],
    recommended_actions: ['Evaluasi sepsis'],
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('diagnosis-v2 shadow mode', () => {
  it('reads SENTRA_DIAGNOSIS_V2_SHADOW feature flag', () => {
    vi.stubEnv('SENTRA_DIAGNOSIS_V2_SHADOW', 'true');

    expect(isDiagnosisV2ShadowEnabled()).toBe(true);
  });

  it('returns governance language that keeps physician as final decision-maker', () => {
    const result = runDiagnosisV2Shadow({
      suggestions: baseSuggestions,
      context: {
        keluhan_utama: 'Demam, batuk, sesak napas',
        keluhan_tambahan: 'Lemas',
        vital_signs: {
          systolic: 110,
          diastolic: 70,
          heart_rate: 108,
          respiratory_rate: 26,
          temperature: 39.1,
        },
      },
    });

    expect(result.guidance).toContain('support diagnostic reasoning');
    expect(result.guidance).toContain('differential considerations');
    expect(result.guidance).toContain('physician remains final decision-maker');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('abstains from a primary pick when top candidates are too close', () => {
    const result = runDiagnosisV2Shadow({
      suggestions: [
        {
          rank: 1,
          icd_x: 'J06.9',
          nama: 'ISPA',
          confidence: 0.61,
          rationale: 'Batuk pilek.',
          red_flags: [],
          recommended_actions: [],
        },
        {
          rank: 2,
          icd_x: 'J20.9',
          nama: 'Bronkitis akut',
          confidence: 0.6,
          rationale: 'Batuk dan napas cepat.',
          red_flags: [],
          recommended_actions: [],
        },
      ],
      context: {
        keluhan_utama: 'Batuk dan demam',
        keluhan_tambahan: 'Napas terasa berat',
        vital_signs: {
          systolic: 118,
          diastolic: 74,
          heart_rate: 100,
          respiratory_rate: 22,
          temperature: 37.9,
        },
      },
    });

    expect(result.primaryAbstained).toBe(true);
    expect(result.uncertaintyLevel).toBe('high');
  });
});

describe('diagnosis-v2 comparator', () => {
  it('returns the requested comparison fields', () => {
    const comparison = compareDiagnosisVersions({
      v1Suggestions: [
        { ...baseSuggestions[0], icd_x: 'J06.9' },
        { ...baseSuggestions[1], icd_x: 'J20.9' },
      ],
      v2Suggestions: [
        { ...baseSuggestions[2], icd_x: 'A41.9' },
        { ...baseSuggestions[0], icd_x: 'J06.9' },
      ],
      v2UncertaintyLevel: 'moderate',
      v2PrimaryAbstained: false,
    });

    expect(comparison).toEqual({
      v1_top5_icd: ['J06.9', 'J20.9'],
      v2_top5_icd: ['A41.9', 'J06.9'],
      top1_changed: true,
      critical_differential_added: true,
      v2_uncertainty_level: 'moderate',
      v2_primary_abstained: false,
    });
  });

  it('builds de-identified audit metadata only from codes and flags', () => {
    const metadata = shadowComparisonToAuditMetadata({
      v1_top5_icd: ['J06.9'],
      v2_top5_icd: ['A41.9'],
      top1_changed: true,
      critical_differential_added: true,
      v2_uncertainty_level: 'high',
      v2_primary_abstained: true,
    });

    expect(metadata).toEqual({
      v1_top5_icd: '["J06.9"]',
      v2_top5_icd: '["A41.9"]',
      top1_changed: true,
      critical_differential_added: true,
      v2_uncertainty_level: 'high',
      v2_primary_abstained: true,
    });
    expect(JSON.stringify(metadata)).not.toContain('Demam');
    expect(JSON.stringify(metadata)).not.toContain('Dr');
  });

  it('reprioritizes chest-pain differential toward ACS when vital instability is present', () => {
    const v1Suggestions: DiagnosisSuggestion[] = [
      {
        rank: 1,
        icd_x: 'K21.9',
        nama: 'Refluks gastroesofageal',
        confidence: 0.81,
        rationale: 'Nyeri dada seperti terbakar.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 2,
        icd_x: 'I20.9',
        nama: 'Suspek Angina / Rule-Out ACS',
        confidence: 0.62,
        rationale: 'Nyeri dada perlu eksklusi ACS.',
        red_flags: ['nyeri_dada_persisten'],
        recommended_actions: ['EKG 12 sadapan'],
      },
      {
        rank: 3,
        icd_x: 'M94.0',
        nama: 'Nyeri dinding dada muskuloskeletal',
        confidence: 0.58,
        rationale: 'Nyeri tekan lokal.',
        red_flags: [],
        recommended_actions: [],
      },
    ];

    const v2 = runDiagnosisV2Shadow({
      suggestions: v1Suggestions,
      context: {
        keluhan_utama: 'Nyeri dada dan sesak napas',
        keluhan_tambahan: 'Keringat dingin sejak 1 jam',
        vital_signs: {
          systolic: 186,
          diastolic: 118,
          heart_rate: 124,
          respiratory_rate: 28,
          temperature: 36.9,
        },
      },
    });

    const comparison = compareDiagnosisVersions({
      v1Suggestions,
      v2Suggestions: v2.suggestions,
      v2UncertaintyLevel: v2.uncertaintyLevel,
      v2PrimaryAbstained: v2.primaryAbstained,
    });

    expect(comparison.v1_top5_icd[0]).toBe('K21.9');
    expect(comparison.v2_top5_icd[0]).toBe('I20.9');
    expect(comparison.top1_changed).toBe(true);
  });

  it('pulls a critical sepsis differential into the top 5 when systemic inflammatory signals are present', () => {
    const v1Suggestions: DiagnosisSuggestion[] = [
      {
        rank: 1,
        icd_x: 'J18.9',
        nama: 'Pneumonia',
        confidence: 0.79,
        rationale: 'Demam dan batuk.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 2,
        icd_x: 'J06.9',
        nama: 'ISPA',
        confidence: 0.74,
        rationale: 'Batuk pilek.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 3,
        icd_x: 'R50.9',
        nama: 'Demam, tidak spesifik',
        confidence: 0.7,
        rationale: 'Demam akut.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 4,
        icd_x: 'J20.9',
        nama: 'Bronkitis akut',
        confidence: 0.66,
        rationale: 'Batuk produktif.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 5,
        icd_x: 'E86',
        nama: 'Dehidrasi',
        confidence: 0.61,
        rationale: 'Asupan menurun.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 6,
        icd_x: 'A41.9',
        nama: 'Sepsis, unspecified organism',
        confidence: 0.45,
        rationale: 'Infeksi sistemik perlu disingkirkan.',
        red_flags: ['takikardia', 'demam_tinggi'],
        recommended_actions: ['Evaluasi sepsis'],
      },
    ];

    const v2 = runDiagnosisV2Shadow({
      suggestions: v1Suggestions,
      context: {
        keluhan_utama: 'Demam tinggi, sesak napas, lemas',
        keluhan_tambahan: 'Menggigil dan napas cepat',
        vital_signs: {
          systolic: 98,
          diastolic: 62,
          heart_rate: 132,
          respiratory_rate: 30,
          temperature: 39.4,
        },
      },
      maxResults: 6,
    });

    const comparison = compareDiagnosisVersions({
      v1Suggestions,
      v2Suggestions: v2.suggestions,
      v2UncertaintyLevel: v2.uncertaintyLevel,
      v2PrimaryAbstained: v2.primaryAbstained,
    });

    expect(comparison.v1_top5_icd).not.toContain('A41.9');
    expect(comparison.v2_top5_icd).toContain('A41.9');
    expect(comparison.critical_differential_added).toBe(true);
  });

  it('marks ambiguous low-separation respiratory differentials as abstained', () => {
    const v1Suggestions: DiagnosisSuggestion[] = [
      {
        rank: 1,
        icd_x: 'J06.9',
        nama: 'ISPA',
        confidence: 0.63,
        rationale: 'Batuk pilek.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 2,
        icd_x: 'J20.9',
        nama: 'Bronkitis akut',
        confidence: 0.62,
        rationale: 'Batuk dan ronki kasar.',
        red_flags: [],
        recommended_actions: [],
      },
      {
        rank: 3,
        icd_x: 'J02.9',
        nama: 'Faringitis akut',
        confidence: 0.59,
        rationale: 'Nyeri tenggorokan.',
        red_flags: [],
        recommended_actions: [],
      },
    ];

    const v2 = runDiagnosisV2Shadow({
      suggestions: v1Suggestions,
      context: {
        keluhan_utama: 'Batuk, pilek, tenggorokan nyeri',
        keluhan_tambahan: 'Demam ringan',
        vital_signs: {
          systolic: 118,
          diastolic: 76,
          heart_rate: 96,
          respiratory_rate: 20,
          temperature: 37.6,
        },
      },
    });

    expect(v2.uncertaintyLevel).toBe('high');
    expect(v2.primaryAbstained).toBe(true);
  });
});
