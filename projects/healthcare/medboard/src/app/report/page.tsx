'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type OutputFile = {
  name: string
  path: string
  sizeKb: number
  generatedAt: string
}

type ReportRow = {
  rm: string
  nama: string
  tanggal: string
  diagnosis: string
  icd: string
  dokter: string
  status: 'SELESAI' | 'RAWAT INAP' | 'RUJUK'
}

type SummaryItem = {
  label: string
  value: string
  unit: string
}

const STATUS_STYLE: Record<ReportRow['status'], { color: string; borderColor: string }> = {
  SELESAI: { color: 'var(--text-muted)', borderColor: 'var(--line-base)' },
  'RAWAT INAP': { color: 'var(--c-warning)', borderColor: 'var(--c-warning)' },
  RUJUK: { color: 'var(--c-critical)', borderColor: 'var(--c-critical)' },
}

const DEFAULT_SUMMARY: SummaryItem[] = [
  { label: 'Total Kunjungan', value: '—', unit: 'klik Generate' },
  { label: 'Rawat Jalan', value: '—', unit: 'pasien' },
  { label: 'Rawat Inap', value: '—', unit: 'pasien' },
  { label: 'Rujukan', value: '—', unit: 'kasus' },
]

const REPORT_PAGE_WIDTH = 1200
const REPORT_ACTION_TONE = '#101012'
const REPORT_ACTION_SOFT = 'rgba(16, 16, 18, 0.14)'
const REPORT_ACTION_BORDER = 'rgba(255, 255, 255, 0.12)'
const REPORT_ACTION_SHADOW =
  '2px 2px 8px rgba(0, 0, 0, 0.18), inset 1px 1px 0 rgba(255, 255, 255, 0.04)'

