/**
 * Symphony trajectory physiology core.
 *
 * Adapted for local use from the Jewel/Sentra Nada trajectory engine so the
 * active repo can reuse the physiological model without depending on the
 * external monorepo structure.
 */

export type SymphonyTrajectoryRiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type SymphonyGlobalDeteriorationState =
  'improving' | 'stable' | 'deteriorating' | 'critical';
export type SymphonyMomentumLevel =
  'INSUFFICIENT_DATA' | 'STABLE' | 'DRIFTING' | 'ACCELERATING' | 'CONVERGING' | 'CRITICAL_MOMENTUM';
export type SymphonyConvergencePattern =
  'cardiovascular' | 'shock' | 'sepsis_like' | 'respiratory' | 'multi_system' | 'none';
export type SymphonyConsciousnessLevel =
  'alert' | 'confusion' | 'voice' | 'pain' | 'unresponsive' | 'unknown';
export type SymphonyTrajectoryDirection = 'worsening' | 'improving' | 'stable' | 'unknown';

import { clamp, round } from './math-utils';
export type SymphonyTrajectoryMomentum = 'rapid' | 'gradual' | 'flat' | 'insufficient_data';

export type SymphonyVitalKey =
  | 'systolicBp'
  | 'diastolicBp'
  | 'heartRate'
  | 'respiratoryRate'
  | 'temperatureC'
  | 'glucoseMgDl'
  | 'spo2';

export interface SymphonyVitalsInput {
  observedAt: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  glucoseMgDl?: number;
  spo2?: number;
  consciousness?: SymphonyConsciousnessLevel;
  /** On supplemental oxygen at the observation (NEWS2 +2). Undefined when not recorded. */
  supplementalO2?: boolean;
}

export interface SymphonyVitalTrend {
  parameter: SymphonyVitalKey;
  values: number[];
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  risk: SymphonyTrajectoryRiskLevel;
  changePercent: number;
}

export interface SymphonyEarlyWarningBurden {
  totalBreachesLast5: number;
  breachFrequency: number;
  breachBreakdown: {
    sbpGe160Count: number;
    tempGe385Count: number;
    glucoseGe300Count: number;
    hrExtremeCount: number;
    rrExtremeCount: number;
    spo2Lt94Count: number;
  };
}

export interface SymphonyAcuteAttackRisk24h {
  hypertensiveCrisisRisk: number;
  glycemicCrisisRisk: number;
  sepsisLikeDeteriorationRisk: number;
  shockDecompensationRisk: number;
  strokeAcsSuspicionRisk: number;
}

export interface SymphonyTimeToCriticalEstimate {
  systolicBpHoursToCritical: number | null;
  diastolicBpHoursToCritical: number | null;
  glucoseMgDlHoursToCritical: number | null;
  temperatureCHoursToCritical: number | null;
  heartRateHoursToCritical: number | null;
  respiratoryRateHoursToCritical: number | null;
  spo2HoursToCritical: number | null;
}

export interface SymphonyTimeToCriticalProjection {
  parameter: SymphonyVitalKey;
  currentValue: number;
  criticalThreshold: number;
  hoursLinear: number | null;
  hoursAccelAdjusted: number | null;
  hoursBestEstimate: number | null;
  confidenceIntervalHours: number | null;
  isReliable: boolean;
  label: string;
}

export interface SymphonyTrajectoryVolatility {
  volatilityIndex: number;
  stabilityLabel: 'true_stable' | 'pseudo_stable' | 'unstable';
}

export interface SymphonyPersonalBaselineParam {
  mean?: number;
  median?: number;
  currentZScore?: number;
}

export interface SymphonyPersonalBaseline {
  computedAt: string;
  visitCount: number;
  params: Partial<Record<SymphonyVitalKey, SymphonyPersonalBaselineParam>>;
}

export interface SymphonyMomentumParam {
  parameter: SymphonyVitalKey;
  values: number[];
  velocityPerHour: number;
  acceleration: number;
  worsening: boolean;
}

export type SymphonyTreatmentResponseInterpretation =
  'effective' | 'partially_effective' | 'ineffective' | 'worsening' | 'unknown';

export interface SymphonyTreatmentResponse {
  detected: boolean;
  parameter: SymphonyVitalKey | null;
  velocityBefore: number | null;
  velocityAfter: number | null;
  velocityChangePercent: number | null;
  interpretation: SymphonyTreatmentResponseInterpretation;
  narrative: string;
}

export interface SymphonyConvergenceResult {
  pattern: SymphonyConvergencePattern;
  convergenceScore: number;
  worseningParams: SymphonyVitalKey[];
  narrative: string;
}

export interface SymphonyMomentumAnalysis {
  level: SymphonyMomentumLevel;
  score: number;
  visitCount: number;
  params: SymphonyMomentumParam[];
  convergence: SymphonyConvergenceResult;
  narrative: string;
}

