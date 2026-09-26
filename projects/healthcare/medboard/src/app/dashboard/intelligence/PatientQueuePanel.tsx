'use client'

import { useEncounterQueue } from '@/hooks/useEncounterQueue'
import {
  getIntelligenceEventStatusLabel,
  type IntelligenceEventStatus,
} from '@/lib/intelligence/socket-payload'

import { useSharedIntelligenceSocket } from './IntelligenceSocketProvider'

// ── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  indicator: string
  color: string
  borderColor: string
}

const STATUS_CONFIG: Record<IntelligenceEventStatus, StatusConfig> = {
  in_consultation: {
    indicator: '●',
    color: 'var(--c-asesmen)',
    borderColor: 'var(--c-asesmen)',
  },
  cdss_pending: {
    indicator: '◐',
    color: 'var(--c-asesmen)',
    borderColor: 'var(--c-asesmen)',
  },
  documentation_incomplete: {
    indicator: '⚠',
    color: 'var(--c-critical)',
    borderColor: 'var(--c-critical)',
  },
  waiting: {
    indicator: '○',
    color: 'var(--text-muted)',
    borderColor: 'var(--line-base)',
  },
  completed: {
    indicator: '✓',
    color: 'var(--text-muted)',
    borderColor: 'transparent',
  },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PatientQueuePanel(): React.JSX.Element {
  const socket = useSharedIntelligenceSocket()
  const { encounters, isLoading, error, isStale, retry } = useEncounterQueue(socket)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: 80,
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              background: 'var(--bg-card)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            borderRadius: 4,
            border: '1px dashed var(--c-critical)',
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--c-critical)',
          }}
        >
          {error}
        </div>
        <button
          type="button"
          onClick={retry}
          style={{
            alignSelf: 'flex-start',
            borderRadius: 4,
            border: '1px solid var(--line-base)',
            padding: '6px 12px',
            fontSize: 13,
            color: 'var(--text-muted)',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (encounters.length === 0) {
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
          ○
        </div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>Tidak ada encounter aktif saat ini</div>
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            opacity: 0.5,
          }}
        >
          To be filled — encounter akan muncul saat shift aktif
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Stale data warning */}
      {isStale && (
        <div
          role="status"
          style={{
            borderRadius: 4,
            border: '1px dashed var(--line-base)',
            padding: '8px 12px',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          ⚠ Koneksi terputus — data mungkin tidak terbaru.
        </div>
      )}

      {encounters.map(item => {
        const cfg = STATUS_CONFIG[item.status]
        return (
          <article
            key={item.encounterId}
            style={{
              borderRadius: 4,
              border: '1px solid var(--line-base)',
              borderLeft: `3px solid ${cfg.borderColor}`,
              background: 'var(--bg-card)',
              padding: '14px 16px',
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    opacity: 0.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.encounterId}
                </div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-main)',
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.patientLabel}
                </h3>
              </div>

              {/* Status badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                  borderRadius: 20,
                  border: `1px solid ${cfg.color}`,
                  padding: '4px 10px',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: cfg.color,
                }}
              >
                <span aria-hidden="true">{cfg.indicator}</span>
                {getIntelligenceEventStatusLabel(item.status)}
              </span>
            </div>

            {/* Note */}
            {item.note && (
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'var(--text-muted)',
                  marginTop: 8,
                }}
              >
                {item.note}
              </p>
            )}

            {/* Timestamp */}
            <div
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                opacity: 0.5,
                marginTop: 8,
              }}
            >
              {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </article>
        )
      })}
    </div>
  )
}
