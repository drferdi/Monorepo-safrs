/**
 * Unified Vital Signs — Single Source of Truth
 *
 * Replaces 4 separate VitalSigns interfaces across the codebase with one
 * Zod-validated schema. All vital sign input, validation, and type inference
 * flows through here.
 *
 * References:
 * - NEWS2 (Royal College of Physicians UK, 2017) — 6 core parameters
 * - WHO IMAI Quick Check — primary care triage essentials
 * - qSOFA (Sepsis-3) — bedside sepsis screening
 * - MEOWS — obstetric early warning adaptations
 * - PERKENI 2024 — glucose crisis thresholds
 *
 * Clinical Momentum Engine — Phase 1A (Safety First)
 */

import { z } from 'zod'
import type { VitalSigns } from '../cdss/types'

// ── AVPU Scale ──────────────────────────────────────────────────────────────

export const AVPU_VALUES = ['A', 'C', 'V', 'P', 'U'] as const
export type AVPULevel = (typeof AVPU_VALUES)[number]

export const avpuLabels: Record<AVPULevel, string> = {
  A: 'Alert — Sadar penuh',
  C: 'Confusion — Disorientasi baru (new confusion)',
  V: 'Voice — Merespons suara',
  P: 'Pain — Merespons nyeri',
  U: 'Unresponsive — Tidak ada respons',
}

// ── GCS Components ──────────────────────────────────────────────────────────

export const gcsSchema = z
  .object({
    e: z.number().int().min(1).max(4).describe('Eye opening: 1-4'),
    v: z.number().int().min(1).max(5).describe('Verbal response: 1-5'),
    m: z.number().int().min(1).max(6).describe('Motor response: 1-6'),
  })
  .describe('Glasgow Coma Scale components')

export type GCSComponents = z.infer<typeof gcsSchema>

/**
 * Calculate total GCS from components.
 * Range: 3 (worst) to 15 (best/normal).
 */
export function calculateGCSTotal(gcs: GCSComponents): number {
  return gcs.e + gcs.v + gcs.m
}

// ── Glucose Type ────────────────────────────────────────────────────────────

export const GLUCOSE_TYPES = ['GDS', 'GDP', '2JPP', 'HbA1c'] as const
export type GlucoseType = (typeof GLUCOSE_TYPES)[number]

export const glucoseSchema = z
  .object({
    value: z.number().min(0).max(999),
    type: z.enum(GLUCOSE_TYPES),
  })
  .refine(
    data => {
      // HbA1c is reported as percentage (normal ~4-6%, diabetic target <7%, crisis ~15-20%)
      if (data.type === 'HbA1c') return data.value <= 20
      // GDS/GDP/2JPP — glucose in mg/dL, HHS crisis max ~1500 but implausible > 999
      return data.value <= 999
    },
    { message: 'Nilai tidak sesuai tipe pemeriksaan (HbA1c max 20%, GDS/GDP/2JPP max 999)' }
  )

export type GlucoseMeasurement = z.infer<typeof glucoseSchema>

// ── Plausibility Bounds ─────────────────────────────────────────────────────
// Values outside these ranges are physiologically implausible and indicate
// input error. These are NOT clinical thresholds — they are sanity checks.

export const PLAUSIBILITY_BOUNDS = {
  sbp: { min: 30, max: 350 },
  dbp: { min: 20, max: 250 },
  hr: { min: 20, max: 250 },
  rr: { min: 4, max: 60 },
  temp: { min: 25, max: 45 },
  spo2: { min: 50, max: 100 },
  painScore: { min: 0, max: 10 },
  gestationalWeek: { min: 1, max: 45 },
} as const

// ── Core NEWS2 Parameters (Required) ────────────────────────────────────────

