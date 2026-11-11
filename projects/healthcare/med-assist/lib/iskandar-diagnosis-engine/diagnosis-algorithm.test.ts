// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import type { DiagnosisSuggestion } from '@/types/api';
import { ChronicDiseaseType } from './chronic-disease-classifier';
import { runDiagnosisAlgorithm } from './diagnosis-algorithm';
import type { TrajectoryAnalysis } from './trajectory-analyzer';

const vitalsCriticalMetabolic = {
  sbp: 168,
  dbp: 102,
  hr: 114,
  rr: 24,
  temp: 38.6,
  glucose: 338,
};

const baseSuggestions: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'J06.9',
    nama: 'ISPA',
    confidence: 0.84,
    rationale: 'Batuk pilek dan nyeri tenggorokan.',
    red_flags: [],
    recommended_actions: ['Terapi simptomatik'],
  },
  {
    rank: 2,
    icd_x: 'E11.65',
    nama: 'Diabetes melitus tipe 2 dengan hiperglikemia',
    confidence: 0.72,
    rationale: 'Poliuria, polidipsia, dan gula darah tinggi.',
    red_flags: ['hiperglikemia_berat'],
    recommended_actions: ['Verifikasi glukosa dan tata laksana korektif'],
  },
  {
    rank: 3,
    icd_x: 'I10',
    nama: 'Hipertensi esensial',
    confidence: 0.69,
    rationale: 'Tekanan darah meningkat berulang.',
    red_flags: [],
    recommended_actions: ['Kontrol tekanan darah'],
  },
];

const chronicConfirmedTrajectory: TrajectoryAnalysis = {
  overallTrend: 'stable',
  overallRisk: 'moderate',
  vitalTrends: [],
  recommendations: [],
  summary: 'mock',
  visitCount: 3,
  global_deterioration: {
    state: 'stable',
    deterioration_score: 35,
  },
  acute_attack_risk_24h: {
    hypertensive_crisis_risk: 30,
    glycemic_crisis_risk: 20,
    sepsis_like_deterioration_risk: 10,
    shock_decompensation_risk: 8,
    stroke_acs_suspicion_risk: 12,
  },
  early_warning_burden: {
    total_breaches_last5: 1,
    breach_frequency: 0.2,
    breach_breakdown: {
      sbp_ge_160_count: 1,
      temp_ge_38_5_count: 0,
      gds_ge_300_count: 0,
      hr_extreme_count: 0,
      rr_extreme_count: 0,
    },
  },
  trajectory_volatility: {
    volatility_index: 20,
    stability_label: 'true_stable',
  },
  time_to_critical_estimate: {
    sbp_hours_to_critical: null,
    dbp_hours_to_critical: null,
    gds_hours_to_critical: null,
    temp_hours_to_critical: null,
    hr_hours_to_critical: null,
    rr_hours_to_critical: null,
  },
  mortality_proxy: {
    mortality_proxy_tier: 'moderate',
    mortality_proxy_score: 32,
    clinical_urgency_tier: 'moderate',
  },
  clinical_safe_output: {
    risk_tier: 'moderate',
    confidence: 0.72,
    drivers: [],
    missing_data: [],
    recommended_action: 'mock',
    review_window: '24h',
  },
  confirmed_chronic_diagnoses: [
    {
      icd_x: 'I10',
      nama: 'Hipertensi esensial',
      disease_type: ChronicDiseaseType.HYPERTENSION,
      confirmed_at: '2026-02-09T10:00:00.000Z',
    },
  ],
};

