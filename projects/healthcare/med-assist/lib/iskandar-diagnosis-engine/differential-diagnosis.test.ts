// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import type { DiagnosisSuggestion } from '@/types/api';
import {
  buildDifferentialInsight,
  deriveAgainstSignals,
  deriveSupportingExamPlan,
  deriveVitalDrivers,
  extractComplaintSignals,
  matchSuggestionSignals,
} from './differential-diagnosis';

const baseSuggestion: DiagnosisSuggestion = {
  rank: 1,
  icd_x: 'I10',
  nama: 'Hipertensi esensial',
  confidence: 0.84,
  rationale: 'Tekanan darah tinggi menetap dengan keluhan sakit kepala dan pusing.',
  red_flags: [],
  recommended_actions: ['Konfirmasi tekanan darah serial'],
};

describe('differential-diagnosis helpers', () => {
  it('extracts complaint signals and keeps compound symptom phrases', () => {
    const result = extractComplaintSignals('Pasien nyeri dada dan sesak napas, pusing sejak pagi');
    expect(result).toContain('nyeri dada');
    expect(result).toContain('sesak napas');
    expect(result).toContain('pusing');
  });

  it('matches complaint signals against suggestion rationale', () => {
    const signals = ['nyeri dada', 'pusing', 'demam'];
    const matched = matchSuggestionSignals(baseSuggestion, signals);
    expect(matched).toContain('pusing');
    expect(matched).not.toContain('demam');
  });

  it('derives vital drivers for severe abnormalities', () => {
    const drivers = deriveVitalDrivers({
      sbp: 186,
      dbp: 122,
      hr: 126,
      rr: 26,
      temp: 39.1,
      glucose: 320,
    });

    expect(drivers.some((line) => line.includes('krisis hipertensi'))).toBe(true);
    expect(drivers.some((line) => line.includes('takikardia'))).toBe(true);
    expect(drivers.some((line) => line.includes('dekompensasi metabolik'))).toBe(true);
  });

  it('marks exam plan as required for high-risk metabolic profile', () => {
    const plan = deriveSupportingExamPlan(
      {
        ...baseSuggestion,
        icd_x: 'E11.9',
        nama: 'Diabetes melitus tipe 2',
      },
      {
        sbp: 150,
        dbp: 92,
        hr: 98,
        rr: 20,
        temp: 37.1,
        glucose: 348,
      },
      ['poliuria', 'polidipsia']
    );

    expect(plan.needLevel).toBe('required');
    expect(plan.tests.some((test) => test.includes('HbA1c'))).toBe(true);
    expect(plan.tests.some((test) => test.includes('Keton'))).toBe(true);
  });

  it('builds complete differential insight payload', () => {
    const insight = buildDifferentialInsight({
      suggestion: {
        ...baseSuggestion,
        icd_x: 'J06.9',
        nama: 'ISPA',
        rationale: 'Batuk, pilek, dan demam ringan tanpa distress napas.',
      },
      keluhanUtama: 'Batuk pilek disertai demam',
      keluhanTambahan: 'Tenggorokan sakit',
      vitals: {
        sbp: 124,
        dbp: 78,
        hr: 92,
        rr: 18,
        temp: 37.8,
        glucose: 108,
      },
    });

    expect(insight.matchedSymptoms.length).toBeGreaterThan(0);
    expect(insight.supportingExamPlan.tests.length).toBeGreaterThan(0);
  });

  it('derives against signals from unmatched complaints and clinical discordance (not empty stub)', () => {
    const suggestion: DiagnosisSuggestion = {
      rank: 1,
      icd_x: 'B76',
      nama: 'Penyakit cacing tambang',
      confidence: 0.4,
      rationale: 'Anemia dan paparan tanah endemis.',
      red_flags: [],
      recommended_actions: [],
    };
    const keluhanUtama = 'nyeri dada sesak napas keringat dingin';
    const matched = matchSuggestionSignals(
      suggestion,
      extractComplaintSignals(keluhanUtama)
    );

    const against = deriveAgainstSignals({
      suggestion,
      matchedSymptoms: matched,
      keluhanUtama,
      vitals: {
        sbp: 118,
        dbp: 76,
        hr: 88,
        rr: 16,
        temp: 36.6,
        glucose: 98,
      },
    });

    expect(against.length).toBeGreaterThan(0);
    expect(against.some((line) => /nyeri dada|sesak napas|belum dijelaskan/i.test(line))).toBe(
      true
    );
    expect(against.some((line) => /parasit|cacing/i.test(line))).toBe(true);
    expect(against.every((line) => line.trim().length >= 8)).toBe(true);
    expect(against.every((line) => !/^correlate with examination$/i.test(line))).toBe(true);
  });

  it('adds vital discordance against hypertension when blood pressure is not elevated', () => {
    const against = deriveAgainstSignals({
      suggestion: baseSuggestion,
      matchedSymptoms: ['pusing'],
      keluhanUtama: 'pusing ringan',
      vitals: {
        sbp: 118,
        dbp: 74,
        hr: 78,
        rr: 16,
        temp: 36.7,
        glucose: 100,
      },
    });

    expect(against.some((line) => /tekanan darah|tidak mendukung hipertensi/i.test(line))).toBe(
      true
    );
  });
});