export interface SymphonyMortalityProxyRisk {
  tier: 'low' | 'moderate' | 'high' | 'very_high';
  score: number;
  clinicalUrgencyTier: 'low' | 'moderate' | 'high' | 'immediate';
}

export interface SymphonyClinicalSafeOutput {
  riskTier: SymphonyTrajectoryRiskLevel;
  confidence: number;
  drivers: string[];
  missingData: string[];
  recommendedAction: string;
  reviewWindow: '24h';
}

export interface SymphonyTrajectoryAnalysis {
  overallTrend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  overallRisk: SymphonyTrajectoryRiskLevel;
  vitalTrends: SymphonyVitalTrend[];
  visitCount: number;
  globalDeterioration: {
    state: SymphonyGlobalDeteriorationState;
    deteriorationScore: number;
  };
  acuteAttackRisk24h: SymphonyAcuteAttackRisk24h;
  earlyWarningBurden: SymphonyEarlyWarningBurden;
  trajectoryVolatility: SymphonyTrajectoryVolatility;
  timeToCriticalEstimate: SymphonyTimeToCriticalEstimate;
  timeToCriticalDetail: Partial<Record<SymphonyVitalKey, SymphonyTimeToCriticalProjection>>;
  treatmentResponse: SymphonyTreatmentResponse;
  mortalityProxy: SymphonyMortalityProxyRisk;
  clinicalSafeOutput: SymphonyClinicalSafeOutput;
  personalBaseline: SymphonyPersonalBaseline;
  momentum: SymphonyMomentumAnalysis;
  summary: string;
}

const VITAL_KEYS: SymphonyVitalKey[] = [
  'systolicBp',
  'diastolicBp',
  'heartRate',
  'respiratoryRate',
  'temperatureC',
  'glucoseMgDl',
  'spo2',
];

const NORMAL_RANGES: Record<SymphonyVitalKey, { min: number; max: number }> = {
  systolicBp: { min: 90, max: 139 },
  diastolicBp: { min: 60, max: 89 },
  heartRate: { min: 60, max: 100 },
  respiratoryRate: { min: 12, max: 20 },
  temperatureC: { min: 36.1, max: 37.5 },
  glucoseMgDl: { min: 70, max: 199 },
  spo2: { min: 96, max: 100 },
};

const CRITICAL_THRESHOLDS: Record<SymphonyVitalKey, { high?: number; low?: number }> = {
  systolicBp: { high: 180, low: 90 },
  diastolicBp: { high: 120, low: 50 },
  heartRate: { high: 140, low: 45 },
  respiratoryRate: { high: 30, low: 8 },
  temperatureC: { high: 40, low: 35 },
  glucoseMgDl: { high: 400, low: 54 },
  spo2: { low: 90 },
};

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
}

