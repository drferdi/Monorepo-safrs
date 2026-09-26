// Designed and constructed by Drferdi.
/**
 * platform-api-client — typed HTTP surface for the canonical platform API.
 *
 * This module is host-agnostic by design. Today the canonical platform API is
 * hosted by `medboard`; later it may migrate to `apps/platform/orchestrator`.
 * Consumers never depend on host identity — only on endpoint paths and the typed
 * contracts in `./platform-api-contract` (vendored from the platform).
 *
 * Transport is delegated to `authedFetch`, which already implements:
 *   - HMAC crew cookie / `CREW_ACCESS_AUTOMATION_TOKEN` auth resolution.
 *   - `credentials: 'include'` + `X-Correlation-Id`.
 *   - 30s timeout.
 *   - 401 refresh-and-retry.
 *   - Typed errors (`AuthRequiredError`, `BridgeApiError`,
 *     `BridgeResponseFormatError`).
 *
 * Every method runs `assertNoPII` BEFORE the transport call. Violations throw
 * `PIILeakError` and the fetch is never issued. For trajectory lookups, the
 * caller-supplied patient reference is hashed with `hashPatientRef` so the
 * URL carries only a SHA-256 digest.
 *
 * TODO(orchestrator-pivot): when `apps/platform/orchestrator` ships, either
 * (a) teach `authedFetch` to prefer a `platformApiBaseUrl` auth config field
 * over the legacy `baseUrl`, or (b) introduce a slim alternative transport
 * that shares auth logic via a helper. The path constants below are stable
 * under the orchestrator lane; only the base URL changes.
 */

import { authedFetch } from './authed-fetch';
import { assertNoPII, hashPatientRef } from './pii-guard';
import type {
  PlatformDiagnoseRequest,
  PlatformDiagnoseResponse,
  PlatformOutcomeFeedbackRequest,
  PlatformRedFlagAckRequest,
  PlatformSuggestionSelectedRequest,
  PlatformTrajectoryResponse,
} from './platform-api-contract';

// ============================================================================
// PATH CONSTANTS
// ============================================================================

const PATH_CDSS_DIAGNOSE = '/api/cdss/diagnose';
const PATH_CDSS_RED_FLAG_ACK = '/api/cdss/red-flag-ack';
const PATH_CDSS_SUGGESTION_SELECTED = '/api/cdss/suggestion-selected';
const PATH_CDSS_OUTCOME_FEEDBACK = '/api/cdss/outcome-feedback';

function trajectoryPath(hash: string, visits: number): string {
  return `/api/patients/${hash}/trajectory?visits=${visits}`;
}

// ============================================================================
// INTERNAL: PII-GUARDED POST
// ============================================================================

async function guardedPost<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
  assertNoPII(body);
  return authedFetch<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ============================================================================
// CDSS DIAGNOSE
// ============================================================================

export async function diagnose(
  request: PlatformDiagnoseRequest
): Promise<PlatformDiagnoseResponse> {
  return guardedPost<PlatformDiagnoseRequest, PlatformDiagnoseResponse>(
    PATH_CDSS_DIAGNOSE,
    request
  );
}

// ============================================================================
// CDSS AUDIT (session-scoped, no patient payload)
// ============================================================================

export async function ackRedFlag(
  request: PlatformRedFlagAckRequest
): Promise<{ success: boolean }> {
  return guardedPost<PlatformRedFlagAckRequest, { success: boolean }>(
    PATH_CDSS_RED_FLAG_ACK,
    request
  );
}

export async function selectSuggestion(
  request: PlatformSuggestionSelectedRequest
): Promise<{ success: boolean }> {
  return guardedPost<PlatformSuggestionSelectedRequest, { success: boolean }>(
    PATH_CDSS_SUGGESTION_SELECTED,
    request
  );
}

export async function submitOutcomeFeedback(
  request: PlatformOutcomeFeedbackRequest
): Promise<{ success: boolean }> {
  return guardedPost<PlatformOutcomeFeedbackRequest, { success: boolean }>(
    PATH_CDSS_OUTCOME_FEEDBACK,
    request
  );
}

// ============================================================================
// CLINICAL TRAJECTORY
// ============================================================================

/**
 * Fetch the Clinical Momentum Engine trajectory for a patient.
 *
 * `patientRef` is hashed to SHA-256 before being placed in the URL path. The
 * raw reference never leaves the extension. If the caller passes a PII-shaped
 * ref (e.g. a raw NIK), the hash is still the defense — the outbound URL
 * carries only the digest.
 *
 * @param patientRef any stable patient identifier (MRN, encounter ref, etc.).
 * @param visits visit count to analyze (1–10, default behavior is server-side clamped).
 */
export async function getTrajectory(
  patientRef: string,
  visits: number
): Promise<PlatformTrajectoryResponse> {
  const hash = await hashPatientRef(patientRef);
  const path = trajectoryPath(hash, visits);
  return authedFetch<PlatformTrajectoryResponse>(path, { method: 'GET' });
}
