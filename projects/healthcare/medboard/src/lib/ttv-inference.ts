/**
 * Gate 1: TTV (Vital Signs) Inference Algorithm
 *
 * Purpose: Auto-fill unmeasured vital signs based on patient complaints
 * Evidence Base: WHO, AHA guidelines
 *
 * @module lib/emergency-detector/ttv-inference
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Evidence-based normal ranges for vital signs
 * Source: WHO, AHA
 */
export interface VitalRanges {
  pulse: { min: number; max: number }
  rr: { min: number; max: number }
  temp: { min: number; max: number }
}

/**
 * Measured or inferred vital signs
 */
export interface VitalSigns {
  pulse?: number
  rr?: number
  temp?: number
  sbp?: number
  dbp?: number
}

export type VitalConfidence = 'high' | 'medium' | 'low'
export type RecentActivity = 'resting' | 'walking' | 'post_exertion'
export type StressState = 'calm' | 'anxious' | 'pain' | 'severe_pain'
export type MedicationFlag = 'beta_blocker' | 'stimulant' | 'sedative' | 'antipyretic'

export interface VitalInferenceContext {
  ageYears?: number
  sex?: 'L' | 'P'
  isPregnant?: boolean
  bodyWeightKg?: number
  recentActivity?: RecentActivity
  stressState?: StressState
  ambientTemperatureC?: number
  medications?: MedicationFlag[]
  measured?: VitalSigns
}

/**
 * Metadata about how vital was obtained
 */
export interface VitalMetadata {
  source: 'measured' | 'inferred'
  confidence?: VitalConfidence
  reasoning?: string
  range?: { min: number; max: number }
}

/**
 * Complete vital signs with metadata
 */
export interface VitalsWithMetadata {
  values: VitalSigns
  metadata: {
    pulse?: VitalMetadata
    rr?: VitalMetadata
    temp?: VitalMetadata
  }
}

export interface ContextualVitalsAdvice extends VitalsWithMetadata {
  manualMeasurementRequired: Array<'sbp' | 'dbp' | 'spo2' | 'gcs' | 'map'>
  rationale: string[]
  defaults: {
    gcs?: number
    spo2?: number
  }
}

/**
 * Symptom pattern for inference
 */
