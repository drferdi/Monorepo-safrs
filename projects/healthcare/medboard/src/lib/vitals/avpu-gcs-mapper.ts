/**
 * AVPU ↔ GCS Bidirectional Mapper
 *
 * Maps between AVPU consciousness scale (simple, fast triage) and
 * Glasgow Coma Scale (detailed, granular). Used for:
 * - NEWS2 scoring (requires AVPU)
 * - qSOFA screening (requires GCS ≤14)
 * - Red flag alerting (GCS ≤8 = emergency)
 *
 * Mapping references:
 * - Kelly et al. (2004): AVPU-GCS correlation in emergency settings
 * - RCP NEWS2 (2017): Alert=0, new Confusion=3 scoring
 * - McNarry & Goldhill (2004): GCS-AVPU equivalence
 *
 * Clinical Momentum Engine — Phase 1A (Safety First)
 */

import type { AVPULevel, GCSComponents } from './unified-vitals'

// ── AVPU → NEWS2 Score ──────────────────────────────────────────────────────

/**
 * NEWS2 consciousness scoring per RCP 2017:
 * - A (Alert) = 0
 * - C (new Confusion) = 3  ← triggers single-param-3 escalation
 * - V (Voice) = 3
 * - P (Pain) = 3
 * - U (Unresponsive) = 3
 */
export function avpuToNEWS2Score(avpu: AVPULevel): number {
  return avpu === 'A' ? 0 : 3
}

// ── GCS → AVPU Mapping ─────────────────────────────────────────────────────

/**
 * Convert GCS components to AVPU level.
 *
 * Mapping logic:
 * - GCS 15 (E4V5M6) = A (Alert)
 * - GCS 14 with V ≤ 4 (verbal impairment) = C (Confusion/new confusion)
 * - GCS 14 with V = 5 (motor only) = A (still alert, minor motor issue)
 * - GCS 9-13 = V (responds to Voice — correlated range)
 * - GCS 4-8 = P (responds to Pain only — severe impairment)
 * - GCS 3 = U (Unresponsive — minimum possible)
 *
 * Evidence: Kelly et al. 2004, McNarry & Goldhill 2004
 */
export function gcsToAVPU(gcs: GCSComponents): AVPULevel {
  const total = gcs.e + gcs.v + gcs.m

  if (total >= 15) return 'A'

  // GCS 14: check verbal component specifically
  // New confusion is defined by verbal response drop (V ≤ 4)
  if (total === 14) {
    return gcs.v <= 4 ? 'C' : 'A'
  }

  // GCS 9-13: responds to voice stimuli
  if (total >= 9) return 'V'

  // GCS 4-8: responds to pain only
  if (total >= 4) return 'P'

  // GCS 3: unresponsive
  return 'U'
}

// ── AVPU → Estimated GCS ────────────────────────────────────────────────────

/**
 * Convert AVPU to estimated GCS components.
 * Used when only AVPU is available but downstream needs GCS total.
 *
 * These are clinical ESTIMATES — not exact conversions.
 * When precise GCS is needed, it should be measured directly.
 */
export function avpuToEstimatedGCS(avpu: AVPULevel): GCSComponents {
  switch (avpu) {
    case 'A':
      return { e: 4, v: 5, m: 6 } // GCS 15
    case 'C':
      return { e: 4, v: 4, m: 6 } // GCS 14 with verbal confusion
    case 'V':
      return { e: 3, v: 3, m: 5 } // GCS 11 (midpoint of 9-13)
    case 'P':
      return { e: 2, v: 2, m: 4 } // GCS 8 (upper boundary of pain-only)
    case 'U':
      return { e: 1, v: 1, m: 1 } // GCS 3 (minimum)
  }
}

// ── GCS Total from AVPU (convenience) ───────────────────────────────────────

/**
 * Get estimated GCS total from AVPU level.
 */
export function avpuToGCSTotal(avpu: AVPULevel): number {
  const gcs = avpuToEstimatedGCS(avpu)
  return gcs.e + gcs.v + gcs.m
}

// ── Consciousness Severity ──────────────────────────────────────────────────

export type ConsciousnessSeverity = 'normal' | 'impaired' | 'severe' | 'unresponsive'

/**
 * Determine consciousness severity from either AVPU or GCS.
 * Returns unified severity level for red flag engine.
 */
export function assessConsciousnessSeverity(
  avpu: AVPULevel,
  gcs?: GCSComponents
): ConsciousnessSeverity {
  // If GCS is provided, use it for more granular assessment
  if (gcs) {
    const total = gcs.e + gcs.v + gcs.m
    if (total >= 15) return 'normal'
    if (total >= 13) return 'impaired' // mild — confusion, drowsiness
    if (total >= 4) return 'severe' // moderate-severe — GCS 4-12, impaired responses
    return 'unresponsive' // GCS 3 — no response at all
  }

  // AVPU-based assessment
  switch (avpu) {
    case 'A':
      return 'normal'
    case 'C':
    case 'V':
      return 'impaired'
    case 'P':
      return 'severe'
    case 'U':
      return 'unresponsive'
  }
}

// ── Clinical Context ────────────────────────────────────────────────────────

/**
 * Determine the best available GCS total from AVPU + optional GCS.
 * If GCS is provided, use actual GCS. Otherwise estimate from AVPU.
 */
export function getBestGCSTotal(avpu: AVPULevel, gcs?: GCSComponents): number {
  if (gcs) return gcs.e + gcs.v + gcs.m
  return avpuToGCSTotal(avpu)
}
