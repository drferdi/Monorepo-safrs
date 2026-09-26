import { describe, expect, it } from 'vitest';

import {
  sanitizeDiagnosisSuggestions,
  sanitizePharmacotherapyPayload,
} from './diagnosis-ui-contract';

import type { CDSSResponse } from '@/types/api';

describe('diagnosis UI contract sanitizers', () => {
  it('normalizes diagnosis suggestions and removes invalid rows before UI render', () => {
    const sanitized = sanitizeDiagnosisSuggestions([
      {
        rank: 3,
        icd_x: 'j18 9',
        nama: ' ',
        diagnosis_name: 'Pneumonia komunitas',
        confidence: 1.4,
        rationale: ' ',
        red_flags: [' ', 'Hipoksia perlu dinilai'],
        recommended_actions: [' ', 'Foto toraks bila tersedia'],
      },
      {
        rank: 1,
        icd_x: 'J18.9',
        nama: 'Pneumonia komunitas',
        confidence: 0.72,
        rationale: 'Demam dan sesak konsisten.',
        red_flags: ['Hipoksia perlu dinilai'],
        recommended_actions: ['Foto toraks bila tersedia'],
      },
      {
        rank: 2,
        icd_x: 'INVALID',
        nama: 'Noise',
        confidence: 0.6,
        rationale: 'Tidak boleh lolos.',
      },
    ]);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]).toMatchObject({
      rank: 1,
      icd_x: 'J18.9',
      nama: 'Pneumonia komunitas',
      confidence: 0.72,
      rationale: 'Demam dan sesak konsisten.',
      red_flags: ['Hipoksia perlu dinilai'],
      recommended_actions: ['Foto toraks bila tersedia'],
    });
  });

  it('sanitizes pharmacotherapy payloads into safe UI-ready structures', () => {
    const payload = {
      diagnosis_suggestions: [],
      medication_recommendations: [
        {
          nama_obat: 'Amoxicillin 500 mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Antibiotik utama.',
          safety_check: 'safe',
          contraindications: ['Riwayat alergi penisilin'],
          role: 'utama',
          isChronicContinuation: true,
        },
        {
          nama_obat: 'Omeprazole 20 mg',
          dosis: '1x1',
          aturan_pakai: 'Malam',
          durasi: '',
          rationale: '',
          safety_check: 'unsafe',
          contraindications: [' ', 'GERD alarm symptoms'],
          role: 'supportive',
          isChronicContinuation: 'yes',
        },
        {
          nama_obat: ' ',
          dosis: '2x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: 'Baris kosong harus dibuang.',
          safety_check: 'safe',
        },
      ],
      alerts: [
        {
          id: '',
          type: 'unsupported',
          severity: 'critical',
          title: ' ',
          message: 'Pantau fungsi ginjal',
        },
      ],
      clinical_guidelines: [' ', 'Review fungsi ginjal sebelum terapi lanjutan'],
      drug_interactions: [
        {
          drug_a: 'Amoxicillin',
          drug_b: 'Warfarin',
          severity: 'major',
          description: 'Potensi peningkatan INR',
          recommendation: 'Pantau INR lebih ketat',
        },
      ],
      pharmacotherapy_explainability: {
        confidence: 120,
        drivers: ['demam', ' ', 'sesak'],
        missing_data: ['fungsi_renal', ' '],
        risk_tier: 'unsupported',
        review_window: '12h',
        pathway: 'unsupported',
      },
    } as unknown as CDSSResponse;

    const sanitized = sanitizePharmacotherapyPayload(payload);

    expect(sanitized.medications).toHaveLength(2);
    expect(sanitized.medications[0]).toMatchObject({
      nama_obat: 'Amoxicillin 500 mg',
      aturan_pakai: 'Sesudah makan',
      safety_check: 'safe',
      role: 'utama',
      isChronicContinuation: true,
    });
    expect(sanitized.medications[1]).toMatchObject({
      nama_obat: 'Omeprazole 20 mg',
      aturan_pakai: 'Sesudah makan',
      safety_check: 'caution',
      rationale: 'Perlu verifikasi klinis sebelum diresepkan.',
      contraindications: ['GERD alarm symptoms'],
    });
    expect(sanitized.medications[1]?.role).toBeUndefined();
    expect(sanitized.medications[1]?.isChronicContinuation).toBeUndefined();
    expect(sanitized.alerts).toHaveLength(1);
    expect(sanitized.alerts[0]).toMatchObject({
      type: 'api_error',
      severity: 'high',
      title: 'Peringatan klinis',
      message: 'Pantau fungsi ginjal',
    });
    expect(sanitized.guidelines).toEqual(['Review fungsi ginjal sebelum terapi lanjutan']);
    expect(sanitized.drugInteractions).toHaveLength(1);
    expect(sanitized.explainability).toMatchObject({
      confidence: 100,
      drivers: ['demam', 'sesak'],
      missing_data: ['fungsi_renal'],
      risk_tier: 'urgent',
      review_window: '24h',
      pathway: 'knowledge-only',
    });
  });
});