export interface SymptomPattern {
  id: string
  keywords: string[]
  vitals: {
    pulse?: { min: number; max: number }
    rr?: { min: number; max: number }
    temp?: { min: number; max: number }
  }
  reasoning: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Evidence-based normal ranges (WHO/AHA)
 */
export const NORMAL_RANGES: VitalRanges = {
  pulse: { min: 60, max: 100 },
  rr: { min: 12, max: 20 },
  temp: { min: 36.5, max: 37.2 },
}

const AGE_BASELINE_RANGES: Array<{ maxAge: number; ranges: VitalRanges }> = [
  {
    maxAge: 0.99,
    ranges: {
      pulse: { min: 100, max: 160 },
      rr: { min: 30, max: 60 },
      temp: { min: 36.5, max: 37.5 },
    },
  },
  {
    maxAge: 3,
    ranges: {
      pulse: { min: 90, max: 150 },
      rr: { min: 24, max: 40 },
      temp: { min: 36.5, max: 37.5 },
    },
  },
  {
    maxAge: 5,
    ranges: {
      pulse: { min: 80, max: 140 },
      rr: { min: 22, max: 34 },
      temp: { min: 36.4, max: 37.5 },
    },
  },
  {
    maxAge: 12,
    ranges: {
      pulse: { min: 70, max: 120 },
      rr: { min: 18, max: 30 },
      temp: { min: 36.4, max: 37.4 },
    },
  },
  {
    maxAge: 17,
    ranges: {
      pulse: { min: 60, max: 100 },
      rr: { min: 12, max: 20 },
      temp: { min: 36.4, max: 37.4 },
    },
  },
  { maxAge: Number.POSITIVE_INFINITY, ranges: NORMAL_RANGES },
]

/**
 * Symptom patterns for vital signs inference
 * Based on clinical evidence and pathophysiology
 */
export const SYMPTOM_PATTERNS: SymptomPattern[] = [
  {
    id: 'fever_infection',
    keywords: ['demam', 'panas', 'fever', 'meriang'],
    vitals: {
      temp: { min: 38.0, max: 39.5 },
      pulse: { min: 90, max: 110 }, // Tachycardia (↑10-20 bpm per 1°C)
      rr: { min: 20, max: 24 }, // Mild tachypnea
    },
    reasoning: 'Demam → ↑metabolisme → ↑HR, ↑RR',
  },
  {
    id: 'respiratory_distress',
    keywords: ['sesak', 'napas', 'dyspnea', 'breathless', 'asma', 'asthma'],
    vitals: {
      rr: { min: 24, max: 30 }, // Tachypnea
      pulse: { min: 90, max: 110 }, // Compensatory tachycardia
      temp: { min: 36.5, max: 37.2 }, // Normal (unless infection)
    },
    reasoning: 'Respiratory distress → ↑RR, ↑HR kompensasi',
  },
  {
    id: 'chest_pain_cardiac',
    keywords: ['nyeri dada', 'chest pain', 'angina', 'jantung'],
    vitals: {
      pulse: { min: 80, max: 100 }, // May be normal or elevated
      rr: { min: 16, max: 22 }, // Mild elevation
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Cardiac ischemia → stress response → mild ↑HR, ↑RR',
  },
  {
    id: 'hypoglycemia',
    keywords: ['lemas', 'pusing', 'keringat dingin', 'tremor', 'gemetar'],
    vitals: {
      pulse: { min: 90, max: 120 }, // Tachycardia (sympathetic)
      rr: { min: 16, max: 22 }, // Mild tachypnea
      temp: { min: 36.0, max: 36.8 }, // May be slightly low
    },
    reasoning: 'Hipoglikemia → aktivasi simpatis → ↑HR, keringat dingin',
  },
  {
    id: 'sepsis_infection',
    keywords: ['menggigil', 'rigors', 'infeksi berat', 'sepsis'],
    vitals: {
      temp: { min: 38.5, max: 40.0 }, // High fever
      pulse: { min: 100, max: 130 }, // Tachycardia
      rr: { min: 22, max: 28 }, // Tachypnea
    },
    reasoning: 'Sepsis → SIRS response → ↑↑HR, ↑↑RR, ↑↑Temp',
  },
  {
    id: 'pain_musculoskeletal',
    keywords: [
      'nyeri pinggang',
      'nyeri punggung',
      'pegal',
      'kaku otot',
      'otot tegang',
      'low back pain',
    ],
    vitals: {
      pulse: { min: 76, max: 92 },
      rr: { min: 14, max: 20 },
      temp: { min: 36.5, max: 37.2 },
    },
    reasoning:
      'Nyeri muskuloskeletal umumnya menaikkan nadi ringan, tanpa respons simpatis setinggi nyeri viseral atau kolik.',
  },
  {
    id: 'pain_colic_visceral',
    keywords: [
      'kolik',
      'flank pain',
      'renal colic',
      'nyeri kolik',
      'menjalar ke lipat paha',
      'anyang-anyangan',
    ],
    vitals: {
      pulse: { min: 92, max: 112 },
      rr: { min: 18, max: 24 },
      temp: { min: 36.5, max: 37.5 },
    },
    reasoning:
      'Nyeri kolik atau viseral cenderung memicu aktivasi simpatis lebih kuat dengan nadi dan napas lebih tinggi.',
  },
  {
    id: 'pain_acute',
    keywords: ['nyeri', 'sakit', 'pain'],
    vitals: {
      pulse: { min: 80, max: 100 }, // Mild tachycardia
      rr: { min: 16, max: 22 }, // Mild tachypnea
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Nyeri akut → stress response → mild ↑HR, ↑RR',
  },
  {
    id: 'gi_distress',
    keywords: ['mual', 'muntah', 'diare', 'nausea', 'vomiting', 'diarrhea'],
    vitals: {
      pulse: { min: 80, max: 100 }, // May be elevated if dehydrated
      rr: { min: 14, max: 20 }, // Usually normal
      temp: { min: 36.5, max: 38.0 }, // May have low-grade fever
    },
    reasoning: 'GI distress → possible dehydration → mild ↑HR',
  },
  {
    id: 'anxiety_panic',
    keywords: ['cemas', 'panik', 'anxiety', 'panic', 'deg-degan'],
    vitals: {
      pulse: { min: 90, max: 120 }, // Tachycardia
      rr: { min: 20, max: 28 }, // Hyperventilation
      temp: { min: 36.5, max: 37.2 }, // Normal
    },
    reasoning: 'Anxiety → aktivasi simpatis → ↑HR, hyperventilasi',
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate random value within normal range
 * Uses uniform distribution
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Random value within range
 */
export function getRandomNormal(min: number, max: number, decimals: number = 0): number {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(decimals))
}

function roundDeterministic(min: number, max: number, decimals = 0): number {
  const value = (min + max) / 2
  return Number(value.toFixed(decimals))
}

function clampRange(
  range: { min: number; max: number },
  floor: number,
  ceil: number
): { min: number; max: number } {
  const nextMin = Math.max(floor, Math.min(range.min, ceil))
  const nextMax = Math.max(nextMin, Math.min(range.max, ceil))
  return { min: nextMin, max: nextMax }
}

function applyModifier(
  range: { min: number; max: number },
  deltaMin: number,
  deltaMax: number
): { min: number; max: number } {
  return { min: range.min + deltaMin, max: range.max + deltaMax }
}

function getBaselineRanges(ageYears?: number): VitalRanges {
  const age = ageYears ?? 30
  return AGE_BASELINE_RANGES.find(entry => age <= entry.maxAge)?.ranges ?? NORMAL_RANGES
}

export function hasRespiratoryComplaint(complaint: string): boolean {
  const normalized = complaint.toLowerCase()
  return /\bsesak\b|\bdispnea\b|\bdyspnea\b|\bbreathless\b|\basma\b|\basthma\b/.test(normalized)
}

export function hasConsciousnessRiskComplaint(complaint: string): boolean {
  const normalized = complaint.toLowerCase()
  return /penurunan kesadaran|tidak sadar|kejang|pingsan|sinkop|syncope|apatis|somnolen|delirium/.test(
    normalized
  )
}

function buildContextModifiers(
  context: VitalInferenceContext,
  complaint: string
): {
  pulse: { min: number; max: number }
  rr: { min: number; max: number }
  temp: { min: number; max: number }
  reasons: string[]
  confidence: VitalConfidence
} {
  let pulseDelta = { min: 0, max: 0 }
  let rrDelta = { min: 0, max: 0 }
  let tempDelta = { min: 0, max: 0 }
  const reasons: string[] = []
  let confidence: VitalConfidence = 'medium'

  if (context.sex === 'P' && (context.ageYears ?? 30) >= 12) {
    pulseDelta = { min: pulseDelta.min + 2, max: pulseDelta.max + 4 }
    reasons.push(
      'Jenis kelamin perempuan dewasa cenderung memiliki denyut nadi istirahat sedikit lebih tinggi.'
    )
  }

  if (context.isPregnant) {
    pulseDelta = { min: pulseDelta.min + 6, max: pulseDelta.max + 12 }
    rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 2 }
    reasons.push('Kehamilan fisiologis dapat meningkatkan nadi dan sedikit menaikkan laju napas.')
  }

  switch (context.recentActivity) {
    case 'walking':
      pulseDelta = { min: pulseDelta.min + 6, max: pulseDelta.max + 12 }
      rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 3 }
      reasons.push('Aktivitas ringan sebelum pemeriksaan dapat menaikkan nadi dan napas sementara.')
      break
    case 'post_exertion':
      pulseDelta = { min: pulseDelta.min + 12, max: pulseDelta.max + 24 }
      rrDelta = { min: rrDelta.min + 3, max: rrDelta.max + 6 }
      reasons.push(
        'Setelah aktivitas sedang/berat, nadi dan napas cenderung lebih tinggi dari kondisi istirahat.'
      )
      break
    default:
      break
  }

  switch (context.stressState) {
    case 'anxious':
      pulseDelta = { min: pulseDelta.min + 4, max: pulseDelta.max + 10 }
      rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 3 }
      reasons.push(
        'Cemas atau panik dapat memicu aktivasi simpatis dan meningkatkan nadi serta napas.'
      )
      break
    case 'pain':
      pulseDelta = { min: pulseDelta.min + 6, max: pulseDelta.max + 12 }
      rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 3 }
      reasons.push('Nyeri akut dapat meningkatkan nadi dan napas melalui respons stres fisiologis.')
      break
    case 'severe_pain':
      pulseDelta = { min: pulseDelta.min + 10, max: pulseDelta.max + 18 }
      rrDelta = { min: rrDelta.min + 2, max: rrDelta.max + 5 }
      reasons.push('Nyeri berat dapat menyebabkan takikardia dan takipnea yang lebih nyata.')
      break
    default:
      break
  }

