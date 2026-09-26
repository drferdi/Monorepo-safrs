/**
 * Symphony Safety Gates — Dashboard integration adapter.
 *
 * Thin adapter that converts `CDSSEngineInput` into the inputs expected by
 * the canonical SYMPHONY safety-gate detectors (`detectSymphonyPeSuspect`
 * and `detectSymphonyAnaphylaxis`) and maps their `SymphonyAlert` output
 * back into this app's `CDSSEngineResult['red_flags']` shape.
 *
 * This is strictly additive: existing `checkVitalRedFlags`,
 * `calculateNEWS2`, and early-warning patterns continue to run unchanged.
 * The safety-gate flags are merged into `mergedRedFlags` alongside the
 * other sources.
 *
 * Net-new gates added in Phase A.1 and A.2 of the 5-mandate roadmap:
 *   - `SYMPHONY_PE_SUSPECT` — Wells-inspired pulmonary-embolism detection.
 *   - `SYMPHONY_ANAPHYLAXIS` — WAO 2020 anaphylaxis criteria.
 */

import {
  detectSymphonyAnaphylaxis,
  detectSymphonyPeSuspect,
  type SymphonyAnaphylaxisInput,
  type SymphonyPeSuspectInput,
} from './symphony'
import type { CDSSEngineInput, CDSSEngineResult, VitalSigns } from './types'

import type {
  SymphonyAlert,
  SymphonyPregnancyStatus,
  SymphonyVitalsInput,
} from '@/types/abyss/symphony'

// ── Input converters ──────────────────────────────────────────────────────────

function toSymphonyVitals(
  vitals: VitalSigns | undefined,
  observedAt: string
): SymphonyVitalsInput | undefined {
  if (!vitals) return undefined
  return {
    observedAt,
    systolicBp: vitals.systolic,
    diastolicBp: vitals.diastolic,
    heartRate: vitals.heart_rate,
    respiratoryRate: vitals.respiratory_rate,
    temperatureC: vitals.temperature,
    spo2: vitals.spo2,
    glucoseMgDl: vitals.glucose,
    oxygenSupplement: vitals.supplemental_o2,
  }
}

function toPregnancyStatus(isPregnant: boolean | undefined): SymphonyPregnancyStatus | undefined {
  if (isPregnant === undefined) return undefined
  return isPregnant ? 'pregnant' : 'not_pregnant'
}

function buildPeInput(input: CDSSEngineInput): SymphonyPeSuspectInput {
  const observedAt = new Date().toISOString()
  return {
    latestVitals: toSymphonyVitals(input.vital_signs, observedAt),
    chiefComplaint: input.keluhan_utama,
    additionalComplaint: input.keluhan_tambahan,
    medicalHistory: input.chronic_diseases,
    pregnancyStatus: toPregnancyStatus(input.is_pregnant),
  }
}

function buildAnaphylaxisInput(input: CDSSEngineInput): SymphonyAnaphylaxisInput {
  const observedAt = new Date().toISOString()
  return {
    latestVitals: toSymphonyVitals(input.vital_signs, observedAt),
    chiefComplaint: input.keluhan_utama,
    additionalComplaint: input.keluhan_tambahan,
    medicalHistory: input.chronic_diseases,
    allergies: input.allergies,
    ageYears: input.usia,
  }
}

// ── Alert → red_flag adapter ──────────────────────────────────────────────────

function alertToRedFlag(
  alert: SymphonyAlert,
  action: string,
  icdCodes?: string[]
): CDSSEngineResult['red_flags'][number] {
  return {
    severity: 'emergency',
    condition: alert.title,
    action,
    criteria_met: alert.reasoning,
    icd_codes: icdCodes,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run SYMPHONY safety gates (PE + Anaphylaxis) against the diagnose input
 * and return any triggered red flags in the Dashboard's existing shape.
 *
 * Deterministic. No network or LLM. Safe to call in every request path.
 */
export function detectSymphonySafetyGateRedFlags(
  input: CDSSEngineInput
): CDSSEngineResult['red_flags'] {
  const flags: CDSSEngineResult['red_flags'] = []
  const observedAt = new Date().toISOString()

  const pe = detectSymphonyPeSuspect(buildPeInput(input))
  if (pe.suspect) {
    const alerts = [
      {
        id: 'SYMPHONY_PE_SUSPECT' as const,
        severity: 'critical' as const,
        title: 'Suspek Emboli Paru (PE)',
        reasoning: [
          `Kriteria PE terpenuhi: ${pe.criteriaMet.length} dari ambang minimum.`,
          `Kriteria terdeteksi: ${pe.criteriaMet.join(', ')}.`,
        ],
        source: 'safety_gate' as const,
        gate: 'GATE_9_PE' as const,
        acknowledged: false,
        triggeredAt: observedAt,
      },
    ]
    for (const alert of alerts) {
      flags.push(
        alertToRedFlag(
          alert,
          'Oksigen suplemen, pertimbangkan D-dimer dan CT-PA bila tersedia, rujuk emergensi.',
          ['I26.9']
        )
      )
    }
  }

  const anaph = detectSymphonyAnaphylaxis(buildAnaphylaxisInput(input))
  if (anaph.suspect && anaph.trigger !== null) {
    const triggerText =
      anaph.trigger === 1
        ? 'Trigger 1 (kulit/mukosa + kompromi organ)'
        : anaph.trigger === 2
          ? 'Trigger 2 (pajanan + ≥2 sistem organ)'
          : 'Trigger 3 (pajanan + hipotensi)'
    const alert: SymphonyAlert = {
      id: 'SYMPHONY_ANAPHYLAXIS',
      severity: 'critical',
      title: 'Suspek Anafilaksis',
      reasoning: [
        `WAO 2020: ${triggerText}.`,
        `Sistem organ terlibat: ${anaph.involvedSystems.join(', ') || 'tidak terdeteksi eksplisit'}.`,
        `Konteks pajanan alergen: ${anaph.exposureContext ? 'terdeteksi' : 'tidak terdeteksi'}.`,
        `Hipotensi: ${anaph.hypotension ? 'ada (SBP < 90)' : 'tidak'}.`,
      ],
      source: 'safety_gate',
      gate: 'GATE_10_ANAPHYLAXIS',
      acknowledged: false,
      triggeredAt: observedAt,
    }
    flags.push(
      alertToRedFlag(
        alert,
        'Epinefrin IM 0.3–0.5 mg (dewasa), oksigen, posisi terlentang kaki elevasi, rujuk segera.',
        ['T78.2']
      )
    )
  }

  return flags
}
