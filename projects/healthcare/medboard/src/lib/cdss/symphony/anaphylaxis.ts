// Copyright 2026 Sentra. All rights reserved. Proprietary and confidential.
// Designed and constructed by Drferdi.
/**
 * Anaphylaxis — deterministic safety gate per WAO 2020 criteria.
 *
 * Three triggers, any of which emits a CRITICAL alert
 * `SYMPHONY_ANAPHYLAXIS` with `source: 'safety_gate'` and
 * `gate: 'GATE_10_ANAPHYLAXIS'`:
 *
 *   1. Acute skin/mucosa involvement AND (respiratory OR cardiovascular OR
 *      severe GI compromise).
 *   2. Known/likely allergen exposure AND involvement of >=2 organ systems.
 *   3. Known/likely allergen exposure AND isolated hypotension.
 *
 * Involvement detection uses both complaint text (regex) and latest vitals.
 * Hypotension threshold is SBP < 90 mmHg for adults. Pediatric thresholds are
 * intentionally left conservative at this stage; they can be tightened in
 * Phase B when the 70-CP parity adapter defines pediatric shock cuts.
 */

import type { SymphonyAlert, SymphonyVitalsInput } from '@/types/abyss/symphony'

export type SymphonyAnaphylaxisOrganSystem =
  | 'skin_mucosa'
  | 'respiratory'
  | 'cardiovascular'
  | 'gastrointestinal'

export interface SymphonyAnaphylaxisInput {
  latestVitals?: SymphonyVitalsInput
  chiefComplaint?: string
  additionalComplaint?: string
  medicalHistory?: string[]
  allergies?: string[]
  ageYears?: number
}

export interface SymphonyAnaphylaxisResult {
  suspect: boolean
  trigger: 1 | 2 | 3 | null
  involvedSystems: SymphonyAnaphylaxisOrganSystem[]
  exposureContext: boolean
  hypotension: boolean
}

const HYPOTENSION_SBP_CUTOFF = 90
const RESPIRATORY_RR_CUTOFF = 24
const RESPIRATORY_SPO2_CUTOFF = 94
const CARDIOVASCULAR_HR_CUTOFF = 110

// ── Regex patterns ────────────────────────────────────────────────────────────

const SKIN_MUCOSA_PATTERNS: RegExp[] = [
  /\bbentol\b/i,
  /\bruam\b/i,
  /\bgatal\b/i,
  /\bpruritus\b/i,
  /urticaria|urtikaria/i,
  /\brash\b/i,
  /\bflushing\b/i,
  /bengkak\s+(bibir|lidah|wajah|muka|uvula)/i,
  /angio?edema/i,
]

const RESPIRATORY_PATTERNS: RegExp[] = [
  /sesak\s+napas/i,
  /\bsesak\b/i,
  /\bmengi\b/i,
  /\bwheeze\b/i,
  /wheezing/i,
  /\bstridor\b/i,
  /dyspnea|dyspnoea/i,
  /batuk\s+menggonggong/i,
]

const CARDIOVASCULAR_PATTERNS: RegExp[] = [
  /\bpingsan\b/i,
  /\bsyncope\b/i,
  /near[-\s]?syncope/i,
  /\blemas\b/i,
  /\blunglai\b/i,
  /hipotensi/i,
  /tekanan\s+darah\s+turun/i,
  /\bkolaps\b/i,
  /collapse/i,
]

const GI_PATTERNS: RegExp[] = [
  /muntah\s+(berulang|terus[-\s]menerus)/i,
  /\bmuntah\b/i,
  /\bdiare\b/i,
  /nyeri\s+perut\s+(kram|hebat)/i,
  /\bkram\s+perut\b/i,
  /repetitive\s+vomit/i,
  /abdominal\s+cramp/i,
]

const EXPOSURE_PATTERNS: RegExp[] = [
  /setelah\s+(makan|minum|suntik|inhalasi|konsumsi|disuntik|diberi)/i,
  /\bpaska\s+(obat|konsumsi|suntik|injeksi)/i,
  /\bpasca\s+(obat|konsumsi|suntik|injeksi)/i,
  /\bpost[-\s]?(injection|dose|exposure|ingestion)/i,
  /alergi\s+obat/i,
  /reaksi\s+alergi\s+terhadap/i,
]

function anyMatch(text: string | undefined, patterns: RegExp[]): boolean {
  if (!text) return false
  return patterns.some((p) => p.test(text))
}

function combineText(input: SymphonyAnaphylaxisInput): string {
  return [input.chiefComplaint ?? '', input.additionalComplaint ?? ''].join(' ')
}

function hasAllergenExposureByName(text: string, allergies: string[] | undefined): boolean {
  if (!allergies || allergies.length === 0) return false
  const lowered = text.toLowerCase()
  return allergies.some((a) => a.trim().length > 0 && lowered.includes(a.trim().toLowerCase()))
}