  if (typeof context.bodyWeightKg === 'number') {
    if (context.bodyWeightKg >= 100) {
      pulseDelta = { min: pulseDelta.min + 2, max: pulseDelta.max + 5 }
      rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 2 }
      reasons.push('Berat badan tinggi dapat meningkatkan kerja kardiorespirasi saat istirahat.')
    } else if (
      context.bodyWeightKg > 0 &&
      context.bodyWeightKg <= 45 &&
      (context.ageYears ?? 30) >= 15
    ) {
      pulseDelta = { min: pulseDelta.min + 1, max: pulseDelta.max + 3 }
      reasons.push(
        'Berat badan rendah pada dewasa dapat sedikit memengaruhi denyut nadi istirahat.'
      )
    }
  }

  if (typeof context.ambientTemperatureC === 'number') {
    if (context.ambientTemperatureC >= 32) {
      pulseDelta = { min: pulseDelta.min + 2, max: pulseDelta.max + 4 }
      tempDelta = { min: tempDelta.min + 0.1, max: tempDelta.max + 0.3 }
      reasons.push('Suhu lingkungan panas dapat sedikit menaikkan suhu tubuh dan denyut nadi.')
    } else if (context.ambientTemperatureC <= 18) {
      tempDelta = { min: tempDelta.min - 0.2, max: tempDelta.max - 0.1 }
      reasons.push('Suhu lingkungan dingin dapat menurunkan suhu tubuh perifer.')
    }
  }

  for (const medication of context.medications ?? []) {
    switch (medication) {
      case 'beta_blocker':
        pulseDelta = { min: pulseDelta.min - 10, max: pulseDelta.max - 6 }
        reasons.push('Beta blocker dapat menurunkan denyut nadi istirahat.')
        break
      case 'stimulant':
        pulseDelta = { min: pulseDelta.min + 6, max: pulseDelta.max + 10 }
        rrDelta = { min: rrDelta.min + 1, max: rrDelta.max + 2 }
        reasons.push('Obat atau zat stimulan dapat meningkatkan nadi dan laju napas.')
        break
      case 'sedative':
        pulseDelta = { min: pulseDelta.min - 4, max: pulseDelta.max - 2 }
        rrDelta = { min: rrDelta.min - 2, max: rrDelta.max - 1 }
        reasons.push('Sedatif dapat menurunkan respons kardiorespirasi.')
        break
      case 'antipyretic':
        tempDelta = { min: tempDelta.min - 0.4, max: tempDelta.max - 0.2 }
        reasons.push('Antipiretik dapat menurunkan estimasi suhu tubuh.')
        break
    }
  }

  if (!context.bodyWeightKg || !context.recentActivity || !context.stressState) {
    confidence = 'low'
  }

  if (
    complaint.includes('sesak berat') ||
    complaint.includes('penurunan kesadaran') ||
    complaint.includes('nyeri dada akut')
  ) {
    confidence = 'low'
  }

  return {
    pulse: pulseDelta,
    rr: rrDelta,
    temp: tempDelta,
    reasons,
    confidence,
  }
}

