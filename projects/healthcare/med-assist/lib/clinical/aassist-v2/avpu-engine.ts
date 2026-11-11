/**
 * AASSIST v2 — AVPU Auto-Determination Engine
 * Derives AVPU consciousness level from vital sign values.
 * commit: feat(aassist): AVPU auto-determination from vitals + confirmed lock button
 *
 * Rule priority (highest first):
 *   U → P → V → A
 *
 * Example outputs:
 *   { sbp:120, spo2:98, rr:16, hr:78, glucose:95 }  → A (#4CAF50)
 *   { sbp:75,  spo2:88, rr:26, hr:118, glucose:55 } → P (#FF6B00)
 *   { sbp:55,  spo2:65, rr:32, hr:145, glucose:30 } → U (#FF6B00)
 */

export type AvpuLevel = 'A' | 'V' | 'P' | 'U';

/**
 * AvpuResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AvpuResult {
  avpu: AvpuLevel;
  reason: string[];
  /** Hex color: green for Alert, red-orange for V/P/U */
  color: string;
}

// ─── Threshold Klinis ───────────────────────────────────────────────────────
const THRESHOLD = {
  // Unresponsive territory
  sbp_shock: 60, // SBP < 60 → U
  spo2_critical: 70, // SpO₂ < 70% → U
  glucose_critical: 40, // GDS < 40 mg/dL → U
  glucose_extreme: 400, // GDS > 400 mg/dL → U

  // Pain territory
  sbp_severe: 70, // SBP 60–70 → P
  spo2_severe: 85, // SpO₂ 70–85% → P
  glucose_severe: 55, // GDS 40–55 → P

  // Verbal territory
  sbp_low: 90, // SBP 70–90 → V
  spo2_low: 94, // SpO₂ 85–94% → V
  rr_high: 30, // RR > 30 → V
  hr_high: 140, // HR > 140 → V
  hr_low: 40, // HR < 40 → V
} as const;

const COLOR_ALERT = '#4CAF50';
const COLOR_ABNORMAL = '#FF6B00';

/**
 * VitalsForAvpu interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface VitalsForAvpu {
  sbp: number;
  spo2: number;
  rr: number;
  hr: number;
  glucose: number;
}

/**
 * determineAVPU
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function determineAVPU(v: VitalsForAvpu): AvpuResult {
  const reasons: string[] = [];
  // glucose < 0 means unknown/missing — skip glucose-based checks to avoid false alarms
  const glucoseKnown = v.glucose >= 0;

  // ── Unresponsive ─────────────────────────────────────────────────────────
  if (
    v.sbp < THRESHOLD.sbp_shock ||
    v.spo2 < THRESHOLD.spo2_critical ||
    (glucoseKnown && v.glucose < THRESHOLD.glucose_critical) ||
    (glucoseKnown && v.glucose > THRESHOLD.glucose_extreme)
  ) {
    if (v.sbp < THRESHOLD.sbp_shock)
      reasons.push(`SBP kritis: ${v.sbp} mmHg (< ${THRESHOLD.sbp_shock})`);
    if (v.spo2 < THRESHOLD.spo2_critical)
      reasons.push(`SpO₂ kritis: ${v.spo2}% (< ${THRESHOLD.spo2_critical}%)`);
    if (glucoseKnown && v.glucose < THRESHOLD.glucose_critical)
      reasons.push(
        `Hipoglikemia ekstrem: GDS ${v.glucose} mg/dL (< ${THRESHOLD.glucose_critical})`
      );
    if (glucoseKnown && v.glucose > THRESHOLD.glucose_extreme)
      reasons.push(
        `Hiperglikemia ekstrem: GDS ${v.glucose} mg/dL (> ${THRESHOLD.glucose_extreme})`
      );
    return { avpu: 'U', reason: reasons, color: COLOR_ABNORMAL };
  }

  // ── Pain ─────────────────────────────────────────────────────────────────
  if (
    v.sbp < THRESHOLD.sbp_severe ||
    v.spo2 < THRESHOLD.spo2_severe ||
    (glucoseKnown && v.glucose < THRESHOLD.glucose_severe)
  ) {
    if (v.sbp < THRESHOLD.sbp_severe)
      reasons.push(`SBP berat: ${v.sbp} mmHg (< ${THRESHOLD.sbp_severe})`);
    if (v.spo2 < THRESHOLD.spo2_severe)
      reasons.push(`SpO₂ berat: ${v.spo2}% (< ${THRESHOLD.spo2_severe}%)`);
    if (glucoseKnown && v.glucose < THRESHOLD.glucose_severe)
      reasons.push(`Hipoglikemia berat: GDS ${v.glucose} mg/dL (< ${THRESHOLD.glucose_severe})`);
    return { avpu: 'P', reason: reasons, color: COLOR_ABNORMAL };
  }

  // ── Verbal ───────────────────────────────────────────────────────────────
  if (
    v.sbp < THRESHOLD.sbp_low ||
    v.spo2 < THRESHOLD.spo2_low ||
    v.rr > THRESHOLD.rr_high ||
    v.hr > THRESHOLD.hr_high ||
    v.hr < THRESHOLD.hr_low
  ) {
    if (v.sbp < THRESHOLD.sbp_low)
      reasons.push(`Hipotensi: ${v.sbp} mmHg (< ${THRESHOLD.sbp_low})`);
    if (v.spo2 < THRESHOLD.spo2_low)
      reasons.push(`SpO₂ rendah: ${v.spo2}% (< ${THRESHOLD.spo2_low}%)`);
    if (v.rr > THRESHOLD.rr_high)
      reasons.push(`Takipnea berat: RR ${v.rr} rpm (> ${THRESHOLD.rr_high})`);
    if (v.hr > THRESHOLD.hr_high)
      reasons.push(`Takikardia berat: HR ${v.hr} bpm (> ${THRESHOLD.hr_high})`);
    if (v.hr < THRESHOLD.hr_low)
      reasons.push(`Bradikardia berat: HR ${v.hr} bpm (< ${THRESHOLD.hr_low})`);
    return { avpu: 'V', reason: reasons, color: COLOR_ABNORMAL };
  }

  // ── Alert ─────────────────────────────────────────────────────────────────
  return {
    avpu: 'A',
    reason: ['Semua parameter vital dalam batas normal atau abnormal ringan.'],
    color: COLOR_ALERT,
  };
}

/** Exported thresholds for use in unit tests or UI tooltips. */
export { THRESHOLD as AVPU_THRESHOLDS };
