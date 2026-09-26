'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { type AIInsightsSnapshot, buildAIInsightsSnapshot } from '@/lib/intelligence/ai-insights'
import {
  buildSnapshotObservabilityPayload,
  canDispatchObservabilityFingerprint,
  getObservabilityFingerprint,
  markObservabilityDeliveryFailed,
  markObservabilityDeliveryPending,
  markObservabilityDeliverySucceeded,
  type ObservabilityDeliveryState,
} from '@/lib/intelligence/observability'

import { AIDisclosureBadge } from './AIDisclosureBadge'
import { useSharedIntelligenceSocket } from './IntelligenceSocketProvider'
import { MedicalKnowledgeSearch } from '@/components/clinical/MedicalKnowledgeSearch'

type OverrideAction = 'accept' | 'modify' | 'reject'

export interface OverrideDraftState {
  finalIcd: string
  reason: string
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string | null
}

type OverrideStateMap = Record<string, OverrideDraftState>

const DEFAULT_DRAFT_STATE: OverrideDraftState = {
  finalIcd: '',
  reason: '',
  status: 'idle',
  message: null,
}

function getDraftState(overrideState: OverrideStateMap, suggestionId: string): OverrideDraftState {
  return overrideState[suggestionId] ?? DEFAULT_DRAFT_STATE
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 4,
  border: '1px solid var(--line-base)',
  background: 'transparent',
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--text-main)',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
}

const actionBtnBase: React.CSSProperties = {
  borderRadius: 4,
  padding: '8px 14px',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  background: 'transparent',
  transition: 'opacity 0.2s',
}

