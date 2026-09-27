/**
 * The diagnosis step the background runs for the side panel's `getSuggestions` request.
 *
 * The physician always sees the legacy engine's response, unchanged. When the flag selects a
 * candidate engine (MIRA), it runs alongside on the same de-identified case, and only its
 * outcome (status, ICD codes, latency; no clinical text) is written to the audit log for
 * comparison. A candidate failure never changes what the physician sees and never touches the
 * safety layer; the response waits for the candidate at most `candidateTimeoutMs`.
 *
 * @module lib/diagnosis-engine/run-diagnosis
 */

import { encounterToCaseState } from './case-state';
import { createTraceId, createUnavailableResult } from './engine-result';
import type { LegacyDiagnosisEngine } from './legacy-engine';
import { getActiveDiagnosisEngine, getLegacyEngine } from './registry';
import type { CaseState, DiagnosisEngine, EngineResult } from './types';

import { logShadowComparison } from '@/lib/iskandar-diagnosis-engine/audit-logger';
import type { APIResponse, CDSSResponse, DiagnosisRequestContext } from '@/types/api';
import { createLogger } from '@/utils/logger';
import type { Encounter } from '~/utils/types';

const log = createLogger('DiagnosisEngine', 'global');

/** Upper bound for a candidate engine, whatever its own client timeout is. */
export const CANDIDATE_TIMEOUT_MS = 20_000;

async function stepWithTimeout(
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

async function recordCandidateRun(result: EngineResult, engine: DiagnosisEngine): Promise<void> {
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

export async function runDiagnosisSuggestions(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  options: {
    engines?: { legacy: LegacyDiagnosisEngine; active: DiagnosisEngine };
    candidateTimeoutMs?: number;
  } = {}
): Promise<APIResponse<CDSSResponse>> {
  const legacy = options.engines?.legacy ?? getLegacyEngine();
  const active = options.engines?.active ?? getActiveDiagnosisEngine();

  const physicianResponse = legacy.runSuggestions(encounter, context);
  if (active.id === 'legacy') return physicianResponse;

  const candidateRun = stepWithTimeout(
    active,
    encounterToCaseState(encounter, context),
    options.candidateTimeoutMs ?? CANDIDATE_TIMEOUT_MS
  ).then((result) => recordCandidateRun(result, active));

  const [response] = await Promise.all([physicianResponse, candidateRun]);
  return response;
}
