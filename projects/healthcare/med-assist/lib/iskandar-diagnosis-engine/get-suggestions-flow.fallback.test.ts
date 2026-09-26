// Designed and constructed by Drferdi.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';
import { runGetSuggestionsFlow } from './get-suggestions-flow';

const runDiagnosisEngineMock = vi.fn();

vi.mock('./engine', () => ({
  runDiagnosisEngine: (...args: unknown[]) => runDiagnosisEngineMock(...args),
}));

const encounter: Encounter = {
  id: 'enc-fallback-1',
  patient_id: 'pat-fallback-1',
  timestamp: new Date().toISOString(),
  dokter: { id: 'doc-1', nama: 'Dr Test' },
  perawat: { id: 'nurse-1', nama: 'Ns Test' },
  anamnesa: {
    keluhan_utama: 'Nyeri dada',
    keluhan_tambahan: '',
    lama_sakit: { thn: 0, bln: 0, hr: 1 },
    riwayat_penyakit: null,
    alergi: { obat: [], makanan: [], udara: [], lainnya: [] },
  },
  diagnosa: {
    icd_x: '',
    nama: '',
    jenis: 'PRIMER',
    kasus: 'BARU',
    prognosa: '',
    penyakit_kronis: [],
  },
  resep: [],
};

const context: DiagnosisRequestContext = {
  keluhan_utama: 'Nyeri dada',
  patient_age: 21,
  patient_gender: 'F',
  vital_signs: {
    systolic: 117,
    diastolic: 75,
    heart_rate: 81,
    respiratory_rate: 17,
    temperature: 36.3,
  },
};

describe('runGetSuggestionsFlow engine-only differential', () => {
  beforeEach(() => {
    runDiagnosisEngineMock.mockReset();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  it('returns no fabricated diagnosis when engine suggestions are empty for chest pain', async () => {
    runDiagnosisEngineMock.mockResolvedValue({
      suggestions: [],
      red_flags: [],
      alerts: [],
      processing_time_ms: 12,
      source: 'local',
      model_version: 'sentra-inference-v3.0.0',
      validation_summary: {
        total_raw: 0,
        total_validated: 0,
        unverified_codes: [],
        warnings: [],
      },
    });

    const result = await runGetSuggestionsFlow(encounter, context);

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis_suggestions).toEqual([]);
    expect(result.data?.medication_recommendations).toEqual([]);
    expect(
      result.data?.diagnosis_suggestions.some((item) =>
        /ispa|infeksi saluran napas/i.test(item.nama)
      )
    ).toBe(false);
    expect(result.data?.clinical_reasoning?.status).toBe('no_safe_match');
    expect(result.data?.alerts.some((alert) => alert.id.startsWith('fallback-'))).toBe(false);
    expect(result.data?.validation_summary?.warnings.some((w) => w.includes('fallback'))).toBe(
      false
    );
  });

  it('keeps engine suggestions when available', async () => {
    runDiagnosisEngineMock.mockResolvedValue({
      suggestions: [
        {
          rank: 1,
          diagnosis_name: 'Suspek Sepsis',
          icd10_code: 'A41.9',
          confidence: 0.62,
          reasoning: 'Demam tinggi dan takipnea.',
          red_flags: ['Sepsis risk'],
          recommended_actions: ['Bundle sepsis'],
        },
      ],
      red_flags: [],
      alerts: [],
      processing_time_ms: 11,
      source: 'local',
      model_version: 'sentra-inference-v3.0.0',
      validation_summary: {
        total_raw: 1,
        total_validated: 1,
        unverified_codes: [],
        warnings: [],
      },
    });

    const result = await runGetSuggestionsFlow(encounter, context);

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis_suggestions[0]?.icd_x).toBe('A41.9');
    expect(result.data?.alerts.some((alert) => alert.id.startsWith('fallback-'))).toBe(false);
  });

  it('normalizes OCR-like ICD and numeric diagnosis label into readable chronic name', async () => {
    runDiagnosisEngineMock.mockResolvedValue({
      suggestions: [
        {
          rank: 1,
          diagnosis_name: '150',
          icd10_code: '150',
          confidence: 0.66,
          reasoning: 'Riwayat penyakit kronis jantung.',
          red_flags: [],
          recommended_actions: ['Monitoring serial'],
        },
      ],
      red_flags: [],
      alerts: [],
      processing_time_ms: 9,
      source: 'local',
      model_version: 'sentra-inference-v3.0.0',
      validation_summary: {
        total_raw: 1,
        total_validated: 1,
        unverified_codes: [],
        warnings: [],
      },
    });

    const result = await runGetSuggestionsFlow(encounter, context);

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis_suggestions[0]?.icd_x).toBe('I50');
    expect(result.data?.diagnosis_suggestions[0]?.nama).toBe('Gagal Jantung');
  });
});