export function suggestContextualVitals(
  complaint: string,
  context: VitalInferenceContext = {}
): ContextualVitalsAdvice {
  const measured = context.measured ?? {}
  const normalizedComplaint = complaint.toLowerCase()
  const isAdultOutpatient = (context.ageYears ?? 30) >= 18
  const respiratoryComplaint = hasRespiratoryComplaint(normalizedComplaint)
  const consciousnessRiskComplaint = hasConsciousnessRiskComplaint(normalizedComplaint)
  const manualMeasurementRequired: ContextualVitalsAdvice['manualMeasurementRequired'] = [
    'sbp',
    'dbp',
    'map',
  ]

  if (respiratoryComplaint) {
    manualMeasurementRequired.push('spo2')
  }

  if (consciousnessRiskComplaint) {
    manualMeasurementRequired.push('gcs')
  }

  const result: ContextualVitalsAdvice = {
    values: { ...measured },
    metadata: {},
    manualMeasurementRequired,
    rationale: [],
    defaults: {},
  }

  if (measured.pulse !== undefined)
    result.metadata.pulse = { source: 'measured', confidence: 'high' }
  if (measured.rr !== undefined) result.metadata.rr = { source: 'measured', confidence: 'high' }
  if (measured.temp !== undefined) result.metadata.temp = { source: 'measured', confidence: 'high' }

  const baseline = getBaselineRanges(context.ageYears)
  const patterns = findMatchingPatterns(complaint)
  const primaryPattern = patterns[0]
  const modifiers = buildContextModifiers(context, normalizedComplaint)

  let pulseRange = primaryPattern?.vitals.pulse ?? baseline.pulse
  let rrRange = primaryPattern?.vitals.rr ?? baseline.rr
  let tempRange = primaryPattern?.vitals.temp ?? baseline.temp

  pulseRange = clampRange(
    applyModifier(pulseRange, modifiers.pulse.min, modifiers.pulse.max),
    40,
    180
  )
  rrRange = clampRange(applyModifier(rrRange, modifiers.rr.min, modifiers.rr.max), 8, 40)
  tempRange = clampRange(
    applyModifier(tempRange, modifiers.temp.min, modifiers.temp.max),
    35.0,
    40.5
  )

  if (primaryPattern) {
    result.rationale.push(primaryPattern.reasoning)
  } else {
    result.rationale.push(
      'Tidak ada pola keluhan dominan; memakai baseline fisiologis sesuai usia.'
    )
  }
  result.rationale.push(...modifiers.reasons)

  if (isAdultOutpatient && !consciousnessRiskComplaint) {
    result.defaults.gcs = 15
    result.rationale.push(
      'Dalam poli umum dewasa tanpa keluhan neurologis, GCS dapat memakai default awal 15 sambil menunggu verifikasi petugas.'
    )
  }

  if (isAdultOutpatient && !respiratoryComplaint) {
    result.defaults.spo2 = 98
    result.rationale.push(
      'Dalam poli umum dewasa tanpa keluhan respirasi, SpO2 dapat memakai default awal 98% sambil menunggu verifikasi alat.'
    )
  }

  result.rationale.push(
    'Tekanan darah dan MAP tetap harus diukur manual agar aman secara klinis dan medikolegal.'
  )
  if (respiratoryComplaint) {
    result.rationale.push(
      'Keluhan respirasi membuat SpO2 wajib diverifikasi manual dengan pulse oximeter.'
    )
  }
  if (consciousnessRiskComplaint) {
    result.rationale.push(
      'Keluhan neurologis atau penurunan kesadaran membuat GCS wajib dinilai langsung pada pasien.'
    )
  }

  if (result.values.pulse === undefined) {
    result.values.pulse = roundDeterministic(pulseRange.min, pulseRange.max)
    result.metadata.pulse = {
      source: 'inferred',
      confidence: modifiers.confidence,
      reasoning: result.rationale.join(' '),
      range: pulseRange,
    }
  }

  if (result.values.rr === undefined) {
    result.values.rr = roundDeterministic(rrRange.min, rrRange.max)
    result.metadata.rr = {
      source: 'inferred',
      confidence: modifiers.confidence,
      reasoning: result.rationale.join(' '),
      range: rrRange,
    }
  }

  if (result.values.temp === undefined) {
    result.values.temp = roundDeterministic(tempRange.min, tempRange.max, 1)
    result.metadata.temp = {
      source: 'inferred',
      confidence: modifiers.confidence,
      reasoning: result.rationale.join(' '),
      range: tempRange,
    }
  }

  return result
}

