'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScreeningAuditEntry {
  id: string
  eventId: string
  assistId: string
  consultId: string | null
  patientId: string
  doctorId: string
  facilityId: string
  screeningStatus: string
  riskLevel: string | null
  score: number | null
  resultSummary: string | null
  deliveryStatus: string
  deliveryTimestamp: string
  acknowledgedByDoctor: boolean
  ackTimestamp: string | null
  createdAt: string
}

interface LogbookResponse {
  ok: boolean
  data: ScreeningAuditEntry[]
  pagination: { page: number; perPage: number; total: number; totalPages: number }
}

// ── Status colours (semantic — not design-system, stay hardcoded) ─────────────

function statusBadge(s: string) {
  const m: Record<string, { color: string; bg: string; border: string; label: string }> = {
    positive:     { color: '#FC8181', bg: 'rgba(252,129,129,0.10)', border: 'rgba(252,129,129,0.20)', label: 'Positif'       },
    negative:     { color: '#68D391', bg: 'rgba(104,211,145,0.10)', border: 'rgba(104,211,145,0.20)', label: 'Negatif'       },
    inconclusive: { color: '#F6AD55', bg: 'rgba(246,173,85,0.10)',  border: 'rgba(246,173,85,0.20)',  label: 'Tdk Konklusif' },
  }
  return m[s] ?? { color: 'var(--text-muted)', bg: 'rgba(115,115,115,0.10)', border: 'rgba(115,115,115,0.20)', label: s }
}

const RISK_COLOR: Record<string, string>     = { critical: '#FC8181', high: '#F6AD55', medium: '#63B3ED', low: '#68D391' }
const DELIVERY_COLOR: Record<string, string> = { sent: '#63B3ED', delivered: '#68D391', failed: '#FC8181', pending: 'var(--text-muted)' }

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// ── Component ─────────────────────────────────────────────────────────────────