function skinMucosaInvolved(text: string): boolean {
  return anyMatch(text, SKIN_MUCOSA_PATTERNS)
}

function respiratoryInvolved(text: string, vitals?: SymphonyVitalsInput): boolean {
  if (anyMatch(text, RESPIRATORY_PATTERNS)) return true
  if (vitals?.respiratoryRate !== undefined && vitals.respiratoryRate > RESPIRATORY_RR_CUTOFF) {
    return true
  }
  if (vitals?.spo2 !== undefined && vitals.spo2 < RESPIRATORY_SPO2_CUTOFF) return true
  return false
}

function cardiovascularInvolved(text: string, vitals?: SymphonyVitalsInput): boolean {
  if (anyMatch(text, CARDIOVASCULAR_PATTERNS)) return true
  if (vitals?.systolicBp !== undefined && vitals.systolicBp < HYPOTENSION_SBP_CUTOFF) return true
  if (vitals?.heartRate !== undefined && vitals.heartRate > CARDIOVASCULAR_HR_CUTOFF) return true
  return false
}

function gastrointestinalInvolved(text: string): boolean {
  return anyMatch(text, GI_PATTERNS)
}

function hypotensionPresent(vitals?: SymphonyVitalsInput): boolean {
  if (vitals?.systolicBp === undefined) return false
  return vitals.systolicBp < HYPOTENSION_SBP_CUTOFF
}

// ── Detector ──────────────────────────────────────────────────────────────────

export function detectSymphonyAnaphylaxis(
  input: SymphonyAnaphylaxisInput
): SymphonyAnaphylaxisResult {
  const text = combineText(input)
  const vitals = input.latestVitals

  const systems: SymphonyAnaphylaxisOrganSystem[] = []
  if (skinMucosaInvolved(text)) systems.push('skin_mucosa')
  if (respiratoryInvolved(text, vitals)) systems.push('respiratory')
  if (cardiovascularInvolved(text, vitals)) systems.push('cardiovascular')
  if (gastrointestinalInvolved(text)) systems.push('gastrointestinal')

  const exposureContext =
    anyMatch(text, EXPOSURE_PATTERNS) || hasAllergenExposureByName(text, input.allergies)
  const hypotension = hypotensionPresent(vitals)

  // Trigger 1: skin/mucosa + (respiratory OR cardiovascular OR GI)
  if (
    systems.includes('skin_mucosa') &&
    (systems.includes('respiratory') ||
      systems.includes('cardiovascular') ||
      systems.includes('gastrointestinal'))
  ) {
    return { suspect: true, trigger: 1, involvedSystems: systems, exposureContext, hypotension }
  }

  // Trigger 2: known exposure + >=2 organ systems
  if (exposureContext && systems.length >= 2) {
    return { suspect: true, trigger: 2, involvedSystems: systems, exposureContext, hypotension }
  }

  // Trigger 3: known exposure + isolated hypotension
  if (exposureContext && hypotension) {
    return { suspect: true, trigger: 3, involvedSystems: systems, exposureContext, hypotension }
  }

  return {
    suspect: false,
    trigger: null,
    involvedSystems: systems,
    exposureContext,
    hypotension,
  }
}

// ── Alert adapter ─────────────────────────────────────────────────────────────

export function anaphylaxisToSymphonyAlerts(
  result: SymphonyAnaphylaxisResult,
  triggeredAt: string
): SymphonyAlert[] {
  if (!result.suspect || result.trigger === null) return []
  const triggerText =
    result.trigger === 1
      ? 'Kriteria 1 (kulit/mukosa + kompromi organ lain)'
      : result.trigger === 2
        ? 'Kriteria 2 (pajanan + ≥2 sistem organ)'
        : 'Kriteria 3 (pajanan + hipotensi)'
  return [
    {
      id: 'SYMPHONY_ANAPHYLAXIS',
      severity: 'critical',
      title: 'Suspek anafilaksis',
      reasoning: [
        `Trigger WAO terpenuhi: ${triggerText}.`,
        `Sistem organ terlibat: ${result.involvedSystems.join(', ') || 'tidak terdeteksi eksplisit'}.`,
        `Konteks pajanan alergen: ${result.exposureContext ? 'terdeteksi' : 'tidak terdeteksi'}.`,
        `Hipotensi: ${result.hypotension ? 'ada (SBP < 90)' : 'tidak'}.`,
        'Epinefrin IM 0.3–0.5 mg (dewasa), oksigen, posisi terlentang-kaki-elevasi, rujuk segera.',
      ],
      source: 'safety_gate',
      gate: 'GATE_10_ANAPHYLAXIS',
      acknowledged: false,
      triggeredAt,
    },
  ]
}
