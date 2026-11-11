// Designed and constructed by Drferdi.
import { describe, expect, it, vi } from 'vitest';
import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';
import { runGetSuggestionsFlow } from './get-suggestions-flow';

vi.mock('./engine', () => ({
  runDiagnosisEngine: vi.fn(async () => {
    throw new Error('engine exploded');
  }),
}));

const encounter: Encounter = {
  id: 'enc-flow-err',
  patient_id: 'pat-flow-err',
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
  patient_age: 42,
  patient_gender: 'M',
};

describe('runGetSuggestionsFlow error handling', () => {
  it('returns fail-closed engine_error contract when engine throws', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false');
    const result = await runGetSuggestionsFlow(encounter, context);

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis_suggestions).toEqual([]);
    expect(result.data?.clinical_reasoning?.status).toBe('engine_error');
  });
});
