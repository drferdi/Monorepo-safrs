/**
 * The diagnosis step the background runs for the side panel's `getSuggestions` request, by the
 * `diagnosisEngine` flag (`feature-flags.ts`):
 *
 * - `legacy` (default): the legacy engine's response, unchanged.
 * - `shadow`: the legacy response, returned without waiting for MIRA. MIRA runs in the background
 *   on the same de-identified case and only its outcome (status, ICD codes, latency; no clinical
 *   text) is written to the audit log.
 * - `mira`: MIRA's differential replaces `diagnosis_suggestions` in the legacy response
 *   (likely, alternatives, then cannot-miss, each tagged "MIRA"); every other field, including
 *   the alerts, stays the legacy engine's. When MIRA fails, times out or returns no diagnosis,
 *   the legacy response is returned with `engine_notice` set to a reason-specific notice (see
 *   `mira-notice.ts`). When the Trajectory stage already prefetched this case (`mira-prefetch.ts`,
 *   by the case key: the hash of `encounterToCaseState`), its finished result is used instead of a
 *   new step; while that prefetch is still running, the legacy response is returned at once with
 *   `engine_pending: true` and `prefetch_key` (the case key), and the panel asks again when the
 *   ready record for that key arrives.
 *
 * The safety layer (red flags, emergency gates, triage/referral) runs outside this step, and a
 * candidate never waits longer than `candidateTimeoutMs`.
 *
 * @module lib/diagnosis-engine/run-diagnosis
 */

import { encounterToCaseState } from './case-state';
import { createTraceId, createUnavailableResult } from './engine-result';
import type { LegacyDiagnosisEngine } from './legacy-engine';
import { MIRA_UNAVAILABLE_NOTICE, miraNoticeFor } from './mira-notice';
import { ensureMira, getLastMiraStatus, type MiraStatus } from './mira-supervisor';
import { CANDIDATE_TIMEOUT_MS, peekPrefetch } from './prefetch-store';
import { getActiveDiagnosisEngine, getLegacyEngine } from './registry';
import { hashCanonical } from './request-context';
import type { CaseState, ConfidenceTier, DiagnosisEngine, EngineResult } from './types';

import { logShadowComparison } from '@/lib/iskandar-diagnosis-engine/audit-logger';
import {
  getDiagnosisEngineConfig,
  type DiagnosisEngineMode,
} from '@/lib/iskandar-diagnosis-engine/feature-flags';
import type {
  APIResponse,
  CDSSResponse,
  DiagnosisRequestContext,
  DiagnosisSuggestion,
} from '@/types/api';
import { createLogger } from '@/utils/logger';
import type { Encounter } from '~/utils/types';

const log = createLogger('DiagnosisEngine', 'global');

export { CANDIDATE_TIMEOUT_MS };

export const MIRA_TAG = 'MIRA';
export const MIRA_CANNOT_MISS_TAG = 'MIRA · jangan terlewat';
export { MIRA_UNAVAILABLE_NOTICE };

/** The side panel shows at most five diagnoses (`ClinicalDifferential.tsx`). */
const MAX_SHOWN_DIAGNOSES = 5;
/** `runDiagnosisAlgorithm` hides suggestions below this confidence. */
const MIN_SHOWN_CONFIDENCE = 0.1;
/** Inside the side panel's bands (≥ 0.7 high, ≥ 0.45 moderate, else low); used without a score. */
const TIER_CONFIDENCE: Record<ConfidenceTier, number> = {
  high: 0.8,
  moderate: 0.55,
  low: 0.3,
  unknown: MIN_SHOWN_CONFIDENCE,
};

/**
 * Sharpens a candidate engine's error code with the MIRA supervisor's last known state: a generic
 * network failure or missing configuration is really "not installed" or "starting" when the
 * supervisor already knows that. Any other code, or no supervisor status, passes through as-is.
 */
export function resolveMiraNoticeCode(
  code: string | undefined,
  status: MiraStatus | null | undefined
): string | undefined {
  if (code === 'NETWORK_ERROR' || code === 'NOT_CONFIGURED') {
    if (status?.state === 'not-installed') return 'NOT_INSTALLED';
    if (status?.state === 'starting') return 'STARTING';
  }
  return code;
}

