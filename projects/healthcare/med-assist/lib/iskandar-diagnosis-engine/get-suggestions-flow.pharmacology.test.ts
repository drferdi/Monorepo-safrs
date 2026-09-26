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
  id: 'enc-pharm-1',
  patient_id: 'pat-pharm-1',
  timestamp: new Date().toISOString(),
  dokter: { id: 'doc-1', nama: 'Dr Test' },
  perawat: { id: 'nurse-1', nama: 'Ns Test' },
  anamnesa: {
    keluhan_utama: 'Sakit kepala',
    keluhan_tambahan: '',
    lama_sakit: { thn: 0, bln: 0, hr: 2 },
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
  keluhan_utama: 'Sakit kepala',
  patient_age: 40,
  patient_gender: 'M',
};

describe('runGetSuggestionsFlow pharmacology gating', () => {
  beforeEach(() => {
    runDiagnosisEngineMock.mockReset();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  it('does not emit medication recommendations from diagnosis stage even when KB match exists', async () => {
    runDiagnosisEngineMock.mockResolvedValue({
      suggestions: [
        {
          rank: 1,
          diagnosis_name: 'Hipertensi Esensial',
          icd10_code: 'I10',
          confidence: 0.71,
          reasoning: 'Tekanan darah meningkat konsisten.',
          red_flags: [],
          recommended_actions: ['Ulangi TTV serial'],
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
    expect(result.data?.diagnosis_suggestions[0]?.icd_x).toBe('I10');
    expect(result.data?.medication_recommendations).toEqual([]);
    expect(result.data?.clinical_reasoning?.pharmacotherapy).toEqual([]);
  });
});
