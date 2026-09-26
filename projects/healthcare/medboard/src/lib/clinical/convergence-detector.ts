/**
 * Convergence Detector
 *
 * Detects when multiple vital parameters are simultaneously trending
 * toward danger. Convergence = multiplicative risk, not additive.
 *
 * Examples:
 * - SBP↑ + HR↑ + SpO2↓ → cardiovascular convergence
 * - SBP↓ + HR↑ + RR↑ → shock convergence
 * - Temp↑ + HR↑ + RR↑ → sepsis convergence
 *
 * A single deteriorating parameter is a warning.
 * Three converging parameters is a clinical emergency signal.
 *
 * Clinical Momentum Engine — Phase 2 (Momentum Core)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ConvergenceParam = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'glucose' | 'spo2'

export type ConvergenceDirection = 'worsening' | 'improving' | 'stable'

export interface ParamTrend {
  param: ConvergenceParam
  direction: ConvergenceDirection
  /** Velocity in units/day (positive = increasing) */
  velocity: number
}

export type ConvergencePattern =
  | 'cardiovascular' // SBP↑ + HR↑ + SpO2↓
  | 'shock' // SBP↓ + HR↑ + RR↑
  | 'sepsis_like' // Temp↑ + HR↑ + RR↑
  | 'hypertensive_crisis' // SBP↑ + DBP↑
  | 'metabolic_crisis' // Glucose↑↑ + HR↑
  | 'respiratory' // RR↑ + SpO2↓
  | 'multi_system' // ≥4 params converging
  | 'none'

export interface ConvergenceResult {
  /** Number of parameters trending toward danger simultaneously */
  convergenceScore: number
  /** Parameters currently worsening */
  worseningParams: ConvergenceParam[]
  /** Parameters improving (reassuring) */
  improvingParams: ConvergenceParam[]
  /** Recognized clinical pattern, if any */
  pattern: ConvergencePattern
  /** Human-readable clinical narrative */
  narrative: string
  /** Whether an alert should be raised */
  shouldAlert: boolean
}

// ── Danger Direction per Parameter ──────────────────────────────────────────
// Defines which direction is "worsening" for each parameter.
// SpO2 is INVERTED — lower is worse.

const DANGER_DIRECTION: Record<ConvergenceParam, 'up' | 'down'> = {
  sbp: 'up', // high BP → hypertensive crisis
  dbp: 'up',
  hr: 'up', // tachycardia
  rr: 'up', // tachypnea
  temp: 'up', // fever
  glucose: 'up', // hyperglycemia
  spo2: 'down', // desaturation — lower is worse
}

// ── Pattern Recognition ──────────────────────────────────────────────────────

function detectPattern(worsening: Set<ConvergenceParam>): ConvergencePattern {
  if (worsening.size >= 4) return 'multi_system'

  // Cardiovascular: SBP↑ + HR↑ + SpO2↓
  if (worsening.has('sbp') && worsening.has('hr') && worsening.has('spo2')) {
    return 'cardiovascular'
  }

  // Shock: SBP↓ (going LOW = improving in "up" direction means worsening when going down)
  // For shock: SBP is worsening when going DOWN. But our system marks SBP worsening = UP.
  // We need to handle "hypo" convergence differently via velocity sign.
  // Handled via the specialized shock check in buildConvergenceResult.

  // Sepsis-like: Temp↑ + HR↑ + RR↑
  if (worsening.has('temp') && worsening.has('hr') && worsening.has('rr')) {
    return 'sepsis_like'
  }

  // Hypertensive crisis: SBP↑ + DBP↑
  if (worsening.has('sbp') && worsening.has('dbp')) {
    return 'hypertensive_crisis'
  }

  // Metabolic: Glucose↑ + HR↑
  if (worsening.has('glucose') && worsening.has('hr')) {
    return 'metabolic_crisis'
  }

  // Respiratory: RR↑ + SpO2↓
  if (worsening.has('rr') && worsening.has('spo2')) {
    return 'respiratory'
  }

  return 'none'
}

function buildNarrative(
  pattern: ConvergencePattern,
  worsening: ConvergenceParam[],
  score: number
): string {
  if (score === 0) return 'Semua parameter stabil atau membaik.'

  const paramList = worsening.join(', ').toUpperCase()

  switch (pattern) {
    case 'cardiovascular':
      return `Konvergensi kardiovaskular: SBP↑ + HR↑ + SpO2↓ — risiko kegagalan sirkulasi.`
    case 'sepsis_like':
      return `Pola sepsis-like: Suhu↑ + HR↑ + RR↑ — pertimbangkan infeksi sistemik.`
    case 'hypertensive_crisis':
      return `Konvergensi hipertensi: SBP↑ + DBP↑ — waspadai krisis hipertensif.`
    case 'metabolic_crisis':
      return `Konvergensi metabolik: Glukosa↑ + HR↑ — evaluasi KAD/HHS.`
    case 'respiratory':
      return `Deteriorasi respirasi: RR↑ + SpO2↓ — risiko gagal napas.`
    case 'multi_system':
      return `KONVERGENSI MULTI-SISTEM (${score} parameter): ${paramList} — kegawatan klinis tinggi.`
    default:
      if (score >= 2) {
        return `${score} parameter memburuk bersamaan (${paramList}) — monitoring ketat.`
      }
      return `${paramList} menunjukkan tren memburuk.`
  }
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Detect convergence from an array of parameter trends.
 *
 * @param trends - Array of parameter trends (velocity + direction)
 */
export function detectConvergence(trends: ParamTrend[]): ConvergenceResult {
  const worseningParams: ConvergenceParam[] = []
  const improvingParams: ConvergenceParam[] = []
  const worseningSet = new Set<ConvergenceParam>()

  for (const trend of trends) {
    if (trend.direction === 'worsening') {
      worseningParams.push(trend.param)
      worseningSet.add(trend.param)
    } else if (trend.direction === 'improving') {
      improvingParams.push(trend.param)
    }
  }

  const score = worseningParams.length
  const pattern = detectPattern(worseningSet)
  const narrative = buildNarrative(pattern, worseningParams, score)

  // Alert threshold: 2+ params converging on a recognized pattern,
  // OR 3+ params converging regardless of pattern
  const shouldAlert = score >= 3 || (score >= 2 && pattern !== 'none')

  return {
    convergenceScore: score,
    worseningParams,
    improvingParams,
    pattern,
    narrative,
    shouldAlert,
  }
}

/**
 * Determine if a velocity is "worsening" for a given parameter.
 * Takes into account the danger direction (SpO2 going down = worsening).
 */
export function isWorsening(
  param: ConvergenceParam,
  velocity: number,
  threshold = 0.1
): ConvergenceDirection {
  const dangerDir = DANGER_DIRECTION[param]
  const absV = Math.abs(velocity)

  if (absV < threshold) return 'stable'

  if (dangerDir === 'up') {
    return velocity > 0 ? 'worsening' : 'improving'
  } else {
    // SpO2: going down = worsening
    return velocity < 0 ? 'worsening' : 'improving'
  }
}
