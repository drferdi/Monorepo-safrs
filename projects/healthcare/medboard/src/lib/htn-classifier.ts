/**
 * Gate 2: Hypertension Classification & Crisis Management
 *
 * Purpose: Classify HTN types and guide crisis management
 * Evidence Base: FKTP 2024 Guidelines
 *
 * @module lib/emergency-detector/htn-classifier
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Blood pressure reading
 */
export interface BPReading {
  sbp: number
  dbp: number
  timestamp?: Date
}

/**
 * BP measurement session (3-4 readings)
 */
export interface BPMeasurementSession {
  readings: BPReading[]
  final_bp?: BPReading
  measurement_quality: 'good' | 'acceptable' | 'poor'
}

/**
 * Hypertension types (FKTP 2024)
 */
export type HTNType =
  | 'NORMAL'
  | 'PREHYPERTENSION'
  | 'PRIMARY_HTN'
  | 'SECONDARY_HTN'
  | 'ISOLATED_SYSTOLIC_HTN'
  | 'WHITE_COAT_HTN'
  | 'MASKED_HTN'
  | 'RESISTANT_HTN'
  | 'HTN_URGENCY'
  | 'HTN_EMERGENCY'

/**
 * HTN severity levels
 */
export type HTNSeverity = 'normal' | 'prehypertension' | 'stage1' | 'stage2' | 'crisis'

/**
 * HMOD (Hypertension-Mediated Organ Damage) red flags
 */
export interface HMODRedFlags {
  chest_pain: boolean
  pulmonary_edema: boolean
  neurological_deficit: boolean
  vision_changes: boolean
  severe_headache: boolean
  oliguria: boolean
  altered_mental_status: boolean
}

/**
 * HTN classification result
 */
export interface HTNClassification {
  type: HTNType
  severity: HTNSeverity
  final_bp: BPReading
  red_flags?: HMODRedFlags
  recommendations: string[]
  reasoning: string
}

/**
 * Captopril SL protocol step
 */
