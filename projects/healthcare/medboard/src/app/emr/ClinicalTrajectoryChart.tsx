'use client'

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useEffect, useMemo, useRef } from 'react'
import {
  getTrajectoryHistoryWindow,
  type ScrapedVisit,
  type ScrapedVisitVitals,
} from '@/lib/emr/visit-history'

Chart.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
)

interface ScreeningAlertLike {
  severity: 'critical' | 'high' | 'warning'
  title: string
}

interface ClinicalTrajectoryChartProps {
  rpdSelected: Set<string>
  familyHistory: string
  alergiSelected: Set<string>
  keluhanUtama: string
  patientAge: number
  isPregnant: boolean
  screeningAlerts: ScreeningAlertLike[]
  visitHistory?: ScrapedVisit[]
  currentVitals?: ScrapedVisitVitals
}

const HIGH_RISK_RPD = [
  'Diabetes Mellitus Tipe 2',
  'Penyakit Jantung Koroner',
  'Stroke',
  'Gagal Ginjal Kronis',
  'Tuberkulosis Paru',
]

const HIGH_RISK_FAMILY_TOKENS = [
  'dm',
  'diabetes',
  'jantung',
  'stroke',
  'kanker',
  'ht',
  'hipertensi',
  'ginjal',
]
const TEMPORARY_THRESHOLDS = [
  { label: '__threshold-hijau', value: 25, color: 'rgba(16, 185, 129, 0.7)' },
  { label: '__threshold-oranye', value: 50, color: 'rgba(249, 115, 22, 0.7)' },
  { label: '__threshold-merah', value: 75, color: 'rgba(239, 68, 68, 0.72)' },
] as const
// Canvas colours: Chart.js cannot read CSS variables, so these mirror the --text,
// --text-secondary and --border tokens.
const CHART_TEXT_SOFT = '#0f172a'
const CHART_TEXT_MUTED = '#64748b'
const CHART_GRID = 'rgba(15, 23, 42, 0.06)'
const CHART_AXIS = 'rgba(15, 23, 42, 0.12)'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseFamilyHistory(text: string): string[] {
  return text
    .split(/[;,/]/)
    .map(item => item.trim())
    .filter(Boolean)
}

/** Format ISO date "2025-12-06" → "06/12/25" */
function fmtDate(iso: string): string {
  const parsed = new Date(iso)
  if (!Number.isFinite(parsed.getTime())) return iso

  const day = `${parsed.getDate()}`.padStart(2, '0')
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const year = `${parsed.getFullYear()}`.slice(-2)
  return `${day}/${month}/${year}`
}

/** Compute composite vital risk score (0-100) from a single visit's vitals */
function computeVitalRisk(v: {
  sbp: number
  dbp: number
  hr: number
  rr: number
  temp: number
  glucose: number
}): number {
  let score = 0
  // SBP
  if (v.sbp >= 180) score += 25
  else if (v.sbp >= 140) score += 15
  else if (v.sbp < 90 && v.sbp > 0) score += 20
  // DBP
  if (v.dbp >= 110) score += 20
  else if (v.dbp >= 90) score += 10
  else if (v.dbp < 60 && v.dbp > 0) score += 15
  // HR
  if (v.hr > 120) score += 15
  else if (v.hr > 100) score += 8
  else if (v.hr < 50 && v.hr > 0) score += 12
  // RR
  if (v.rr > 24) score += 12
  else if (v.rr > 20) score += 5
  else if (v.rr < 12 && v.rr > 0) score += 10
  // Temp
  if (v.temp > 39) score += 15
  else if (v.temp > 37.5) score += 8
  else if (v.temp < 36 && v.temp > 0) score += 10
  // Glucose
  if (v.glucose > 300) score += 20
  else if (v.glucose > 200) score += 12
  else if (v.glucose < 70 && v.glucose > 0) score += 18
  return clamp(score, 0, 100)
}

/** Count abnormal vitals */
function countAbnormals(v: {
  sbp: number
  dbp: number
  hr: number
  rr: number
  temp: number
  glucose: number
}): number {
  let n = 0
  if (v.sbp > 0 && (v.sbp >= 140 || v.sbp < 90)) n++
  if (v.dbp > 0 && (v.dbp >= 90 || v.dbp < 60)) n++
  if (v.hr > 0 && (v.hr > 100 || v.hr < 60)) n++
  if (v.rr > 0 && (v.rr > 20 || v.rr < 12)) n++
  if (v.temp > 0 && (v.temp > 37.5 || v.temp < 36)) n++
  if (v.glucose > 0 && (v.glucose > 200 || v.glucose < 70)) n++
  return n
}

