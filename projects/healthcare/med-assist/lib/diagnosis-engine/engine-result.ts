/**
 * Helpers shared by every engine adapter.
 *
 * @module lib/diagnosis-engine/engine-result
 */

import type { DiagnosisEngineId, EngineResult, EngineResultField } from './types';

const ALL_FIELDS: EngineResultField[] = [
  'differential.likely',
  'differential.alternatives',
  'differential.cannotMiss',
  'evidence.supporting',
  'evidence.opposing',
  'missingInformation',
  'nextBestActions',
  'disposition',
];

export function createTraceId(): string {
  return crypto.randomUUID();
}

/**
 * The result an engine returns when it could not produce an answer (error, timeout, blocked
 * payload, abort). Every field is empty and flagged, so no caller can mistake it for a result.
 */
export function createUnavailableResult(params: {
  engineId: DiagnosisEngineId;
  version: string;
  code: string;
  message: string;
  latencyMs: number | null;
  traceId: string;
  model?: string | null;
}): EngineResult {
  return {
    status: 'unavailable',
    differential: { likely: [], alternatives: [], cannotMiss: [] },
    evidence: [],
    missingInformation: [],
    nextBestActions: [],
    disposition: null,
    unfilled: ALL_FIELDS.map((field) => ({ field, reason: `engine unavailable: ${params.code}` })),
    error: { code: params.code, message: params.message },
    meta: {
      engineId: params.engineId,
      version: params.version,
      model: params.model ?? null,
      costUsd: null,
      latencyMs: params.latencyMs,
      traceId: params.traceId,
    },
  };
}