function standardDeviation(values: number[]): number {
  const mean = average(values);
  if (mean === undefined) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getValue(vitals: SymphonyVitalsInput, key: SymphonyVitalKey): number | undefined {
  const value = vitals[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function sortedVitals(vitals: SymphonyVitalsInput[]): SymphonyVitalsInput[] {
  return [...vitals]
    .filter((item) => VITAL_KEYS.some((key) => getValue(item, key) !== undefined))
    .sort(
      (left, right) => new Date(left.observedAt).getTime() - new Date(right.observedAt).getTime()
    )
    .slice(-5);
}

function deviationScore(value: number, key: SymphonyVitalKey): number {
  const range = NORMAL_RANGES[key];
  if (value < range.min) return ((range.min - value) / range.min) * 100;
  if (value > range.max) return ((value - range.max) / range.max) * 100;
  return 0;
}

function assessRisk(key: SymphonyVitalKey, value: number): SymphonyTrajectoryRiskLevel {
  switch (key) {
    case 'systolicBp':
      if (value >= 180 || value < 90) return 'critical';
      if (value >= 160 || value <= 100) return 'high';
      if (value >= 140 || value <= 110) return 'moderate';
      return 'low';
    case 'diastolicBp':
      if (value >= 120 || value < 50) return 'critical';
      if (value >= 100 || value < 60) return 'high';
      if (value >= 90) return 'moderate';
      return 'low';
    case 'heartRate':
      if (value > 140 || value < 45) return 'critical';
      if (value > 120 || value < 50) return 'high';
      if (value > 100 || value < 60) return 'moderate';
      return 'low';
    case 'respiratoryRate':
      if (value > 30 || value < 8) return 'critical';
      if (value > 24 || value < 10) return 'high';
      if (value > 20 || value < 12) return 'moderate';
      return 'low';
    case 'temperatureC':
      if (value >= 40 || value < 35) return 'critical';
      if (value >= 38.5) return 'high';
      if (value >= 37.5 || value < 36.1) return 'moderate';
      return 'low';
    case 'glucoseMgDl':
      if (value >= 400 || value < 54) return 'critical';
      if (value >= 300 || value < 70) return 'high';
      if (value >= 200) return 'moderate';
      return 'low';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 92) return 'high';
      if (value < 96) return 'moderate';
      return 'low';
  }
}

function isWorseningDirection(key: SymphonyVitalKey, delta: number): boolean {
  if (key === 'systolicBp' || key === 'diastolicBp' || key === 'spo2') return delta < 0;
  return delta > 0;
}

function detectTrend(values: number[], key: SymphonyVitalKey): SymphonyVitalTrend['trend'] {
  if (values.length < 2) return 'insufficient_data';
  const firstDeviation = deviationScore(values[0], key);
  const lastDeviation = deviationScore(values[values.length - 1], key);
  const deviationDelta = lastDeviation - firstDeviation;
  if (Math.abs(deviationDelta) < 4) return 'stable';
  return deviationDelta > 0 ? 'declining' : 'improving';
}

function riskScore(risk: SymphonyTrajectoryRiskLevel): number {
  if (risk === 'critical') return 1;
  if (risk === 'high') return 0.75;
  if (risk === 'moderate') return 0.45;
  return 0.1;
}

function buildVitalTrends(vitals: SymphonyVitalsInput[]): SymphonyVitalTrend[] {
  return VITAL_KEYS.map((key) => {
    const values = vitals
      .map((item) => getValue(item, key))
      .filter((value): value is number => value !== undefined);
    const firstValue = values[0] ?? 0;
    const lastValue = values[values.length - 1] ?? 0;
    return {
      parameter: key,
      values,
      trend: detectTrend(values, key),
      risk: values.length > 0 ? assessRisk(key, lastValue) : 'low',
      changePercent: firstValue > 0 ? round(((lastValue - firstValue) / firstValue) * 100, 1) : 0,
    };
  });
}

function buildEarlyWarningBurden(vitals: SymphonyVitalsInput[]): SymphonyEarlyWarningBurden {
  const breachBreakdown = {
    sbpGe160Count: 0,
    tempGe385Count: 0,
    glucoseGe300Count: 0,
    hrExtremeCount: 0,
    rrExtremeCount: 0,
    spo2Lt94Count: 0,
  };

  for (const item of vitals) {
    if ((item.systolicBp ?? 0) >= 160) breachBreakdown.sbpGe160Count += 1;
    if ((item.temperatureC ?? 0) >= 38.5) breachBreakdown.tempGe385Count += 1;
    if ((item.glucoseMgDl ?? 0) >= 300) breachBreakdown.glucoseGe300Count += 1;
    if ((item.heartRate ?? 0) > 120 || ((item.heartRate ?? 0) > 0 && (item.heartRate ?? 0) < 50)) {
      breachBreakdown.hrExtremeCount += 1;
    }
    if (
      (item.respiratoryRate ?? 0) > 24 ||
      ((item.respiratoryRate ?? 0) > 0 && (item.respiratoryRate ?? 0) < 10)
    ) {
      breachBreakdown.rrExtremeCount += 1;
    }
    if ((item.spo2 ?? 100) < 94) breachBreakdown.spo2Lt94Count += 1;
  }

  const totalBreachesLast5 = Object.values(breachBreakdown).reduce((sum, value) => sum + value, 0);
  return {
    totalBreachesLast5,
    breachFrequency: vitals.length > 0 ? round(totalBreachesLast5 / vitals.length, 2) : 0,
    breachBreakdown,
  };
}

function seriesVolatility(values: number[]): { cv: number; signFlips: number } {
  if (values.length < 2) return { cv: 0, signFlips: 0 };
  const mean = average(values);
  if (!mean) return { cv: 0, signFlips: 0 };
  const cv = (standardDeviation(values) / mean) * 100;
  let signFlips = 0;
  let previousSign = 0;
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const sign = delta === 0 ? 0 : delta > 0 ? 1 : -1;
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) signFlips += 1;
    if (sign !== 0) previousSign = sign;
  }
  return { cv, signFlips };
}

function buildTrajectoryVolatility(
  trends: SymphonyVitalTrend[],
  burden: SymphonyEarlyWarningBurden,
  overallTrend: SymphonyTrajectoryAnalysis['overallTrend']
): SymphonyTrajectoryVolatility {
  const active = trends.filter((trend) => trend.values.length >= 2);
  if (active.length === 0) return { volatilityIndex: 0, stabilityLabel: 'unstable' };
  const total = active.reduce(
    (acc, trend) => {
      const volatility = seriesVolatility(trend.values);
      acc.cv += clamp(volatility.cv, 0, 100);
      acc.signFlips += volatility.signFlips;
      return acc;
    },
    { cv: 0, signFlips: 0 }
  );
  const volatilityIndex = clamp(
    round(
      total.cv / active.length + total.signFlips * 5 + Math.min(20, burden.totalBreachesLast5 * 2)
    ),
    0,
    100
  );
  return {
    volatilityIndex,
    stabilityLabel:
      overallTrend === 'stable' && volatilityIndex <= 25 && burden.totalBreachesLast5 <= 1
        ? 'true_stable'
        : overallTrend === 'stable'
          ? 'pseudo_stable'
          : 'unstable',
  };
}