export default function ClinicalTrajectoryChart({
  rpdSelected,
  familyHistory,
  alergiSelected,
  keluhanUtama,
  patientAge,
  isPregnant,
  screeningAlerts,
  visitHistory = [],
  currentVitals,
}: ClinicalTrajectoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart | null>(null)
  const rpdKey = Array.from(rpdSelected).sort().join('|')
  const alergiKey = Array.from(alergiSelected).sort().join('|')
  const alertKey = screeningAlerts.map(alert => `${alert.severity}:${alert.title}`).join('|')
  const hasCurrentVitals = Boolean(currentVitals?.sbp)
  const trajectoryHistory = useMemo(
    () => getTrajectoryHistoryWindow(visitHistory, hasCurrentVitals),
    [hasCurrentVitals, visitHistory]
  )

  const hasVisitHistory = trajectoryHistory.length > 0

  // ═══════════════════════════════════════════════════
  // MODE 2: Visit-based vital trajectory (when visits available)
  // ═══════════════════════════════════════════════════
  const visitModel = useMemo(() => {
    if (!hasVisitHistory) return null

    // Build visit points: historical + current
    const points = trajectoryHistory.map(v => ({
      label: fmtDate(v.date),
      vitals: v.vitals,
      keluhan: v.keluhan_utama,
      diagnosa: v.diagnosa,
      risk: computeVitalRisk(v.vitals),
      abnormals: countAbnormals(v.vitals),
    }))

    if (currentVitals && currentVitals.sbp > 0) {
      points.push({
        label: 'Hari ini',
        vitals: currentVitals,
        keluhan: keluhanUtama,
        diagnosa: null,
        risk: computeVitalRisk(currentVitals),
        abnormals: countAbnormals(currentVitals),
      })
    }

    return {
      labels: points.map(p => p.label),
      sbp: points.map(p => p.vitals.sbp),
      dbp: points.map(p => p.vitals.dbp),
      hr: points.map(p => p.vitals.hr),
      risk: points.map(p => p.risk),
      abnormals: points.map(p => p.abnormals),
      summaries: points.map(p => ({
        keluhan: p.keluhan?.slice(0, 60) || '-',
        diagnosa: p.diagnosa ? `${p.diagnosa.icd_x} ${p.diagnosa.nama}` : '-',
        td: `${p.vitals.sbp}/${p.vitals.dbp}`,
        hr: `${p.vitals.hr}`,
        temp: `${p.vitals.temp}`,
      })),
      points,
    }
  }, [currentVitals, hasVisitHistory, keluhanUtama, trajectoryHistory])

  // ═══════════════════════════════════════════════════
  // MODE 1: Category-based snapshot (original, when no visits)
  // ═══════════════════════════════════════════════════
  const snapshotModel = useMemo(() => {
    if (hasVisitHistory) return null

    const rpdItems = Array.from(rpdSelected)
    const familyItems = parseFamilyHistory(familyHistory)
    const allergyItems = Array.from(alergiSelected)
    const activeAlerts = screeningAlerts.length

    const chronicPriorityCount = rpdItems.filter(item => HIGH_RISK_RPD.includes(item)).length
    const familyPriorityCount = familyItems.filter(item =>
      HIGH_RISK_FAMILY_TOKENS.some(token => item.toLowerCase().includes(token))
    ).length
    const currentContextCount =
      (keluhanUtama.trim() ? 1 : 0) +
      activeAlerts +
      (patientAge >= 60 ? 1 : 0) +
      (isPregnant ? 1 : 0)

    const historyRisk = clamp(18 + rpdItems.length * 8 + chronicPriorityCount * 10, 0, 100)
    const familyRisk = clamp(10 + familyItems.length * 10 + familyPriorityCount * 8, 0, 100)
    const allergyRisk = clamp(12 + allergyItems.length * 14, 0, 100)
    const currentRisk = clamp(
      20 +
        (keluhanUtama.trim() ? 12 : 0) +
        activeAlerts * 22 +
        (patientAge >= 60 ? 8 : 0) +
        (isPregnant ? 6 : 0),
      0,
      100
    )

    return {
      labels: ['Riwayat Dahulu', 'Keluarga', 'Alergi', 'Hari Ini'],
      factorCounts: [rpdItems.length, familyItems.length, allergyItems.length, currentContextCount],
      priorityCounts: [
        chronicPriorityCount,
        familyPriorityCount,
        allergyItems.length,
        activeAlerts,
      ],
      riskScores: [historyRisk, familyRisk, allergyRisk, currentRisk],
      staticLoad: historyRisk + familyRisk,
      acuteLoad: allergyRisk + currentRisk,
      summaries: {
        history: rpdItems.slice(0, 3),
        family: familyItems.slice(0, 3),
        allergy: allergyItems.slice(0, 3),
        current: [
          keluhanUtama.trim() || 'keluhan belum diisi',
          ...screeningAlerts.slice(0, 2).map(alert => alert.title),
        ].filter(Boolean),
      },
    }
  }, [
    rpdSelected,
    familyHistory,
    alergiSelected,
    keluhanUtama,
    patientAge,
    isPregnant,
    rpdKey,
    alergiKey,
    alertKey,
    hasVisitHistory,
  ])

  // ═══════════════════════════════════════════════════
  // CHART RENDERING
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    chartRef.current?.destroy()

    let config: ChartConfiguration<'bar' | 'line'>

    if (visitModel) {
      // ── MODE 2: Visit-based vital trends ──
      config = {
        type: 'line',
        data: {
          labels: visitModel.labels,
          datasets: [
            // SBP threshold lines
            {
              type: 'line',
              label: '__threshold-normal',
              data: visitModel.labels.map(() => 140),
              borderColor: 'rgba(249, 115, 22, 0.5)',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
              tension: 0,
            },
            {
              type: 'line',
              label: '__threshold-crisis',
              data: visitModel.labels.map(() => 180),
              borderColor: 'rgba(239, 68, 68, 0.5)',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
              tension: 0,
            },
            // Abnormal count bars
            {
              type: 'bar',
              label: 'Vital Abnormal',
              data: visitModel.abnormals,
              backgroundColor: 'rgba(180, 35, 24, 0.18)',
              borderColor: 'rgba(180, 35, 24, 0.6)',
              borderWidth: 1.2,
              borderRadius: 4,
              yAxisID: 'yCount',
            },
            // SBP line
            {
              type: 'line',
              label: 'Sistolik (mmHg)',
              data: visitModel.sbp,
              borderColor: '#002147',
              backgroundColor: 'rgba(0, 33, 71, 0.12)',
              fill: false,
              borderWidth: 2.4,
              tension: 0.3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBorderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#002147',
              yAxisID: 'yVital',
            },
            // DBP line
            {
              type: 'line',
              label: 'Diastolik (mmHg)',
              data: visitModel.dbp,
              borderColor: 'rgba(0, 33, 71, 0.45)',
              fill: false,
              borderWidth: 1.6,
              borderDash: [4, 3],
              tension: 0.3,
              pointRadius: 3.5,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(0, 33, 71, 0.6)',
              yAxisID: 'yVital',
            },
            // HR line
            {
              type: 'line',
              label: 'Heart Rate (bpm)',
              data: visitModel.hr,
              borderColor: 'rgba(96, 165, 250, 0.7)',
              fill: false,
              borderWidth: 1.8,
              tension: 0.3,
              pointRadius: 3.5,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: 'rgba(96, 165, 250, 0.8)',
              yAxisID: 'yVital',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 720, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'start',
              labels: {
                color: CHART_TEXT_SOFT,
                boxWidth: 12,
                boxHeight: 12,
                padding: 14,
                font: { size: 11, weight: 600 },
                filter(item) {
                  return !item.text.startsWith('__threshold-')
                },
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#0f172a',
              borderWidth: 1,
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              displayColors: true,
              padding: 12,
              filter(tooltipItem) {
                return !tooltipItem.dataset.label?.startsWith('__threshold-')
              },
              callbacks: {
                footer(tooltipItems) {
                  const idx = tooltipItems[0]?.dataIndex ?? 0
                  const s = visitModel.summaries[idx]
                  if (!s) return ''
                  const lines = [`Keluhan: ${s.keluhan}`]
                  if (s.diagnosa !== '-') lines.push(`Dx: ${s.diagnosa}`)
                  return lines.join('\n')
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: CHART_GRID, tickLength: 0 },
              ticks: {
                color: CHART_TEXT_SOFT,
                font: { size: 11, weight: 600 },
              },
              border: { color: CHART_AXIS },
            },
            yVital: {
              position: 'left',
              beginAtZero: false,
              suggestedMin: 50,
              suggestedMax: 200,
              grid: { color: CHART_GRID },
              ticks: {
                color: CHART_TEXT_MUTED,
                font: { size: 10, weight: 600 },
              },
              border: { color: CHART_AXIS },
              title: {
                display: true,
                text: 'mmHg / bpm',
                color: CHART_TEXT_MUTED,
                font: { size: 10, weight: 700 },
              },
            },
            yCount: {
              position: 'right',
              beginAtZero: true,
              suggestedMax: 6,
              grid: { drawOnChartArea: false },
              ticks: {
                precision: 0,
                color: '#b42318',
                font: { size: 10, weight: 600 },
              },
              border: { color: CHART_AXIS },
              title: {
                display: true,
                text: 'Abnormal',
                color: '#b42318',
                font: { size: 10, weight: 700 },
              },
            },
          },
        },
      }
    } else if (snapshotModel) {
      // ── MODE 1: Category-based snapshot (original) ──
      config = {
        type: 'bar',
        data: {
          labels: snapshotModel.labels,
          datasets: [
            ...TEMPORARY_THRESHOLDS.map(threshold => ({
              type: 'line' as const,
              label: threshold.label,
              data: snapshotModel.labels.map(() => threshold.value),
              borderColor: threshold.color,
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              pointHoverRadius: 0,
              fill: false,
              tension: 0,
              yAxisID: 'yRisk',
            })),
            {
              type: 'bar' as const,
              label: 'Jumlah Faktor',
              data: snapshotModel.factorCounts,
              backgroundColor: 'rgba(0, 33, 71, 0.18)',
              borderColor: 'rgba(0, 33, 71, 0.6)',
              borderWidth: 1.2,
              borderRadius: 6,
              yAxisID: 'yCount',
            },
            {
              type: 'bar' as const,
              label: 'Faktor Prioritas',
              data: snapshotModel.priorityCounts,
              backgroundColor: 'rgba(180, 35, 24, 0.18)',
              borderColor: 'rgba(180, 35, 24, 0.6)',
              borderWidth: 1.2,
              borderRadius: 6,
              yAxisID: 'yCount',
            },
            {
              type: 'line' as const,
              label: 'Skor Trajektori Klinis',
              data: snapshotModel.riskScores,
              borderColor: '#002147',
              backgroundColor: 'rgba(0, 33, 71, 0.12)',
              fill: false,
              borderWidth: 2.4,
              tension: 0.36,
              pointRadius: 4.5,
              pointHoverRadius: 6,
              pointBorderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#002147',
              yAxisID: 'yRisk',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 720, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'start',
              labels: {
                color: CHART_TEXT_SOFT,
                boxWidth: 12,
                boxHeight: 12,
                usePointStyle: false,
                padding: 14,
                font: { size: 11, weight: 600, family: 'var(--font-mono)' },
                filter(item) {
                  return !item.text.startsWith('__threshold-')
                },
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              borderColor: '#0f172a',
              borderWidth: 1,
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              displayColors: true,
              padding: 12,
              filter(tooltipItem) {
                const datasetLabel = tooltipItem.dataset.label ?? ''
                return !datasetLabel.startsWith('__threshold-')
              },
              callbacks: {
                footer(tooltipItems) {
                  const index = tooltipItems[0]?.dataIndex ?? 0
                  const summary =
                    index === 0
                      ? snapshotModel.summaries.history
                      : index === 1
                        ? snapshotModel.summaries.family
                        : index === 2
                          ? snapshotModel.summaries.allergy
                          : snapshotModel.summaries.current
                  return summary.length > 0
                    ? `Fokus: ${summary.join(', ')}`
                    : 'Belum ada detail dominan.'
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: CHART_GRID, tickLength: 0 },
              ticks: {
                color: CHART_TEXT_SOFT,
                font: { size: 11, weight: 600 },
              },
              border: { color: CHART_AXIS },
            },
            yCount: {
              position: 'left',
              beginAtZero: true,
              suggestedMax: Math.max(...snapshotModel.factorCounts, 4) + 1,
              grid: { color: CHART_GRID },
              ticks: {
                precision: 0,
                color: CHART_TEXT_MUTED,
                font: { size: 10, weight: 600 },
              },
              border: { color: CHART_AXIS },
              title: {
                display: true,
                text: 'Jumlah faktor',
                color: CHART_TEXT_MUTED,
                font: { size: 10, weight: 700 },
              },
            },
            yRisk: {
              position: 'right',
              beginAtZero: true,
              max: 100,
              grid: { drawOnChartArea: false },
              ticks: {
                color: '#0f172a',
                font: { size: 10, weight: 700 },
                callback(value) {
                  return `${value}`
                },
              },
              border: { color: CHART_AXIS },
              title: {
                display: true,
                text: 'Skor klinis',
                color: '#0f172a',
                font: { size: 10, weight: 700 },
              },
            },
          },
        },
      }
    } else {
      return
    }

    chartRef.current = new Chart(context, config)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [visitModel, snapshotModel])

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Clinical Trajectory Chart
          </span>
          <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
            {hasVisitHistory
              ? `Vital trend dari ${trajectoryHistory.length} kunjungan historis terbaru + kunjungan hari ini. SBP/DBP/HR ditampilkan lintas waktu.`
              : 'Snapshot v1 untuk membaca beban klinis historis pasien sebelum masuk ke tahap vital sign dan assessment dokter.'}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          {hasVisitHistory
            ? `${trajectoryHistory.length + (hasCurrentVitals ? 1 : 0)} visits`
            : 'Chart.js mixed bar-line'}
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: 280 }}>
        <canvas ref={canvasRef} />
      </div>

      {/* ── MODE 2: Visit summary cards ── */}
      {visitModel && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 8,
              marginTop: 14,
            }}
          >
            {visitModel.points.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  background: p.label === 'Hari ini' ? 'var(--primary-tint)' : 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: p.label === 'Hari ini' ? 'var(--primary)' : 'var(--text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: 'var(--text)',
                    fontWeight: 500,
                    marginBottom: 2,
                  }}
                >
                  {p.vitals.sbp}/{p.vitals.dbp}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  HR {p.vitals.hr} · Suhu {p.vitals.temp} · GDS {p.vitals.glucose || '-'}
                </div>
                {p.diagnosa && (
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 3 }}>
                    {p.diagnosa.icd_x} {p.diagnosa.nama}
                  </div>
                )}
                {p.keluhan && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                      fontStyle: 'italic',
                    }}
                  >
                    {p.keluhan.slice(0, 50)}
                    {p.keluhan.length > 50 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Threshold legend */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              marginTop: 10,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 18,
                  borderTop: '2px dashed rgba(249, 115, 22, 0.7)',
                }}
              />
              SBP 140: batas hipertensi
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 18,
                  borderTop: '2px dashed rgba(239, 68, 68, 0.7)',
                }}
              />
              SBP 180: krisis hipertensi
            </span>
          </div>
        </>
      )}

      {/* ── MODE 1: Category summary cards (original) ── */}
      {snapshotModel && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 10,
              marginTop: 14,
            }}
          >
            {[
              {
                label: 'Riwayat Dominan',
                values: snapshotModel.summaries.history,
              },
              {
                label: 'Riwayat Keluarga',
                values: snapshotModel.summaries.family,
              },
              {
                label: 'Alergi Tercatat',
                values: snapshotModel.summaries.allergy,
              },
              {
                label: 'Fokus Hari Ini',
                values: snapshotModel.summaries.current,
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                  {item.values.length > 0 ? item.values.join(', ') : 'Belum ada data.'}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'start',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Perhitungan ringkas: <span style={{ color: 'var(--text)' }}>Historis</span> dibentuk
              dari bobot komorbid + riwayat keluarga, sedangkan{' '}
              <span style={{ color: 'var(--text)' }}>Akut</span> dibentuk dari bobot alergi aktif
              + konteks hari ini. Visual ini membantu prioritas review klinis, bukan skor diagnosis
              baku.
            </div>
            <div
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                Beban Historis
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Snapshot: <span style={{ color: 'var(--primary)' }}>{snapshotModel.staticLoad}</span>
              </div>
            </div>
            <div
              style={{
                padding: '10px 12px',
                border: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                Kedaruratan Dinamis
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Snapshot: <span style={{ color: 'var(--critical)' }}>{snapshotModel.acuteLoad}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              marginTop: 10,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 18,
                  borderTop: '2px dashed rgba(16, 185, 129, 0.9)',
                }}
              />
              Hijau: observasi rutin
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 18,
                  borderTop: '2px dashed rgba(249, 115, 22, 0.92)',
                }}
              />
              Oranye: prioritas review meningkat
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 18,
                  borderTop: '2px dashed rgba(239, 68, 68, 0.92)',
                }}
              />
              Merah: high alert internal
            </span>
          </div>
        </>
      )}
    </div>
  )
}