export async function stepWithTimeout(
  engine: DiagnosisEngine,
  caseState: CaseState,
  timeoutMs: number
): Promise<EngineResult> {
  const controller = new AbortController();
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      engine.step(caseState, { signal: controller.signal }),
      timedOut,
    ]);
    return (
      result ??
      createUnavailableResult({
        engineId: engine.id,
        version: engine.version,
        code: 'TIMEOUT',
        message: `Engine did not answer within ${timeoutMs} ms`,
        latencyMs: Date.now() - startedAt,
        traceId: createTraceId(),
      })
    );
  } catch (error) {
    return createUnavailableResult({
      engineId: engine.id,
      version: engine.version,
      code: 'ENGINE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown engine error',
      latencyMs: Date.now() - startedAt,
      traceId: createTraceId(),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function recordCandidateRun(result: EngineResult, engine: DiagnosisEngine): Promise<void> {
  const ranked = [...result.differential.likely, ...result.differential.alternatives];
  try {
    await logShadowComparison({
      session_id: `engine-${result.meta.traceId}`,
      suggestions: [],
      model_version: `${engine.id}:${engine.version}`,
      metadata: {
        engine_id: engine.id,
        status: result.status,
        error_code: result.error?.code ?? '',
        icd10_ranked: ranked.map((item) => item.icd10).join(','),
        cannot_miss: result.differential.cannotMiss.map((item) => item.icd10).join(','),
        latency_ms: result.meta.latencyMs ?? -1,
        unfilled_fields: result.unfilled.map((entry) => entry.field).join(','),
      },
    });
  } catch (error) {
    log.warn('Candidate diagnosis engine run could not be recorded', {
      engineId: engine.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * MIRA's differential as side-panel suggestions: likely, alternatives, then cannot-miss, one entry
 * per ICD-10 code (a code also listed as cannot-miss keeps its first place and the cannot-miss
 * tag). Codes are kept as MIRA sent them, whether or not the local knowledge base has them.
 * Cannot-miss entries always get a slot; the other slots go to the earliest entries.
 */
export function miraDifferentialToSuggestions(result: EngineResult): DiagnosisSuggestion[] {
  const { likely, alternatives, cannotMiss } = result.differential;
  const codeOf = (item: { icd10: string }) => item.icd10.trim().toUpperCase();
  const cannotMissCodes = new Set(cannotMiss.map(codeOf));

  const seen = new Set<string>();
  const entries = [...likely, ...alternatives, ...cannotMiss]
    .filter((item) => {
      const code = codeOf(item);
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    })
    .map((item) => ({ item, cannotMiss: cannotMissCodes.has(codeOf(item)) }));

  const keptCannotMiss = entries.filter((entry) => entry.cannotMiss).slice(0, MAX_SHOWN_DIAGNOSES);
  let room = MAX_SHOWN_DIAGNOSES - keptCannotMiss.length;
  const kept = entries.filter((entry) =>
    entry.cannotMiss ? keptCannotMiss.includes(entry) : room-- > 0
  );

  return kept.map(({ item, cannotMiss: isCannotMiss }, index) => ({
    rank: index + 1,
    icd_x: item.icd10,
    icd10_code: item.icd10,
    nama: item.label,
    confidence: Math.min(
      1,
      Math.max(MIN_SHOWN_CONFIDENCE, item.score ?? TIER_CONFIDENCE[item.confidenceTier])
    ),
    rationale:
      result.evidence.find((entry) => codeOf(entry) === codeOf(item))?.supporting.join('; ') ?? '',
    engine_tag: isCannotMiss ? MIRA_CANNOT_MISS_TAG : MIRA_TAG,
  }));
}

export async function runDiagnosisSuggestions(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  options: {
    engines?: { legacy: LegacyDiagnosisEngine; active: DiagnosisEngine };
    mode?: DiagnosisEngineMode;
    candidateTimeoutMs?: number;
  } = {}
): Promise<APIResponse<CDSSResponse>> {
  const mode = options.mode ?? getDiagnosisEngineConfig().diagnosisEngine;
  const legacy = options.engines?.legacy ?? getLegacyEngine();

  const physicianResponse = legacy.runSuggestions(encounter, context);
  if (mode === 'legacy') return physicianResponse;

  const candidate = options.engines?.active ?? getActiveDiagnosisEngine('mira');
  const caseState = encounterToCaseState(encounter, context);
  const caseKey = hashCanonical(caseState);
  const prefetched = mode === 'mira' ? peekPrefetch(caseKey) : undefined;

  if (prefetched?.status === 'pending') {
    const response = await physicianResponse;
    if (!response.success || !response.data) return response;
    return {
      ...response,
      data: {
        ...response.data,
        engine_notice: 'Menunggu MIRA…',
        engine_pending: true,
        prefetch_key: caseKey,
      },
    };
  }

  const candidateRun =
    prefetched?.status === 'done'
      ? Promise.resolve(prefetched.result)
      : stepWithTimeout(
          candidate,
          caseState,
          options.candidateTimeoutMs ?? CANDIDATE_TIMEOUT_MS
        ).then(async (result) => {
          await recordCandidateRun(result, candidate);
          return result;
        });
  if (mode === 'shadow') return physicianResponse;

  const [response, result] = await Promise.all([physicianResponse, candidateRun]);
  if (!response.success || !response.data) return response;

  const suggestions = result.status === 'ok' ? miraDifferentialToSuggestions(result) : [];
  // A network failure means the service is not up (yet): ask the supervisor to bring it up so the
  // panel's re-request, or the next run, finds it running instead of a stale status.
  if (result.status !== 'ok' && (result.error?.code === 'NETWORK_ERROR' || result.error?.code === 'NOT_CONFIGURED')) {
    void ensureMira().catch(() => undefined);
  }
  return {
    ...response,
    data:
      suggestions.length > 0
        ? { ...response.data, diagnosis_suggestions: suggestions, next_best_actions: result.nextBestActions }
        : {
            ...response.data,
            engine_notice: miraNoticeFor(
              resolveMiraNoticeCode(
                result.status === 'ok' ? undefined : result.error?.code,
                getLastMiraStatus()
              )
            ),
          },
  };
}