function buildAcuteRisk(latest: SymphonyVitalsInput | undefined): SymphonyAcuteAttackRisk24h {
  if (!latest) {
    return {
      hypertensiveCrisisRisk: 0,
      glycemicCrisisRisk: 0,
      sepsisLikeDeteriorationRisk: 0,
      shockDecompensationRisk: 0,
      strokeAcsSuspicionRisk: 0,
    };
  }

  let hypertensive = 15;
  if ((latest.systolicBp ?? 0) >= 180 || (latest.diastolicBp ?? 0) >= 120) hypertensive = 90;
  else if ((latest.systolicBp ?? 0) >= 160 || (latest.diastolicBp ?? 0) >= 100) hypertensive = 70;
  else if ((latest.systolicBp ?? 0) >= 140 || (latest.diastolicBp ?? 0) >= 90) hypertensive = 45;

  let glycemic = 15;
  if (
    (latest.glucoseMgDl ?? 0) >= 400 ||
    ((latest.glucoseMgDl ?? 0) > 0 && (latest.glucoseMgDl ?? 0) < 54)
  ) {
    glycemic = 92;
  } else if (
    (latest.glucoseMgDl ?? 0) >= 300 ||
    ((latest.glucoseMgDl ?? 0) > 0 && (latest.glucoseMgDl ?? 0) < 70)
  ) {
    glycemic = 78;
  } else if ((latest.glucoseMgDl ?? 0) >= 200) {
    glycemic = 55;
  }

  let sepsisLike = 5;
  if ((latest.temperatureC ?? 0) >= 38.5) sepsisLike += 30;
  if ((latest.temperatureC ?? 99) < 36) sepsisLike += 20;
  if ((latest.heartRate ?? 0) > 100) sepsisLike += 20;
  if ((latest.respiratoryRate ?? 0) >= 22) sepsisLike += 25;
  if ((latest.systolicBp ?? 999) <= 100) sepsisLike += 20;
  if (
    latest.consciousness !== undefined &&
    latest.consciousness !== 'alert' &&
    latest.consciousness !== 'unknown'
  ) {
    sepsisLike += 10;
  }

  let shock = 5;
  if ((latest.systolicBp ?? 999) < 90) shock += 45;
  else if ((latest.systolicBp ?? 999) <= 100) shock += 25;
  if ((latest.heartRate ?? 0) > 120) shock += 20;
  if (
    (latest.respiratoryRate ?? 0) > 24 ||
    ((latest.respiratoryRate ?? 0) > 0 && (latest.respiratoryRate ?? 0) < 10)
  ) {
    shock += 18;
  }
  if ((latest.temperatureC ?? 99) < 36) shock += 10;
  if ((latest.spo2 ?? 100) < 92) shock += 12;

  let strokeAcs = 10;
  if ((latest.systolicBp ?? 0) >= 180 || (latest.diastolicBp ?? 0) >= 120) strokeAcs += 32;
  if (
    (latest.heartRate ?? 0) > 120 ||
    ((latest.heartRate ?? 0) > 0 && (latest.heartRate ?? 0) < 50)
  ) {
    strokeAcs += 10;
  }
  if ((latest.spo2 ?? 100) < 92) strokeAcs += 8;

  return {
    hypertensiveCrisisRisk: clamp(Math.round(hypertensive), 0, 100),
    glycemicCrisisRisk: clamp(Math.round(glycemic), 0, 100),
    sepsisLikeDeteriorationRisk: clamp(Math.round(sepsisLike), 0, 100),
    shockDecompensationRisk: clamp(Math.round(shock), 0, 100),
    strokeAcsSuspicionRisk: clamp(Math.round(strokeAcs), 0, 100),
  };
}

function velocityPerHour(vitals: SymphonyVitalsInput[], key: SymphonyVitalKey): number {
  const points = vitals
    .map((item) => ({ value: getValue(item, key), timestamp: new Date(item.observedAt).getTime() }))
    .filter(
      (item): item is { value: number; timestamp: number } =>
        item.value !== undefined && Number.isFinite(item.timestamp)
    );
  if (points.length < 2) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  const hours = Math.max(1, (last.timestamp - first.timestamp) / 3_600_000);
  return round((last.value - first.value) / hours, 2);
}