export default function ReportPage() {
  const [filter, setFilter] = useState<'SEMUA' | ReportRow['status']>('SEMUA')
  const [reportData, setReportData] = useState<ReportRow[]>([])
  const [summary, setSummary] = useState<SummaryItem[]>(DEFAULT_SUMMARY)
  const [isGenerating, setIsGenerating] = useState(false)
  const [runMessage, setRunMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState('')
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([])
  const [outputDir, setOutputDir] = useState('')

  const currentPeriod = useMemo(() => {
    const now = new Date()
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  }, [])

  const loadOutputFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/report/files', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        ok: boolean
        files: OutputFile[]
        outputDir: string
      }
      if (data.ok) {
        setOutputFiles(data.files)
        setOutputDir(data.outputDir)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch('/api/report', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        source?: string
        summary?: SummaryItem[]
        rows?: ReportRow[]
      }
      if (Array.isArray(data.rows)) setReportData(data.rows)
      if (Array.isArray(data.summary) && data.summary.length === 4) setSummary(data.summary)
      if (data.source) setSource(data.source)
    } catch {
      // pertahankan data default
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReport()
    void loadOutputFiles()
  }, [loadReport, loadOutputFiles])

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setRunMessage('Menjalankan LB1 Engine (TypeScript)...')

      const now = new Date()
      const res = await fetch('/api/report/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full-cycle',
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }),
      })

      const result = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        totalKunjungan?: number
        rawatJalan?: number
        rawatInap?: number
        rujukan?: number
        durationMs?: number
      }

      if (!res.ok || !result.ok) {
        setRunMessage(`Gagal: ${result.error || 'unknown error'}`)
        return
      }

      const ms = result.durationMs ?? 0
      setRunMessage(
        `✓ Generate selesai dalam ${ms}ms — ${result.totalKunjungan} kunjungan diproses`
      )
      await loadReport()
      await loadOutputFiles()
    } catch {
      setRunMessage('Gagal: endpoint tidak terjangkau.')
    } finally {
      setIsGenerating(false)
    }
  }

  const filtered = filter === 'SEMUA' ? reportData : reportData.filter(r => r.status === filter)

  const counts = useMemo(
    () => ({
      SEMUA: reportData.length,
      SELESAI: reportData.filter(r => r.status === 'SELESAI').length,
      'RAWAT INAP': reportData.filter(r => r.status === 'RAWAT INAP').length,
      RUJUK: reportData.filter(r => r.status === 'RUJUK').length,
    }),
    [reportData]
  )

  const reportActionButtonStyle = {
    fontSize: 13,
    letterSpacing: '0.1em',
    padding: '8px 16px',
    background: REPORT_ACTION_TONE,
    border: `1px solid ${REPORT_ACTION_BORDER}`,
    color: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    boxShadow: REPORT_ACTION_SHADOW,
    cursor: 'pointer',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
  }

  const reportActionChipStyle = {
    fontSize: 13,
    letterSpacing: '0.1em',
    padding: '3px 10px',
    background: REPORT_ACTION_SOFT,
    border: `1px solid ${REPORT_ACTION_BORDER}`,
    color: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    boxShadow: REPORT_ACTION_SHADOW,
  }

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        className="page-header"
        style={{
          maxWidth: REPORT_PAGE_WIDTH,
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div className="page-title">Report</div>
          <div className="page-subtitle">Rekap Kunjungan & Laporan SP3 LB1 — Puskesmas Kediri</div>
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textAlign: 'right',
            paddingTop: 4,
          }}
        >
          ENGINE: TYPESCRIPT NATIVE
          <br />
          <span style={{ color: '#4ADE80' }}>● PYTHON NOT REQUIRED</span>
          {source && (
            <>
              <br />
              SRC: {source.toUpperCase()}
            </>
          )}
        </div>
      </div>

      {/* Link ke Laporan Klinis */}
      <div style={{ maxWidth: REPORT_PAGE_WIDTH, width: '100%', marginBottom: 20 }}>
        <Link
          href="/report/clinical"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            letterSpacing: '0.1em',
            padding: '8px 16px',
            background: '#101012',
            border: '1px solid var(--c-asesmen)',
            color: 'var(--c-asesmen)',
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          LAPORAN KLINIS KUNJUNGAN
        </Link>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 28,
          maxWidth: REPORT_PAGE_WIDTH,
          width: '100%',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            ...reportActionButtonStyle,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {isGenerating ? '● GENERATING...' : 'GENERATE LB1'}
        </button>
        <span className="v-label" style={{ flex: 1 }}>
          {runMessage || `Periode: ${currentPeriod} — Klik Generate untuk memuat data kunjungan`}
        </span>
      </div>

      {/* Output Files */}
      {outputFiles.length > 0 && (
        <div
          style={{
            maxWidth: REPORT_PAGE_WIDTH,
            width: '100%',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 13,
                letterSpacing: '0.12em',
                color: 'var(--text-muted)',
              }}
            >
              FILE OUTPUT LB1
            </span>
            <button
              onClick={() => {
                const el = document.createElement('input')
                el.setAttribute('type', 'text')
                el.value = outputDir
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
              }}
              style={{
                ...reportActionButtonStyle,
                padding: '6px 12px',
              }}
              title={outputDir}
            >
              COPY PATH FOLDER
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {outputFiles.map(f => (
              <a
                key={f.name}
                href={`/api/report/files/download?file=${encodeURIComponent(f.name.replace(/\.\./g, ''))}`}
                download={f.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid var(--line-base)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-asesmen)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-base)')}
                title={`Klik untuk download: ${f.name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--c-asesmen)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {f.sizeKb} KB
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {new Date(f.generatedAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    style={{
                      ...reportActionChipStyle,
                    }}
                  >
                    DOWNLOAD
                  </span>
                </div>
              </a>
            ))}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: 'var(--text-muted)',
              opacity: 0.5,
              letterSpacing: '0.08em',
            }}
          >
            Klik file untuk download langsung ke komputer
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
          maxWidth: REPORT_PAGE_WIDTH,
          width: '100%',
          marginBottom: 48,
        }}
      >
        {summary.map(s => (
          <div
            key={s.label}
            style={{
              border: '1px solid var(--line-base)',
              padding: '24px 28px',
              transition: 'border-color 0.2s',
            }}
          >
            <div className="v-label" style={{ marginBottom: 8 }}>
              {s.label}
            </div>
            <div className="v-value" style={{ fontSize: 36 }}>
              {isLoading ? <span style={{ opacity: 0.3 }}>—</span> : s.value}
              <span className="v-unit">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          maxWidth: REPORT_PAGE_WIDTH,
          width: '100%',
          flexWrap: 'wrap',
        }}
      >
        {(['SEMUA', 'SELESAI', 'RAWAT INAP', 'RUJUK'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 13,
              letterSpacing: '0.1em',
              padding: '5px 14px',
              background: 'none',
              border: `1px solid ${filter === f ? 'var(--c-asesmen)' : 'var(--line-base)'}`,
              color: filter === f ? 'var(--c-asesmen)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f}
            <span
              style={{
                marginLeft: 6,
                opacity: 0.6,
                fontSize: 13,
              }}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ maxWidth: REPORT_PAGE_WIDTH, width: '100%' }}>
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 170px 90px 1fr 120px 170px 100px',
            gap: 16,
            padding: '0 0 10px',
            borderBottom: '1px solid var(--line-base)',
            marginBottom: 4,
          }}
        >
          {['No. RM', 'Pasien', 'Tanggal', 'Diagnosis', 'ICD-X', 'Dokter', 'Status'].map(h => (
            <span key={h} className="v-label">
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div
            style={{
              padding: '48px 0',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--text-muted)',
              letterSpacing: '0.15em',
              opacity: 0.5,
            }}
          >
            — BELUM ADA DATA — KLIK GENERATE LB1 —
          </div>
        )}

        {/* Rows */}
        {filtered.map((row, i) => (
          <div
            key={`${row.rm}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 170px 90px 1fr 120px 170px 100px',
              gap: 16,
              padding: '13px 0',
              borderBottom: '1px dashed var(--line-base)',
              alignItems: 'baseline',
              transition: 'background 0.15s',
              cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,236,230,0.02)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{
                fontSize: 13,
                color: 'var(--c-asesmen)',
                letterSpacing: '0.05em',
              }}
            >
              {row.rm}
            </span>

            <span
              style={{
                fontSize: 15,
                color: 'var(--text-main)',
              }}
            >
              {row.nama}
            </span>

            <span
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              {row.tanggal}
            </span>

            <span
              style={{
                fontSize: 15,
                color: 'var(--text-main)',
              }}
            >
              {row.diagnosis}
            </span>

            <span
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              {row.icd}
            </span>

            <span
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
              }}
            >
              {row.dokter}
            </span>

            <span
              className="tag-meta"
              style={{
                color: STATUS_STYLE[row.status].color,
                borderColor: STATUS_STYLE[row.status].borderColor,
                whiteSpace: 'nowrap',
              }}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>

      {/* Footer info */}
      {reportData.length > 0 && (
        <div
          style={{
            marginTop: 24,
            fontSize: 13,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            opacity: 0.5,
          }}
        >
          MENAMPILKAN {filtered.length} DARI {reportData.length} KUNJUNGAN
          {source === 'lb1-summary'
            ? ' · DATA DARI LB1 ENGINE'
            : source === 'default'
              ? ' · DATA DEMO'
              : ''}
        </div>
      )}
    </div>
  )
}