export interface CaptoprilProtocolStep {
  time_minutes: number
  action: string
  monitoring: string[]
  decision_point?: {
    condition: string
    if_true: string
    if_false: string
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * BP thresholds (FKTP 2024)
 */
export const BP_THRESHOLDS = {
  NORMAL: { sbp: 120, dbp: 80 },
  PREHYPERTENSION: { sbp: 130, dbp: 85 },
  STAGE1: { sbp: 140, dbp: 90 },
  STAGE2: { sbp: 160, dbp: 100 },
  CRISIS: { sbp: 180, dbp: 110 },
} as const

/**
 * Captopril SL protocol timeline
 */
export const CAPTOPRIL_PROTOCOL: CaptoprilProtocolStep[] = [
  {
    time_minutes: 0,
    action: 'Captopril 12.5mg SL',
    monitoring: ['TD baseline', 'Gejala hipoperfusi'],
  },
  {
    time_minutes: 15,
    action: 'Monitor TD serial',
    monitoring: ['TD', 'Gejala pusing/lemas'],
  },
  {
    time_minutes: 30,
    action: 'Evaluasi DBP',
    monitoring: ['DBP', 'Perfusi'],
    decision_point: {
      condition: 'DBP >100 DAN pasien stabil',
      if_true: 'Ulangi Captopril 12.5mg SL (maks 25mg total)',
      if_false: 'Lanjut ke maintenance (Amlodipine)',
    },
  },
  {
    time_minutes: 60,
    action: 'Amlodipine 10mg PO',
    monitoring: ['TD trend', 'Toleransi obat'],
  },
]

// ============================================================================
// BP MEASUREMENT PROTOCOL
// ============================================================================

/**
 * Finalize BP from multiple readings (FKTP 2024 protocol)
 *
 * Protocol:
 * 1. Take 3 readings (1-2 min apart)
 * 2. If difference >10 mmHg → take 4th reading
 * 3. Final BP = average of last 2 readings
 *
 * @param readings - Array of BP readings (minimum 2)
 * @returns Finalized BP measurement session
 */
export function finalizeBP(readings: BPReading[]): BPMeasurementSession {
  if (readings.length < 2) {
    throw new Error('Minimum 2 BP readings required')
  }

  const session: BPMeasurementSession = {
    readings,
    measurement_quality: 'good',
  }

  // Check if we need 4th reading
  if (readings.length === 3) {
    const [r1, r2, r3] = readings
    const maxDiff = Math.max(
      Math.abs(r1.sbp - r2.sbp),
      Math.abs(r2.sbp - r3.sbp),
      Math.abs(r1.sbp - r3.sbp)
    )

    if (maxDiff > 10) {
      session.measurement_quality = 'acceptable'
      // In real implementation, would prompt for 4th reading
      // For now, proceed with 3 readings
    }
  }

  // Calculate final BP (average of last 2)
  const lastTwo = readings.slice(-2)
  const avgSBP = Math.round((lastTwo[0].sbp + lastTwo[1].sbp) / 2)
  const avgDBP = Math.round((lastTwo[0].dbp + lastTwo[1].dbp) / 2)

  session.final_bp = {
    sbp: avgSBP,
    dbp: avgDBP,
    timestamp: new Date(),
  }

  return session
}

// ============================================================================
// HTN CLASSIFICATION
// ============================================================================

/**
 * Classify hypertension type based on BP and clinical context
 *
 * @param bp - Finalized BP reading
 * @param context - Clinical context (optional)
 * @returns HTN classification
 */
export function classifyHTN(
  bp: BPReading,
  context?: {
    on_medication?: boolean
    multiple_medications?: boolean
    home_bp_normal?: boolean
    clinic_bp_elevated?: boolean
    secondary_causes?: boolean
  }
): HTNType {
  const { sbp, dbp } = bp

  // Crisis (highest priority)
  if (sbp >= BP_THRESHOLDS.CRISIS.sbp || dbp >= BP_THRESHOLDS.CRISIS.dbp) {
    // Will be further triaged to URGENCY vs EMERGENCY
    return 'HTN_URGENCY' // Default, will be refined by triageHypertensiveCrisis
  }

  // Normal
  if (sbp < BP_THRESHOLDS.NORMAL.sbp && dbp < BP_THRESHOLDS.NORMAL.dbp) {
    return 'NORMAL'
  }

  // Prehypertension
  if (sbp < BP_THRESHOLDS.STAGE1.sbp && dbp < BP_THRESHOLDS.STAGE1.dbp) {
    return 'PREHYPERTENSION'
  }

  // Isolated Systolic HTN (elderly)
  if (sbp >= BP_THRESHOLDS.STAGE1.sbp && dbp < BP_THRESHOLDS.STAGE1.dbp) {
    return 'ISOLATED_SYSTOLIC_HTN'
  }

  // White Coat HTN (elevated in clinic, normal at home)
  if (context?.clinic_bp_elevated && context?.home_bp_normal) {
    return 'WHITE_COAT_HTN'
  }

  // Masked HTN (normal in clinic, elevated at home)
  if (!context?.clinic_bp_elevated && !context?.home_bp_normal) {
    return 'MASKED_HTN'
  }

  // Resistant HTN (on ≥3 medications including diuretic)
  if (context?.on_medication && context?.multiple_medications) {
    if (sbp >= BP_THRESHOLDS.STAGE1.sbp || dbp >= BP_THRESHOLDS.STAGE1.dbp) {
      return 'RESISTANT_HTN'
    }
  }

  // Secondary HTN (clinical suspicion)
  if (context?.secondary_causes) {
    return 'SECONDARY_HTN'
  }

  // Primary HTN (default)
  return 'PRIMARY_HTN'
}

/**
 * Get HTN severity level
 *
 * @param bp - BP reading
 * @returns Severity level
 */
export function getHTNSeverity(bp: BPReading): HTNSeverity {
  const { sbp, dbp } = bp

  if (sbp >= BP_THRESHOLDS.CRISIS.sbp || dbp >= BP_THRESHOLDS.CRISIS.dbp) {
    return 'crisis'
  }
  if (sbp >= BP_THRESHOLDS.STAGE2.sbp || dbp >= BP_THRESHOLDS.STAGE2.dbp) {
    return 'stage2'
  }
  if (sbp >= BP_THRESHOLDS.STAGE1.sbp || dbp >= BP_THRESHOLDS.STAGE1.dbp) {
    return 'stage1'
  }
  if (sbp >= BP_THRESHOLDS.PREHYPERTENSION.sbp || dbp >= BP_THRESHOLDS.PREHYPERTENSION.dbp) {
    return 'prehypertension'
  }
  return 'normal'
}

// ============================================================================
// CRISIS TRIAGE
// ============================================================================

/**
 * Check for HMOD red flags
 *
 * @param redFlags - HMOD red flags checklist
 * @returns True if any red flag present (EMERGENCY)
 */
export function checkHMODRedFlags(redFlags: HMODRedFlags): boolean {
  return Object.values(redFlags).some(flag => flag === true)
}

/**
 * Triage hypertensive crisis into URGENCY vs EMERGENCY
 *
 * URGENCY: BP ≥180/110 WITHOUT HMOD
 * EMERGENCY: BP ≥180/110 WITH HMOD
 *
 * @param bp - BP reading
 * @param redFlags - HMOD red flags
 * @returns HTN type (URGENCY or EMERGENCY)
 */
export function triageHypertensiveCrisis(
  _bp: BPReading,
  redFlags: HMODRedFlags
): 'HTN_URGENCY' | 'HTN_EMERGENCY' {
  if (checkHMODRedFlags(redFlags)) {
    return 'HTN_EMERGENCY'
  }
  return 'HTN_URGENCY'
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Get clinical recommendations based on HTN classification
 *
 * @param classification - HTN type
 * @param bp - BP reading
 * @returns Array of recommendations
 */
export function getHTNRecommendations(classification: HTNType, bp: BPReading): string[] {
  switch (classification) {
    case 'NORMAL':
      return [
        'Maintain healthy lifestyle',
        'Recheck BP annually',
        'Continue healthy diet and exercise',
      ]

    case 'PREHYPERTENSION':
      return [
        'Lifestyle modification (DASH diet, exercise, salt restriction)',
        'Weight loss if BMI >25',
        'Recheck BP in 3-6 months',
        'No medication needed yet',
      ]

    case 'PRIMARY_HTN':
      return [
        'Lifestyle counseling (DASH diet, exercise, salt <5g/day)',
        'Start pharmacotherapy (per FKTP algorithm)',
        'Target: <140/90 mmHg (or <130/80 if DM/CKD)',
        'Follow-up 2-4 weeks',
      ]

    case 'ISOLATED_SYSTOLIC_HTN':
      return [
        'Common in elderly (arterial stiffness)',
        'Lifestyle modification',
        'Consider pharmacotherapy if SBP ≥160',
        'Careful monitoring (fall risk)',
      ]

    case 'HTN_URGENCY': {
      // Dynamic recommendations based on actual DBP value
      const recs: string[] = [
        '━━━ ORDER SET (IGD) ━━━',
        '1. Captopril 12.5 mg SL — NOW',
        '2. Monitor TD q15 menit',
        '3. Reassess TD pada +30 min:',
      ]

      // Smart DBP-based guardrail
      if (bp.dbp <= 100) {
        recs.push(
          `   DBP ${bp.dbp} sudah ≤100: SKIP repeat Captopril`,
          '   Fokus: evaluasi gejala & perfusi, BUKAN angka'
        )
      } else {
        recs.push(`   Repeat Captopril 12.5 mg jika DBP masih >100 (max 25 mg total)`)
      }

      recs.push(
        '4. Maintenance: Amlodipine 10 mg PO (onset bertahap)',
        '━━━ GUARDRAILS ━━━',
        'Hindari penurunan cepat; target 24-48 jam bertahap',
        'Repeat captopril HANYA jika DBP >100 pada +30 min',
        'Evaluasi: gejala hipoperfusi, bukan angka tunggal',
        '━━━ DISCHARGE ━━━',
        'Stabil klinis, TD tren turun, tanpa hipoperfusi',
        'Kontrol ≤7 hari untuk titrasi regimen'
      )

      return recs
    }

    case 'HTN_EMERGENCY':
      return [
        '━━━ IMMEDIATE ACTION ━━━',
        'RUJUK IGD/ICU SEGERA',
        'IV access 2 jalur',
        'Continuous monitoring',
        'Panggil ambulance',
        'JANGAN beri antihipertensi oral',
        '━━━ TARGET ━━━',
        'Turunkan ≤25% MAP dalam 1-2 jam (BERTAHAP)',
        'Hindari penurunan >25% dalam jam pertama',
        '━━━ EVALUASI HMOD ━━━',
        'Nyeri dada, sesak, defisit neurologis',
        'Funduskopi, EKG, fungsi ginjal',
      ]

    case 'RESISTANT_HTN':
      return [
        'Confirm adherence to medications',
        'Rule out secondary causes',
        'Optimize diuretic therapy',
        'Consider spironolactone',
        'Refer to specialist',
      ]

    case 'SECONDARY_HTN':
      return [
        'Investigate secondary causes:',
        '- Renal artery stenosis',
        '- Primary aldosteronism',
        '- Pheochromocytoma',
        '- Cushing syndrome',
        'Refer to specialist',
      ]

    default:
      return ['Evaluate and manage per FKTP 2024 guidelines']
  }
}

/**
 * Get clinical reasoning for HTN classification
 *
 * @param type - HTN type
 * @param bp - BP reading
 * @returns Reasoning explanation
 */
export function getHTNReasoning(type: HTNType, bp: BPReading): string {
  const { sbp, dbp } = bp

  switch (type) {
    case 'NORMAL':
      return `TD ${sbp}/${dbp} dalam batas normal (<${BP_THRESHOLDS.NORMAL.sbp}/${BP_THRESHOLDS.NORMAL.dbp})`

    case 'PREHYPERTENSION':
      return `TD ${sbp}/${dbp} meningkat tapi belum hipertensi. Lifestyle modification dapat mencegah progresi ke HTN.`

    case 'PRIMARY_HTN':
      return `TD ${sbp}/${dbp} memenuhi kriteria hipertensi (≥${BP_THRESHOLDS.STAGE1.sbp}/${BP_THRESHOLDS.STAGE1.dbp}). Tidak ada penyebab sekunder yang jelas.`

    case 'HTN_URGENCY': {
      // Comprehensive reasoning with status and data
      const crisisTag = sbp >= 180 ? '(SBP ≥180 = crisis-level)' : ''
      const dbpNote =
        dbp <= 100
          ? `DBP ${dbp} mmHg sudah ≤100 — jangan kejar target DBP lebih rendah.`
          : `DBP ${dbp} mmHg — evaluasi ulang pada +30 min.`

      return [
        `STATUS: URGENCY (tanpa red flags HMOD).`,
        `TD final: ${sbp}/${dbp} mmHg ${crisisTag}.`,
        dbpNote,
        `Catatan: Hindari penurunan cepat; target penurunan bertahap 24-48 jam, follow-up ≤7 hari.`,
      ].join(' ')
    }

    case 'HTN_EMERGENCY':
      return [
        `STATUS: EMERGENCY (dengan red flags HMOD).`,
        `TD ${sbp}/${dbp} mmHg ≥${BP_THRESHOLDS.CRISIS.sbp}/${BP_THRESHOLDS.CRISIS.dbp} DENGAN kerusakan organ akut.`,
        `RUJUK SEGERA ke IGD/ICU! Target: turunkan ≤25% MAP dalam 1-2 jam secara bertahap.`,
      ].join(' ')

    case 'ISOLATED_SYSTOLIC_HTN':
      return `SBP ${sbp} ≥${BP_THRESHOLDS.STAGE1.sbp} tapi DBP ${dbp} <${BP_THRESHOLDS.STAGE1.dbp}. Umum pada lansia (kekakuan arteri).`

    default:
      return `TD ${sbp}/${dbp} - klasifikasi ${type}`
  }
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

/**
 * Complete HTN classification workflow
 *
 * @param session - BP measurement session
 * @param redFlags - HMOD red flags (for crisis triage)
 * @param context - Clinical context
 * @returns Complete HTN classification
 */
export function classifyHypertension(
  session: BPMeasurementSession,
  redFlags?: HMODRedFlags,
  context?: Parameters<typeof classifyHTN>[1]
): HTNClassification {
  if (!session.final_bp) {
    throw new Error('BP session must have final_bp calculated')
  }

  const bp = session.final_bp
  let type = classifyHTN(bp, context)

  // Refine crisis classification
  if (type === 'HTN_URGENCY' && redFlags) {
    type = triageHypertensiveCrisis(bp, redFlags)
  }

  const severity = getHTNSeverity(bp)
  const recommendations = getHTNRecommendations(type, bp)
  const reasoning = getHTNReasoning(type, bp)

  return {
    type,
    severity,
    final_bp: bp,
    red_flags: redFlags,
    recommendations,
    reasoning,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  BP_THRESHOLDS,
  CAPTOPRIL_PROTOCOL,
  finalizeBP,
  classifyHTN,
  getHTNSeverity,
  checkHMODRedFlags,
  triageHypertensiveCrisis,
  getHTNRecommendations,
  getHTNReasoning,
  classifyHypertension,
}