const coreVitalsSchema = z.object({
  sbp: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.sbp.min)
    .max(PLAUSIBILITY_BOUNDS.sbp.max)
    .describe('Systolic blood pressure (mmHg)'),
  dbp: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.dbp.min)
    .max(PLAUSIBILITY_BOUNDS.dbp.max)
    .describe('Diastolic blood pressure (mmHg)'),
  hr: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.hr.min)
    .max(PLAUSIBILITY_BOUNDS.hr.max)
    .describe('Heart rate / pulse (bpm)'),
  rr: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.rr.min)
    .max(PLAUSIBILITY_BOUNDS.rr.max)
    .describe('Respiratory rate (breaths/min)'),
  temp: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.temp.min)
    .max(PLAUSIBILITY_BOUNDS.temp.max)
    .describe('Body temperature (°C)'),
  spo2: z
    .number()
    .min(PLAUSIBILITY_BOUNDS.spo2.min)
    .max(PLAUSIBILITY_BOUNDS.spo2.max)
    .describe('Oxygen saturation (%)'),
  avpu: z.enum(AVPU_VALUES).describe('Consciousness level (AVPU+C scale)'),
  supplementalO2: z.boolean().default(false).describe('Is patient receiving supplemental oxygen?'),
})

// ── Detail Parameters (Conditional) ─────────────────────────────────────────

const detailVitalsSchema = z.object({
  gcs: gcsSchema.optional().describe('GCS detail — required when AVPU ≠ A'),
  painScore: z
    .number()
    .int()
    .min(PLAUSIBILITY_BOUNDS.painScore.min)
    .max(PLAUSIBILITY_BOUNDS.painScore.max)
    .optional()
    .describe('Numeric Rating Scale 0-10'),
  capillaryRefillSec: z
    .number()
    .min(0)
    .max(15)
    .optional()
    .describe('Capillary refill time in seconds'),
})

// ── Metabolic Parameters ────────────────────────────────────────────────────

const metabolicVitalsSchema = z.object({
  glucose: glucoseSchema.optional().describe('Blood glucose measurement'),
  weightKg: z.number().min(0.5).max(300).optional(),
  heightCm: z.number().min(30).max(250).optional(),
})

// ── Context Parameters ──────────────────────────────────────────────────────

const contextSchema = z.object({
  isPregnant: z.boolean().default(false),
  gestationalWeek: z
    .number()
    .int()
    .min(PLAUSIBILITY_BOUNDS.gestationalWeek.min)
    .max(PLAUSIBILITY_BOUNDS.gestationalWeek.max)
    .optional()
    .describe('Gestational age in weeks — required if pregnant'),
  hasCOPD: z
    .boolean()
    .default(false)
    .describe('Use SpO2 Scale 2 (target 88-92%) for confirmed COPD/hypercapnic patients'),
  measurementTime: z.string().datetime().optional(),
})

// ── Unified Schema ──────────────────────────────────────────────────────────

export const unifiedVitalSignsSchema = coreVitalsSchema
  .merge(detailVitalsSchema)
  .merge(metabolicVitalsSchema)
  .merge(contextSchema)
  .refine(
    data => {
      // DBP should not exceed SBP
      return data.dbp <= data.sbp
    },
    {
      message: 'Diastolik tidak boleh melebihi sistolik',
      path: ['dbp'],
    }
  )
// Note: gestationalWeek is strongly recommended but not enforced for
// backward compatibility with existing Assist app versions that do not
// yet send gestational data. Enforcement will be added in Phase 1B.

export type UnifiedVitalSigns = z.infer<typeof unifiedVitalSignsSchema>

// ── Triage Payload Schema (for Socket.IO validation) ────────────────────────
// Slightly more lenient — allows partial vitals for backward compatibility
// with older Assist app versions that may not send all fields.

