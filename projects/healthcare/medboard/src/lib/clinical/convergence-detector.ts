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
// Default direction that is "worsening" when the current value is unknown.
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

// Parameters that are dangerous on both sides (shock, hypothermia, hypoglycaemia). With the
// current value known, worsening means moving away from the midpoint of the normal range —
// the same rule detectTrend uses (NORMAL_RANGES in trajectory-analyzer.ts).
const NORMAL_MIDPOINT: Partial<Record<ConvergenceParam, number>> = {
  sbp: (90 + 139) / 2,
  dbp: (60 + 89) / 2,
  temp: (36.1 + 37.5) / 2,
  glucose: (70 + 199) / 2,
}

// ── Pattern Recognition ──────────────────────────────────────────────────────

function detectPattern(
  worsening: Set<ConvergenceParam>,
  falling: Set<ConvergenceParam>
): ConvergencePattern {
  if (worsening.size >= 4) return 'multi_system'

  const rising = (param: ConvergenceParam) => worsening.has(param) && !falling.has(param)
  const dropping = (param: ConvergenceParam) => worsening.has(param) && falling.has(param)

  // Cardiovascular: SBP↑ + HR↑ + SpO2↓
  if (rising('sbp') && worsening.has('hr') && worsening.has('spo2')) {
    return 'cardiovascular'
  }

  // Shock: SBP↓ + HR↑ + RR↑
  if (dropping('sbp') && worsening.has('hr') && worsening.has('rr')) {
    return 'shock'
  }

  // Sepsis-like: Temp away from normal (fever or hypothermia) + HR↑ + RR↑
  if (worsening.has('temp') && worsening.has('hr') && worsening.has('rr')) {
    return 'sepsis_like'
  }

  // Hypertensive crisis: SBP↑ + DBP↑
  if (rising('sbp') && rising('dbp')) {
    return 'hypertensive_crisis'
  }

  // Metabolic: Glucose↑ + HR↑
  if (rising('glucose') && worsening.has('hr')) {
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
    case 'shock':
      return `Pola syok: SBP↓ + HR↑ + RR↑ — risiko hipoperfusi, nilai ulang segera.`
    case 'sepsis_like':
      return `Pola sepsis-like: Suhu menjauh dari normal + HR↑ + RR↑ — pertimbangkan infeksi sistemik.`
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
  const fallingSet = new Set<ConvergenceParam>()

  for (const trend of trends) {
    if (trend.direction === 'worsening') {
      worseningParams.push(trend.param)
      worseningSet.add(trend.param)
      if (trend.velocity < 0) fallingSet.add(trend.param)
    } else if (trend.direction === 'improving') {
      improvingParams.push(trend.param)
    }
  }

  const score = worseningParams.length
  const pattern = detectPattern(worseningSet, fallingSet)
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
 * SpO2 going down is worsening. For SBP, DBP, temperature and glucose, when the current
 * value is given, worsening is moving away from the normal midpoint in either direction.
 */
export function isWorsening(
  param: ConvergenceParam,
  velocity: number,
  threshold = 0.1,
  currentValue?: number
): ConvergenceDirection {
  const absV = Math.abs(velocity)

  if (absV < threshold) return 'stable'

  const midpoint = NORMAL_MIDPOINT[param]
  const dangerDir =
    midpoint !== undefined && currentValue !== undefined && currentValue > 0
      ? currentValue < midpoint
        ? 'down'
        : 'up'
      : DANGER_DIRECTION[param]

  if (dangerDir === 'up') {
    return velocity > 0 ? 'worsening' : 'improving'
  } else {
    // SpO2: going down = worsening
    return velocity < 0 ? 'worsening' : 'improving'
  }
}
