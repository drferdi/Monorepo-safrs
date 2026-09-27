/**
 * The legacy Iskandar diagnosis engine behind the `DiagnosisEngine` contract.
 *
 * The algorithm is untouched: this adapter calls `runGetSuggestionsFlow`, the same entry point
 * the background used before, and only translates its input and output.
 *
 * - `runSuggestions` is the physician-facing path. It returns the flow's response unchanged,
 *   because the side panel consumes that shape (`CDSSResponse`).
 * - `step` serves the benchmark and engine comparison. It maps a `CaseState` to the flow's
 *   input and the flow's response to an `EngineResult`.
 *
 * @module lib/diagnosis-engine/legacy-engine
 */

import { createTraceId, createUnavailableResult } from './engine-result';
import type {
  CaseState,
  ConfidenceTier,
  DiagnosisEngine,
  DiagnosisItem,
  EngineResult,
  UnfilledField,
} from './types';

import { runGetSuggestionsFlow } from '@/lib/iskandar-diagnosis-engine/get-suggestions-flow';
import type { APIResponse, CDSSResponse, DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';

export const LEGACY_ENGINE_VERSION = 'iskandar-ide-v1';

type SuggestionsFlow = (
  encounter: Encounter,
  context: DiagnosisRequestContext
) => Promise<APIResponse<CDSSResponse>>;

export interface LegacyDiagnosisEngine extends DiagnosisEngine {
  readonly id: 'legacy';
  runSuggestions(
    encounter: Encounter,
    context: DiagnosisRequestContext
  ): Promise<APIResponse<CDSSResponse>>;
}

/**
 * Same bands as the side panel's confidence label (`confidenceBandPresentation` in
 * `components/clinical/ClinicalDifferential.tsx`): ≥ 0.7 high, ≥ 0.45 moderate, else low.
 */
export function toConfidenceTier(score: number): ConfidenceTier {
  if (!Number.isFinite(score)) return 'unknown';
  if (score >= 0.7) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'low';
}

/**
 * Builds the flow's input from a `CaseState`. The legacy engine only reads complaints,
 * demographics, vitals, chronic conditions and allergies; physical exam, results, current
 * medication and facility capabilities have no input in it and are not used.
 * Unknown sex maps to 'M', as the side panel does (`patientGender === 'P' ? 'F' : 'M'`).
 */
export function caseStateToLegacyRequest(
  state: CaseState,
  encounterId: string
): { encounter: Encounter; context: DiagnosisRequestContext } {
  const additional = [
    state.anamnesis.freeText ?? '',
    ...(state.anamnesis.qa ?? []).map(({ question, answer }) => `${question}: ${answer}`),
  ]
    .filter((line) => line.trim().length > 0)
    .join('\n');

  const context: DiagnosisRequestContext = {
    keluhan_utama: state.chiefComplaint,
    keluhan_tambahan: additional,
    patient_age: state.demographics.ageYears ?? 0,
    patient_gender: state.demographics.sex === 'F' ? 'F' : 'M',
    vital_signs: {
      systolic: state.vitals.systolic,
      diastolic: state.vitals.diastolic,
      heart_rate: state.vitals.heartRate,
      respiratory_rate: state.vitals.respiratoryRate,
      temperature: state.vitals.temperature,
      spo2: state.vitals.spo2,
      gcs: state.vitals.gcs,
    },
  };

  const encounter: Encounter = {
    id: encounterId,
    patient_id: 'case-state',
    timestamp: new Date(0).toISOString(),
    dokter: { id: '', nama: '' },
    perawat: { id: '', nama: '' },
    anamnesa: {
      keluhan_utama: context.keluhan_utama,
      keluhan_tambahan: additional,
      lama_sakit: { thn: 0, bln: 0, hr: 0 },
      riwayat_penyakit: null,
      alergi: { obat: [...state.allergies], makanan: [], udara: [], lainnya: [] },
      ...(state.demographics.pregnant !== undefined
        ? { is_pregnant: state.demographics.pregnant }
        : {}),
    },
    diagnosa: {
      icd_x: '',
      nama: '',
      jenis: 'PRIMER',
      kasus: 'BARU',
      prognosa: '',
      penyakit_kronis: [...state.knownConditions],
    },
    resep: [],
  };

  return { encounter, context };
}

/**
 * Maps the flow's response to an `EngineResult`. Fields the legacy engine does not produce are
 * left empty and listed in `unfilled`.
 */
export function legacyResponseToEngineResult(
  response: APIResponse<CDSSResponse>,
  params: { latencyMs: number; traceId: string }
): EngineResult {
  if (!response.success || !response.data) {
    return createUnavailableResult({
      engineId: 'legacy',
      version: LEGACY_ENGINE_VERSION,
      code: response.error?.code ?? 'ENGINE_ERROR',
      message: response.error?.message ?? 'Legacy engine returned no data',
      latencyMs: params.latencyMs,
      traceId: params.traceId,
    });
  }

  const data = response.data;
  const items: DiagnosisItem[] = data.diagnosis_suggestions.map((suggestion) => ({
    icd10: suggestion.icd_x,
    label: suggestion.nama || suggestion.diagnosis_name || suggestion.icd_x,
    confidenceTier: toConfidenceTier(suggestion.confidence),
    score: suggestion.confidence,
  }));
  const evidence = data.diagnosis_suggestions.map((suggestion) => ({
    icd10: suggestion.icd_x,
    supporting: suggestion.rationale ? [suggestion.rationale] : [],
    opposing: [],
  }));
  const inputState = data.clinical_reasoning?.input_data_state;
  const missingInformation = inputState
    ? Object.entries(inputState)
        .filter(([, state]) => state !== 'present')
        .map(([field, state]) => `${field}: ${state}`)
    : [];

  const unfilled: UnfilledField[] = [
    {
      field: 'differential.cannotMiss',
      reason: 'legacy engine has no cannot-miss list; its red flags stay in the safety layer',
    },
    { field: 'evidence.opposing', reason: 'legacy engine reports supporting rationale only' },
    {
      field: 'nextBestActions',
      reason: 'legacy recommended actions are free text, not typed as question/exam/test',
    },
    {
      field: 'disposition',
      reason: 'legacy engine does not decide treat/refer; the triage/referral tree does',
    },
  ];
  if (items.length === 0) {
    unfilled.push(
      { field: 'differential.likely', reason: 'no knowledge-base candidate matched' },
      { field: 'differential.alternatives', reason: 'no knowledge-base candidate matched' }
    );
  }
  if (evidence.every((entry) => entry.supporting.length === 0)) {
    unfilled.push({ field: 'evidence.supporting', reason: 'no rationale returned' });
  }
  if (!inputState) {
    unfilled.push({ field: 'missingInformation', reason: 'no input data state returned' });
  }

  return {
    status: 'ok',
    differential: { likely: items.slice(0, 1), alternatives: items.slice(1), cannotMiss: [] },
    evidence,
    missingInformation,
    nextBestActions: [],
    disposition: null,
    unfilled,
    meta: {
      engineId: 'legacy',
      version: data.meta?.model_version
        ? `${LEGACY_ENGINE_VERSION}/${data.meta.model_version}`
        : LEGACY_ENGINE_VERSION,
      // The response does not name the OpenAI model; `version` ends in IDE-V1-LLM when it ran.
      model: null,
      costUsd: null,
      latencyMs: params.latencyMs,
      traceId: params.traceId,
    },
  };
}

export function createLegacyEngine(
  flow: SuggestionsFlow = runGetSuggestionsFlow
): LegacyDiagnosisEngine {
  return {
    id: 'legacy',
    version: LEGACY_ENGINE_VERSION,
    runSuggestions: (encounter, context) => flow(encounter, context),
    async step(input, opts) {
      const traceId = createTraceId();
      const startedAt = Date.now();
      if (opts?.signal?.aborted) {
        return createUnavailableResult({
          engineId: 'legacy',
          version: LEGACY_ENGINE_VERSION,
          code: 'ABORTED',
          message: 'Request aborted before the legacy engine ran',
          latencyMs: 0,
          traceId,
        });
      }
      try {
        const { encounter, context } = caseStateToLegacyRequest(input, `case-${traceId}`);
        const response = await flow(encounter, context);
        return legacyResponseToEngineResult(response, {
          latencyMs: Date.now() - startedAt,
          traceId,
        });
      } catch (error) {
        return createUnavailableResult({
          engineId: 'legacy',
          version: LEGACY_ENGINE_VERSION,
          code: 'ENGINE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown legacy engine error',
          latencyMs: Date.now() - startedAt,
          traceId,
        });
      }
    },
  };
}
