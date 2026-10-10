// Designed and constructed by Drferdi.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrescriptionRequestContext } from '@/types/api';

function context(overrides: Partial<PrescriptionRequestContext> = {}): PrescriptionRequestContext {
  return {
    icd_x: 'I10',
    patient_age: 58,
    alergi: [],
    penyakit_kronis: [],
    current_medications: [],
    selected_diagnosis_name: 'Hipertensi esensial',
    ...overrides,
  };
}

describe('SentraAPI recommendPrescription fail-closed contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_FEATURE_PRESCRIPTION_AI', 'true');
    vi.stubEnv('VITE_USE_MOCK', 'true');
  });

  it('blocks mock pharmacotherapy instead of returning automatic therapy', async () => {
    const { SentraAPI } = await import('./sentra-api');

    const result = await SentraAPI.recommendPrescription(context());

    expect(result.success).toBe(true);
    expect(result.data?.medication_recommendations).toEqual([]);
    expect(result.data?.alerts[0]?.title).toBe('Farmakoterapi Mock Diblok');
    expect(result.data?.meta?.is_mock).toBe(false);
    expect(result.data?.meta?.is_local).toBe(true);
  });

  // Chief, 2026-10-01: with no prescription service, propose the knowledge base's therapy only.
  describe('without a prescription service (VITE_SENTRA_API_URL unset)', () => {
    const rag = (details: unknown[], others: unknown[] = []) => ({
      getICD10Details: vi.fn().mockResolvedValue(details),
      searchICD10: vi.fn().mockResolvedValue(others.map((entry) => ({ entry }))),
      searchForDiagnosisSuggestions: vi.fn().mockResolvedValue(others.map((entry) => ({ entry }))),
      ensureICD10DataLoaded: vi.fn().mockResolvedValue(undefined),
    });

    beforeEach(() => {
      vi.stubEnv('VITE_USE_MOCK', 'false');
      vi.stubEnv('VITE_SENTRA_API_URL', '');
      vi.stubGlobal('fetch', vi.fn());
    });

    it("proposes exactly the knowledge base's therapy for the diagnosis, with its dose", async () => {
      vi.doMock('@/lib/rag', () =>
        rag([{ code: 'B77', name_id: 'Askariasis', terapi: [{ obat: 'Albendazol', dosis: '400 mg', frek: 'dosis tunggal' }] }])
      );
      const { SentraAPI } = await import('./sentra-api');

      const result = await SentraAPI.recommendPrescription(context({ icd_x: 'B77', selected_diagnosis_name: 'Askariasis' }));

      expect(result.success).toBe(true);
      expect(result.data?.medication_recommendations.map((m) => [m.nama_obat, m.dosis])).toEqual([
        ['Albendazol', '400 mg dosis tunggal'],
      ]);
      expect(result.data?.meta?.is_mock).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("never proposes another disease's therapy when the diagnosis has none", async () => {
      vi.doMock('@/lib/rag', () =>
        rag([], [{ code: 'T00', name_id: 'Vulnus laseratum', terapi: [{ obat: 'Amoksisilin', dosis: '500 mg', frek: '3x sehari' }] }])
      );
      const { SentraAPI } = await import('./sentra-api');

      const result = await SentraAPI.recommendPrescription(
        context({ icd_x: 'Z48', selected_diagnosis_name: 'Other surgical follow-up care', keluhan_utama: 'rawat jahitan' })
      );

      expect(result.success).toBe(true);
      expect(result.data?.medication_recommendations).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it('keeps feature-disabled response ahead of mock fail-closed handling', async () => {
    vi.stubEnv('VITE_FEATURE_PRESCRIPTION_AI', 'false');
    const { SentraAPI } = await import('./sentra-api');

    const result = await SentraAPI.recommendPrescription(context());

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('FEATURE_DISABLED');
  });

  it('surfaces structured role on curated medications added by regimen composition', async () => {
    const { __sentraApiInternals } = await import('./sentra-api');
    const result = __sentraApiInternals.enforceMedicationComposition(
      [
        {
          nama_obat: 'Amoxicillin 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Terapi utama infeksi.',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
      context(),
      3
    );

    expect(result.medications).toHaveLength(3);
    expect(result.medications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nama_obat: 'Paracetamol 500mg',
          role: 'adjuvant',
          rationale: expect.stringContaining('[Komponen: adjuvant]'),
        }),
        expect.objectContaining({
          nama_obat: 'Vitamin C 500mg',
          role: 'vitamin',
          rationale: expect.stringContaining('[Komponen: vitamin]'),
        }),
      ])
    );
  });

  it('preserves chronic continuation metadata when duplicate medications are merged', async () => {
    const { __sentraApiInternals } = await import('./sentra-api');
    const merged = __sentraApiInternals.mergeMedicationRecommendations(
      [
        {
          nama_obat: 'Amlodipin 5mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Knowledge package.',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
      [
        {
          nama_obat: 'Amlodipin 5mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Continuation from chronic therapy.',
          safety_check: 'safe',
          contraindications: [],
          isChronicContinuation: true,
        },
      ],
      6
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      nama_obat: 'Amlodipin 5mg',
      isChronicContinuation: true,
    });
  });
});
