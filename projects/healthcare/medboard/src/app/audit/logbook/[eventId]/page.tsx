'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScreeningAuditDetail {
  id: string
  eventId: string
  assistId: string
  consultId: string | null
  patientId: string
  screeningId: string | null
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
  appVersion: string | null
  immutableHash: string | null
  senderUserId: string | null
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
  } catch { return iso }
}

const STATUS_LABEL: Record<string, string> = {
  positive: 'Positif', negative: 'Negatif', inconclusive: 'Tidak Konklusif',
}

const PAGE_W = 1100

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = use(params)
  const [data, setData]       = useState<ScreeningAuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [acking, setAcking]   = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/v1/logs/screening/${encodeURIComponent(eventId)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { ok: boolean; data: ScreeningAuditDetail }
        if (!json.ok) throw new Error('API returned ok:false')
        setData(json.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat event')
      } finally {
        setLoading(false)
      }
    })()
  }, [eventId])

  async function handleAck() {
    if (!data || data.acknowledgedByDoctor) return
    setAcking(true)
    try {
      await fetch(`/api/v1/logs/screening/${encodeURIComponent(eventId)}/ack`, { method: 'POST' })
      setData(prev => prev ? { ...prev, acknowledgedByDoctor: true, ackTimestamp: new Date().toISOString() } : null)
    } finally {
      setAcking(false)
    }
  }

  /* ── Shared styles — identical to clinical report ── */
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    background: 'var(--bg-card)',
    color: 'var(--text-main)',
    border: '1px solid var(--line-base)',
    outline: 'none',
    borderRadius: 0,
  }
  const monoStyle: React.CSSProperties = {
    ...inputStyle,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 12,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    wordBreak: 'break-all',
  }
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.15em',
    color: 'var(--c-asesmen)',
    borderBottom: '1px solid var(--line-base)',
    paddingBottom: 6,
    marginBottom: 16,
    marginTop: 32,
  }
  const btnStyle: React.CSSProperties = {
    fontSize: 13,
    letterSpacing: '0.1em',
    padding: '8px 20px',
    background: '#101012',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.92)',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    textDecoration: 'none',
    display: 'inline-block',
  }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 12 }
  const field: React.CSSProperties = { marginBottom: 12 }

  /* ── Loading / error states ── */
  if (loading) return (
    <div style={{ maxWidth: PAGE_W, margin: '0 auto', padding: '48px 24px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
      MEMUAT DATA...
    </div>
  )

  if (error || !data) return (
    <div style={{ maxWidth: PAGE_W, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ color: 'var(--c-asesmen)', fontSize: 13, marginBottom: 16 }}>{error ?? 'Event tidak ditemukan'}</div>
      <Link href="/audit/logbook" style={btnStyle}>← KEMBALI</Link>
    </div>
  )

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Header ── */}
      <div
        className="page-header no-print"
        style={{ maxWidth: PAGE_W, width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <div>
          <div className="page-title">Detail Audit Skrining</div>
          <div className="page-subtitle">Rekam pengiriman hasil skrining ASSIST — {data.facilityId}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <Link href="/audit/logbook" style={btnStyle}>KEMBALI</Link>
          {!data.acknowledgedByDoctor && (
            <button
              style={{ ...btnStyle, borderColor: 'var(--c-asesmen)', color: 'var(--c-asesmen)', cursor: acking ? 'not-allowed' : 'pointer', opacity: acking ? 0.6 : 1 }}
              onClick={() => void handleAck()}
              disabled={acking}
            >
              {acking ? 'MENYIMPAN…' : 'TANDAI ACK DOKTER'}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: PAGE_W, width: '100%' }}>

        {/* 01 — IDENTITAS EVENT */}
        <div style={sectionTitleStyle}>01 — IDENTITAS EVENT</div>
        <div style={grid3}>
          <div>
            <label style={labelStyle}>Dokter ID</label>
            <input style={inputStyle} value={data.doctorId} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Fasilitas</label>
            <input style={inputStyle} value={data.facilityId} readOnly />
          </div>
          <div>
            <label style={labelStyle}>App Version</label>
            <input style={inputStyle} value={data.appVersion ?? '—'} readOnly />
          </div>
        </div>
        <div style={field}>
          <label style={labelStyle}>Event ID</label>
          <input style={monoStyle} value={data.eventId} readOnly />
        </div>
        <div style={grid2}>
          <div>
            <label style={labelStyle}>Assist ID</label>
            <input style={monoStyle} value={data.assistId} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Consult ID</label>
            <input style={monoStyle} value={data.consultId ?? '—'} readOnly />
          </div>
        </div>
        <div style={grid2}>
          <div>
            <label style={labelStyle}>Screening ID</label>
            <input style={monoStyle} value={data.screeningId ?? '—'} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Patient Token (Pseudonim)</label>
            <input style={monoStyle} value={data.patientId} readOnly />
          </div>
        </div>

        {/* 02 — HASIL SKRINING */}
        <div style={sectionTitleStyle}>02 — HASIL SKRINING</div>
        <div style={grid3}>
          <div>
            <label style={labelStyle}>Status Skrining</label>
            <input
              style={{ ...inputStyle, color: data.screeningStatus === 'positive' ? '#FC8181' : data.screeningStatus === 'negative' ? '#68D391' : '#F6AD55' }}
              value={STATUS_LABEL[data.screeningStatus] ?? data.screeningStatus}
              readOnly
            />
          </div>
          <div>
            <label style={labelStyle}>Level Risiko</label>
            <input
              style={{ ...inputStyle, color: data.riskLevel === 'critical' || data.riskLevel === 'high' ? '#FC8181' : data.riskLevel === 'medium' ? '#63B3ED' : 'var(--text-main)' }}
              value={data.riskLevel ?? '—'}
              readOnly
            />
          </div>
          <div>
            <label style={labelStyle}>Skor</label>
            <input style={inputStyle} value={data.score !== null ? String(data.score) : '—'} readOnly />
          </div>
        </div>
        {data.resultSummary && (
          <div style={field}>
            <label style={labelStyle}>Ringkasan Hasil</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
              value={data.resultSummary}
              readOnly
            />
          </div>
        )}

        {/* 03 — PENGIRIMAN */}
        <div style={sectionTitleStyle}>03 — STATUS PENGIRIMAN</div>
        <div style={grid3}>
          <div>
            <label style={labelStyle}>Status Kirim</label>
            <input
              style={{ ...inputStyle, color: data.deliveryStatus === 'delivered' ? '#68D391' : data.deliveryStatus === 'failed' ? '#FC8181' : '#63B3ED' }}
              value={data.deliveryStatus}
              readOnly
            />
          </div>
          <div>
            <label style={labelStyle}>Waktu Kirim</label>
            <input style={inputStyle} value={fmtDate(data.deliveryTimestamp)} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Pengirim</label>
            <input style={inputStyle} value={data.senderUserId ?? '—'} readOnly />
          </div>
        </div>
        <div style={grid3}>
          <div>
            <label style={labelStyle}>Acknowledged Dokter</label>
            <input
              style={{ ...inputStyle, color: data.acknowledgedByDoctor ? '#68D391' : 'var(--text-muted)' }}
              value={data.acknowledgedByDoctor ? 'Ya — Sudah Di-ack' : '— Belum Di-ack'}
              readOnly
            />
          </div>
          <div>
            <label style={labelStyle}>Waktu Ack</label>
            <input style={inputStyle} value={data.ackTimestamp ? fmtDate(data.ackTimestamp) : '—'} readOnly />
          </div>
          <div>
            <label style={labelStyle}>Dibuat Pada</label>
            <input style={inputStyle} value={fmtDate(data.createdAt)} readOnly />
          </div>
        </div>

        {/* 04 — INTEGRITAS */}
        <div style={sectionTitleStyle}>04 — INTEGRITAS & AUDIT TRAIL</div>
        <div style={field}>
          <label style={labelStyle}>Immutable Hash (SHA-256)</label>
          <input style={monoStyle} value={data.immutableHash ?? '—'} readOnly />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 8, marginBottom: 40 }}>
          Hash dihitung saat event dibuat dan tidak dapat dimodifikasi.
          Setiap perubahan status dicatat sebagai event terpisah.
          Record ini bersifat <span style={{ color: 'var(--text-main)' }}>immutable</span>.
        </div>

      </div>
    </div>
  )
}
