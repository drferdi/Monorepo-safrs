/**
 * MIRA engine slot: an HTTP client for the Sentra-side reasoning service that runs MIRA.
 *
 * - The extension never holds an OpenAI key for MIRA; it only talks to the service at
 *   `VITE_MIRA_SERVICE_URL` (unset = engine unavailable, no request).
 * - Development only: `VITE_MIRA_DEV_TOKEN` is sent as `Authorization: Bearer <token>` (the
 *   service's development token check). A `VITE_` value is inlined into the bundle, so never
 *   put a production secret there. Unset = no header.
 * - Every payload passes `assertNoPII` (`lib/api/pii-guard.ts`); if it is blocked, nothing is
 *   sent.
 * - Timeouts, network errors, HTTP errors and responses that break the contract
 *   (`contract/mira-step-response.schema.json`) all return a flagged "unavailable" result.
 *
 * Off by default: the registry returns this engine only when `diagnosisEngine` is `'shadow'` or
 * `'mira'`; `run-diagnosis.ts` decides whether the physician sees its result.
 *
 * @module lib/diagnosis-engine/mira-engine
 */

import responseSchema from './contract/mira-step-response.schema.json';
import { validateJson, type JsonSchema } from './contract/validate-json';
import { createTraceId, createUnavailableResult } from './engine-result';
import { MIRA_PLAN_MODEL_HEADER, getMiraPlanModel } from './mira-plan-model';
import type { CaseState, DiagnosisEngine, EngineResult } from './types';

import { assertNoPII } from '@/lib/api/pii-guard';

export const MIRA_ENGINE_VERSION = 'mira-client-1';
export const MIRA_CONTRACT_VERSION = '1';
export const MIRA_STEP_PATH = '/v1/diagnosis/step';
export const MIRA_REQUEST_TIMEOUT_MS = 15_000;

export interface MiraStepRequest {
  contractVersion: typeof MIRA_CONTRACT_VERSION;
  traceId: string;
  case: CaseState;
}

export type MiraStepResponse = Omit<EngineResult, 'meta'> & {
  contractVersion: typeof MIRA_CONTRACT_VERSION;
  meta: { version: string; model: string | null; costUsd: number | null };
};

export function buildMiraStepRequest(input: CaseState, traceId: string): MiraStepRequest {
  return { contractVersion: MIRA_CONTRACT_VERSION, traceId, case: input };
}

export function validateMiraStepResponse(value: unknown): string[] {
  return validateJson(value, responseSchema as JsonSchema);
}

export function createMiraEngine(
  deps: {
    fetchFn?: typeof fetch;
    baseUrl?: () => string | undefined;
    timeoutMs?: number;
    planModel?: () => Promise<string | undefined>;
    devToken?: () => string | undefined;
  } = {}
): DiagnosisEngine {
  const fetchFn = deps.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const readBaseUrl = deps.baseUrl ?? (() => import.meta.env.VITE_MIRA_SERVICE_URL);
  const timeoutMs = deps.timeoutMs ?? MIRA_REQUEST_TIMEOUT_MS;
  const readPlanModel = deps.planModel ?? getMiraPlanModel;
  const readDevToken = deps.devToken ?? (() => import.meta.env.VITE_MIRA_DEV_TOKEN);

  return {
    id: 'mira',
    version: MIRA_ENGINE_VERSION,
    async step(input, opts) {
      const traceId = createTraceId();
      const startedAt = Date.now();
      const unavailable = (code: string, message: string): EngineResult =>
        createUnavailableResult({
          engineId: 'mira',
          version: MIRA_ENGINE_VERSION,
          code,
          message,
          latencyMs: Date.now() - startedAt,
          traceId,
        });

      const baseUrl = readBaseUrl()?.trim().replace(/\/+$/, '');
      if (!baseUrl) return unavailable('NOT_CONFIGURED', 'VITE_MIRA_SERVICE_URL is not set');
      if (opts?.signal?.aborted) return unavailable('ABORTED', 'Request aborted before sending');

      const body = JSON.stringify(buildMiraStepRequest(input, traceId));
      try {
        // Scan the case, the only part that carries patient-derived text. The trace id is a
        // random UUID made here; its digit runs match the phone/NIK patterns in about 1 of 700
        // requests, which blocked MIRA at random.
        assertNoPII(JSON.stringify(input));
      } catch {
        // Never echo the payload: it is exactly what the guard refused to send.
        return unavailable('PII_BLOCKED', 'Payload blocked by the PII guard; nothing was sent');
      }

      // A developer or admin may pick the planning model; the service checks it against its allowlist.
      const planModel = await readPlanModel();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (planModel) headers[MIRA_PLAN_MODEL_HEADER] = planModel;
      const devToken = readDevToken()?.trim();
      if (devToken) headers.Authorization = `Bearer ${devToken}`;

      const controller = new AbortController();
      const onAbort = () => controller.abort();
      opts?.signal?.addEventListener('abort', onAbort, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      try {
        const response = await fetchFn(`${baseUrl}${MIRA_STEP_PATH}`, {
          method: 'POST',
          headers,
          body,
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) {
          return unavailable(`HTTP_${response.status}`, 'Reasoning service returned an error');
        }

        const payload: unknown = await response.json();
        const violations = validateMiraStepResponse(payload);
        if (violations.length > 0) {
          return unavailable(
            'CONTRACT_MISMATCH',
            `Response breaks the contract: ${violations.slice(0, 5).join('; ')}`
          );
        }

        const { contractVersion: _contractVersion, meta, ...result } = payload as MiraStepResponse;
        return {
          ...result,
          meta: {
            engineId: 'mira',
            version: `${MIRA_ENGINE_VERSION}/${meta.version}`,
            model: meta.model,
            costUsd: meta.costUsd,
            latencyMs: Date.now() - startedAt,
            traceId,
          },
        };
      } catch (error) {
        if (controller.signal.aborted) {
          return timedOut
            ? unavailable('TIMEOUT', `No answer within ${timeoutMs} ms`)
            : unavailable('ABORTED', 'Request aborted by the caller');
        }
        return unavailable(
          'NETWORK_ERROR',
          error instanceof Error ? error.message : 'Reasoning service unreachable'
        );
      } finally {
        clearTimeout(timer);
        opts?.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
