'use client'

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { useEffect, useMemo, useRef } from 'react'
import {
  analyzeTrajectory,
  type ClinicalUrgencyTier,
  type MortalityProxyTier,
  type RiskLevel,
  type VisitRecord,
} from '@/lib/clinical/trajectory-analyzer'

Chart.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  ArcElement,
  BarController,
  BarElement,
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  Tooltip,
  Legend,
  Filler
)

interface ClinicalPrognosisChartProps {
  vitals: {
    sbp: number
    dbp: number
    hr: number
    rr: number
    temp: number
    glucose: number
    spo2: number
  }
  keluhanUtama: string
  encounterId?: string
  selectedDiagnosis?: {
    diagnosis_name: string
    icd10_code: string
  } | null
  patientAge: number
  patientGender: 'L' | 'P'
  bodyWeightKg?: number
  chronicDiseases?: string[]
  isPregnant?: boolean
}

interface PrognosisSignalDetail {
  label: string
  value: number
  severity: 'orange' | 'red'
  description: string
}

interface SurvivalCurvePoint {
  label: string
  probability: number
  lower: number
  upper: number
}

interface HeatmapItem {
  label: string
  score: number
  note: string
}

interface JourneyMilestone {
  title: string
  detail: string
  state: 'done' | 'active' | 'next'
}

interface PrognosisOverviewBreakdown {
  label: string
  value: number
  color: string
}

interface OutpatientRiskPreview {
  tenYearRiskPercent: number
  tier: 'low' | 'moderate' | 'high' | 'very_high'
  confidencePercent: number
  framing: string
  inputsUsed: string[]
  missingInputs: string[]
  supportTools: Array<{ label: string; status: string; note: string }>
}

const GUIDE_DATASET_PREFIX = '__guide-threshold'
const SURVIVAL_GUIDE_PREFIX = '__survival-band'
const PROGNOSIS_GUIDE_THRESHOLDS = [
  {
    label: `${GUIDE_DATASET_PREFIX}-hijau`,
    value: 25,
    color: 'rgba(16, 185, 129, 0.68)',
  },
  {
    label: `${GUIDE_DATASET_PREFIX}-oranye`,
    value: 50,
    color: 'rgba(249, 115, 22, 0.72)',
  },
  {
    label: `${GUIDE_DATASET_PREFIX}-merah`,
    value: 75,
    color: 'rgba(239, 68, 68, 0.76)',
  },
] as const

const SURVIVAL_TIMELINE = [
  { label: '24 jam', decay: 0.18 },
  { label: '72 jam', decay: 0.28 },
  { label: '7 hari', decay: 0.42 },
  { label: '30 hari', decay: 0.62 },
] as const
const SURVIVAL_NEON_PINK = 'rgba(255, 82, 190, 0.96)'
const SURVIVAL_BAND_FILL = 'rgba(142, 156, 184, 0.14)'
const SURVIVAL_BAND_STROKE = 'rgba(170, 184, 210, 0.24)'

const URGENCY_LABEL: Record<ClinicalUrgencyTier, string> = {
  low: 'Observasi Rutin',
  moderate: 'Review Hari Ini',
  high: 'Urgent <6 Jam',
  immediate: 'Emergency Sekarang',
}

const MORTALITY_LABEL: Record<MortalityProxyTier, string> = {
  low: 'Rendah',
  moderate: 'Menengah',
  high: 'Tinggi',
  very_high: 'Sangat Tinggi',
}

