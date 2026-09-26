import type { AIInsightsSnapshot } from './ai-insights'

export type IntelligenceInteraction =
  | 'rendered'
  | 'guardrail_blocked'
  | 'degraded'
  | 'alert_acknowledged'

export interface IntelligenceObservabilityPayload {
  encounterId: string
  requestId?: string
  interaction: IntelligenceInteraction
  latencyMs?: number
  suggestionCount: number
  violationCount: number
  warningCount: number
  primaryConfidence?: number
  metadata?: Record<string, unknown>
}

export interface ObservabilityDeliveryState {
  pendingFingerprint: string | null
  reportedFingerprint: string | null
}

export function buildSnapshotObservabilityPayload(
  snapshot: AIInsightsSnapshot
): IntelligenceObservabilityPayload | null {
  if (!snapshot.encounterId) {
    return null
  }

  const interaction: IntelligenceInteraction = snapshot.isDegraded
    ? snapshot.validation.violations.length > 0
      ? 'guardrail_blocked'
      : 'degraded'
    : 'rendered'

  return {
    encounterId: snapshot.encounterId,
    requestId: snapshot.requestId ?? undefined,
    interaction,
    latencyMs: snapshot.latencyMs ?? undefined,
    suggestionCount: snapshot.suggestions.length,
    violationCount: snapshot.validation.violations.length,
    warningCount: snapshot.validation.warnings.length,
    primaryConfidence: snapshot.suggestions[0]?.confidence,
    metadata: {
      engineVersion: snapshot.engineVersion,
      processedAt: snapshot.processedAt,
      degradedMessage: snapshot.degradedMessage || undefined,
    },
  }
}

export function getObservabilityFingerprint(payload: IntelligenceObservabilityPayload): string {
  return [
    payload.encounterId,
    payload.requestId ?? 'none',
    payload.interaction,
    payload.suggestionCount,
    payload.violationCount,
    payload.warningCount,
    payload.primaryConfidence ?? 'none',
  ].join(':')
}

export function canDispatchObservabilityFingerprint(
  state: ObservabilityDeliveryState,
  fingerprint: string
): boolean {
  return state.reportedFingerprint !== fingerprint && state.pendingFingerprint !== fingerprint
}

export function markObservabilityDeliveryPending(
  state: ObservabilityDeliveryState,
  fingerprint: string
): ObservabilityDeliveryState {
  return {
    ...state,
    pendingFingerprint: fingerprint,
  }
}

export function markObservabilityDeliverySucceeded(
  state: ObservabilityDeliveryState,
  fingerprint: string
): ObservabilityDeliveryState {
  return {
    pendingFingerprint: state.pendingFingerprint === fingerprint ? null : state.pendingFingerprint,
    reportedFingerprint: fingerprint,
  }
}

export function markObservabilityDeliveryFailed(
  state: ObservabilityDeliveryState,
  fingerprint: string
): ObservabilityDeliveryState {
  if (state.pendingFingerprint !== fingerprint) {
    return state
  }

  return {
    ...state,
    pendingFingerprint: null,
  }
}
