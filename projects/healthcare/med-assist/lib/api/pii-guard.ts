// Designed and constructed by Drferdi.
/**
 * pii-guard — fail-closed PII tripwire for outbound platform API calls.
 *
 * This module is the last line of defense between Assist and the platform
 * backend. Every outbound HTTP call from `platform-api-client.ts` MUST pass
 * through `assertNoPII()` before the request leaves the extension. If the
 * serialized payload contains any PII pattern, the call fails closed by
 * throwing `PIILeakError` — the network request is never attempted.
 *
 * Detection logic is delegated to the canonical anonymizer
 * (`lib/iskandar-diagnosis-engine/anonymizer.ts`). This file intentionally
 * does not redefine regex patterns to keep a single source of truth for PII
 * detection.
 *
 * `hashPatientRef()` provides a deterministic SHA-256 digest of patient
 * identifiers for use in URL path segments (e.g.
 * `/api/patients/<hash>/trajectory`). The hash itself is the defense: raw
 * identifiers never leave the extension, regardless of whether they look
 * PII-shaped on input.
 */

import { containsPII, validateAnonymization } from '../iskandar-diagnosis-engine/anonymizer';

import type { AnonymizedClinicalContext } from './ai-types';

// ============================================================================
// ERRORS
// ============================================================================

export class PIILeakError extends Error {
  readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(message);
    this.name = 'PIILeakError';
    this.violations = violations;
  }
}

// ============================================================================
// GUARD
// ============================================================================

/**
 * Fail-closed assertion that the outbound payload contains no PII.
 *
 * If `ctx` is provided, the anonymized clinical context is validated first
 * against the canonical anonymizer's violation list. Any failure throws
 * before the body is even serialized.
 *
 * The body is then JSON-serialized and scanned with the canonical
 * `containsPII()` detector. On any match, throws `PIILeakError`.
 *
 * @throws PIILeakError when any PII is detected.
 */
export function assertNoPII(body: unknown, ctx?: AnonymizedClinicalContext): void {
  if (ctx) {
    const result = validateAnonymization(ctx);
    if (!result.valid) {
      throw new PIILeakError('Anonymized context failed validation', result.violations);
    }
  }

  const serialized = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  if (containsPII(serialized)) {
    throw new PIILeakError('PII detected in outbound payload');
  }
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * Hash a patient reference into a URL-safe 64-char lowercase hex SHA-256
 * digest.
 *
 * The hash IS the defense — raw identifiers never leave the extension. Even
 * if the caller passes a PII-looking ref (e.g. a raw NIK), this function
 * never rejects. The point is to ensure the outbound URL carries only the
 * digest.
 */
export async function hashPatientRef(ref: string): Promise<string> {
  const buf = new TextEncoder().encode(ref);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