const RISK_COLOR: Record<RiskLevel, string> = {
  low: 'rgba(16, 185, 129, 0.8)',
  moderate: 'rgba(234, 179, 8, 0.82)',
  high: 'rgba(249, 115, 22, 0.88)',
  critical: 'rgba(239, 68, 68, 0.92)',
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getUrgencyColor(urgency: ClinicalUrgencyTier): string {
  switch (urgency) {
    case 'immediate':
      return 'var(--c-critical)'
    case 'high':
      return '#F97316'
    case 'moderate':
      return '#E8A838'
    default:
      return 'var(--c-asesmen)'
  }
}

function getMortalityColor(tier: MortalityProxyTier): string {
  switch (tier) {
    case 'very_high':
      return 'var(--c-critical)'
    case 'high':
      return '#F97316'
    case 'moderate':
      return '#E8A838'
    default:
      return 'var(--c-asesmen)'
  }
}

function getScoreColor(value: number): string {
  if (value >= 75) return 'rgba(239, 68, 68, 0.9)'
  if (value >= 50) return 'rgba(249, 115, 22, 0.88)'
  if (value >= 25) return 'rgba(234, 179, 8, 0.84)'
  return 'rgba(16, 185, 129, 0.84)'
}

function getScoreStrokeColor(value: number): string {
  if (value >= 75) return 'rgba(239, 68, 68, 1)'
  if (value >= 50) return 'rgba(249, 115, 22, 1)'
  if (value >= 25) return 'rgba(234, 179, 8, 1)'
  return 'rgba(16, 185, 129, 1)'
}

function getHeatmapBorder(score: number): string {
  if (score >= 75) return 'rgba(239, 68, 68, 0.4)'
  if (score >= 50) return 'rgba(249, 115, 22, 0.4)'
  if (score >= 25) return 'rgba(234, 179, 8, 0.36)'
  return 'rgba(16, 185, 129, 0.34)'
}

function getSurvivalProbabilityColor(probability: number): string {
  if (probability <= 55) return 'rgba(239, 68, 68, 0.9)'
  if (probability <= 72) return 'rgba(249, 115, 22, 0.88)'
  if (probability <= 85) return 'rgba(234, 179, 8, 0.86)'
  return 'rgba(120, 168, 132, 0.9)'
}

function getSurvivalStateLabel(probability: number): string {
  if (probability <= 55) return 'Perlu review ketat'
  if (probability <= 72) return 'Rawan memburuk'
  if (probability <= 85) return 'Perlu observasi'
  return 'Relatif stabil'
}

function isGuideDataset(label: string | undefined): boolean {
  return Boolean(
    label && (label.startsWith(GUIDE_DATASET_PREFIX) || label.startsWith(SURVIVAL_GUIDE_PREFIX))
  )
}

function getSignalDescription(
  label: string,
  analysis: ReturnType<typeof analyzeTrajectory>
): string {
  switch (label) {
    case 'Mortalitas Proxy':
      return analysis.clinical_safe_output.recommended_action
    case 'Deteriorasi':
      return `State saat ini: ${analysis.global_deterioration.state.replace('_', ' ')}.`
    case 'Krisis HTN':
      return 'Dipengaruhi tekanan darah sistolik/diastolik dan rule krisis hipertensi.'
    case 'Krisis Glikemik':
      return 'Dipengaruhi kadar gula darah dan risiko dekompensasi metabolik akut.'
    case 'Sepsis-like':
      return 'Dipengaruhi pola demam, nadi, napas, dan burden perburukan sistemik.'
    case 'Syok':
      return 'Dipengaruhi kombinasi hemodinamik, napas, dan indikator dekompensasi.'
    case 'Stroke / ACS':
      return 'Dipengaruhi kombinasi keluhan dan hemodinamik berbasis rule stroke/ACS.'
    default:
      return 'Proxy prognosis internal untuk prioritas review klinis.'
  }
}

function buildSurvivalCurve(
  analysis: ReturnType<typeof analyzeTrajectory>,
  confidencePercent: number
): SurvivalCurvePoint[] {
  const baseMortality = analysis.mortality_proxy.mortality_proxy_score / 100
  const deterioration = analysis.global_deterioration.deterioration_score / 100
  const volatility = analysis.trajectory_volatility.volatility_index / 100
  const missingPenalty = clamp(analysis.clinical_safe_output.missing_data.length * 0.02, 0, 0.12)
  const urgencyPenalty =
    analysis.mortality_proxy.clinical_urgency_tier === 'immediate'
      ? 0.12
      : analysis.mortality_proxy.clinical_urgency_tier === 'high'
        ? 0.08
        : analysis.mortality_proxy.clinical_urgency_tier === 'moderate'
          ? 0.04
          : 0.01
  const uncertaintyBand = clamp(
    (1 - confidencePercent / 100) * 18 + missingPenalty * 100 + volatility * 10,
    4,
    22
  )

  return SURVIVAL_TIMELINE.map((point, index) => {
    const probability = clamp(
      100 - (baseMortality * 55 + deterioration * 25 + point.decay * 28 + urgencyPenalty * 100),
      18,
      index === 0 ? 99 : 96
    )
    const lower = clamp(probability - uncertaintyBand, 5, 99)
    const upper = clamp(probability + uncertaintyBand, lower + 2, 99.5)
    return {
      label: point.label,
      probability: round(probability),
      lower: round(lower),
      upper: round(upper),
    }
  })
}

function buildHeatmap(analysis: ReturnType<typeof analyzeTrajectory>): HeatmapItem[] {
  return [
    {
      label: 'Hemodinamik',
      score: Math.max(
        analysis.acute_attack_risk_24h.hypertensive_crisis_risk,
        analysis.acute_attack_risk_24h.shock_decompensation_risk
      ),
      note: 'TD, nadi, perfusi, dan potensi dekompensasi sirkulasi.',
    },
    {
      label: 'Infeksi / Sistemik',
      score: analysis.acute_attack_risk_24h.sepsis_like_deterioration_risk,
      note: 'Demam, napas, dan pola sepsis-like hari ini.',
    },
    {
      label: 'Metabolik',
      score: analysis.acute_attack_risk_24h.glycemic_crisis_risk,
      note: 'Glukosa, potensi krisis metabolik, dan stabilitas umum.',
    },
    {
      label: 'Neuro / ACS',
      score: analysis.acute_attack_risk_24h.stroke_acs_suspicion_risk,
      note: 'Sinyal stroke atau sindrom koroner akut yang perlu disingkirkan.',
    },
    {
      label: 'Deteriorasi Global',
      score: analysis.global_deterioration.deterioration_score,
      note: 'Kecenderungan kondisi saat ini memburuk atau tetap stabil.',
    },
    {
      label: 'Beban Warning',
      score: clamp(
        analysis.early_warning_burden.breach_frequency * 100 +
          analysis.trajectory_volatility.volatility_index * 0.45,
        0,
        100
      ),
      note: 'Akumulasi breach warning dan volatilitas kunjungan.',
    },
  ]
}

function buildJourneyMilestones(
  analysis: ReturnType<typeof analyzeTrajectory>,
  selectedDiagnosis: ClinicalPrognosisChartProps['selectedDiagnosis']
): JourneyMilestone[] {
  const reviewWindow = analysis.clinical_safe_output.review_window
  const followUpAction =
    analysis.mortality_proxy.clinical_urgency_tier === 'immediate' ||
    analysis.clinical_safe_output.risk_tier === 'critical'
      ? 'Pertimbangkan rujukan / stabilisasi segera.'
      : analysis.clinical_safe_output.risk_tier === 'high'
        ? 'Observasi ketat dan review ulang prioritas.'
        : 'Lanjutkan monitoring dan follow-up terjadwal.'

  return [
    {
      title: 'Triase selesai',
      detail: 'Data keluhan dan TTV hari ini sudah masuk ke engine.',
      state: 'done',
    },
    {
      title: selectedDiagnosis ? `Dx kerja ${selectedDiagnosis.icd10_code}` : 'Diagnosis dipilih',
      detail: selectedDiagnosis
        ? selectedDiagnosis.diagnosis_name
        : 'Menunggu diagnosis kerja final dari dokter.',
      state: 'done',
    },
    {
      title: 'Review prognosis AI',
      detail: `Window review ${reviewWindow} dengan urgensi ${URGENCY_LABEL[analysis.mortality_proxy.clinical_urgency_tier].toLowerCase()}.`,
      state: 'active',
    },
    {
      title: 'Arah tindak lanjut',
      detail: followUpAction,
      state: 'next',
    },
  ]
}

function buildOverviewBreakdown(
  analysis: ReturnType<typeof analyzeTrajectory>,
  survivalWeekProbability: number
): PrognosisOverviewBreakdown[] {
  const pressure =
    analysis.mortality_proxy.mortality_proxy_score * 0.42 +
    analysis.global_deterioration.deterioration_score * 0.33 +
    analysis.trajectory_volatility.volatility_index * 0.25
  const tightReview = clamp(round(pressure), 8, 72)
  const bufferedObservation = clamp(round((100 - survivalWeekProbability) * 0.72), 8, 52)
  const stabilityReserve = clamp(100 - tightReview - bufferedObservation, 12, 84)

  return [
    {
      label: 'Cadangan stabil',
      value: stabilityReserve,
      color: 'rgba(120, 168, 132, 0.88)',
    },
    {
      label: 'Perlu review',
      value: bufferedObservation,
      color: 'rgba(232, 168, 56, 0.9)',
    },
    {
      label: 'Tekanan risiko',
      value: tightReview,
      color: 'rgba(222, 130, 104, 0.92)',
    },
  ]
}

function buildOutpatientRiskPreview({
  age,
  sex,
  sbp,
  bodyWeightKg,
  chronicDiseases,
  isPregnant,
  keluhanUtama,
}: {
  age: number
  sex: 'L' | 'P'
  sbp: number
  bodyWeightKg?: number
  chronicDiseases: string[]
  isPregnant?: boolean
  keluhanUtama: string
}): OutpatientRiskPreview {
  const chronicLower = chronicDiseases.map(item => item.toLowerCase())
  const hasDiabetes = chronicLower.some(item => item.includes('diabetes'))
  const hasHypertension = chronicLower.some(item => item.includes('hipertensi'))
  const hasKidneyDisease = chronicLower.some(item => item.includes('ginjal'))
  const hasCoronaryDisease = chronicLower.some(item => item.includes('jantung'))

  const ageRisk = age >= 70 ? 16 : age >= 60 ? 13 : age >= 50 ? 10 : age >= 40 ? 6 : 2
  const bpRisk = sbp >= 160 ? 16 : sbp >= 140 ? 11 : sbp >= 130 ? 7 : sbp >= 120 ? 4 : 1
  const diabetesRisk = hasDiabetes ? 9 : 0
  const hypertensionRisk = hasHypertension ? 5 : 0
  const kidneyRisk = hasKidneyDisease ? 4 : 0
  const coronaryRisk = hasCoronaryDisease ? 6 : 0
  const sexRisk = sex === 'L' ? 3 : 1
  const pregnancyBuffer = sex === 'P' && isPregnant ? -2 : 0

  const aggregateRisk =
    ageRisk +
    bpRisk +
    diabetesRisk +
    hypertensionRisk +
    kidneyRisk +
    coronaryRisk +
    sexRisk +
    pregnancyBuffer
  const tenYearRiskPercent = clamp(round(aggregateRisk * 0.92, 1), 2, 42)

  const tier =
    tenYearRiskPercent >= 20
      ? 'very_high'
      : tenYearRiskPercent >= 10
        ? 'high'
        : tenYearRiskPercent >= 5
          ? 'moderate'
          : 'low'

  const missingInputs = [
    'Status merokok belum diisi',
    bodyWeightKg ? 'Tinggi badan / IMT belum tersedia' : 'Berat badan dan IMT belum tersedia',
    'Profil lipid belum ada',
    'Status terapi hipertensi belum terstruktur',
  ]

  const confidencePenalty = missingInputs.length * 0.09
  const confidencePercent = Math.round(clamp((0.84 - confidencePenalty) * 100, 48, 82))

  const supportTools = [
    {
      label: 'PHQ-9',
      status: /cemas|murung|sedih|sulit tidur|insomnia|letih|kelelahan/i.test(keluhanUtama)
        ? 'Disarankan'
        : 'Siaga',
      note: /cemas|murung|sedih|sulit tidur|insomnia|letih|kelelahan/i.test(keluhanUtama)
        ? 'Keluhan mengarah ke beban mental/energi; skrining PHQ-9 bernilai tinggi.'
        : 'Gunakan bila ada keluhan mood, tidur, atau fungsi harian.',
    },
    {
      label: 'Skoring Dehidrasi',
      status: /diare|muntah|demam|haus|lemas/i.test(keluhanUtama) ? 'Pertimbangkan' : 'Selektif',
      note: /diare|muntah|demam|haus|lemas/i.test(keluhanUtama)
        ? 'Keluhan sistemik/cairan muncul; skor dehidrasi dapat membantu triase.'
        : 'Paling relevan untuk kasus cairan, muntah-diare, atau pediatri.',
    },
  ]

  const inputsUsed = [
    `Usia ${age} tahun`,
    `SBP ${sbp > 0 ? `${sbp} mmHg` : 'belum tersedia'}`,
    `Jenis kelamin ${sex === 'L' ? 'laki-laki' : 'perempuan'}`,
    hasDiabetes ? 'Riwayat diabetes ada' : 'Riwayat diabetes tidak terdeteksi',
    hasHypertension ? 'Riwayat hipertensi ada' : 'Riwayat hipertensi tidak terdeteksi',
    bodyWeightKg ? `BB ${bodyWeightKg} kg` : 'BB belum diisi',
  ]

  return {
    tenYearRiskPercent,
    tier,
    confidencePercent,
    framing: 'Framingham / QRISK-oriented preview',
    inputsUsed,
    missingInputs,
    supportTools,
  }
}

export default function ClinicalPrognosisChart({
  vitals,
  keluhanUtama,
  encounterId,
  selectedDiagnosis,
  patientAge,
  patientGender,
  bodyWeightKg,
  chronicDiseases = [],
  isPregnant,
}: ClinicalPrognosisChartProps) {
  const signalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const signalChartRef = useRef<Chart | null>(null)
  const survivalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const survivalChartRef = useRef<Chart<'line'> | null>(null)
  const overviewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overviewChartRef = useRef<Chart<'doughnut'> | null>(null)
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const radarChartRef = useRef<Chart<'radar'> | null>(null)
  const outpatientRiskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const outpatientRiskChartRef = useRef<Chart<'bar' | 'line'> | null>(null)

  const hasUsableVitals =
    vitals.sbp > 0 ||
    vitals.dbp > 0 ||
    vitals.hr > 0 ||
    vitals.rr > 0 ||
    vitals.temp > 0 ||
    vitals.glucose > 0

  const prognosis = useMemo(() => {
    if (!keluhanUtama.trim() && !hasUsableVitals) {
      return null
    }

    const currentVisit: VisitRecord = {
      patient_id: 'session',
      encounter_id: encounterId || 'enc-current-session',
      timestamp: new Date().toISOString(),
      vitals,
      keluhan_utama: keluhanUtama,
      diagnosa: selectedDiagnosis
        ? {
            icd_x: selectedDiagnosis.icd10_code,
            nama: selectedDiagnosis.diagnosis_name,
          }
        : undefined,
      source: 'uplink',
    }

    const analysis = analyzeTrajectory([currentVisit])
    const confidencePercent = Math.round(analysis.clinical_safe_output.confidence * 100)
    const labels = [
      'Mortalitas Proxy',
      'Deteriorasi',
      'Krisis HTN',
      'Krisis Glikemik',
      'Sepsis-like',
      'Syok',
      'Stroke / ACS',
    ]
    const values = [
      analysis.mortality_proxy.mortality_proxy_score,
      analysis.global_deterioration.deterioration_score,
      analysis.acute_attack_risk_24h.hypertensive_crisis_risk,
      analysis.acute_attack_risk_24h.glycemic_crisis_risk,
      analysis.acute_attack_risk_24h.sepsis_like_deterioration_risk,
      analysis.acute_attack_risk_24h.shock_decompensation_risk,
      analysis.acute_attack_risk_24h.stroke_acs_suspicion_risk,
    ]
    const highlightedSignals: PrognosisSignalDetail[] = labels
      .map((label, index) => ({
        label,
        value: values[index],
        severity: values[index] >= 75 ? ('red' as const) : ('orange' as const),
        description: getSignalDescription(label, analysis),
      }))
      .filter(signal => signal.value >= 50)
      .sort((left, right) => right.value - left.value)

    return {
      analysis,
      labels,
      values,
      confidencePercent,
      highlightedSignals,
      survivalCurve: buildSurvivalCurve(analysis, confidencePercent),
      heatmap: buildHeatmap(analysis),
      journeyMilestones: buildJourneyMilestones(analysis, selectedDiagnosis),
      dominantDrivers: analysis.clinical_safe_output.drivers.slice(0, 4),
      missingData: analysis.clinical_safe_output.missing_data.slice(0, 4),
      outpatientRiskPreview: buildOutpatientRiskPreview({
        age: patientAge,
        sex: patientGender,
        sbp: vitals.sbp,
        bodyWeightKg,
        chronicDiseases,
        isPregnant,
        keluhanUtama,
      }),
    }
  }, [
    bodyWeightKg,
    chronicDiseases,
    encounterId,
    hasUsableVitals,
    isPregnant,
    keluhanUtama,
    patientAge,
    patientGender,
    selectedDiagnosis,
    vitals,
  ])

  useEffect(() => {
    const canvas = signalCanvasRef.current
    if (!canvas || !prognosis) return

    const context = canvas.getContext('2d')
    if (!context) return

    signalChartRef.current?.destroy()

    const config: ChartConfiguration<'bar' | 'line'> = {
      type: 'bar',
      data: {
        labels: prognosis.labels,
        datasets: [
          ...PROGNOSIS_GUIDE_THRESHOLDS.map(threshold => ({
            type: 'line' as const,
            label: threshold.label,
            data: prognosis.labels.map(() => threshold.value),
            borderColor: threshold.color,
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          })),
          {
            type: 'bar' as const,
            label: 'Signal Risiko',
            data: prognosis.values,
            backgroundColor: prognosis.values.map(value => getScoreColor(value)),
            borderColor: prognosis.values.map(value => getScoreStrokeColor(value)),
            borderWidth: 1,
            borderRadius: 5,
            maxBarThickness: 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 760, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              color: '#A0A0A0',
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              font: { size: 11, family: 'var(--font-mono)' },
              filter(item) {
                return !isGuideDataset(item.text)
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(33, 33, 33, 0.96)',
            borderColor: 'rgba(230, 126, 34, 0.22)',
            borderWidth: 1,
            titleColor: '#F0E8DC',
            bodyColor: '#F0E8DC',
            displayColors: false,
            padding: 12,
            filter(tooltipItem) {
              return !isGuideDataset(tooltipItem.dataset.label ?? '')
            },
            callbacks: {
              label(tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.formattedValue}/100`
              },
              footer() {
                return 'Signal risiko internal untuk prioritas review; klik detail diagnosis untuk konteks lengkap.'
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#A0A0A0', font: { size: 11 } },
            border: { color: 'rgba(255, 255, 255, 0.08)' },
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#F0E8DC', font: { size: 10 } },
            border: { color: 'rgba(255, 255, 255, 0.08)' },
            title: {
              display: true,
              text: 'Skor proxy (0-100)',
              color: '#F0E8DC',
              font: { size: 10 },
            },
          },
        },
      },
    }

    signalChartRef.current = new Chart(context, config)

    return () => {
      signalChartRef.current?.destroy()
      signalChartRef.current = null
    }
  }, [prognosis])

  useEffect(() => {
    const canvas = survivalCanvasRef.current
    if (!canvas || !prognosis) return

    const context = canvas.getContext('2d')
    if (!context) return

    survivalChartRef.current?.destroy()

    const labels = prognosis.survivalCurve.map(point => point.label)
    const lowerBand = prognosis.survivalCurve.map(point => point.lower)
    const upperBand = prognosis.survivalCurve.map(point => point.upper)
    const forecast = prognosis.survivalCurve.map(point => point.probability)
    const strokeColor = SURVIVAL_NEON_PINK

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${SURVIVAL_GUIDE_PREFIX}-aman`,
            data: labels.map(() => 85),
            borderColor: 'rgba(120, 168, 132, 0.45)',
            borderWidth: 1,
            borderDash: [4, 8],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: `${SURVIVAL_GUIDE_PREFIX}-review`,
            data: labels.map(() => 70),
            borderColor: 'rgba(166, 178, 198, 0.44)',
            borderWidth: 1,
            borderDash: [4, 8],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: `${SURVIVAL_GUIDE_PREFIX}-ketat`,
            data: labels.map(() => 55),
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderWidth: 1,
            borderDash: [4, 8],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: `${SURVIVAL_GUIDE_PREFIX}-lower`,
            data: lowerBand,
            borderColor: 'rgba(0, 0, 0, 0)',
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0.34,
          },
          {
            label: `${SURVIVAL_GUIDE_PREFIX}-band`,
            data: upperBand,
            borderColor: SURVIVAL_BAND_STROKE,
            backgroundColor: SURVIVAL_BAND_FILL,
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: '-1',
            tension: 0.34,
          },
          {
            label: 'Proyeksi stabilitas',
            data: forecast,
            borderColor: strokeColor,
            backgroundColor: 'rgba(255,255,255,0)',
            borderWidth: 2.2,
            pointRadius: 3.6,
            pointHoverRadius: 5.2,
            pointBorderWidth: 1.2,
            pointBorderColor: strokeColor,
            pointBackgroundColor: '#15121A',
            fill: false,
            tension: 0.34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animation: { duration: 760, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(33, 33, 33, 0.96)',
            borderColor: 'rgba(230, 126, 34, 0.22)',
            borderWidth: 1,
            titleColor: '#F0E8DC',
            bodyColor: '#F0E8DC',
            displayColors: false,
            padding: 12,
            filter(tooltipItem) {
              return !isGuideDataset(tooltipItem.dataset.label ?? '')
            },
            callbacks: {
              title(items) {
                return items[0]?.label ?? ''
              },
              label(tooltipItem) {
                const point = prognosis.survivalCurve[tooltipItem.dataIndex]
                if (!point) return ''
                return `Peluang stabil: ${point.probability}%`
              },
              afterLabel(tooltipItem) {
                const point = prognosis.survivalCurve[tooltipItem.dataIndex]
                if (!point) return ''
                return `Rentang internal: ${point.lower}% - ${point.upper}%`
              },
              footer(items) {
                const point = prognosis.survivalCurve[items[0]?.dataIndex ?? -1]
                if (!point) return ''
                return getSurvivalStateLabel(point.probability)
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#B8B1A6',
              font: { size: 11 },
            },
            border: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            min: 30,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#F0E8DC',
              font: { size: 10 },
              callback(value) {
                return `${value}%`
              },
            },
            border: { color: 'rgba(255,255,255,0.08)' },
            title: {
              display: true,
              text: 'Peluang stabil (%)',
              color: '#F0E8DC',
              font: { size: 10 },
            },
          },
        },
      },
    }

    survivalChartRef.current = new Chart(context, config)

    return () => {
      survivalChartRef.current?.destroy()
      survivalChartRef.current = null
    }
  }, [prognosis])

  useEffect(() => {
    const canvas = overviewCanvasRef.current
    if (!canvas || !prognosis) return

    const context = canvas.getContext('2d')
    if (!context) return

    overviewChartRef.current?.destroy()

    const { analysis } = prognosis
    const survivalWeekPoint = prognosis.survivalCurve[2]
    const breakdown = buildOverviewBreakdown(analysis, survivalWeekPoint?.probability ?? 0)

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: breakdown.map(item => item.label),
        datasets: [
          {
            data: breakdown.map(item => item.value),
            backgroundColor: breakdown.map(item => item.color),
            borderColor: 'rgba(12, 16, 20, 0.78)',
            borderWidth: 2,
            hoverOffset: 2,
            spacing: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        animation: { duration: 760, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(33, 33, 33, 0.96)',
            borderColor: 'rgba(230, 126, 34, 0.22)',
            borderWidth: 1,
            titleColor: '#F0E8DC',
            bodyColor: '#F0E8DC',
            displayColors: false,
            padding: 12,
            callbacks: {
              label(tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.formattedValue}%`
              },
            },
          },
        },
      },
    }

    overviewChartRef.current = new Chart(context, config)

    return () => {
      overviewChartRef.current?.destroy()
      overviewChartRef.current = null
    }
  }, [prognosis])

  useEffect(() => {
    const canvas = radarCanvasRef.current
    if (!canvas || !prognosis) return

    const context = canvas.getContext('2d')
    if (!context) return

    radarChartRef.current?.destroy()

    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels: prognosis.heatmap.map(item => item.label),
        datasets: [
          {
            label: 'Profil prognosis',
            data: prognosis.heatmap.map(item => round(item.score)),
            borderColor: 'rgba(255, 82, 190, 0.96)',
            backgroundColor: 'rgba(255, 82, 190, 0.12)',
            pointBackgroundColor: prognosis.heatmap.map(item => getScoreStrokeColor(item.score)),
            pointBorderColor: 'rgba(12, 16, 20, 0.88)',
            pointBorderWidth: 1,
            pointRadius: 3,
            pointHoverRadius: 4.4,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 760, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(33, 33, 33, 0.96)',
            borderColor: 'rgba(230, 126, 34, 0.22)',
            borderWidth: 1,
            titleColor: '#F0E8DC',
            bodyColor: '#F0E8DC',
            displayColors: false,
            padding: 12,
            callbacks: {
              label(tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.formattedValue}/100`
              },
              afterLabel(tooltipItem) {
                return prognosis.heatmap[tooltipItem.dataIndex]?.note ?? ''
              },
            },
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            beginAtZero: true,
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: {
              color: '#C9C2B7',
              font: { size: 10, family: 'var(--font-mono)' },
            },
            ticks: {
              display: false,
              stepSize: 25,
            },
          },
        },
      },
    }

    radarChartRef.current = new Chart(context, config)

    return () => {
      radarChartRef.current?.destroy()
      radarChartRef.current = null
    }
  }, [prognosis])

  useEffect(() => {
    const canvas = outpatientRiskCanvasRef.current
    if (!canvas || !prognosis) return

    const context = canvas.getContext('2d')
    if (!context) return

    outpatientRiskChartRef.current?.destroy()

    const preview = prognosis.outpatientRiskPreview

    const config: ChartConfiguration<'bar' | 'line'> = {
      type: 'bar',
      data: {
        labels: ['Risiko 10 Tahun'],
        datasets: [
          {
            type: 'line' as const,
            label: `${GUIDE_DATASET_PREFIX}-rendah`,
            data: [5],
            borderColor: 'rgba(120, 168, 132, 0.54)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            type: 'line' as const,
            label: `${GUIDE_DATASET_PREFIX}-sedang`,
            data: [10],
            borderColor: 'rgba(232, 168, 56, 0.56)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            type: 'line' as const,
            label: `${GUIDE_DATASET_PREFIX}-tinggi`,
            data: [20],
            borderColor: 'rgba(222, 130, 104, 0.62)',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            type: 'bar' as const,
            label: 'Preview risiko 10 tahun',
            data: [preview.tenYearRiskPercent],
            backgroundColor: [getScoreColor(preview.tenYearRiskPercent * 2.2)],
            borderColor: [getScoreStrokeColor(preview.tenYearRiskPercent * 2.2)],
            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 760, easing: 'easeOutQuart' },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              color: '#A0A0A0',
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              font: { size: 11, family: 'var(--font-mono)' },
              filter(item) {
                return !isGuideDataset(item.text)
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(33, 33, 33, 0.96)',
            borderColor: 'rgba(230, 126, 34, 0.22)',
            borderWidth: 1,
            titleColor: '#F0E8DC',
            bodyColor: '#F0E8DC',
            displayColors: false,
            padding: 12,
            filter(tooltipItem) {
              return !isGuideDataset(tooltipItem.dataset.label ?? '')
            },
            callbacks: {
              label() {
                return `Preview risiko event kardiovaskular 10 tahun: ${preview.tenYearRiskPercent}%`
              },
              afterLabel() {
                return `${preview.framing} · confidence ${preview.confidencePercent}%`
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 30,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#F0E8DC',
              font: { size: 10 },
              callback(value) {
                return `${value}%`
              },
            },
            border: { color: 'rgba(255,255,255,0.08)' },
            title: {
              display: true,
              text: 'Risiko event CV 10 tahun',
              color: '#F0E8DC',
              font: { size: 10 },
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: '#B8B1A6', font: { size: 11 } },
            border: { color: 'rgba(255,255,255,0.08)' },
          },
        },
      },
    }

    outpatientRiskChartRef.current = new Chart(context, config)

    return () => {
      outpatientRiskChartRef.current?.destroy()
      outpatientRiskChartRef.current = null
    }
  }, [prognosis])

  if (!prognosis) {
    return null
  }

  const { analysis } = prognosis
  const riskColor = RISK_COLOR[analysis.clinical_safe_output.risk_tier]
  const survivalLead = prognosis.survivalCurve[0]
  const survivalWeek = prognosis.survivalCurve[2]
  const survivalMonth = prognosis.survivalCurve[3]
  const survivalBandHalfWidth = Math.round(
    ((survivalWeek?.upper ?? 0) - (survivalWeek?.lower ?? 0)) / 2
  )
  const overviewBreakdown = buildOverviewBreakdown(analysis, survivalWeek?.probability ?? 0)
  const outpatientRiskPreview = prognosis.outpatientRiskPreview

  return (
    <div
      className="blueprint-wrapper"
      style={{
        marginTop: 10,
        padding: '14px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 3,
            }}
          >
            PROGNOSIS LANJUTAN
          </div>
          <div style={{ fontSize: 15, color: 'var(--text-main)', fontWeight: 600 }}>
            Review prognosis setelah diagnosis dipilih
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            minWidth: 220,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            DIAGNOSIS TERPILIH
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-main)',
              textAlign: 'right',
              lineHeight: 1.35,
            }}
          >
            {selectedDiagnosis
              ? `${selectedDiagnosis.diagnosis_name} (${selectedDiagnosis.icd10_code})`
              : 'Menunggu diagnosis kerja'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginTop: 12,
        }}
      >
        <div className="prognosis-section" style={{ padding: '10px 12px', minHeight: 82 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            URGENSI KLINIS
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              fontWeight: 600,
              color: getUrgencyColor(analysis.mortality_proxy.clinical_urgency_tier),
              lineHeight: 1.2,
            }}
          >
            {URGENCY_LABEL[analysis.mortality_proxy.clinical_urgency_tier]}
          </div>
        </div>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 12px',
            background: 'transparent',
            minHeight: 82,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            MORTALITAS PROXY
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              fontWeight: 600,
              color: getMortalityColor(analysis.mortality_proxy.mortality_proxy_tier),
              lineHeight: 1.2,
            }}
          >
            {MORTALITY_LABEL[analysis.mortality_proxy.mortality_proxy_tier]}
          </div>
        </div>
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 12px',
            background: 'transparent',
            minHeight: 82,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            CONFIDENCE
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-main)',
              lineHeight: 1.2,
            }}
          >
            {prognosis.confidencePercent}%
          </div>
        </div>
        <div className="prognosis-section" style={{ padding: '10px 12px', minHeight: 82 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
            }}
          >
            TIER REVIEW
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 16,
              fontWeight: 600,
              color: riskColor,
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            {analysis.clinical_safe_output.risk_tier.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, 0.9fr)',
          gap: 16,
          marginTop: 14,
        }}
      >
        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            POLI UMUM // EARLY DETECTION &amp; RISK STRATIFICATION
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                }}
              >
                RISIKO 10 TAHUN
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 18,
                  fontWeight: 700,
                  color: getScoreStrokeColor(outpatientRiskPreview.tenYearRiskPercent * 2.2),
                }}
              >
                {outpatientRiskPreview.tenYearRiskPercent}%
              </div>
            </div>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                }}
              >
                MODEL
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  lineHeight: 1.4,
                }}
              >
                {outpatientRiskPreview.framing}
              </div>
            </div>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                }}
              >
                CONFIDENCE
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
              >
                {outpatientRiskPreview.confidencePercent}%
              </div>
            </div>
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--text-muted)',
                }}
              >
                PROGNOSA
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  lineHeight: 1.4,
                }}
              >
                Prediksi risiko serangan jantung / stroke dalam 10 tahun.
              </div>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <canvas ref={outpatientRiskCanvasRef} />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.58,
            }}
          >
            Garis putus menunjukkan zona rendah, sedang, dan tinggi. Panel ini cocok untuk poli umum
            dewasa sebagai early detection, bukan pengganti kalkulator formal saat data lengkap
            tersedia.
          </div>
        </div>

        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            INPUT &amp; TOOL PENDUKUNG
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                INPUT YANG SUDAH MASUK
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {outpatientRiskPreview.inputsUsed.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-main)',
                      lineHeight: 1.6,
                      padding: '7px 0 0',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                DATA YANG MASIH DIBUTUHKAN
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {outpatientRiskPreview.missingInputs.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-main)',
                      lineHeight: 1.6,
                      padding: '7px 0 0',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                TOOL PENDUKUNG
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {outpatientRiskPreview.supportTools.map(tool => (
                  <div
                    key={tool.label}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      background: 'transparent',
                      padding: '8px 0 0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-main)',
                          fontWeight: 600,
                        }}
                      >
                        {tool.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--c-asesmen)',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {tool.status}
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        lineHeight: 1.55,
                      }}
                    >
                      {tool.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 0.84fr) minmax(0, 1.16fr)',
          gap: 16,
          marginTop: 14,
        }}
      >
        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            SNAPSHOT PROGNOSIS
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '132px minmax(0, 1fr)',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 132,
                height: 132,
                margin: '0 auto',
              }}
            >
              <canvas ref={overviewCanvasRef} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    7 HARI
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 20,
                      fontWeight: 700,
                      color: getSurvivalProbabilityColor(survivalWeek?.probability ?? 0),
                    }}
                  >
                    {survivalWeek?.probability ?? 0}%
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      lineHeight: 1.35,
                    }}
                  >
                    {getSurvivalStateLabel(survivalWeek?.probability ?? 0)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 0 }}>
              {overviewBreakdown.map(item => (
                <div
                  key={item.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 56px',
                    gap: 10,
                    alignItems: 'center',
                    padding: '9px 0',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'transparent',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-main)',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        height: 5,
                        background: 'rgba(255,255,255,0.06)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: `${item.value}%`,
                          height: '100%',
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: item.color,
                      textAlign: 'right',
                      fontWeight: 600,
                    }}
                  >
                    {Math.round(item.value)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.58,
            }}
          >
            Snapshot ini membaca keseimbangan antara cadangan stabilitas, kebutuhan review, dan
            tekanan risiko klinis setelah diagnosis kerja dipilih.
          </div>
        </div>

        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            RADAR PROGNOSIS MULTI-FAKTOR
          </div>
          <div style={{ height: 260 }}>
            <canvas ref={radarCanvasRef} />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.58,
            }}
          >
            Semakin melebar area radar, semakin banyak domain yang perlu perhatian klinis aktif pada
            kunjungan ini.
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.85fr)',
          gap: 16,
          marginTop: 14,
        }}
      >
        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            KURVA KELANGSUNGAN HIDUP PROBABILISTIK
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              {
                label: '24 JAM',
                value: `${survivalLead?.probability ?? 0}%`,
                note: getSurvivalStateLabel(survivalLead?.probability ?? 0),
                color: getSurvivalProbabilityColor(survivalLead?.probability ?? 0),
              },
              {
                label: '7 HARI',
                value: `${survivalWeek?.probability ?? 0}%`,
                note: 'Titik review utama',
                color: getSurvivalProbabilityColor(survivalWeek?.probability ?? 0),
              },
              {
                label: '30 HARI',
                value: `${survivalMonth?.probability ?? 0}%`,
                note: 'Arah prognosis lanjut',
                color: getSurvivalProbabilityColor(survivalMonth?.probability ?? 0),
              },
              {
                label: 'BAND',
                value: `±${survivalBandHalfWidth}%`,
                note: 'Ketidakpastian internal',
                color: 'rgba(232, 168, 56, 0.86)',
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  padding: '10px 11px',
                  minHeight: 72,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 18,
                    fontWeight: 600,
                    color: item.color,
                    lineHeight: 1.1,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                  }}
                >
                  {item.note}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 230 }}>
            <canvas ref={survivalCanvasRef} />
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.58,
            }}
          >
            <span>Garis utama: proyeksi peluang stabilitas.</span>
            <span>Area berbayang: rentang ketidakpastian internal.</span>
            <span>Garis putus: zona aman, review, dan risiko tinggi.</span>
          </div>
        </div>

        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            PATIENT JOURNEY &amp; AI MILESTONES
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {prognosis.journeyMilestones.map((milestone, index) => (
              <div
                key={`${milestone.title}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr',
                  gap: 12,
                }}
              >
                <div style={{ display: 'grid', justifyItems: 'center' }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      marginTop: 4,
                      background:
                        milestone.state === 'done'
                          ? 'var(--c-asesmen)'
                          : milestone.state === 'active'
                            ? '#E8A838'
                            : 'rgba(255,255,255,0.18)',
                      boxShadow:
                        milestone.state !== 'next' ? '0 0 0 4px rgba(230, 126, 34, 0.08)' : 'none',
                    }}
                  />
                  {index < prognosis.journeyMilestones.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        width: 1,
                        minHeight: 36,
                        background: 'rgba(255,255,255,0.08)',
                      }}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-main)',
                      fontWeight: 600,
                    }}
                  >
                    {milestone.title}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.65,
                    }}
                  >
                    {milestone.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 16,
          marginTop: 18,
        }}
      >
        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            PETA PANAS RISIKO
          </div>
          <div style={{ display: 'grid', gap: 0 }}>
            {prognosis.heatmap.map(item => (
              <div
                key={item.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px minmax(0, 1fr) 58px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '10px 0',
                  background: 'transparent',
                  borderTop: `1px solid ${getHeatmapBorder(item.score)}`,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-main)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {item.label}
                </div>
                <div>
                  <div
                    style={{
                      height: 6,
                      background: 'rgba(255,255,255,0.06)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${clamp(item.score, 0, 100)}%`,
                        height: '100%',
                        background: getScoreColor(item.score),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      lineHeight: 1.55,
                    }}
                  >
                    {item.note}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: getScoreStrokeColor(item.score),
                    textAlign: 'right',
                  }}
                >
                  {Math.round(item.score)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            SIGNAL PROGNOSIS
          </div>
          <div style={{ height: 260 }}>
            <canvas ref={signalCanvasRef} />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.95fr)',
          gap: 16,
          marginTop: 18,
        }}
      >
        <div className="prognosis-section" style={{ padding: '14px 16px' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--c-asesmen)',
              marginBottom: 9,
            }}
          >
            PENJABARAN ORANYE &amp; MERAH
          </div>
          {prognosis.highlightedSignals.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.7,
              }}
            >
              Belum ada signal yang masuk oranye atau merah pada snapshot prognosis ini.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {prognosis.highlightedSignals.map(signal => (
                <div key={signal.label} className={`prognosis-highlight-card ${signal.severity}`}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-main)',
                        fontWeight: 600,
                      }}
                    >
                      {signal.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.1em',
                        color: signal.severity === 'red' ? 'var(--c-critical)' : '#F97316',
                      }}
                    >
                      {signal.severity === 'red' ? 'MERAH' : 'ORANYE'} · {Math.round(signal.value)}
                      /100
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      lineHeight: 1.65,
                    }}
                  >
                    {signal.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '14px 16px',
            background: 'transparent',
            display: 'grid',
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--c-asesmen)',
                marginBottom: 8,
              }}
            >
              DRIVER DOMINAN
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {prognosis.dominantDrivers.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Belum ada driver dominan yang menonjol.
                </div>
              ) : (
                prognosis.dominantDrivers.map((driver, index) => (
                  <div
                    key={`${driver}-${index}`}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-main)',
                      lineHeight: 1.6,
                    }}
                  >
                    • {driver}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--c-asesmen)',
                marginBottom: 8,
              }}
            >
              DATA YANG MASIH PERLU
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {prognosis.missingData.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Tidak ada data kritikal tambahan yang terdeteksi saat ini.
                </div>
              ) : (
                prognosis.missingData.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-main)',
                      lineHeight: 1.6,
                    }}
                  >
                    • {item}
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: '1px dashed rgba(255,255,255,0.08)',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}
          >
            <div style={{ color: 'var(--text-main)', marginBottom: 4 }}>
              Ringkasan mesin: {analysis.summary}
            </div>
            <div>
              Catatan: visual prognosis ini membantu membaca arah risiko setelah diagnosis dipilih.
              Ia tidak menggantikan judgement klinis, evaluasi serial, atau indikator prognosis
              tervalidasi.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
