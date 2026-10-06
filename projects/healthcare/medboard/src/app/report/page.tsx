'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './report.module.css'

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

const STATUS_BADGE: Record<ReportRow['status'], string> = {
  SELESAI: 'ui-badge--neutral',
  'RAWAT INAP': 'ui-badge--warning',
  RUJUK: 'ui-badge--critical',
}

const DEFAULT_SUMMARY: SummaryItem[] = [
  { label: 'Total Kunjungan', value: '—', unit: 'klik Generate' },
  { label: 'Rawat Jalan', value: '—', unit: 'pasien' },
  { label: 'Rawat Inap', value: '—', unit: 'pasien' },
  { label: 'Rujukan', value: '—', unit: 'kasus' },
]

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


  return (
    <div className={styles.page}>
      <div className="ui-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Report</h1>
          <p className="ui-page-header__description">
            Rekap Kunjungan & Laporan SP3 LB1 — Puskesmas Kediri
          </p>
          <div className={styles.meta}>
            <span>ENGINE: TYPESCRIPT NATIVE</span>
            <span className="ui-badge ui-badge--success">PYTHON NOT REQUIRED</span>
            {source && <span>SRC: {source.toUpperCase()}</span>}
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.hint}>
            {runMessage || `Periode: ${currentPeriod} — Klik Generate untuk memuat data kunjungan`}
          </span>
          <Link href="/report/clinical" className={`ui-btn ui-btn--secondary ${styles.link}`}>
            LAPORAN KLINIS KUNJUNGAN
          </Link>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="ui-btn ui-btn--primary"
          >
            {isGenerating ? '● GENERATING...' : 'GENERATE LB1'}
          </button>
        </div>
      </div>

      {/* Output Files */}
      {outputFiles.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>FILE OUTPUT LB1</h2>
            <button
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={() => {
                const el = document.createElement('input')
                el.setAttribute('type', 'text')
                el.value = outputDir
                document.body.appendChild(el)
                el.select()
                document.execCommand('copy')
                document.body.removeChild(el)
              }}
              title={outputDir}
            >
              COPY PATH FOLDER
            </button>
          </div>
          <div className={styles.files}>
            {outputFiles.map(f => (
              <a
                key={f.name}
                className={styles.file}
                href={`/api/report/files/download?file=${encodeURIComponent(f.name.replace(/\.\./g, ''))}`}
                download={f.name}
                title={`Klik untuk download: ${f.name}`}
              >
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{f.name}</span>
                  <span>{f.sizeKb} KB</span>
                </div>
                <div className={styles.fileEnd}>
                  <span>
                    {new Date(f.generatedAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="ui-badge ui-badge--primary">DOWNLOAD</span>
                </div>
              </a>
            ))}
          </div>
          <div className={styles.note}>Klik file untuk download langsung ke komputer</div>
        </div>
      )}

      {/* Summary Cards */}
      <div className={styles.kpiRow}>
        {summary.map(s => (
          <div key={s.label} className={styles.kpi}>
            <div className={styles.kpiLabel}>{s.label}</div>
            <div className={styles.kpiValue}>
              {isLoading ? <span className={styles.dim}>—</span> : s.value}
              <span className={styles.kpiUnit}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {/* Filter tabs */}
        <div className={styles.filters}>
          {(['SEMUA', 'SELESAI', 'RAWAT INAP', 'RUJUK'] as const).map(f => (
            <button
              key={f}
              className="ui-chip"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className={styles.count}>{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className={styles.tableScroll}>
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}>
              {['No. RM', 'Pasien', 'Tanggal', 'Diagnosis', 'ICD-X', 'Dokter', 'Status'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
              <div className={styles.empty}>— BELUM ADA DATA — KLIK GENERATE LB1 —</div>
            )}

            {/* Rows */}
            {filtered.map((row, i) => (
              <div key={`${row.rm}-${i}`} className={`${styles.row} ${styles.body}`}>
                <span className={styles.rm}>{row.rm}</span>
                <span>{row.nama}</span>
                <span className={styles.muted}>{row.tanggal}</span>
                <span>{row.diagnosis}</span>
                <span className={styles.muted}>{row.icd}</span>
                <span className={styles.muted}>{row.dokter}</span>
                <span>
                  <span className={`ui-badge ${STATUS_BADGE[row.status]}`}>{row.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        {reportData.length > 0 && (
          <div className={styles.foot}>
            MENAMPILKAN {filtered.length} DARI {reportData.length} KUNJUNGAN
            {source === 'lb1-summary'
              ? ' · DATA DARI LB1 ENGINE'
              : source === 'default'
                ? ' · DATA DEMO'
                : ''}
          </div>
        )}
      </div>
    </div>
  )
}
