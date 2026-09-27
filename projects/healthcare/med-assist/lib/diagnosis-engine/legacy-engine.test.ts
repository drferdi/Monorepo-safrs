// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { GOLDEN_CASES } from './__golden__/cases';
import { encounterToCaseState } from './case-state';
import {
  caseStateToLegacyRequest,
  createLegacyEngine,
  legacyResponseToEngineResult,
  toConfidenceTier,
} from './legacy-engine';
import { readGoldenRecording } from './testing/golden';
import { installLegacyRuntime } from './testing/legacy-runtime';
import type { CaseState } from './types';

import type { APIResponse, CDSSResponse } from '@/types/api';

vi.mock('@/lib/rag/icd10-db', () => import('./testing/memory-icd10-db'));

const baseCase: CaseState = {
  demographics: { ageYears: 30, sex: 'unknown', pregnant: true },
  chiefComplaint: 'nyeri perut',
  anamnesis: {
    freeText: 'sejak kemarin',
    qa: [{ question: 'Muntah?', answer: 'dua kali' }],
  },
  vitals: { systolic: 110, diastolic: 70, heartRate: 90, temperature: 37.9 },
  physicalExam: ['nyeri tekan kanan bawah'],
  results: [{ name: 'Leukosit', value: 15.8, unit: '10^3/uL', flag: 'abnormal' }],
  currentMedications: ['parasetamol'],
  knownConditions: ['hipertensi'],
  allergies: ['penisilin'],
  facilityCapabilities: [],
};

describe('toConfidenceTier', () => {
  it.each([
    [0.9, 'high'],
    [0.7, 'high'],
    [0.69, 'moderate'],
    [0.45, 'moderate'],
    [0.44, 'low'],
    [0, 'low'],
    [Number.NaN, 'unknown'],
  ])('%d -> %s', (score, tier) => {
    expect(toConfidenceTier(score)).toBe(tier);
  });
});

describe('caseStateToLegacyRequest', () => {
  it('maps the case into the flow input the legacy engine reads', () => {
    const { encounter, context } = caseStateToLegacyRequest(baseCase, 'case-1');
    expect(context).toMatchObject({
      keluhan_utama: 'nyeri perut',
      keluhan_tambahan: 'sejak kemarin\nMuntah?: dua kali',
      patient_age: 30,
      patient_gender: 'M',
      vital_signs: { systolic: 110, diastolic: 70, heart_rate: 90, temperature: 37.9 },
    });
    expect(encounter.id).toBe('case-1');
    expect(encounter.anamnesa.alergi.obat).toEqual(['penisilin']);
    expect(encounter.anamnesa.is_pregnant).toBe(true);
    expect(encounter.diagnosa.penyakit_kronis).toEqual(['hipertensi']);
  });
});

describe('legacyResponseToEngineResult', () => {
  const recorded = readGoldenRecording();

  it('maps a legacy failure to a flagged unavailable result', () => {
    const result = legacyResponseToEngineResult(
      { success: false, error: { code: 'MISSING_DATA', message: 'no complaint' } },
      { latencyMs: 3, traceId: 't-1' }
    );
    expect(result.status).toBe('unavailable');
    expect(result.error).toEqual({ code: 'MISSING_DATA', message: 'no complaint' });
    expect(result.differential).toEqual({ likely: [], alternatives: [], cannotMiss: [] });
    expect(result.unfilled.map((entry) => entry.field)).toContain('differential.likely');
  });

  it('keeps the legacy order and flags what legacy cannot provide', () => {
    const response = recorded['sepsis-like-with-history'] as APIResponse<CDSSResponse>;
    const result = legacyResponseToEngineResult(response, { latencyMs: 5, traceId: 't-2' });
    const suggestions = response.data?.diagnosis_suggestions ?? [];

    expect(result.status).toBe('ok');
    expect([...result.differential.likely, ...result.differential.alternatives]).toEqual(
      suggestions.map((suggestion) => ({
        icd10: suggestion.icd_x,
        label: suggestion.nama,
        confidenceTier: toConfidenceTier(suggestion.confidence),
        score: suggestion.confidence,
      }))
    );
    expect(result.differential.likely).toHaveLength(1);
    expect(result.differential.cannotMiss).toEqual([]);
    expect(result.nextBestActions).toEqual([]);
    expect(result.disposition).toBeNull();
    expect(result.unfilled.map((entry) => entry.field)).toEqual(
      expect.arrayContaining([
        'differential.cannotMiss',
        'evidence.opposing',
        'nextBestActions',
        'disposition',
      ])
    );
    expect(result.meta).toMatchObject({ engineId: 'legacy', latencyMs: 5, traceId: 't-2' });
  });
});

describe('legacy engine step()', () => {
  beforeAll(async () => {
    await installLegacyRuntime();
  });

  it.each(GOLDEN_CASES)(
    'CaseState round trip ranks the same diagnoses as the recording: $id',
    async (goldenCase) => {
      const engine = createLegacyEngine();
      const result = await engine.step(
        encounterToCaseState(goldenCase.encounter, goldenCase.context)
      );
      const recorded = readGoldenRecording()[goldenCase.id] as APIResponse<CDSSResponse>;

      if (!recorded.success) {
        expect(result.status).toBe('unavailable');
        return;
      }
      expect(
        [...result.differential.likely, ...result.differential.alternatives].map(
          (item) => item.icd10
        )
      ).toEqual(recorded.data?.diagnosis_suggestions.map((suggestion) => suggestion.icd_x));
    }
  );

  it('returns unavailable when aborted before running', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await createLegacyEngine().step(baseCase, { signal: controller.signal });
    expect(result.status).toBe('unavailable');
    expect(result.error?.code).toBe('ABORTED');
  });

  it('returns unavailable instead of throwing when the flow throws', async () => {
    const engine = createLegacyEngine(async () => {
      throw new Error('boom');
    });
    const result = await engine.step(baseCase);
    expect(result).toMatchObject({ status: 'unavailable', error: { code: 'ENGINE_ERROR' } });
  });
});