function acceleration(vitals: SymphonyVitalsInput[], key: SymphonyVitalKey): number {
  const points = vitals
    .map((item) => ({ value: getValue(item, key), timestamp: new Date(item.observedAt).getTime() }))
    .filter(
      (item): item is { value: number; timestamp: number } =>
        item.value !== undefined && Number.isFinite(item.timestamp)
    );
  if (points.length < 3) return 0;
  const prevDelta = points[points.length - 2].value - points[points.length - 3].value;
  const lastDelta = points[points.length - 1].value - points[points.length - 2].value;
  return round(lastDelta - prevDelta, 2);
}

function getSeries(vitals: SymphonyVitalsInput[], key: SymphonyVitalKey): number[] {
  return vitals
    .map((item) => getValue(item, key))
    .filter((value): value is number => value !== undefined);
}

function buildMomentumParams(vitals: SymphonyVitalsInput[]): SymphonyMomentumParam[] {
  return VITAL_KEYS.map((parameter) => {
    const values = getSeries(vitals, parameter);
    const velocity = velocityPerHour(vitals, parameter);
    return {
      parameter,
      values,
      velocityPerHour: velocity,
      acceleration: acceleration(vitals, parameter),
      worsening: isWorseningDirection(parameter, velocity),
    };
  }).filter((param) => param.values.length >= 2 && param.velocityPerHour !== 0);
}

function predictTimeToCritical(
  param: SymphonyMomentumParam
): SymphonyTimeToCriticalProjection | null {
  const currentValue = param.values[param.values.length - 1];
  if (currentValue === undefined || currentValue <= 0) return null;
  const velocity = param.velocityPerHour;
  if (Math.abs(velocity) < 0.001) return null;

  const thresholds = CRITICAL_THRESHOLDS[param.parameter];
  let threshold: number | null = null;
  if (velocity > 0 && thresholds.high !== undefined && currentValue < thresholds.high) {
    threshold = thresholds.high;
  } else if (velocity < 0 && thresholds.low !== undefined && currentValue > thresholds.low) {
    threshold = thresholds.low;
  }
  if (threshold === null) return null;

  const delta = threshold - currentValue;
  const hoursLinear = delta / velocity;
  if (hoursLinear <= 0 || hoursLinear > 168) return null;

  let hoursAccelAdjusted: number | null = null;
  if (Math.abs(param.acceleration) > 0.001) {
    const a = 0.5 * param.acceleration;
    const b = velocity;
    const c = -delta;
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      const validRoots = [t1, t2].filter((root) => root > 0 && root <= 168);
      if (validRoots.length > 0) {
        hoursAccelAdjusted = Math.min(...validRoots);
      }
    }
  }

  const hoursBestEstimate = hoursAccelAdjusted ?? hoursLinear;
  const baseCi = Math.max(2, hoursBestEstimate * 0.2);
  const sparsityPenalty = param.values.length < 3 ? baseCi * 2 : 0;
  const accelPenalty = Math.abs(param.acceleration) > 0.1 ? hoursBestEstimate * 0.3 : 0;
  const confidenceIntervalHours = round(baseCi + sparsityPenalty + accelPenalty, 1);
  const isReliable = param.values.length >= 3 && confidenceIntervalHours < hoursBestEstimate * 0.6;
  const roundedBest = round(hoursBestEstimate, 1);

  return {
    parameter: param.parameter,
    currentValue: round(currentValue, 1),
    criticalThreshold: threshold,
    hoursLinear: round(hoursLinear, 1),
    hoursAccelAdjusted: hoursAccelAdjusted !== null ? round(hoursAccelAdjusted, 1) : null,
    hoursBestEstimate: roundedBest,
    confidenceIntervalHours,
    isReliable,
    label: isReliable
      ? `~${roundedBest} jam (±${confidenceIntervalHours} jam)`
      : `~${roundedBest} jam (timeline tidak pasti)`,
  };
}

function buildTimeToCriticalDetail(
  params: SymphonyMomentumParam[]
): Partial<Record<SymphonyVitalKey, SymphonyTimeToCriticalProjection>> {
  return params.reduce<Partial<Record<SymphonyVitalKey, SymphonyTimeToCriticalProjection>>>(
    (acc, param) => {
      const prediction = predictTimeToCritical(param);
      if (prediction) {
        acc[param.parameter] = prediction;
      }
      return acc;
    },
    {}
  );
}

