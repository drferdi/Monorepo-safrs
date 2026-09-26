'use client'

import { useEffect, useState } from 'react'

/* ── Types ── */

interface KPI {
  lb1Runs: number
  lb1SuccessRuns: number
  lb1FailedRuns: number
  lb1TotalVisits: number
}

interface LB1Entry {
  id: string
  timestamp: string
  status: string
  year: number
  month: number
  rawatJalan: number
  rawatInap: number
  validRows: number
  invalidRows: number
}

interface OverviewResponse {
  ok: boolean
  kpi: KPI & Record<string, unknown>
  lb1Recent: LB1Entry[]
}

/* ── Helpers ── */

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate().toString().padStart(2, '0')
  const mon = MONTH_NAMES[d.getMonth() + 1] || '???'
  const year = d.getFullYear()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${mon} ${year}, ${h}:${m}`
}

function formatPeriode(month: number, year: number): string {
  return `${MONTH_NAMES[month] || month}/${year}`
}

/* ── Styles ── */

const cardStyle: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid var(--line-base)',
  background: 'var(--bg-nav)',
  padding: '14px 20px',
}

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: 10,
  letterSpacing: '0.2em',
  fontWeight: 600,
  color: 'var(--text-muted)',
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  color: 'var(--text-muted)',
  textAlign: 'left',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--line-base)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 10px',
  fontSize: 12,
  color: 'var(--text-main)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

/* ── Sub-components ── */

function KPICard({
  label,
  value,
  sub,
  alert,
}: {
  label: string
  value: string | number
  sub?: string
  alert?: boolean
}) {
  return (
    <div style={cardStyle}>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          letterSpacing: '0.15em',
          fontWeight: 600,
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 28,
          fontWeight: 700,
          color: alert ? 'var(--c-critical, #e74c3c)' : 'var(--text-main)',
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.7,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status.toLowerCase() === 'success'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        background: isSuccess ? 'rgba(76,175,80,0.12)' : 'rgba(231,76,60,0.12)',
        color: isSuccess ? '#4CAF50' : 'var(--c-critical, #e74c3c)',
      }}
    >
      {status.toUpperCase()}
    </span>
  )
}

/* ── Main Component ── */

export default function AdminRpaMonitoring() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [entries, setEntries] = useState<LB1Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) {
          setError('Gagal memuat data RPA.')
          return
        }
        const data: OverviewResponse = await res.json()
        if (!data.ok) {
          setError('Gagal memuat data RPA.')
          return
        }
        setKpi({
          lb1Runs: data.kpi.lb1Runs,
          lb1SuccessRuns: data.kpi.lb1SuccessRuns,
          lb1FailedRuns: data.kpi.lb1FailedRuns,
          lb1TotalVisits: data.kpi.lb1TotalVisits,
        })
        setEntries(data.lb1Recent)
      } catch {
        setError('Gagal memuat data RPA.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  /* ── Loading / Error ── */

  if (loading) {
    return (
      <div
        style={{
          padding: '40px 0',
          color: 'var(--text-muted)',
          fontSize: 12,
          letterSpacing: '0.1em',
        }}
      >
        LOADING RPA DATA...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: '40px 0',
          color: 'var(--c-critical, #e74c3c)',
          fontSize: 13,
        }}
      >
        {error}
      </div>
    )
  }

  /* ── Derived ── */

  const successRate =
    kpi && kpi.lb1Runs > 0 ? ((kpi.lb1SuccessRuns / kpi.lb1Runs) * 100).toFixed(1) : '0'

  const failedEntries = entries.filter(e => e.status.toLowerCase() === 'failed').slice(0, 5)

  /* ── Render ── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── KPI Cards ── */}
      <div>
        <p style={sectionTitleStyle}>RPA OVERVIEW</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          <KPICard label="TOTAL RUNS" value={kpi?.lb1Runs ?? 0} />
          <KPICard
            label="SUCCESS RATE"
            value={`${successRate}%`}
            sub={`${kpi?.lb1SuccessRuns ?? 0} dari ${kpi?.lb1Runs ?? 0} runs`}
          />
          <KPICard
            label="TOTAL KUNJUNGAN"
            value={kpi?.lb1TotalVisits ?? 0}
            sub="rawat jalan + rawat inap"
          />
          <KPICard
            label="FAILED RUNS"
            value={kpi?.lb1FailedRuns ?? 0}
            alert={(kpi?.lb1FailedRuns ?? 0) > 0}
          />
        </div>
      </div>

      {/* ── Run History Table ── */}
      <div>
        <p style={sectionTitleStyle}>RUN HISTORY</p>
        <div
          style={{
            borderRadius: 10,
            border: '1px solid var(--line-base)',
            background: 'var(--bg-nav)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Waktu</th>
                <th style={thStyle}>Periode</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Valid</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Invalid</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Rawat Jalan</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Rawat Inap</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tdStyle,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      padding: '24px 10px',
                    }}
                  >
                    Belum ada data LB1 run.
                  </td>
                </tr>
              )}
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td style={tdStyle}>{formatTimestamp(entry.timestamp)}</td>
                  <td style={tdStyle}>{formatPeriode(entry.month, entry.year)}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={entry.status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{entry.validRows}</td>
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: 'right',
                      color:
                        entry.invalidRows > 0 ? 'var(--c-critical, #e74c3c)' : 'var(--text-main)',
                    }}
                  >
                    {entry.invalidRows}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{entry.rawatJalan}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{entry.rawatInap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Failure Alert Cards ── */}
      {failedEntries.length > 0 && (
        <div>
          <p style={sectionTitleStyle}>RECENT FAILURES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failedEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  ...cardStyle,
                  borderColor: 'rgba(231,76,60,0.25)',
                  background: 'rgba(231,76,60,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 4,
                  }}
                >
                  <StatusBadge status={entry.status} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-main)' }}>
                  Periode {formatPeriode(entry.month, entry.year)}
                  {' — '}
                  Valid: {entry.validRows}, Invalid: {entry.invalidRows}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
