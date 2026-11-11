/**
 * Gate 4: Occult Shock Detection (Relative Hypotension)
 *
 * Purpose: Early warning system for HTN patients with acute symptoms
 * Evidence Base: MSF Shock Guidelines
 *
 * @module lib/emergency-detector/occult-shock-detector
 */

import { calculateMAP } from './vitals/unified-vitals'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Historical BP reading
 */
export interface HistoricalBP {
  visit_date: string
  sbp: number
  dbp: number
  location?: 'clinic' | 'home' | 'igd'
}

/**
 * Current vitals for shock assessment
 */
export interface ShockAssessmentVitals {
  current_sbp: number
  current_dbp: number
  glucose?: number
}

/**
 * Acute symptoms suggesting shock
 */
export interface AcuteSymptoms {
  dizziness: boolean
  presyncope: boolean
  syncope: boolean
  weakness: boolean
}

/**
 * Occult shock input data
 */
export interface OccultShockInput {
  // Current vitals
  vitals: ShockAssessmentVitals

  // Historical data
  last_3_visits: HistoricalBP[]

  // Symptoms
  symptoms: AcuteSymptoms

  // Patient context
  known_htn: boolean
}

/**
 * Risk levels
 */
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'

/**
 * Occult shock result
 */
export interface OccultShockResult {
  risk_level: RiskLevel
  triggers: string[]
  recommendations: string[]
  baseline_bp?: { sbp: number; dbp: number }
  delta_sbp?: number
  map: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Shock thresholds (MSF Guidelines)
 */
export const SHOCK_THRESHOLDS = {
  ABSOLUTE_HYPOTENSION_SBP: 90, // SBP <90 mmHg
  MAP_HYPOPERFUSION: 65, // MAP <65 mmHg
  RELATIVE_HYPOTENSION_DELTA: 40, // ΔSBP ≥40 mmHg from baseline
} as const

// ============================================================================
// BASELINE CALCULATION
// ============================================================================

/**
 * Calculate baseline BP from historical readings
 * Uses median (more robust to outliers than mean)
 *
 * @param history - Array of historical BP readings (minimum 3)
 * @returns Baseline BP (median of readings)
 */
export function calculateBaseline(history: HistoricalBP[]): { sbp: number; dbp: number } | null {
  if (history.length < 3) {
    return null // Insufficient data
  }

  // Extract and sort values
  const sbpValues = history.map(v => v.sbp).sort((a, b) => a - b)
  const dbpValues = history.map(v => v.dbp).sort((a, b) => a - b)

  // Calculate median
  const medianIndex = Math.floor(sbpValues.length / 2)

  return {
    sbp: sbpValues[medianIndex],
    dbp: dbpValues[medianIndex],
  }
}

/**
 * Get recent baseline from patient BP history
 * Filters for clinic readings only
 *
 * @param history - Complete BP history
 * @returns Baseline BP or null if insufficient data
 */
export function getRecentBaseline(history: HistoricalBP[]): { sbp: number; dbp: number } | null {
  // Filter for clinic readings only
  const clinicReadings = history.filter(r => !r.location || r.location === 'clinic').slice(-3) // Last 3

  if (clinicReadings.length < 3) {
    return null // Insufficient data
  }

  return calculateBaseline(clinicReadings)
}

// ============================================================================
// MAP CALCULATION
// ============================================================================

/**
 * Calculate Mean Arterial Pressure (MAP)
 *
 * Formula: MAP = DBP + ⅓(SBP - DBP)
 *
 * Clinical significance:
 * - MAP ≥65 mmHg needed for adequate organ perfusion
 * - MAP <65 mmHg = hypoperfusion risk
 *
 * @param sbp - Systolic BP
 * @param dbp - Diastolic BP
 * @returns MAP (rounded to nearest integer)
 */
export { calculateMAP }

// ============================================================================
// OCCULT SHOCK DETECTION
// ============================================================================

/**
 * Detect occult shock (relative hypotension)
 *
 * Algorithm:
 * 1. Check hypoglycemia FIRST (can mimic shock)
 * 2. Calculate baseline BP (if HTN history available)
 * 3. Calculate MAP
 * 4. Check danger triggers:
 *    - Absolute hypotension (SBP <90 OR MAP <65)
 *    - Relative hypotension (ΔSBP ≥40 from baseline)
 * 5. Generate recommendations
 *
 * @param input - Occult shock input data
 * @returns Occult shock assessment result
 */
export function detectOccultShock(input: OccultShockInput): OccultShockResult {
  const triggers: string[] = []
  const recommendations: string[] = []

  // Step 1: Check hypoglycemia FIRST (can mimic shock)
  if (input.vitals.glucose && input.vitals.glucose < 70) {
    return {
      risk_level: 'CRITICAL',
      triggers: ['Hypoglycemia (<70 mg/dL)'],
      recommendations: [
        '⚡ TREAT HYPOGLYCEMIA FIRST (15-15 rule)',
        'Recheck BP after glucose correction',
        'Hypoglycemia can cause hypotension',
      ],
      map: calculateMAP(input.vitals.current_sbp, input.vitals.current_dbp),
    }
  }

  // Step 2: Calculate baseline (if HTN history available)
  let baseline_sbp: number | undefined
  let baseline_dbp: number | undefined
  let delta_sbp: number | undefined

  if (input.known_htn && input.last_3_visits.length >= 3) {
    const baseline = calculateBaseline(input.last_3_visits)
    if (baseline) {
      baseline_sbp = baseline.sbp
      baseline_dbp = baseline.dbp
      delta_sbp = baseline_sbp - input.vitals.current_sbp
    }
  }

  // Step 3: Calculate MAP
  const map = calculateMAP(input.vitals.current_sbp, input.vitals.current_dbp)

  // Step 4: Check danger triggers
  let risk_level: RiskLevel = 'LOW'

  // Absolute hypotension
  if (input.vitals.current_sbp < SHOCK_THRESHOLDS.ABSOLUTE_HYPOTENSION_SBP) {
    triggers.push(
      `Absolute hypotension (SBP ${input.vitals.current_sbp} <${SHOCK_THRESHOLDS.ABSOLUTE_HYPOTENSION_SBP})`
    )
    risk_level = 'CRITICAL'
  }

  if (map < SHOCK_THRESHOLDS.MAP_HYPOPERFUSION) {
    triggers.push(`MAP ${map} <${SHOCK_THRESHOLDS.MAP_HYPOPERFUSION} (organ hypoperfusion risk)`)
    risk_level = 'CRITICAL'
  }

  // Relative hypotension (only if baseline available)
  if (delta_sbp !== undefined && delta_sbp >= SHOCK_THRESHOLDS.RELATIVE_HYPOTENSION_DELTA) {
    triggers.push(`Relative hypotension (ΔSBP ${delta_sbp} from baseline ${baseline_sbp})`)
    risk_level = risk_level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
  }

  // Step 5: Generate recommendations
  if (triggers.length > 0 && hasAcuteSymptoms(input.symptoms)) {
    recommendations.push(
      '🚨 OCCULT SHOCK SUSPECTED',
      '',
      '**Immediate Actions:**',
      '- Serial BP monitoring (every 15 min)',
      '- Assess perfusion: mental status, CRT, skin temp, urine output',
      '- IV access + fluid challenge (if no contraindication)',
      '',
      '**Investigate Causes:**',
      '- Bleeding (GI, trauma, AAA)',
      '- Sepsis/infection (fever, WBC, lactate)',
      '- Dehydration (history, mucous membranes)',
      '- Medication overdose (review antihypertensives)',
      '- Cardiac (ECG, troponin)',
      '',
      '**Consider:**',
      '- Hold antihypertensive medications',
      '- Labs: CBC, lactate, BUN/Cr',
      '- Escalate to ICU/resus if unstable'
    )
  } else if (triggers.length > 0) {
    recommendations.push(
      '⚠️ BP concerning but no acute symptoms',
      'Monitor closely',
      'Reassess if symptoms develop'
    )
    risk_level = 'MODERATE'
  } else {
    recommendations.push('No occult shock detected', 'Routine monitoring')
  }

  return {
    risk_level,
    triggers,
    recommendations,
    baseline_bp: baseline_sbp !== undefined ? { sbp: baseline_sbp, dbp: baseline_dbp! } : undefined,
    delta_sbp,
    map,
  }
}

/**
 * Check if patient has acute symptoms
 *
 * @param symptoms - Acute symptoms
 * @returns True if any acute symptom present
 */
function hasAcuteSymptoms(symptoms: AcuteSymptoms): boolean {
  return symptoms.dizziness || symptoms.presyncope || symptoms.syncope || symptoms.weakness
}

// ============================================================================
// PERFUSION ASSESSMENT
// ============================================================================

/**
 * Perfusion assessment checklist
 */
export interface PerfusionAssessment {
  mental_status: 'alert' | 'confused' | 'lethargic' | 'unresponsive'
  skin_temp: 'warm' | 'cool' | 'cold'
  skin_moisture: 'dry' | 'clammy'
  capillary_refill_sec: number
  urine_output_ml_kg_hr?: number
}

/**
 * Assess perfusion status
 *
 * @param assessment - Perfusion assessment data
 * @returns Perfusion status
 */
export function assessPerfusion(assessment: PerfusionAssessment): {
  status: 'adequate' | 'concerning' | 'poor'
  findings: string[]
} {
  const findings: string[] = []
  let status: 'adequate' | 'concerning' | 'poor' = 'adequate'

  // Mental status
  if (assessment.mental_status !== 'alert') {
    findings.push(`Altered mental status: ${assessment.mental_status}`)
    status = 'poor'
  }

  // Skin
  if (assessment.skin_temp === 'cold' || assessment.skin_temp === 'cool') {
    findings.push(`Cool/cold skin (peripheral vasoconstriction)`)
    status = status === 'poor' ? 'poor' : 'concerning'
  }

  if (assessment.skin_moisture === 'clammy') {
    findings.push('Clammy skin (sympathetic activation)')
    status = status === 'poor' ? 'poor' : 'concerning'
  }

  // Capillary refill
  if (assessment.capillary_refill_sec > 2) {
    findings.push(`Prolonged CRT: ${assessment.capillary_refill_sec} sec (>2 sec)`)
    status = 'poor'
  }

  // Urine output
  if (assessment.urine_output_ml_kg_hr !== undefined && assessment.urine_output_ml_kg_hr < 0.5) {
    findings.push(`Low urine output: ${assessment.urine_output_ml_kg_hr} mL/kg/hr (<0.5)`)
    status = 'poor'
  }

  if (findings.length === 0) {
    findings.push('All perfusion parameters adequate')
  }

  return { status, findings }
}

// ============================================================================
// INTEGRATED PRIORITY WORKFLOW
// ============================================================================

/**
 * Clinical decision priority
 */
export interface ClinicalDecision {
  gate: 'GATE_3_GLUCOSE' | 'GATE_4_OCCULT_SHOCK' | 'GATE_2_HTN' | 'STANDARD_WORKFLOW'
  priority: 'CRITICAL' | 'HIGH' | 'ROUTINE'
  action: string
}

/**
 * Integrated TTV workflow with priority routing
 *
 * Priority order:
 * 1. Hypoglycemia (<70) → TREAT FIRST
 * 2. Occult Shock (HTN + symptoms) → INVESTIGATE
 * 3. HTN Crisis (≥180/120) → TRIAGE
 * 4. Hyperglycemia Crisis (DKA/HHS) → REFER
 * 5. Standard classification
 *
 * @param patient - Patient data
 * @returns Clinical decision with priority
 */
export function integratedTTVWorkflow(patient: {
  glucose?: number
  bp: { sbp: number; dbp: number }
  known_htn: boolean
  has_acute_symptoms: boolean
  has_crisis_signs?: boolean
  bp_history?: HistoricalBP[]
}): ClinicalDecision {
  // Priority 1: Hypoglycemia (can mimic everything)
  if (patient.glucose && patient.glucose < 70) {
    return {
      gate: 'GATE_3_GLUCOSE',
      priority: 'CRITICAL',
      action: 'TREAT_HYPOGLYCEMIA',
    }
  }

  // Priority 2: Occult Shock (if HTN + symptoms)
  if (patient.known_htn && patient.has_acute_symptoms && patient.bp_history) {
    const shockRisk = detectOccultShock({
      vitals: {
        current_sbp: patient.bp.sbp,
        current_dbp: patient.bp.dbp,
        glucose: patient.glucose,
      },
      last_3_visits: patient.bp_history,
      symptoms: {
        dizziness: patient.has_acute_symptoms,
        presyncope: false,
        syncope: false,
        weakness: patient.has_acute_symptoms,
      },
      known_htn: patient.known_htn,
    })

    if (shockRisk.risk_level === 'CRITICAL' || shockRisk.risk_level === 'HIGH') {
      return {
        gate: 'GATE_4_OCCULT_SHOCK',
        priority: 'HIGH',
        action: 'INVESTIGATE_SHOCK',
      }
    }
  }

  // Priority 3: Hypertensive Crisis
  if (patient.bp.sbp >= 180 || patient.bp.dbp >= 120) {
    return {
      gate: 'GATE_2_HTN',
      priority: 'HIGH',
      action: 'TRIAGE_HTN_CRISIS',
    }
  }

  // Priority 4: Hyperglycemia Crisis
  if (patient.glucose && patient.glucose >= 200 && patient.has_crisis_signs) {
    return {
      gate: 'GATE_3_GLUCOSE',
      priority: 'HIGH',
      action: 'TRIAGE_DKA_HHS',
    }
  }

  // Priority 5: Standard classification
  return {
    gate: 'STANDARD_WORKFLOW',
    priority: 'ROUTINE',
    action: 'CLASSIFY_AND_MANAGE',
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SHOCK_THRESHOLDS,
  calculateBaseline,
  getRecentBaseline,
  calculateMAP,
  detectOccultShock,
  assessPerfusion,
  integratedTTVWorkflow,
}