export function detectSymphonyTreatmentResponse(
  params: SymphonyMomentumParam[]
): SymphonyTreatmentResponse {
  const worseningParam = params
    .filter((param) => param.worsening && param.values.length >= 4)
    .sort((left, right) => Math.abs(right.velocityPerHour) - Math.abs(left.velocityPerHour))[0];

  if (!worseningParam) {
    return {
      detected: false,
      parameter: null,
      velocityBefore: null,
      velocityAfter: null,
      velocityChangePercent: null,
      interpretation: 'unknown',
      narrative: 'Data tidak cukup untuk mendeteksi respons terapi (butuh >=4 observasi).',
    };
  }

  const midpoint = Math.floor(worseningParam.values.length / 2);
  const firstHalf = worseningParam.values.slice(0, midpoint);
  const secondHalf = worseningParam.values.slice(midpoint);
  if (firstHalf.length < 2 || secondHalf.length < 2) {
    return {
      detected: false,
      parameter: worseningParam.parameter,
      velocityBefore: null,
      velocityAfter: null,
      velocityChangePercent: null,
      interpretation: 'unknown',
      narrative: 'Tidak cukup data untuk analisis respons terapi.',
    };
  }

  const velocityBefore =
    (firstHalf[firstHalf.length - 1] - firstHalf[0]) / Math.max(1, firstHalf.length - 1);
  const velocityAfter =
    (secondHalf[secondHalf.length - 1] - secondHalf[0]) / Math.max(1, secondHalf.length - 1);
  const velocityChangePercent =
    Math.abs(velocityBefore) > 0.01
      ? round(
          ((Math.abs(velocityBefore) - Math.abs(velocityAfter)) / Math.abs(velocityBefore)) * 100,
          1
        )
      : null;

  let interpretation: SymphonyTreatmentResponseInterpretation = 'unknown';
  let narrative = 'Tidak dapat menilai respons terapi.';
  if (velocityChangePercent === null) {
    narrative = 'Tidak dapat menilai respons terapi karena slope awal terlalu kecil.';
  } else if (velocityChangePercent >= 50) {
    interpretation = 'effective';
    narrative = `Respons terapi efektif pada ${worseningParam.parameter}: kecepatan perburukan turun ${velocityChangePercent}%.`;
  } else if (velocityChangePercent >= 20) {
    interpretation = 'partially_effective';
    narrative = `Respons terapi parsial pada ${worseningParam.parameter}: kecepatan perburukan turun ${velocityChangePercent}%.`;
  } else if (velocityChangePercent >= -10) {
    interpretation = 'ineffective';
    narrative = `Terapi belum mengubah tren ${worseningParam.parameter} secara bermakna (${velocityChangePercent}%).`;
  } else {
    interpretation = 'worsening';
    narrative = `Perburukan tetap berakselerasi pada ${worseningParam.parameter}: slope memburuk ${Math.abs(velocityChangePercent)}%.`;
  }

  return {
    detected: Math.abs(velocityChangePercent ?? 0) > 10,
    parameter: worseningParam.parameter,
    velocityBefore: round(velocityBefore, 2),
    velocityAfter: round(velocityAfter, 2),
    velocityChangePercent,
    interpretation,
    narrative,
  };
}

function detectConvergence(params: SymphonyMomentumParam[]): SymphonyConvergenceResult {
  const worseningParams = params.filter((param) => param.worsening).map((param) => param.parameter);
  const has = (key: SymphonyVitalKey) => worseningParams.includes(key);
  let pattern: SymphonyConvergencePattern = 'none';
  if (has('temperatureC') && has('heartRate') && has('respiratoryRate')) pattern = 'sepsis_like';
  else if (has('systolicBp') && has('heartRate') && has('respiratoryRate')) pattern = 'shock';
  else if (has('spo2') && has('respiratoryRate')) pattern = 'respiratory';
  else if (has('systolicBp') && has('heartRate') && has('spo2')) pattern = 'cardiovascular';
  if (worseningParams.length >= 4 && pattern !== 'sepsis_like') pattern = 'multi_system';

  return {
    pattern,
    convergenceScore: worseningParams.length,
    worseningParams,
    narrative:
      pattern === 'none'
        ? 'Tidak ada pola konvergensi multi-parameter.'
        : `Konvergensi ${pattern} pada ${worseningParams.join(', ')}.`,
  };
}

function buildMomentum(vitals: SymphonyVitalsInput[]): SymphonyMomentumAnalysis {
  if (vitals.length < 2) {
    return {
      level: 'INSUFFICIENT_DATA',
      score: 0,
      visitCount: vitals.length,
      params: [],
      convergence: detectConvergence([]),
      narrative: 'Data tidak cukup untuk analisis momentum.',
    };
  }

  const params = buildMomentumParams(vitals);
  const convergence = detectConvergence(params);
  const worseningCount = convergence.convergenceScore;
  const acceleratingWorsening = params.filter(
    (param) => param.worsening && isWorseningDirection(param.parameter, param.acceleration)
  ).length;
  const score = clamp(
    worseningCount * 18 + acceleratingWorsening * 8 + (convergence.pattern !== 'none' ? 20 : 0),
    0,
    100
  );
  let level: SymphonyMomentumLevel = 'STABLE';
  if (score >= 80 || (worseningCount >= 4 && convergence.pattern !== 'none')) {
    level = 'CRITICAL_MOMENTUM';
  } else if (convergence.pattern !== 'none' && worseningCount >= 3) {
    level = 'CONVERGING';
  } else if (acceleratingWorsening >= 2) {
    level = 'ACCELERATING';
  } else if (worseningCount >= 1) {
    level = 'DRIFTING';
  }

  return {
    level,
    score,
    visitCount: vitals.length,
    params,
    convergence,
    narrative:
      level === 'STABLE' ? 'Momentum klinis stabil.' : `${level}: ${convergence.narrative}`,
  };
}

