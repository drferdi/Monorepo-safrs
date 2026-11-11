// Designed and constructed by Drferdi.
import type { DiagnosisRequestContext } from '@/types/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Encounter } from '~/utils/types';
import type { CDSSEngineResult } from './engine';
import { runGetSuggestionsFlow } from './get-suggestions-flow';

vi.mock('./engine', () => ({
  runDiagnosisEngine: vi.fn(async (): Promise<CDSSEngineResult> => ({
    suggestions: [
      {
        rank: 1,
        diagnosis_name: 'Pneumonia',
        icd10_code: 'J18.9',
        confidence: 0.72,
        reasoning: 'Uji kontrak: demam, menggigil, dan sesak sesuai diferensial infeksi respirasi.',
        red_flags: [],
        recommended_actions: ['Pantau saturasi dan frekuensi napas'],
        rag_verified: true,
        confidence_adjusted: false,
        validation_flags: [],
      },
    ],
    red_flags: [],
    alerts: [],
    processing_time_ms: 42,
    source: 'local',
    model_version: 'IDE-V1-contract',
    validation_summary: {
      total_raw: 1,
      total_validated: 1,
      unverified_codes: [],
      warnings: [],
    },
  })),
}));

vi.mock('./validation', () => ({
  runValidationPipeline: vi.fn(async (suggestions: unknown[]) => ({
    valid: true,
    layer_passed: 5,
    filtered_suggestions: suggestions,
    removed_suggestions: [],
    unverified_codes: [],
    warnings: [],
  })),
}));

vi.mock('./audit-logger', () => ({
  auditLogger: {
    init: vi.fn(async () => undefined),
    getEntryCount: vi.fn(async () => 0),
  },
  logDiagnosisRequest: vi.fn(async () => undefined),
  logSuggestionDisplayed: vi.fn(async () => undefined),
  logEngineError: vi.fn(async () => undefined),
  logFallbackUsed: vi.fn(async () => undefined),
}));

const buildEncounter = (): Encounter => ({
  id: 'enc-it-1',
  patient_id: 'pat-it-1',
  timestamp: new Date().toISOString(),
  dokter: { id: 'doc-1', nama: 'Dr A' },
  perawat: { id: 'nur-1', nama: 'Ns B' },
  anamnesa: {
    keluhan_utama: 'Demam tinggi, menggigil, sesak',
    keluhan_tambahan: 'Lemas dan napas cepat',
    lama_sakit: { thn: 0, bln: 0, hr: 2 },
    riwayat_penyakit: null,
    alergi: {
      obat: ['penisilin'],
      makanan: [],
      udara: [],
      lainnya: [],
    },
  },
  diagnosa: {
    icd_x: '',
    nama: '',
    jenis: 'PRIMER',
    kasus: 'BARU',
    prognosa: '',
    penyakit_kronis: ['diabetes'],
  },
  resep: [],
});

describe('getSuggestions -> runDiagnosisEngine(v3) flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  it('returns v3-backed diagnosis payload with mapped fields', async () => {
    const encounter = buildEncounter();
    const context: DiagnosisRequestContext = {
      keluhan_utama: encounter.anamnesa.keluhan_utama,
      keluhan_tambahan: encounter.anamnesa.keluhan_tambahan,
      patient_age: 47,
      patient_gender: 'M',
      vital_signs: {
        systolic: 85,
        diastolic: 52,
        heart_rate: 128,
        respiratory_rate: 30,
        temperature: 39.2,
        spo2: 92,
        gcs: 14,
      },
      chronic_diseases: ['diabetes'],
      allergies: ['penisilin'],
    };

    const response = await runGetSuggestionsFlow(encounter, context);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.meta?.model_version).toContain('IDE-V1');
    expect(response.data?.diagnosis_suggestions.length).toBeGreaterThan(0);

    const first = response.data?.diagnosis_suggestions[0];
    expect(first?.icd_x).toBeTruthy();
    expect(first?.nama).toBeTruthy();
    expect(Array.isArray(first?.recommended_actions)).toBe(true);
    expect(response.data?.clinical_reasoning?.input_data_state).toEqual({
      chief_complaint: 'present',
      additional_complaint: 'present',
      vitals: 'present',
      age: 'present',
      gender: 'present',
      allergies: 'present',
    });
  });

  it('returns fail-closed insufficient_data when encounter lacks chief complaint', async () => {
    const encounter = buildEncounter();
    encounter.anamnesa.keluhan_utama = '';

    const context: DiagnosisRequestContext = {
      keluhan_utama: '',
      patient_age: 30,
      patient_gender: 'F',
    };

    const response = await runGetSuggestionsFlow(encounter, context);

    expect(response.success).toBe(true);
    expect(response.data?.diagnosis_suggestions).toEqual([]);
    expect(response.data?.clinical_reasoning?.status).toBe('insufficient_data');
    expect(response.data?.clinical_reasoning?.input_data_state).toMatchObject({
      chief_complaint: 'absent',
      additional_complaint: 'present',
      vitals: 'unknown',
      age: 'present',
      gender: 'present',
      allergies: 'unknown',
    });
  });

  it('returns fail-closed mock_blocked when runtime mock flag is enabled', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    const encounter = buildEncounter();
    const context: DiagnosisRequestContext = {
      keluhan_utama: encounter.anamnesa.keluhan_utama,
      patient_age: 30,
      patient_gender: 'M',
    };

    const response = await runGetSuggestionsFlow(encounter, context);

    expect(response.success).toBe(true);
    expect(response.data?.diagnosis_suggestions).toEqual([]);
    expect(response.data?.clinical_reasoning?.status).toBe('mock_blocked');
  });
});