export function AIInsightsPanelContent({
  snapshot,
  overrideState,
  onDraftChange,
  onSubmitOverride,
}: {
  snapshot: AIInsightsSnapshot
  overrideState: OverrideStateMap
  onDraftChange?: (
    suggestionId: string,
    patch: Partial<Pick<OverrideDraftState, 'finalIcd' | 'reason'>>
  ) => void
  onSubmitOverride: (suggestionId: string, action: OverrideAction) => Promise<void>
}): React.JSX.Element {
  if (snapshot.isIdle) {
    return (
      <div
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontFamily: 'var(--font-mono)',
            opacity: 0.2,
            marginBottom: 12,
          }}
        >
          ◇
        </div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Menunggu event CDSS pertama</div>
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            opacity: 0.5,
          }}
        >
          To be filled — insights muncul saat encounter diproses engine
        </div>
      </div>
    )
  }

  if (snapshot.isDegraded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            borderRadius: 4,
            border: '1px dashed var(--c-critical)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--c-critical)',
              marginBottom: 8,
            }}
          >
            Degraded State
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-main)',
            }}
          >
            {snapshot.degradedMessage}
          </p>
        </div>
        {snapshot.validation.violations.length > 0 && (
          <div
            style={{
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              Guardrail Findings
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {snapshot.validation.violations.map(violation => (
                <li
                  key={violation.code}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--text-muted)',
                  }}
                >
                  {violation.code}: {violation.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Medical Knowledge Search */}
      <MedicalKnowledgeSearch />

      {/* Engine info */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          borderRadius: 4,
          border: '1px solid var(--line-base)',
          padding: '12px 16px',
        }}
      >
        <AIDisclosureBadge />
        <span
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Engine {snapshot.engineVersion ?? 'unknown'}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginLeft: 'auto',
          }}
        >
          {formatDateTime(snapshot.processedAt)} · {snapshot.latencyMs ?? 0}ms
        </span>
      </div>

      {/* Clinical Alerts */}
      {snapshot.alerts.length > 0 && (
        <div
          style={{
            borderRadius: 4,
            border: '1px solid var(--c-critical)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--c-critical)',
              marginBottom: 12,
            }}
          >
            Clinical Alerts
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {snapshot.alerts.map(alert => (
              <li
                key={alert.id}
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--text-main)',
                }}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guardrail Warnings */}
      {snapshot.validation.warnings.length > 0 && (
        <div
          style={{
            borderRadius: 4,
            border: '1px solid var(--line-base)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          >
            Guardrail Warnings
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {snapshot.validation.warnings.map(warning => (
              <li
                key={warning.code}
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--text-muted)',
                }}
              >
                {warning.code}: {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {snapshot.suggestions.map(suggestion => {
        const draftState = getDraftState(overrideState, suggestion.id)

        return (
          <article
            key={suggestion.id}
            style={{
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              background: 'var(--bg-card)',
              padding: '20px',
            }}
          >
            {/* Badges */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  borderRadius: 20,
                  border: '1px solid var(--line-base)',
                  padding: '3px 10px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {suggestion.primaryDiagnosis.icd10Code}
              </span>
              <span
                style={{
                  borderRadius: 20,
                  border: '1px solid var(--c-asesmen)',
                  padding: '3px 10px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--c-asesmen)',
                }}
              >
                Confidence {formatConfidence(suggestion.confidence)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  opacity: 0.6,
                }}
              >
                {suggestion.disclosureLabel}
              </span>
            </div>

            {/* Diagnosis name + reasoning */}
            <h3
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: 'var(--text-main)',
                marginBottom: 8,
              }}
            >
              {suggestion.primaryDiagnosis.description}
            </h3>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              {suggestion.reasoning}
            </p>

            {/* Supporting evidence */}
            {suggestion.supportingEvidence.length > 0 && (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {suggestion.supportingEvidence.map(item => (
                  <li
                    key={item}
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: 'var(--text-muted)',
                    }}
                  >
                    • {item}
                  </li>
                ))}
              </ul>
            )}

            {/* Override inputs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Final ICD-10
                </div>
                <input
                  value={draftState.finalIcd}
                  onChange={event =>
                    onDraftChange?.(suggestion.id, {
                      finalIcd: event.target.value,
                    })
                  }
                  placeholder={suggestion.primaryDiagnosis.icd10Code}
                  style={inputStyle}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Alasan override
                </div>
                <input
                  value={draftState.reason}
                  onChange={event =>
                    onDraftChange?.(suggestion.id, {
                      reason: event.target.value,
                    })
                  }
                  placeholder="Opsional untuk accept, wajib untuk modify/reject."
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => void onSubmitOverride(suggestion.id, 'accept')}
                disabled={draftState.status === 'submitting'}
                style={{
                  ...actionBtnBase,
                  border: '1px solid var(--c-asesmen)',
                  color: 'var(--c-asesmen)',
                  opacity: draftState.status === 'submitting' ? 0.5 : 1,
                }}
              >
                Terima
              </button>
              <button
                type="button"
                onClick={() => void onSubmitOverride(suggestion.id, 'modify')}
                disabled={draftState.status === 'submitting'}
                style={{
                  ...actionBtnBase,
                  border: '1px solid var(--line-base)',
                  color: 'var(--text-main)',
                  opacity: draftState.status === 'submitting' ? 0.5 : 1,
                }}
              >
                Override
              </button>
              <button
                type="button"
                onClick={() => void onSubmitOverride(suggestion.id, 'reject')}
                disabled={draftState.status === 'submitting'}
                style={{
                  ...actionBtnBase,
                  border: '1px solid var(--c-critical)',
                  color: 'var(--c-critical)',
                  opacity: draftState.status === 'submitting' ? 0.5 : 1,
                }}
              >
                Tolak
              </button>
            </div>

            {/* Draft message */}
            {draftState.message && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: draftState.status === 'error' ? 'var(--c-critical)' : 'var(--text-muted)',
                }}
              >
                {draftState.message}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function AIInsightsPanel(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket()
  const snapshot = useMemo(
    () => buildAIInsightsSnapshot(socket.lastCdssSuggestion),
    [socket.lastCdssSuggestion]
  )
  const observabilityDeliveryRef = useRef<ObservabilityDeliveryState>({
    pendingFingerprint: null,
    reportedFingerprint: null,
  })
  const [overrideState, setOverrideState] = useState<OverrideStateMap>({})

  useEffect(() => {
    const payload = buildSnapshotObservabilityPayload(snapshot)
    if (!payload) return

    const fingerprint = getObservabilityFingerprint(payload)
    if (!canDispatchObservabilityFingerprint(observabilityDeliveryRef.current, fingerprint)) {
      return
    }

    observabilityDeliveryRef.current = markObservabilityDeliveryPending(
      observabilityDeliveryRef.current,
      fingerprint
    )

    void fetch('/api/dashboard/intelligence/observability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to report intelligence observability.')
        }
        observabilityDeliveryRef.current = markObservabilityDeliverySucceeded(
          observabilityDeliveryRef.current,
          fingerprint
        )
      })
      .catch(() => {
        observabilityDeliveryRef.current = markObservabilityDeliveryFailed(
          observabilityDeliveryRef.current,
          fingerprint
        )
      })
  }, [snapshot])

  function updateDraft(
    suggestionId: string,
    patch: Partial<Pick<OverrideDraftState, 'finalIcd' | 'reason'>>
  ): void {
    setOverrideState(current => ({
      ...current,
      [suggestionId]: {
        ...getDraftState(current, suggestionId),
        ...patch,
        status: 'idle',
        message: null,
      },
    }))
  }

  async function submitOverride(suggestionId: string, action: OverrideAction): Promise<void> {
    const suggestion = snapshot.suggestions.find(item => item.id === suggestionId)
    if (!snapshot.encounterId || !suggestion) return

    const draftState = getDraftState(overrideState, suggestionId)
    if (action !== 'accept' && !draftState.reason.trim()) {
      setOverrideState(current => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: 'error',
          message: 'Alasan override diperlukan untuk modify atau reject.',
        },
      }))
      return
    }

    if (action === 'modify' && !draftState.finalIcd.trim()) {
      setOverrideState(current => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: 'error',
          message: 'Masukkan ICD-10 final sebelum menyimpan override.',
        },
      }))
      return
    }

    setOverrideState(current => ({
      ...current,
      [suggestionId]: {
        ...getDraftState(current, suggestionId),
        status: 'submitting',
        message: 'Merekam override...',
      },
    }))

    try {
      const response = await fetch('/api/dashboard/intelligence/override', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          encounterId: snapshot.encounterId,
          action,
          selectedIcd: suggestion.primaryDiagnosis.icd10Code,
          finalIcd:
            action === 'accept'
              ? suggestion.primaryDiagnosis.icd10Code
              : draftState.finalIcd.trim() || undefined,
          selectedConfidence: suggestion.confidence,
          overrideReason:
            action === 'accept'
              ? draftState.reason.trim() || 'Clinician accepted guarded suggestion'
              : draftState.reason.trim(),
          metadata: {
            source: 'dashboard-intelligence',
            requestId: snapshot.requestId,
            engineVersion: snapshot.engineVersion,
          },
        }),
      })

      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null

      if (!response.ok) {
        throw new Error(body?.error?.message ?? 'Gagal merekam override intelligence.')
      }

      setOverrideState(current => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: 'success',
          message: 'Override berhasil direkam.',
        },
      }))
    } catch (error) {
      setOverrideState(current => ({
        ...current,
        [suggestionId]: {
          ...getDraftState(current, suggestionId),
          status: 'error',
          message: error instanceof Error ? error.message : 'Gagal merekam override.',
        },
      }))
    }
  }

  return (
    <AIInsightsPanelContent
      snapshot={snapshot}
      overrideState={overrideState}
      onDraftChange={updateDraft}
      onSubmitOverride={submitOverride}
    />
  )
}