export function buildSymphonyPersonalBaseline(
  vitals: SymphonyVitalsInput[],
  computedAt = new Date().toISOString()
): SymphonyPersonalBaseline {
  const sorted = sortedVitals(vitals);
  const params = VITAL_KEYS.reduce<
    Partial<Record<SymphonyVitalKey, SymphonyPersonalBaselineParam>>
  >((acc, key) => {
    const values = sorted
      .map((item) => getValue(item, key))
      .filter((value): value is number => value !== undefined);
    if (values.length < 2) return acc;
    const mean = average(values);
    const med = median(values);
    const sd = standardDeviation(values);
    const current = values[values.length - 1];
    acc[key] = {
      mean: mean !== undefined ? round(mean, 2) : undefined,
      median: med !== undefined ? round(med, 2) : undefined,
      currentZScore: sd > 0 ? round((current - (mean ?? current)) / sd, 2) : 0,
    };
    return acc;
  }, {});

  return {
    computedAt,
    visitCount: sorted.length,
    params,
  };
}

function deriveOverallTrend(
  trends: SymphonyVitalTrend[],
  visitCount: number
): SymphonyTrajectoryAnalysis['overallTrend'] {
  if (visitCount < 2) return 'insufficient_data';
  const declining = trends.filter((trend) => trend.trend === 'declining').length;
  const improving = trends.filter((trend) => trend.trend === 'improving').length;
  if (declining > improving) return 'declining';
  if (improving > declining) return 'improving';
  return 'stable';
}

function deriveOverallRisk(trends: SymphonyVitalTrend[]): SymphonyTrajectoryRiskLevel {
  const risks = trends.map((trend) => trend.risk);
  if (risks.includes('critical')) return 'critical';
  if (risks.includes('high')) return 'high';
  if (risks.includes('moderate')) return 'moderate';
  return 'low';
}

function buildClinicalSafeOutput(
  state: SymphonyGlobalDeteriorationState,
  mortality: SymphonyMortalityProxyRisk,
  confidence: number,
  drivers: string[],
  missingData: string[]
): SymphonyClinicalSafeOutput {
  const riskTier: SymphonyTrajectoryRiskLevel =
    state === 'critical'
      ? 'critical'
      : mortality.tier === 'high' || mortality.tier === 'very_high'
        ? 'high'
        : mortality.tier === 'moderate'
          ? 'moderate'
          : 'low';

  return {
    riskTier,
    confidence,
    drivers,
    missingData,
    recommendedAction:
      riskTier === 'critical'
        ? 'Emergency review dan pertimbangkan rujukan segera.'
        : riskTier === 'high'
          ? 'Review klinis urgent dan monitoring ketat.'
          : riskTier === 'moderate'
            ? 'Review klinis hari yang sama.'
            : 'Monitoring rutin dan follow-up terjadwal.',
    reviewWindow: '24h',
  };
}