/**
 * Parse complaint text to extract symptom keywords
 * Case-insensitive, supports Indonesian and English
 *
 * @param complaint - Patient complaint text
 * @returns Array of matched keywords
 */
export function parseComplaint(complaint: string): string[] {
  if (!complaint) return []

  const normalized = complaint.toLowerCase().trim()
  const matches: string[] = []

  // Check each pattern's keywords
  for (const pattern of SYMPTOM_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matches.push(keyword)
      }
    }
  }

  return [...new Set(matches)] // Remove duplicates
}

/**
 * Find matching symptom patterns based on complaint
 * Returns patterns sorted by keyword match count (descending)
 *
 * @param complaint - Patient complaint text
 * @returns Array of matching patterns, sorted by relevance
 */
export function findMatchingPatterns(complaint: string): SymptomPattern[] {
  if (!complaint) return []

  const normalized = complaint.toLowerCase().trim()
  const patternMatches: Array<{ pattern: SymptomPattern; matchCount: number }> = []

  for (const pattern of SYMPTOM_PATTERNS) {
    let matchCount = 0

    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }

    if (matchCount > 0) {
      patternMatches.push({ pattern, matchCount })
    }
  }

  // Sort by match count (descending)
  patternMatches.sort((a, b) => b.matchCount - a.matchCount)

  return patternMatches.map(pm => pm.pattern)
}