export const triageVitalSignsSchema = z.object({
  // Core — required
  sbp: z.number().min(PLAUSIBILITY_BOUNDS.sbp.min).max(PLAUSIBILITY_BOUNDS.sbp.max),
  dbp: z.number().min(PLAUSIBILITY_BOUNDS.dbp.min).max(PLAUSIBILITY_BOUNDS.dbp.max),
  hr: z.number().min(PLAUSIBILITY_BOUNDS.hr.min).max(PLAUSIBILITY_BOUNDS.hr.max),
  rr: z.number().min(PLAUSIBILITY_BOUNDS.rr.min).max(PLAUSIBILITY_BOUNDS.rr.max),
  temp: z.number().min(PLAUSIBILITY_BOUNDS.temp.min).max(PLAUSIBILITY_BOUNDS.temp.max),
  spo2: z.number().min(PLAUSIBILITY_BOUNDS.spo2.min).max(PLAUSIBILITY_BOUNDS.spo2.max),

  // Consciousness — default to Alert for backward compat with old Assist
  avpu: z.enum(AVPU_VALUES).default('A'),
  supplementalO2: z.boolean().default(false),

  // Detail
  gcs: gcsSchema.optional(),
  painScore: z.number().int().min(0).max(10).optional(),

  // Metabolic
  glucose: glucoseSchema.optional(),
  weightKg: z.number().min(0.5).max(300).optional(),
  heightCm: z.number().min(30).max(250).optional(),

  // Context
  isPregnant: z.boolean().default(false),
  gestationalWeek: z.number().int().min(1).max(45).optional(),
  hasCOPD: z.boolean().default(false),
  measurementTime: z.string().datetime().optional(),
})

export type TriageVitalSigns = z.infer<typeof triageVitalSignsSchema>

// ── Converter: Unified → CDSS VitalSigns (backward compatible) ──────────────
// Uses VitalSigns from cdss/types to avoid interface duplication.
// TODO: When AVPULevel is moved to src/types/clinical-primitives.ts,
//       remove the import from cdss/types here to break the cross-module coupling.

/**
 * Convert UnifiedVitalSigns to CDSS engine VitalSigns format.
 * Maps camelCase field names to snake_case for backward compatibility.
 */
export function toCDSSVitalSigns(unified: UnifiedVitalSigns | TriageVitalSigns): VitalSigns {
  return {
    systolic: unified.sbp,
    diastolic: unified.dbp,
    heart_rate: unified.hr,
    spo2: unified.spo2,
    temperature: unified.temp,
    respiratory_rate: unified.rr,
    weight_kg: unified.weightKg,
    height_cm: unified.heightCm,
    avpu: unified.avpu,
    gcs: unified.gcs,
    supplemental_o2: unified.supplementalO2,
    pain_score: unified.painScore,
    has_copd: unified.hasCOPD,
  }
}

// ── Converter: Unified → Trajectory VisitRecord vitals ──────────────────────

export interface TrajectoryVitals {
  sbp: number
  dbp: number
  hr: number
  rr: number
  temp: number
  glucose: number
  spo2: number
  avpu?: AVPULevel
}

/**
 * Convert UnifiedVitalSigns to trajectory analyzer format.
 * Glucose defaults to 0 if not provided (trajectory analyzer handles 0 as missing).
 */
export function toTrajectoryVitals(
  unified: UnifiedVitalSigns | TriageVitalSigns
): TrajectoryVitals {
  return {
    sbp: unified.sbp,
    dbp: unified.dbp,
    hr: unified.hr,
    rr: unified.rr,
    temp: unified.temp,
    glucose: unified.glucose?.value ?? 0,
    spo2: unified.spo2,
    avpu: unified.avpu,
  }
}

// ── Converter: Legacy CDSS VitalSigns → Partial Unified ─────────────────────
// For backward compat when existing code passes old-format VitalSigns

export function fromLegacyCDSSVitals(legacy: {
  systolic?: number
  diastolic?: number
  heart_rate?: number
  spo2?: number
  temperature?: number
  respiratory_rate?: number
  weight_kg?: number
  height_cm?: number
}): Partial<UnifiedVitalSigns> {
  return {
    sbp: legacy.systolic,
    dbp: legacy.diastolic,
    hr: legacy.heart_rate,
    rr: legacy.respiratory_rate,
    temp: legacy.temperature,
    spo2: legacy.spo2,
    weightKg: legacy.weight_kg,
    heightCm: legacy.height_cm,
  }
}

// ── Utility: Calculate BMI ──────────────────────────────────────────────────

export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10
}

// ── Utility: Calculate MAP ──────────────────────────────────────────────────

export function calculateMAP(sbp: number, dbp: number): number {
  return Math.round(dbp + (sbp - dbp) / 3)
}

// ── Utility: Calculate Pulse Pressure ───────────────────────────────────────

export function calculatePulsePressure(sbp: number, dbp: number): number {
  return sbp - dbp
}