export function analyzeSymphonyTrajectory(
  vitals: SymphonyVitalsInput[]
): SymphonyTrajectoryAnalysis {
  const sorted = sortedVitals(vitals);
  const trends = buildVitalTrends(sorted);
  const overallTrend = deriveOverallTrend(trends, sorted.length);
  const overallRisk = deriveOverallRisk(trends);
  const burden = buildEarlyWarningBurden(sorted);
  const volatility = buildTrajectoryVolatility(trends, burden, overallTrend);
  const latest = sorted.at(-1);
  const acuteRisk = buildAcuteRisk(latest);
  const momentum = buildMomentum(sorted);
  const timeToCriticalDetail = buildTimeToCriticalDetail(momentum.params);
  const timeToCriticalEstimate = {
    systolicBpHoursToCritical: timeToCriticalDetail.systolicBp?.hoursBestEstimate ?? null,
    diastolicBpHoursToCritical: timeToCriticalDetail.diastolicBp?.hoursBestEstimate ?? null,
    glucoseMgDlHoursToCritical: timeToCriticalDetail.glucoseMgDl?.hoursBestEstimate ?? null,
    temperatureCHoursToCritical: timeToCriticalDetail.temperatureC?.hoursBestEstimate ?? null,
    heartRateHoursToCritical: timeToCriticalDetail.heartRate?.hoursBestEstimate ?? null,
    respiratoryRateHoursToCritical: timeToCriticalDetail.respiratoryRate?.hoursBestEstimate ?? null,
    spo2HoursToCritical: timeToCriticalDetail.spo2?.hoursBestEstimate ?? null,
  };
  const treatmentResponse = detectSymphonyTreatmentResponse(momentum.params);
  const acutePeak = Math.max(...Object.values(acuteRisk));
  const avgVitalRisk =
    trends.reduce((sum, trend) => sum + riskScore(trend.risk), 0) / Math.max(1, trends.length);
  const decliningCount = trends.filter((trend) => trend.trend === 'declining').length;
  const improvingCount = trends.filter((trend) => trend.trend === 'improving').length;
  const deteriorationScore = clamp(
    round(
      avgVitalRisk * 60 +
        decliningCount * 6 -
        improvingCount * 4 +
        Math.min(20, burden.totalBreachesLast5 * 3) +
        volatility.volatilityIndex * 0.2 +
        acutePeak * 0.15
    ),
    0,
    100
  );

  let state: SymphonyGlobalDeteriorationState = 'stable';
  if (acutePeak >= 85 || deteriorationScore >= 70) state = 'critical';
  else if (deteriorationScore >= 50) state = 'deteriorating';
  else if (overallTrend === 'improving' && deteriorationScore <= 35) state = 'improving';

  const mortalityScore = clamp(
    round(
      deteriorationScore * 0.35 +
        acutePeak * 0.35 +
        Math.min(100, burden.totalBreachesLast5 * 20) * 0.15 +
        volatility.volatilityIndex * 0.15 +
        (acuteRisk.sepsisLikeDeteriorationRisk >= 70 || acuteRisk.shockDecompensationRisk >= 70
          ? 10
          : 0)
    ),
    0,
    100
  );

  const mortality: SymphonyMortalityProxyRisk = {
    score: mortalityScore,
    tier:
      mortalityScore >= 75
        ? 'very_high'
        : mortalityScore >= 50
          ? 'high'
          : mortalityScore >= 25
            ? 'moderate'
            : 'low',
    clinicalUrgencyTier:
      mortalityScore >= 75
        ? 'immediate'
        : mortalityScore >= 50
          ? 'high'
          : mortalityScore >= 25
            ? 'moderate'
            : 'low',
  };

  const missingData = sorted.length < 2 ? ['insufficient_history_lt2'] : [];
  const confidence = round(clamp(sorted.length / 5, 0.1, 0.95), 2);
  const drivers = [
    ...(acuteRisk.sepsisLikeDeteriorationRisk >= 70
      ? ['Pola demam, takikardia, takipnea, dan tekanan darah rendah.']
      : []),
    ...(burden.totalBreachesLast5 > 0
      ? [`Early-warning burden ${burden.totalBreachesLast5} event.`]
      : []),
    ...(overallRisk === 'critical'
      ? ['Minimal satu parameter vital berada pada zona kritis.']
      : []),
  ];

  const clinicalSafeOutput = buildClinicalSafeOutput(
    state,
    mortality,
    confidence,
    drivers.length > 0 ? drivers : ['Tidak ada driver risiko dominan.'],
    missingData
  );

  return {
    overallTrend,
    overallRisk,
    vitalTrends: trends,
    visitCount: sorted.length,
    globalDeterioration: {
      state,
      deteriorationScore,
    },
    acuteAttackRisk24h: acuteRisk,
    earlyWarningBurden: burden,
    trajectoryVolatility: volatility,
    timeToCriticalEstimate,
    timeToCriticalDetail,
    treatmentResponse,
    mortalityProxy: mortality,
    clinicalSafeOutput,
    personalBaseline: buildSymphonyPersonalBaseline(sorted, latest?.observedAt),
    momentum,
    summary: `${state} trajectory with deterioration score ${deteriorationScore}/100, ${momentum.level} momentum, treatment response ${treatmentResponse.interpretation}.`,
  };
}

export function trajectoryDirectionFromAnalysis(
  analysis: SymphonyTrajectoryAnalysis
): SymphonyTrajectoryDirection {
  if (
    analysis.globalDeterioration.state === 'critical' ||
    analysis.globalDeterioration.state === 'deteriorating'
  ) {
    return 'worsening';
  }
  if (analysis.globalDeterioration.state === 'improving') return 'improving';
  if (analysis.overallTrend === 'stable') return 'stable';
  return 'unknown';
}

export function trajectoryMomentumFromAnalysis(
  analysis: SymphonyTrajectoryAnalysis
): SymphonyTrajectoryMomentum {
  if (
    analysis.momentum.level === 'CRITICAL_MOMENTUM' ||
    analysis.momentum.level === 'CONVERGING' ||
    analysis.momentum.level === 'ACCELERATING'
  ) {
    return 'rapid';
  }
  if (analysis.momentum.level === 'DRIFTING') return 'gradual';
  if (analysis.momentum.level === 'STABLE') return 'flat';
  return 'insufficient_data';
}
