// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Mock Diagnosis Suggestions
 * Based on common Puskesmas cases in Indonesia
 *
 * @module lib/api/mocks/diagnosis-mock
 */

import type { CDSSResponse, DiagnosisSuggestion } from '@/types/api';

// =============================================================================
// DIAGNOSIS SUGGESTIONS BY SYMPTOM PATTERN
// =============================================================================

/**
 * ISPA / Upper Respiratory Infection pattern
 * Keluhan: Demam, batuk, pilek
 */
export const ISPA_DIAGNOSIS: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'J06.9',
    nama: 'Infeksi saluran pernapasan akut atas, tidak spesifik',
    confidence: 0.87,
    rationale: 'Demam + batuk + pilek menunjukkan ISPA tipikal',
    red_flags: ['Pantau sesak napas progresif'],
    recommended_actions: ['Edukasi hidrasi', 'Kontrol ulang 48-72 jam'],
  },
  {
    rank: 2,
    icd_x: 'J00',
    nama: 'Nasofaringitis akut (common cold)',
    confidence: 0.72,
    rationale: 'Gejala ringan tanpa komplikasi',
  },
  {
    rank: 3,
    icd_x: 'J02.9',
    nama: 'Faringitis akut, tidak spesifik',
    confidence: 0.58,
    rationale: 'Nyeri tenggorok sebagai gejala dominan',
  },
];

/**
 * Gastroenteritis pattern
 * Keluhan: Diare, mual, muntah
 */
export const GE_DIAGNOSIS: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'A09',
    nama: 'Diare dan gastroenteritis presumtif asal infeksi',
    confidence: 0.89,
    rationale: 'Diare cair dengan dehidrasi ringan-sedang',
    recommended_actions: ['Evaluasi tanda dehidrasi', 'Pertimbangkan oralit'],
  },
  {
    rank: 2,
    icd_x: 'K52.9',
    nama: 'Gastroenteritis dan kolitis non-infektif, tidak spesifik',
    confidence: 0.65,
    rationale: 'Tidak ada tanda infeksi spesifik',
  },
];

/**
 * Hypertension pattern
 * Keluhan: Pusing, nyeri kepala, tensi tinggi
 */
export const HYPERTENSION_DIAGNOSIS: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'I10',
    nama: 'Hipertensi esensial (primer)',
    confidence: 0.92,
    rationale: 'TD > 140/90 mmHg pada pengukuran berulang',
    red_flags: ['Rujuk cepat bila ada nyeri dada, defisit neurologis, atau sesak berat'],
    recommended_actions: ['Ulangi pengukuran TD terstandar', 'Skrining organ target'],
  },
  {
    rank: 2,
    icd_x: 'R51',
    nama: 'Sakit kepala',
    confidence: 0.45,
    rationale: 'Gejala sekunder dari hipertensi',
  },
];

/**
 * Diabetes pattern
 * Keluhan: Sering kencing, lemas, berat badan turun
 */
export const DIABETES_DIAGNOSIS: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'E11.9',
    nama: 'Diabetes mellitus tipe 2 tanpa komplikasi',
    confidence: 0.85,
    rationale: 'Poliuria + polifagia + GDS > 200 mg/dL',
    recommended_actions: ['Konfirmasi GDS/GDP sesuai protokol', 'Edukasi diet dan aktivitas'],
  },
  {
    rank: 2,
    icd_x: 'E11.65',
    nama: 'DM tipe 2 dengan hiperglikemia',
    confidence: 0.78,
    rationale: 'GDS tinggi memerlukan kontrol gula darah',
  },
];

/**
 * Skin infection pattern
 * Keluhan: Gatal, bentol, kemerahan
 */
export const SKIN_DIAGNOSIS: DiagnosisSuggestion[] = [
  {
    rank: 1,
    icd_x: 'L30.9',
    nama: 'Dermatitis, tidak spesifik',
    confidence: 0.75,
    rationale: 'Lesi kulit dengan pruritus tanpa etiologi jelas',
    recommended_actions: ['Hindari iritan', 'Pertimbangkan terapi simptomatik topikal'],
  },
  {
    rank: 2,
    icd_x: 'B35.9',
    nama: 'Dermatofitosis, tidak spesifik',
    confidence: 0.68,
    rationale: 'Lesi annular dengan tepi aktif',
  },
  {
    rank: 3,
    icd_x: 'L50.9',
    nama: 'Urtikaria, tidak spesifik',
    confidence: 0.55,
    rationale: 'Bentol-bentol merah yang gatal',
  },
];

// =============================================================================
// MOCK RESPONSE BUILDER
// =============================================================================

/**
 * Get diagnosis suggestions based on chief complaint keywords
 */
export function getMockDiagnosisBySymptom(keluhan: string): DiagnosisSuggestion[] {
  const keluhanLower = keluhan.toLowerCase();

  if (
    keluhanLower.includes('demam') ||
    keluhanLower.includes('batuk') ||
    keluhanLower.includes('pilek')
  ) {
    return ISPA_DIAGNOSIS;
  }

  if (
    keluhanLower.includes('diare') ||
    keluhanLower.includes('mual') ||
    keluhanLower.includes('muntah')
  ) {
    return GE_DIAGNOSIS;
  }

  if (
    keluhanLower.includes('pusing') ||
    keluhanLower.includes('tensi') ||
    keluhanLower.includes('tekanan darah')
  ) {
    return HYPERTENSION_DIAGNOSIS;
  }

  if (
    keluhanLower.includes('kencing') ||
    keluhanLower.includes('diabetes') ||
    keluhanLower.includes('gula')
  ) {
    return DIABETES_DIAGNOSIS;
  }

  if (
    keluhanLower.includes('gatal') ||
    keluhanLower.includes('bentol') ||
    keluhanLower.includes('kulit')
  ) {
    return SKIN_DIAGNOSIS;
  }

  // Default: return ISPA as most common Puskesmas case
  return ISPA_DIAGNOSIS;
}

/**
 * Build full mock CDSS response for diagnosis
 */
export function buildMockDiagnosisResponse(keluhan: string): CDSSResponse {
  const suggestions = getMockDiagnosisBySymptom(keluhan);

  return {
    diagnosis_suggestions: suggestions,
    medication_recommendations: [],
    alerts: [],
    clinical_guidelines: [
      'Istirahat cukup 7-8 jam/hari',
      'Minum air putih minimal 2 liter/hari',
      'Hindari makanan berminyak dan pedas',
    ],
    meta: {
      processing_time_ms: 150,
      model_version: 'mock-v1.0',
      timestamp: new Date().toISOString(),
      is_mock: true,
    },
  };
}