export function ScreeningLogbook() {
  const [entries, setEntries]               = useState<ScreeningAuditEntry[]>([])
  const [pagination, setPagination]         = useState({ page: 1, perPage: 50, total: 0, totalPages: 0 })
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [page, setPage]                     = useState(1)
  const [filterDoctor, setFilterDoctor]     = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterDelivery, setFilterDelivery] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page), per_page: '50',
        ...(filterDoctor   ? { doctor_id: filterDoctor }         : {}),
        ...(filterStatus   ? { screening_status: filterStatus }  : {}),
        ...(filterDelivery ? { delivery_status: filterDelivery } : {}),
      })
      const res  = await fetch(`/api/v1/logs/screening?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: LogbookResponse = await res.json()
      if (!json.ok) throw new Error('API returned ok:false')
      setEntries(json.data.map((r) => ({
        ...r,
        createdAt:         typeof r.createdAt         === 'string' ? r.createdAt         : String(r.createdAt),
        deliveryTimestamp: typeof r.deliveryTimestamp === 'string' ? r.deliveryTimestamp : String(r.deliveryTimestamp),
      })))
      setPagination(json.pagination)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat logbook')
    } finally {
      setLoading(false)
    }
  }, [page, filterDoctor, filterStatus, filterDelivery])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    intervalRef.current = setInterval(() => void fetchLogs(), 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchLogs])

  const inputStyle: React.CSSProperties = {
    background:  'var(--bg-card)',
    border:      '1px solid var(--line-base)',
    borderRadius: '4px',
    color:       'var(--text-main)',
    fontSize:    '13px',
    fontFamily:  FONT,
    padding:     '7px 12px',
    outline:     'none',
    transition:  'border-color 0.15s',
  }

  const COLS = ['Waktu', 'Assist ID', 'Fasilitas', 'Dokter', 'Hasil', 'Risiko', 'Status Kirim', 'Ack']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: FONT }}>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Filter dokter ID…"
          value={filterDoctor}
          onChange={(e) => { setFilterDoctor(e.target.value); setPage(1) }}
          style={{ ...inputStyle, width: '160px' }}
          aria-label="Filter dokter ID"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          style={{ ...inputStyle, cursor: 'pointer' }}
          aria-label="Filter status skrining"
        >
          <option value="">Semua Status Skrining</option>
          <option value="positive">Positif</option>
          <option value="negative">Negatif</option>
          <option value="inconclusive">Tidak Konklusif</option>
        </select>
        <select
          value={filterDelivery}
          onChange={(e) => { setFilterDelivery(e.target.value); setPage(1) }}
          style={{ ...inputStyle, cursor: 'pointer' }}
          aria-label="Filter status pengiriman"
        >
          <option value="">Semua Status Kirim</option>
          <option value="sent">Terkirim</option>
          <option value="delivered">Diterima</option>
          <option value="failed">Gagal</option>
          <option value="pending">Pending</option>
        </select>

        <button
          type="button"
          onClick={() => void fetchLogs()}
          data-metric="logbook-refresh"
          aria-label="Refresh logbook"
          style={{
            ...inputStyle,
            background:    '#FFFFFF',
            color:         '#000000',
            border:        'none',
            fontSize:      '11px',
            fontWeight:    600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            boxShadow:     '0 0 15px rgba(255,255,255,0.15)',
          }}
        >
          Refresh
        </button>

        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          {pagination.total} total event
        </span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div role="alert" style={{
          background: 'rgba(252,129,129,0.10)', border: '1px solid rgba(252,129,129,0.20)',
          borderRadius: '6px', color: '#FC8181', fontSize: '13px', padding: '12px 16px',
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {!error && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--line-base)', borderRadius: '6px' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            role="grid"
            aria-label="Logbook audit skrining"
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line-base)' }}>
                {COLS.map((h) => (
                  <th key={h} scope="col" style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 600,
                    letterSpacing: '0.08em', color: 'var(--text-muted)',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.1em' }}>MEMUAT…</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.1em' }}>BELUM ADA DATA AUDIT LOG</td></tr>
              ) : entries.map((entry) => {
                const badge = statusBadge(entry.screeningStatus)
                return (
                  <tr
                    key={entry.eventId}
                    style={{
                      borderBottom:  '1px dashed var(--line-base)',
                      borderLeft:    entry.deliveryStatus === 'failed' ? '2px solid #FC8181' : '2px solid transparent',
                      transition:    'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(239,236,230,0.02)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      <Link
                        href={`/audit/logbook/${encodeURIComponent(entry.eventId)}`}
                        style={{ color: 'var(--c-asesmen)', textDecoration: 'none', display: 'block' }}
                      >
                        {new Date(entry.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </Link>
                    </td>
                    <td title={entry.assistId} style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.assistId.length > 22 ? `${entry.assistId.slice(0, 22)}…` : entry.assistId}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>{entry.facilityId}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)', fontSize: '13px' }}>{entry.doctorId}</td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px',
                        borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`,
                      }}>
                        {badge.label}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: RISK_COLOR[entry.riskLevel ?? ''] ?? 'var(--text-muted)' }}>
                      {entry.riskLevel ?? '—'}
                      {entry.score !== null && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>({entry.score})</span>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: DELIVERY_COLOR[entry.deliveryStatus] ?? 'var(--text-muted)' }}>
                      {entry.deliveryStatus}
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '14px', textAlign: 'center' }}>
                      {entry.acknowledgedByDoctor
                        ? <span style={{ color: '#68D391' }} aria-label="Sudah di-ack">✓</span>
                        : <span style={{ color: 'var(--text-muted)' }} aria-label="Belum di-ack">—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
          {[
            { label: '← Sebelumnya', disabled: page <= 1,                    onClick: () => setPage((p) => p - 1) },
            { label: 'Berikutnya →', disabled: page >= pagination.totalPages, onClick: () => setPage((p) => p + 1) },
          ].map(({ label, disabled, onClick }, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={onClick}
              style={{
                background:   'var(--bg-card)',
                border:       '1px solid var(--line-base)',
                borderRadius: '4px',
                color:        disabled ? 'var(--text-muted)' : 'var(--text-main)',
                fontSize:     '12px',
                fontFamily:   FONT,
                padding:      '6px 12px',
                cursor:       disabled ? 'not-allowed' : 'pointer',
                opacity:      disabled ? 0.4 : 1,
                transition:   'opacity 0.15s',
              }}
            >
              {label}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{page} / {pagination.totalPages}</span>
        </div>
      )}
    </div>
  )
}