// ============================================================================
// CORE INFERENCE ALGORITHM
// ============================================================================

/**
 * Infer missing vital signs based on patient complaint
 *
 * Algorithm:
 * 1. Parse complaint for symptom keywords
 * 2. Find matching symptom patterns
 * 3. Use pattern ranges if match found, otherwise use normal ranges
 * 4. Generate random values within determined ranges
 * 5. Return vitals with metadata (source, reasoning)
 *
 * @param complaint - Patient complaint text
 * @param measured - Already measured vitals (will not be overridden)
 * @returns Complete vitals with metadata
 */
export function inferVitals(complaint: string, measured: VitalSigns = {}): VitalsWithMetadata {
  const {
    manualMeasurementRequired: _manualMeasurementRequired,
    rationale: _rationale,
    ...legacyShape
  } = suggestContextualVitals(complaint, { measured })
  return legacyShape
}

/**
 * Check if vital signs are within normal ranges
 *
 * @param vitals - Vital signs to check
 * @returns Object indicating which vitals are abnormal
 */
export function checkVitalRanges(vitals: VitalSigns): {
  pulse: 'low' | 'normal' | 'high' | null
  rr: 'low' | 'normal' | 'high' | null
  temp: 'low' | 'normal' | 'high' | null
} {
  return {
    pulse:
      vitals.pulse === undefined
        ? null
        : vitals.pulse < NORMAL_RANGES.pulse.min
          ? 'low'
          : vitals.pulse > NORMAL_RANGES.pulse.max
            ? 'high'
            : 'normal',

    rr:
      vitals.rr === undefined
        ? null
        : vitals.rr < NORMAL_RANGES.rr.min
          ? 'low'
          : vitals.rr > NORMAL_RANGES.rr.max
            ? 'high'
            : 'normal',

    temp:
      vitals.temp === undefined
        ? null
        : vitals.temp < NORMAL_RANGES.temp.min
          ? 'low'
          : vitals.temp > NORMAL_RANGES.temp.max
            ? 'high'
            : 'normal',
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  NORMAL_RANGES,
  SYMPTOM_PATTERNS,
  getRandomNormal,
  parseComplaint,
  findMatchingPatterns,
  suggestContextualVitals,
  inferVitals,
  checkVitalRanges,
}