describe('runDiagnosisAlgorithm', () => {
  it('returns empty array on empty suggestions', () => {
    const result = runDiagnosisAlgorithm({
      suggestions: [],
      keluhanUtama: 'demam',
      vitals: vitalsCriticalMetabolic,
    });

    expect(result).toEqual([]);
  });

  it('preserves engine suggestion order (single ranking authority — no UI re-sort)', () => {
    // Engine ranked ISPA first; metabolic vitals would previously boost E11 above J06.
    const result = runDiagnosisAlgorithm({
      suggestions: baseSuggestions,
      keluhanUtama: 'Sering kencing, haus terus, lemas, mual',
      keluhanTambahan: 'demam',
      vitals: vitalsCriticalMetabolic,
    });

    expect(result.map((item) => item.suggestion.icd_x)).toEqual(['J06.9', 'E11.65', 'I10']);
    expect(result.map((item) => item.rank)).toEqual([1, 2, 3]);
    // Display metadata still computed (E11 vital fit high) without changing order.
    const diabetes = result.find((item) => item.suggestion.icd_x === 'E11.65');
    expect(diabetes?.scoreBreakdown.vitalFit).toBeGreaterThan(60);
    expect(diabetes?.adjustedConfidence).toBeCloseTo(0.72, 2);
  });

  it('keeps score in 0..100 and adjustedConfidence in 0..1', () => {
    const result = runDiagnosisAlgorithm({
      suggestions: baseSuggestions,
      keluhanUtama: 'Batuk pilek',
      vitals: {
        sbp: 118,
        dbp: 74,
        hr: 82,
        rr: 18,
        temp: 36.8,
        glucose: 102,
      },
    });

    for (const item of result) {
      expect(item.diagnosisScore).toBeGreaterThanOrEqual(0);
      expect(item.diagnosisScore).toBeLessThanOrEqual(100);
      expect(item.adjustedConfidence).toBeGreaterThanOrEqual(0);
      expect(item.adjustedConfidence).toBeLessThanOrEqual(1);
    }
  });

  it('respects maxResults', () => {
    const result = runDiagnosisAlgorithm({
      suggestions: baseSuggestions,
      keluhanUtama: 'demam',
      vitals: vitalsCriticalMetabolic,
      maxResults: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it('keeps chronic/vital score breakdown without reordering engine list', () => {
    const result = runDiagnosisAlgorithm({
      suggestions: [
        {
          rank: 1,
          icd_x: 'J06.9',
          nama: 'ISPA',
          confidence: 0.95,
          rationale: 'Gejala respirasi ringan.',
          red_flags: [],
          recommended_actions: [],
        },
        {
          rank: 2,
          icd_x: 'I10',
          nama: 'Hipertensi esensial',
          confidence: 0.62,
          rationale: 'Riwayat tekanan darah tinggi.',
          red_flags: [],
          recommended_actions: [],
        },
      ],
      keluhanUtama: 'pusing ringan',
      vitals: {
        sbp: 166,
        dbp: 102,
        hr: 90,
        rr: 18,
        temp: 36.8,
        glucose: 110,
      },
      trajectory: chronicConfirmedTrajectory,
    });

    expect(result.map((item) => item.suggestion.icd_x)).toEqual(['J06.9', 'I10']);
    const hypertension = result.find((item) => item.suggestion.icd_x === 'I10');
    expect(hypertension?.scoreBreakdown.confirmedChronicFit).toBe(100);
    expect(hypertension?.scoreBreakdown.chronicPriorityBonus).toBe(35);
  });

  it('records helminth mismatch penalty without dropping or reordering engine suggestions', () => {
    const ckdTrajectory: TrajectoryAnalysis = {
      ...chronicConfirmedTrajectory,
      confirmed_chronic_diagnoses: [
        {
          icd_x: 'N18.5',
          nama: 'Gagal ginjal kronik stadium 5',
          disease_type: ChronicDiseaseType.CHRONIC_KIDNEY,
          confirmed_at: '2026-02-09T10:00:00.000Z',
        },
      ],
    };

    const result = runDiagnosisAlgorithm({
      suggestions: [
        {
          rank: 1,
          icd_x: 'B76',
          nama: 'Penyakit cacing tambang',
          confidence: 0.82,
          rationale: 'Lemas dan gatal kulit.',
          red_flags: [],
          recommended_actions: [],
        },
        {
          rank: 2,
          icd_x: 'N18.5',
          nama: 'Gagal ginjal kronik stadium 5',
          confidence: 0.64,
          rationale: 'Riwayat CKD terkonfirmasi.',
          red_flags: [],
          recommended_actions: [],
        },
      ],
      keluhanUtama: 'badan lemas dan gatal',
      vitals: {
        sbp: 162,
        dbp: 96,
        hr: 96,
        rr: 20,
        temp: 36.7,
        glucose: 118,
      },
      trajectory: ckdTrajectory,
    });

    expect(result.map((item) => item.suggestion.icd_x)).toEqual(['B76', 'N18.5']);
    const helminth = result.find((item) => item.suggestion.icd_x === 'B76');
    expect(helminth?.scoreBreakdown.clinicalMismatchPenalty).toBeGreaterThan(0);
  });
});
