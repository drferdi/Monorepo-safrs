// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Prognosis Mapper
 * Maps trajectory analysis to ePuskesmas prognosis dropdown values
 *
 * Prognosis Options (from ePuskesmas):
 * - Sanam (Sembuh) - Patient recovering/cured
 * - Bonam (Baik) - Good condition
 * - Malam (Buruk/Jelek) - Poor/deteriorating
 * - Dubia Ad Sanam/Bonam - Uncertain, tending toward recovery/good
 * - Dubia Ad Malam - Uncertain, tending toward poor
 */

import type { TrajectoryAnalysis } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';

/**
 * PrognosisValue type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type PrognosisValue =
  | 'Sanam (Sembuh)'
  | 'Bonam (Baik)'
  | 'Malam (Buruk/Jelek)'
  | 'Dubia Ad Sanam/Bonam (Tidak tentu/Ragu-ragu, Cenderung Sembuh/Baik)'
  | 'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)';

/**
 * Map trajectory analysis to prognosis value
 * Decision tree based on:
 * 1. Global deterioration state (critical > deteriorating > stable > improving)
 * 2. Overall risk level (critical > high > moderate > low)
 * 3. Overall trend direction (declining > stable > improving)
 * 4. Acute attack risk markers
 */
export function mapTrajectoryToPrognosis(trajectory: TrajectoryAnalysis): PrognosisValue {
  const {
    global_deterioration,
    overallRisk,
    overallTrend,
    mortality_proxy,
    acute_attack_risk_24h,
  } = trajectory;

  // CRITICAL STATE → Dubia Ad Malam (Uncertain, tending toward poor)
  if (global_deterioration.state === 'critical' || overallRisk === 'critical') {
    return 'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)';
  }

  // EMERGENCY URGENCY → Dubia Ad Malam
  if (mortality_proxy.clinical_urgency_tier === 'immediate') {
    return 'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)';
  }

  // HIGH RISK + DETERIORATING → Malam (Poor/Bad)
  if (
    (overallRisk === 'high' && global_deterioration.state === 'deteriorating') ||
    (overallRisk === 'high' && overallTrend === 'declining')
  ) {
    return 'Malam (Buruk/Jelek)';
  }

  // HIGH ACUTE ATTACK RISK → Dubia Ad Malam
  const highAcuteRiskCount = [
    acute_attack_risk_24h.hypertensive_crisis_risk,
    acute_attack_risk_24h.glycemic_crisis_risk,
    acute_attack_risk_24h.sepsis_like_deterioration_risk,
    acute_attack_risk_24h.shock_decompensation_risk,
    acute_attack_risk_24h.stroke_acs_suspicion_risk,
  ].filter((risk) => risk >= 60).length;

  if (highAcuteRiskCount >= 2) {
    return 'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)';
  }

  // DETERIORATING + MODERATE RISK → Dubia Ad Sanam/Bonam
  if (
    (global_deterioration.state === 'deteriorating' && overallRisk === 'moderate') ||
    (overallTrend === 'declining' && overallRisk === 'moderate')
  ) {
    return 'Dubia Ad Sanam/Bonam (Tidak tentu/Ragu-ragu, Cenderung Sembuh/Baik)';
  }

  // IMPROVING + LOW RISK + STABLE → Sanam (Recovered/Recovering)
  if (
    overallTrend === 'improving' &&
    overallRisk === 'low' &&
    global_deterioration.state === 'improving' &&
    highAcuteRiskCount === 0
  ) {
    return 'Sanam (Sembuh)';
  }

  // IMPROVING + LOW/MODERATE RISK → Bonam (Good)
  if (overallTrend === 'improving' && (overallRisk === 'low' || overallRisk === 'moderate')) {
    return 'Bonam (Baik)';
  }

  // STABLE + LOW RISK → Bonam (Good)
  if (
    (overallTrend === 'stable' && overallRisk === 'low') ||
    (global_deterioration.state === 'stable' && overallRisk === 'low')
  ) {
    return 'Bonam (Baik)';
  }

  // STABLE + MODERATE RISK → Bonam (Good) with caution
  if (overallTrend === 'stable' && overallRisk === 'moderate') {
    return 'Bonam (Baik)';
  }

  // DEFAULT → Bonam (Good)
  // Conservative default for ambiguous cases
  return 'Bonam (Baik)';
}

/**
 * Get prognosis explanation based on trajectory
 * Provides clinical rationale for the prognosis decision
 */
export function getPrognosisExplanation(trajectory: TrajectoryAnalysis): string {
  const prognosis = mapTrajectoryToPrognosis(trajectory);
  const { global_deterioration, overallRisk, overallTrend } = trajectory;

  const parts: string[] = [];

  // Trend component
  if (overallTrend === 'improving') {
    parts.push('Trend klinis membaik');
  } else if (overallTrend === 'declining') {
    parts.push('Trend klinis memburuk');
  } else {
    parts.push('Trend klinis stabil');
  }

  // Risk component
  if (overallRisk === 'critical' || overallRisk === 'high') {
    parts.push('risiko tinggi');
  } else if (overallRisk === 'moderate') {
    parts.push('risiko sedang');
  } else {
    parts.push('risiko rendah');
  }

  // State component
  if (global_deterioration.state === 'critical') {
    parts.push('kondisi kritis');
  } else if (global_deterioration.state === 'deteriorating') {
    parts.push('perburukan klinis');
  } else if (global_deterioration.state === 'improving') {
    parts.push('perbaikan klinis');
  }

  return `${prognosis}: ${parts.join(', ')}.`;
}

/**
 * Check if prognosis indicates need for escalation
 * Returns true if patient needs immediate attention or referral
 */
export function requiresEscalation(prognosis: PrognosisValue): boolean {
  return (
    prognosis === 'Dubia Ad Malam (Tidak Tentu/Ragu-ragu, Cenderung Memburuk)' ||
    prognosis === 'Malam (Buruk/Jelek)'
  );
}
