import {
  type HybridTrajectoryResult,
  type HybridTrajectoryRedFlag,
  type HybridTrajectoryLongitudinalFrame,
  type ComplaintSignal,
  type HistoricalDiagnosisSignal,
  type TherapySignal,
} from './hybrid-trajectory';
import { clamp, round } from './math-utils';
import { sanitizeTrajectoryPresentationText } from './presentation-safety';
import {
  analyzeSymphonyTrajectory,
  type SymphonyTrajectoryAnalysis,
  type SymphonyTrajectoryRiskLevel,
  type SymphonyVitalKey,
} from './symphony-trajectory-core';

export type TrajectoryTimelineState =
  | 'stable'
  | 'mild_concern'
  | 'worsening'
  | 'high_concern'
  | 'critical_concern';

export interface TrajectoryTimelinePoint {
  visitLabel: string;
  date?: string;
  state: TrajectoryTimelineState;
  displayLabel: string;
  score?: number;
}

export interface TrajectoryVitalTrendPoint {
  visitLabel: string;
  date?: string;
  spo2?: number;
  pulse?: number;
  respiratoryRate?: number;
  temperature?: number;
  systolic?: number;
  diastolic?: number;
}

export interface TrajectoryVitalTrendMeta {
  primaryVitalDrivers: string[];
  missingVitalWarnings: string[];
}

export interface TrajectoryDriverContribution {
  driver: string;
  contribution: number;
  severity: 'low' | 'moderate' | 'high';
  explanation: string;
}

export interface TrajectoryBaselineDeviation {
  parameter: string;
  baseline?: number;
  current?: number;
  deviationLabel: 'within_baseline' | 'mild_deviation' | 'significant_deviation' | 'unknown';
  clinicalMeaning: string;
}

export interface TrajectoryBaselineAvailability {
  available: boolean;
  message?: string;
}

export interface TrajectoryMortalityProxy {
  tier: 'low' | 'moderate' | 'high' | 'very_high';
  score: number;
  clinicalUrgencyTier: 'low' | 'moderate' | 'high' | 'immediate';
}

export type PriorityTrajectoryId =
  | 'T-45'
  | 'T-46'
  | 'T-54'
  | 'T-50'
  | 'T-16'
  | 'T-59'
  | 'T-13'
  | 'T-52'
  | 'T-51'
  | 'T-25'
  | 'T-38'
  | 'T-58';

export interface PriorityTrajectoryCoverageItem {
  id: PriorityTrajectoryId;
  label: string;
  status: 'active' | 'supported' | 'inactive';
  evidence: string[];
}

export interface TrajectoryTimeToCriticalRow {
  parameter: string;
  hoursBestEstimate: number;
  currentValue: number;
  criticalThreshold: number;
  confidenceIntervalHours: number | null;
  isReliable: boolean;
}

export interface ClinicalTimelineRow {
  visitLabel: string;
  date?: string;
  complaint?: string;
  diagnosisLabel?: string;
  therapySummary?: string;
  source: string;
}

export interface RiskTrajectoryRow {
  visitLabel: string;
  date?: string;
  score: number;
  riskLevel: string;
  overallTrend: string;
  physiologyState: string;
  news2AggregateScore: number;
  confidence: number;
  momentumLabel: string;
}

export interface RedFlagTimelineRow {
  visitLabel: string;
  date?: string;
  redFlagLabels: string[];
}

export interface VisitToVisitDeltaRow {
  fromVisitLabel: string;
  toVisitLabel: string;
  fromDate?: string;
  toDate?: string;
  summary: string;
  vitalChanges: {
    spo2Delta?: number;
    heartRateDelta?: number;
    respiratoryRateDelta?: number;
    temperatureDelta?: number;
    systolicBpDelta?: number;
    diastolicBpDelta?: number;
    glucoseDelta?: number;
  };
}

export interface DiagnosticHypothesisEvolutionRow {
  visitLabel: string;
  date?: string;
  labels: string[];
}

export interface TrajectoryVisualizationViewModel {
  trajectoryTimeline: TrajectoryTimelinePoint[];
  vitalTrends: TrajectoryVitalTrendPoint[];
  vitalTrendMeta: TrajectoryVitalTrendMeta;
  keyDriverContributions: TrajectoryDriverContribution[];
  baselineDeviation: TrajectoryBaselineDeviation[];
  baselineAvailability: TrajectoryBaselineAvailability;
  mortalityProxy: TrajectoryMortalityProxy;
  priorityTrajectoryCoverage: PriorityTrajectoryCoverageItem[];
  timeToCritical: TrajectoryTimeToCriticalRow[];
  clinicalTimeline?: ClinicalTimelineRow[];
  riskTrajectory?: RiskTrajectoryRow[];
  redFlagTimeline?: RedFlagTimelineRow[];
  visitToVisitDelta?: VisitToVisitDeltaRow[];
  diagnosticHypothesisEvolution?: DiagnosticHypothesisEvolutionRow[];
  dataQualityWarnings: string[];
  uncertaintyNotes: string[];
}

type DriverContributionDraft = Omit<TrajectoryDriverContribution, 'severity'>;

const RISK_PRIORITY: Record<SymphonyTrajectoryRiskLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const VITAL_LABELS: Record<SymphonyVitalKey, string> = {
  spo2: 'SpO2',
  systolicBp: 'Tekanan darah sistolik',
  diastolicBp: 'Tekanan darah diastolik',
  heartRate: 'Nadi',
  respiratoryRate: 'Laju napas',
  temperatureC: 'Suhu',
  glucoseMgDl: 'Glukosa',
};

const BASELINE_PARAMETERS: Array<{
  key: SymphonyVitalKey;
  label: string;
  pickCurrent: (value: HybridTrajectoryResult['physiologicalInput'][number]) => number | undefined;
}> = [
  {
    key: 'spo2',
    label: 'SpO2',
    pickCurrent: (value) => value.spo2,
  },
  {
    key: 'heartRate',
    label: 'Nadi',
    pickCurrent: (value) => value.heartRate,
  },
  {
    key: 'respiratoryRate',
    label: 'Laju napas',
    pickCurrent: (value) => value.respiratoryRate,
  },
  {
    key: 'temperatureC',
    label: 'Suhu',
    pickCurrent: (value) => value.temperatureC,
  },
  {
    key: 'systolicBp',
    label: 'Tekanan darah sistolik',
    pickCurrent: (value) => value.systolicBp,
  },
  {
    key: 'diastolicBp',
    label: 'Tekanan darah diastolik',
    pickCurrent: (value) => value.diastolicBp,
  },
  {
    key: 'glucoseMgDl',
    label: 'Glukosa',
    pickCurrent: (value) => value.glucoseMgDl,
  },
];

const PRIORITY_TRAJECTORY_IDS: PriorityTrajectoryId[] = [
  'T-45',
  'T-46',
  'T-54',
  'T-50',
  'T-16',
  'T-59',
  'T-13',
  'T-52',
  'T-51',
  'T-25',
  'T-38',
  'T-58',
];

const PRIORITY_TRAJECTORY_LABELS: Record<PriorityTrajectoryId, string> = {
  'T-45': 'Respiratory worsening',
  'T-46': 'Hemodynamic instability',
  'T-54': 'Fever burden',
  'T-50': 'NEWS2 aggregate proxy',
  'T-16': 'Sepsis no-return proxy',
  'T-59': 'Cardiovascular shock trajectory',
  'T-13': 'Imminent cardiac arrest proxy',
  'T-52': 'Treatment response poor',
  'T-51': 'Treatment response good',
  'T-25': 'DM-to-renal baseline proxy',
  'T-38': '30-day readmission risk proxy',
  'T-58': 'Mortality risk usia lanjut proxy',
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isPriorityTrajectoryId(value: string): value is PriorityTrajectoryId {
  return (PRIORITY_TRAJECTORY_IDS as string[]).includes(value);
}

function sanitizeLine(text: string): string {
  return sanitizeTrajectoryPresentationText(text.replace(/\s+/g, ' ').trim());
}

function safeNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function formatVisitLabel(index: number): string {
  return `Kunjungan ${index + 1}`;
}

function formatVisitDate(value: string): string | undefined {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function formatSourceLabel(source: string | undefined): string {
  if (!source) return 'unknown';
  return sanitizeLine(source.toLowerCase());
}

function formatOverallTrendLabel(
  trend: HybridTrajectoryLongitudinalFrame['trajectorySummary']['overallTrend']
): string {
  switch (trend) {
    case 'improving':
      return sanitizeLine('Membaik');
    case 'stable':
      return sanitizeLine('Stabil');
    case 'declining':
      return sanitizeLine('Memburuk');
    case 'insufficient_data':
      return sanitizeLine('Data belum cukup');
    default:
      return sanitizeLine(String(trend));
  }
}

function formatPhysiologyStateLabel(
  state: HybridTrajectoryLongitudinalFrame['trajectorySummary']['physiologyState']
): string {
  switch (state) {
    case 'stable':
      return sanitizeLine('Stabil');
    case 'improving':
      return sanitizeLine('Membaik');
    case 'deteriorating':
      return sanitizeLine('Memburuk');
    case 'critical':
      return sanitizeLine('Kritis');
    default:
      return sanitizeLine(String(state));
  }
}

function formatMomentumLabel(
  frame: HybridTrajectoryLongitudinalFrame,
  previousFrame?: HybridTrajectoryLongitudinalFrame
): string {
  if (!previousFrame) return sanitizeLine('Titik awal trajectory');

  const scoreDelta =
    frame.trajectorySummary.deteriorationScore -
    previousFrame.trajectorySummary.deteriorationScore;
  if (
    frame.trajectorySummary.riskLevel !== previousFrame.trajectorySummary.riskLevel ||
    frame.trajectorySummary.physiologyState !== previousFrame.trajectorySummary.physiologyState ||
    scoreDelta >= 5
  ) {
    return sanitizeLine('Memburuk');
  }
  if (scoreDelta <= -5) {
    return sanitizeLine('Membaik');
  }
  return sanitizeLine('Relatif stabil');
}

function buildClinicalTimeline(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['clinicalTimeline'] {
  return result.longitudinalFrames.map((frame) => ({
    visitLabel: frame.visitLabel,
    date: formatVisitDate(frame.observedAt),
    complaint: frame.complaint ? sanitizeLine(frame.complaint) : undefined,
    diagnosisLabel: frame.diagnosisLabel ? sanitizeLine(frame.diagnosisLabel) : undefined,
    therapySummary: frame.therapySummary ? sanitizeLine(frame.therapySummary) : undefined,
    source: formatSourceLabel(frame.source),
  }));
}

function buildRiskTrajectory(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['riskTrajectory'] {
  return result.longitudinalFrames.map((frame, index, frames) => ({
    visitLabel: frame.visitLabel,
    date: formatVisitDate(frame.observedAt),
    score: round(frame.trajectorySummary.deteriorationScore, 1),
    riskLevel: sanitizeLine(frame.trajectorySummary.riskLevel),
    overallTrend: formatOverallTrendLabel(frame.trajectorySummary.overallTrend),
    physiologyState: formatPhysiologyStateLabel(frame.trajectorySummary.physiologyState),
    news2AggregateScore: round(frame.trajectorySummary.news2AggregateScore, 1),
    confidence: round(frame.trajectorySummary.confidence, 2),
    momentumLabel: formatMomentumLabel(frame, frames[index - 1]),
  }));
}

function buildRedFlagTimeline(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['redFlagTimeline'] {
  return result.longitudinalFrames.map((frame) => ({
    visitLabel: frame.visitLabel,
    date: formatVisitDate(frame.observedAt),
    redFlagLabels: uniqueStrings(frame.redFlagTitles.map(sanitizeLine)),
  }));
}

function deltaNumber(current: number | undefined, previous: number | undefined): number | undefined {
  if (current === undefined || previous === undefined) return undefined;
  return round(current - previous, 1);
}

function formatSignedDelta(label: string, delta: number | undefined): string | undefined {
  if (delta === undefined || delta === 0) return undefined;
  const direction = delta > 0 ? 'naik' : 'turun';
  return sanitizeLine(`${label} ${direction} ${Math.abs(delta)}`);
}

function buildVisitDeltaSummary(
  previous: HybridTrajectoryLongitudinalFrame,
  current: HybridTrajectoryLongitudinalFrame,
  changes: VisitToVisitDeltaRow['vitalChanges']
): string {
  const summaryParts = [
    current.trajectorySummary.deteriorationScore > previous.trajectorySummary.deteriorationScore
      ? 'Trajectory memburuk'
      : current.trajectorySummary.deteriorationScore < previous.trajectorySummary.deteriorationScore
        ? 'Trajectory membaik'
        : 'Trajectory relatif stabil',
    formatSignedDelta('SpO2', changes.spo2Delta),
    formatSignedDelta('Laju napas', changes.respiratoryRateDelta),
    formatSignedDelta('Nadi', changes.heartRateDelta),
    formatSignedDelta('Suhu', changes.temperatureDelta),
    formatSignedDelta('Glukosa', changes.glucoseDelta),
  ].filter(Boolean);

  return sanitizeLine(summaryParts.slice(0, 4).join('; '));
}

function buildVisitToVisitDelta(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['visitToVisitDelta'] {
  return result.longitudinalFrames.slice(1).map((frame, index) => {
    const previous = result.longitudinalFrames[index];
    const vitalChanges = {
      spo2Delta: deltaNumber(frame.vitalsSnapshot.spo2, previous.vitalsSnapshot.spo2),
      heartRateDelta: deltaNumber(
        frame.vitalsSnapshot.heartRate,
        previous.vitalsSnapshot.heartRate
      ),
      respiratoryRateDelta: deltaNumber(
        frame.vitalsSnapshot.respiratoryRate,
        previous.vitalsSnapshot.respiratoryRate
      ),
      temperatureDelta: deltaNumber(
        frame.vitalsSnapshot.temperatureC,
        previous.vitalsSnapshot.temperatureC
      ),
      systolicBpDelta: deltaNumber(
        frame.vitalsSnapshot.systolicBp,
        previous.vitalsSnapshot.systolicBp
      ),
      diastolicBpDelta: deltaNumber(
        frame.vitalsSnapshot.diastolicBp,
        previous.vitalsSnapshot.diastolicBp
      ),
      glucoseDelta: deltaNumber(
        frame.vitalsSnapshot.glucoseMgDl,
        previous.vitalsSnapshot.glucoseMgDl
      ),
    };

    return {
      fromVisitLabel: previous.visitLabel,
      toVisitLabel: frame.visitLabel,
      fromDate: formatVisitDate(previous.observedAt),
      toDate: formatVisitDate(frame.observedAt),
      summary: buildVisitDeltaSummary(previous, frame, vitalChanges),
      vitalChanges,
    };
  });
}

function buildDiagnosticHypothesisEvolution(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['diagnosticHypothesisEvolution'] {
  return result.longitudinalFrames.map((frame) => ({
    visitLabel: frame.visitLabel,
    date: formatVisitDate(frame.observedAt),
    labels: uniqueStrings(
      [frame.diagnosisLabel, ...frame.hypothesisLabels].map((item) => sanitizeLine(item || ''))
    ),
  }));
}

function mapUncertaintyToken(note: string): string {
  switch (note) {
    case 'insufficient_history_lt2':
    case 'history_depth_lt2':
      return 'Riwayat kunjungan kurang dari 2 titik; interpretasi trajectory masih sangat terbatas.';
    case 'history_depth_lt5':
      return 'Riwayat kunjungan kurang dari 5 titik; pembacaan pola jangka pendek lebih dominan.';
    case 'latest_spo2_missing':
      return 'SpO2 pada kunjungan terbaru belum tersedia.';
    case 'historical_spo2_missing':
      return 'SpO2 historis belum tersedia untuk perbandingan.';
    case 'current_complaint_sparse':
      return 'Keluhan utama saat ini masih terbatas.';
    case 'patient_age_missing_for_trajectory':
      return 'Usia pasien belum tersedia untuk kalibrasi trajectory.';
    case 'patient_consciousness_missing_for_trajectory':
      return 'Status kesadaran belum tersedia untuk review klinis.';
    case 'diagnosis_history_sparse':
      return 'Riwayat diagnosis historis masih terbatas.';
    case 'therapy_history_sparse':
      return 'Riwayat terapi historis masih terbatas.';
    case 'timestamp_quality_partial':
      return 'Sebagian timestamp kunjungan kurang lengkap.';
    case 'low_data_quality_limits_confidence':
      return 'Kualitas data membatasi keyakinan interpretasi trajectory.';
    case 'contextual_escalation_applied':
      return 'Severity akhir dinaikkan karena konteks klinis memerlukan perhatian lebih.';
    default:
      return note.includes('_')
        ? note
            .split('_')
            .filter(Boolean)
            .join(' ')
            .replace(/\blt2\b/i, 'kurang dari 2')
            .replace(/\blt5\b/i, 'kurang dari 5')
        : note;
  }
}

function mapTimelineState(
  risk: SymphonyTrajectoryRiskLevel | 'low' | 'moderate' | 'high' | 'critical',
  physiologicalState: SymphonyTrajectoryAnalysis['globalDeterioration']['state'],
  trend: SymphonyTrajectoryAnalysis['overallTrend'],
  confidence: number
): { state: TrajectoryTimelineState; displayLabel: string } {
  if (risk === 'critical' || physiologicalState === 'critical') {
    return { state: 'critical_concern', displayLabel: 'Kekhawatiran kritis' };
  }
  if (risk === 'high') {
    return { state: 'high_concern', displayLabel: 'Kekhawatiran tinggi' };
  }
  if (trend === 'declining' || physiologicalState === 'deteriorating') {
    return { state: 'worsening', displayLabel: 'Memburuk' };
  }
  if (risk === 'moderate' || trend === 'insufficient_data' || confidence < 0.45) {
    return { state: 'mild_concern', displayLabel: 'Perlu perhatian ringan' };
  }
  return { state: 'stable', displayLabel: 'Stabil' };
}

function buildTrajectoryTimeline(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['trajectoryTimeline'] {
  return result.physiologicalInput.map((sample, index) => {
    const prefixAnalysis = analyzeSymphonyTrajectory(result.physiologicalInput.slice(0, index + 1));
    const isLatest = index === result.physiologicalInput.length - 1;
    const state = mapTimelineState(
      isLatest
        ? result.integratedAssessment.calibratedSeverity
        : prefixAnalysis.clinicalSafeOutput.riskTier,
      isLatest ? result.integratedAssessment.finalState : prefixAnalysis.globalDeterioration.state,
      prefixAnalysis.overallTrend,
      isLatest
        ? result.integratedAssessment.confidence
        : prefixAnalysis.clinicalSafeOutput.confidence
    );

    return {
      visitLabel: formatVisitLabel(index),
      date: formatVisitDate(sample.observedAt),
      state: state.state,
      displayLabel: state.displayLabel,
      score: round(
        isLatest
          ? result.integratedAssessment.calibratedDeteriorationScore
          : prefixAnalysis.globalDeterioration.deteriorationScore,
        1
      ),
    };
  });
}

function buildVitalTrends(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['vitalTrends'] {
  return result.physiologicalInput.map((sample, index) => ({
    visitLabel: formatVisitLabel(index),
    date: formatVisitDate(sample.observedAt),
    spo2: safeNumber(sample.spo2),
    pulse: safeNumber(sample.heartRate),
    respiratoryRate: safeNumber(sample.respiratoryRate),
    temperature: safeNumber(sample.temperatureC),
    systolic: safeNumber(sample.systolicBp),
    diastolic: safeNumber(sample.diastolicBp),
  }));
}

function buildVitalTrendMeta(
  result: HybridTrajectoryResult,
  dataQualityWarnings: string[]
): TrajectoryVisualizationViewModel['vitalTrendMeta'] {
  const primaryVitalDrivers = result.physiologicalResult.vitalTrends
    .filter((trend) => trend.risk !== 'low' || Math.abs(trend.changePercent) >= 10)
    .sort((left, right) => {
      const riskDelta = RISK_PRIORITY[right.risk] - RISK_PRIORITY[left.risk];
      if (riskDelta !== 0) return riskDelta;
      return Math.abs(right.changePercent) - Math.abs(left.changePercent);
    })
    .slice(0, 3)
    .map((trend) => VITAL_LABELS[trend.parameter]);

  const missingVitalWarnings = dataQualityWarnings.filter((warning) =>
    /spo2|riwayat kunjungan|keluhan utama|timestamp/i.test(warning)
  );

  return {
    primaryVitalDrivers: uniqueStrings(primaryVitalDrivers),
    missingVitalWarnings: uniqueStrings(missingVitalWarnings),
  };
}

function severityContribution(level: 'low' | 'moderate' | 'high' | 'critical'): number {
  if (level === 'critical') return 90;
  if (level === 'high') return 72;
  if (level === 'moderate') return 48;
  return 24;
}

function toContributionSeverity(value: number): TrajectoryDriverContribution['severity'] {
  if (value >= 70) return 'high';
  if (value >= 40) return 'moderate';
  return 'low';
}

function pushDraft(
  drafts: DriverContributionDraft[],
  driver: string,
  contribution: number,
  explanation: string
): void {
  drafts.push({
    driver: sanitizeLine(driver),
    contribution: clamp(round(contribution, 1), 0, 100),
    explanation: sanitizeLine(explanation),
  });
}

function buildSignalContributions(
  drafts: DriverContributionDraft[],
  signals: Array<ComplaintSignal | HistoricalDiagnosisSignal | TherapySignal>,
  sourceBonus: number
): void {
  for (const signal of signals) {
    pushDraft(
      drafts,
      signal.label,
      severityContribution(signal.reviewSeverityFloor) + sourceBonus,
      signal.rationale
    );
  }
}

function buildRedFlagContributions(
  drafts: DriverContributionDraft[],
  redFlags: HybridTrajectoryRedFlag[]
): void {
  for (const flag of redFlags) {
    pushDraft(
      drafts,
      flag.title,
      severityContribution(flag.severity) + (flag.source === 'physiological' ? 6 : 0),
      flag.rationale
    );
  }
}

function buildVitalContributions(
  drafts: DriverContributionDraft[],
  analysis: SymphonyTrajectoryAnalysis
): void {
  const topVitalTrends = analysis.vitalTrends
    .filter((trend) => trend.risk !== 'low')
    .sort((left, right) => {
      const riskDelta = RISK_PRIORITY[right.risk] - RISK_PRIORITY[left.risk];
      if (riskDelta !== 0) return riskDelta;
      return Math.abs(right.changePercent) - Math.abs(left.changePercent);
    })
    .slice(0, 2);

  for (const trend of topVitalTrends) {
    pushDraft(
      drafts,
      `Perubahan ${VITAL_LABELS[trend.parameter]}`,
      severityContribution(trend.risk),
      `${VITAL_LABELS[trend.parameter]} menunjukkan pola ${trend.trend} dengan perubahan ${round(
        Math.abs(trend.changePercent),
        0
      )}%.`
    );
  }
}

function buildDataQualityContribution(
  drafts: DriverContributionDraft[],
  result: HybridTrajectoryResult
): void {
  if (result.clinicalContext.dataQualityScore >= 0.55) return;
  pushDraft(
    drafts,
    'Kualitas data',
    clamp(round((1 - result.clinicalContext.dataQualityScore) * 100, 1), 28, 78),
    `Kualitas data ${Math.round(result.clinicalContext.dataQualityScore * 100)}% sehingga interpretasi chart perlu kehati-hatian.`
  );
}

function trajectorySignalContribution(signalId: string, severity: string): number {
  if (signalId === 'T-13') return severity === 'critical' ? 88 : severity === 'high' ? 80 : 66;
  if (signalId === 'T-16') return severity === 'critical' ? 84 : severity === 'high' ? 76 : 62;
  if (signalId === 'T-45') return severity === 'critical' ? 80 : 68;
  if (signalId === 'T-46') return severity === 'critical' ? 82 : severity === 'high' ? 72 : 58;
  if (signalId === 'T-50') return severity === 'high' || severity === 'critical' ? 74 : 60;
  if (signalId === 'T-54') return severity === 'critical' ? 76 : severity === 'high' ? 66 : 54;
  if (signalId === 'T-59') return severity === 'critical' ? 86 : severity === 'high' ? 78 : 64;
  if (signalId === 'T-51') return severity === 'low' ? 44 : 52;
  if (signalId === 'T-52') return severity === 'high' || severity === 'critical' ? 78 : 62;
  if (signalId === 'T-58') return severity === 'high' || severity === 'critical' ? 74 : 58;
  if (signalId === 'T-38') return severity === 'high' || severity === 'critical' ? 70 : 56;
  if (signalId === 'T-25') return 54;
  return 42;
}

function buildTrajectorySignalContributions(
  drafts: DriverContributionDraft[],
  result: HybridTrajectoryResult
): void {
  for (const signal of result.clinicalIntelligence.trajectorySignals) {
    pushDraft(
      drafts,
      signal.label,
      trajectorySignalContribution(signal.id, signal.severity),
      `${signal.id}: ${signal.rationale} Evidence: ${signal.evidence.slice(0, 3).join('; ')}.`
    );
  }
}

function buildKeyDriverContributions(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['keyDriverContributions'] {
  const drafts: DriverContributionDraft[] = [];
  buildRedFlagContributions(drafts, result.redFlags);
  buildSignalContributions(drafts, result.clinicalContext.complaintSignals, 4);
  buildSignalContributions(drafts, result.clinicalContext.historicalDiagnosisSignals, 0);
  buildSignalContributions(drafts, result.clinicalContext.therapySignals, -4);
  buildVitalContributions(drafts, result.physiologicalResult);
  buildTrajectorySignalContributions(drafts, result);
  buildDataQualityContribution(drafts, result);

  const merged = new Map<string, DriverContributionDraft>();
  for (const item of drafts) {
    const current = merged.get(item.driver);
    if (!current || item.contribution > current.contribution) {
      merged.set(item.driver, item);
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      severity: toContributionSeverity(item.contribution),
    }));
}

function buildBaselineAvailability(result: HybridTrajectoryResult): TrajectoryBaselineAvailability {
  const baselineParamCount = Object.values(
    result.physiologicalResult.personalBaseline.params
  ).filter((value) => value?.mean !== undefined || value?.median !== undefined).length;

  if (result.physiologicalResult.personalBaseline.visitCount < 3 || baselineParamCount < 3) {
    return {
      available: false,
      message: 'Baseline personal belum cukup karena riwayat kunjungan masih terbatas.',
    };
  }

  return { available: true };
}

function deviationLabelFromValues(
  baseline: number,
  current: number
): TrajectoryBaselineDeviation['deviationLabel'] {
  const baselineMagnitude = Math.max(Math.abs(baseline), 1);
  const relativeDelta = Math.abs(current - baseline) / baselineMagnitude;
  if (relativeDelta < 0.08) return 'within_baseline';
  if (relativeDelta < 0.18) return 'mild_deviation';
  return 'significant_deviation';
}

function meaningForDeviation(
  parameter: string,
  deviation: TrajectoryBaselineDeviation['deviationLabel']
): string {
  if (deviation === 'within_baseline') {
    return sanitizeLine(`${parameter} masih dekat dengan baseline personal pasien.`);
  }
  if (deviation === 'mild_deviation') {
    return sanitizeLine(
      `${parameter} mulai bergeser dari baseline personal dan perlu korelasi klinis.`
    );
  }
  if (deviation === 'significant_deviation') {
    return sanitizeLine(
      `${parameter} menyimpang bermakna dari baseline personal dan layak diprioritaskan untuk review.`
    );
  }
  return sanitizeLine(`Baseline personal belum cukup untuk menilai ${parameter.toLowerCase()}.`);
}

function buildBaselineDeviation(
  result: HybridTrajectoryResult,
  availability: TrajectoryBaselineAvailability
): TrajectoryVisualizationViewModel['baselineDeviation'] {
  const latest = result.physiologicalInput.at(-1);

  return BASELINE_PARAMETERS.map((parameter) => {
    const current = safeNumber(latest ? parameter.pickCurrent(latest) : undefined);
    if (!availability.available) {
      return {
        parameter: parameter.label,
        current,
        deviationLabel: 'unknown',
        clinicalMeaning: meaningForDeviation(parameter.label, 'unknown'),
      };
    }

    const baselineParam = result.physiologicalResult.personalBaseline.params[parameter.key];
    const baseline = safeNumber(baselineParam?.mean ?? baselineParam?.median);
    if (baseline === undefined || current === undefined) {
      return {
        parameter: parameter.label,
        baseline,
        current,
        deviationLabel: 'unknown',
        clinicalMeaning: meaningForDeviation(parameter.label, 'unknown'),
      };
    }

    const deviationLabel = deviationLabelFromValues(baseline, current);
    return {
      parameter: parameter.label,
      baseline: round(baseline, 1),
      current: round(current, 1),
      deviationLabel,
      clinicalMeaning: meaningForDeviation(parameter.label, deviationLabel),
    };
  });
}

function buildMortalityProxy(result: HybridTrajectoryResult): TrajectoryMortalityProxy {
  const proxy = result.physiologicalResult.mortalityProxy;

  return {
    tier: proxy.tier,
    score: clamp(round(proxy.score, 1), 0, 100),
    clinicalUrgencyTier: proxy.clinicalUrgencyTier,
  };
}

function buildTimeToCriticalRows(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel['timeToCritical'] {
  return Object.values(result.physiologicalResult.timeToCriticalDetail)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(
      (item) =>
        typeof item.hoursBestEstimate === 'number' &&
        Number.isFinite(item.hoursBestEstimate) &&
        item.hoursBestEstimate > 0
    )
    .map((item) => ({
      parameter: VITAL_LABELS[item.parameter],
      hoursBestEstimate: round(item.hoursBestEstimate || 0, 1),
      currentValue: round(item.currentValue, 1),
      criticalThreshold: round(item.criticalThreshold, 1),
      confidenceIntervalHours:
        typeof item.confidenceIntervalHours === 'number' &&
        Number.isFinite(item.confidenceIntervalHours)
          ? round(item.confidenceIntervalHours, 1)
          : null,
      isReliable: item.isReliable,
    }))
    .sort((left, right) => left.hoursBestEstimate - right.hoursBestEstimate);
}

function prioritizeSelectedCpEvidence(id: PriorityTrajectoryId, evidence: string[]): string[] {
  const preferredCpByTrajectory: Partial<Record<PriorityTrajectoryId, string[]>> = {
    'T-13': ['CP-014', 'CP-063'],
    'T-45': ['CP-014'],
    'T-46': ['CP-063'],
    'T-59': ['CP-063'],
    'T-58': ['CP-064'],
    'T-25': ['CP-066'],
    'T-38': ['CP-066'],
  };
  const preferred = preferredCpByTrajectory[id] ?? [];
  if (preferred.length === 0) return evidence;

  return [...evidence].sort((left, right) => {
    const leftCp = left.match(/^(CP-\d+):/i)?.[1]?.toUpperCase();
    const rightCp = right.match(/^(CP-\d+):/i)?.[1]?.toUpperCase();
    const leftIndex = leftCp ? preferred.indexOf(leftCp) : -1;
    const rightIndex = rightCp ? preferred.indexOf(rightCp) : -1;
    const leftRank = leftIndex >= 0 ? leftIndex : preferred.length;
    const rightRank = rightIndex >= 0 ? rightIndex : preferred.length;
    return leftRank - rightRank;
  });
}

function buildPriorityTrajectoryCoverage(
  result: HybridTrajectoryResult
): PriorityTrajectoryCoverageItem[] {
  const evidenceById = new Map<PriorityTrajectoryId, string[]>();
  const statusById = new Map<PriorityTrajectoryId, PriorityTrajectoryCoverageItem['status']>();

  const addEvidence = (
    id: PriorityTrajectoryId,
    status: PriorityTrajectoryCoverageItem['status'],
    evidence: string[],
    preferNewEvidence = false
  ): void => {
    const currentStatus = statusById.get(id);
    if (status === 'active' || currentStatus === undefined) {
      statusById.set(id, status);
    } else if (currentStatus !== 'active' && status === 'supported') {
      statusById.set(id, 'supported');
    }

    const currentEvidence = evidenceById.get(id) ?? [];
    const sanitizedEvidence = evidence.map(sanitizeLine);
    const selectedCpEvidence = (items: string[]) =>
      prioritizeSelectedCpEvidence(
        id,
        items.filter((item) => /^CP-\d+:/i.test(item))
      );
    const nonSelectedCpEvidence = (items: string[]) =>
      items.filter((item) => !/^CP-\d+:/i.test(item));
    const nextEvidence = preferNewEvidence
      ? [
          sanitizedEvidence[0],
          ...selectedCpEvidence(currentEvidence),
          ...sanitizedEvidence.slice(1),
          ...nonSelectedCpEvidence(currentEvidence),
        ]
      : [
          ...selectedCpEvidence([...currentEvidence, ...sanitizedEvidence]),
          ...nonSelectedCpEvidence([...currentEvidence, ...sanitizedEvidence]),
        ];

    evidenceById.set(id, uniqueStrings(nextEvidence).slice(0, 3));
  };

  for (const pattern of result.clinicalIntelligence.selectedPatterns) {
    const status: PriorityTrajectoryCoverageItem['status'] =
      pattern.severity === 'warning' ? 'supported' : 'active';
    for (const id of pattern.trajectoryIds) {
      if (!isPriorityTrajectoryId(id)) continue;
      addEvidence(id, status, [
        `${pattern.id}: ${pattern.title}`,
        pattern.reasoning,
        ...pattern.criteriaMet,
      ]);
    }
  }

  for (const signal of result.clinicalIntelligence.trajectorySignals) {
    addEvidence(
      signal.id,
      signal.severity === 'low' ? 'supported' : 'active',
      [`${signal.id}: ${signal.label}`, signal.rationale, ...signal.evidence],
      true
    );
  }

  const news2 = result.clinicalIntelligence.news2;
  if (news2.scoreableParameters >= 2 && news2.riskLevel !== 'low') {
    const activeParameters = news2.parameterScores
      .filter((parameter) => parameter.score > 0)
      .slice(0, 2)
      .map((parameter) => `${parameter.parameter} skor ${parameter.score}`);
    addEvidence('T-50', news2.riskLevel === 'low_medium' ? 'supported' : 'active', [
      `NEWS2 aggregate ${news2.aggregateScore}`,
      ...activeParameters,
    ]);
  }

  const feverCount = result.physiologicalResult.earlyWarningBurden.breachBreakdown.tempGe385Count;
  const latestTemperature = safeNumber(result.physiologicalInput.at(-1)?.temperatureC);
  if (feverCount > 0 || (latestTemperature !== undefined && latestTemperature >= 38)) {
    addEvidence('T-54', feverCount > 0 ? 'active' : 'supported', [
      feverCount > 0 ? `Suhu >=38.5C pada ${feverCount} titik` : '',
      latestTemperature !== undefined ? `Suhu terbaru ${latestTemperature}C` : '',
    ]);
  }

  const shockRisk = result.physiologicalResult.acuteAttackRisk24h.shockDecompensationRisk;
  if (shockRisk >= 40) {
    const status: PriorityTrajectoryCoverageItem['status'] =
      shockRisk >= 65 ? 'active' : 'supported';
    addEvidence('T-46', status, [`Shock decompensation risk ${round(shockRisk, 0)}/100`]);
    addEvidence('T-59', status, [`Shock decompensation risk ${round(shockRisk, 0)}/100`]);
    addEvidence('T-13', status, [`Shock decompensation risk ${round(shockRisk, 0)}/100`]);
  }

  if (result.integratedAssessment.calibratedSeverity === 'critical') {
    addEvidence('T-13', 'active', ['Severity akhir kritis']);
    addEvidence('T-16', 'active', ['Severity akhir kritis']);
    addEvidence('T-58', 'active', ['Severity akhir kritis']);
  }

  return PRIORITY_TRAJECTORY_IDS.map((id) => ({
    id,
    label: PRIORITY_TRAJECTORY_LABELS[id],
    status: statusById.get(id) ?? 'inactive',
    evidence: evidenceById.get(id) ?? [],
  }));
}

export function buildTrajectoryVisualizationViewModel(
  result: HybridTrajectoryResult
): TrajectoryVisualizationViewModel {
  const dataQualityWarnings = uniqueStrings(
    result.missingDataWarnings.map((warning) => sanitizeLine(mapUncertaintyToken(warning)))
  );
  const uncertaintyNotes = uniqueStrings(
    result.uncertaintyNotes.map((warning) => sanitizeLine(mapUncertaintyToken(warning)))
  );
  const baselineAvailability = buildBaselineAvailability(result);

  return {
    trajectoryTimeline: buildTrajectoryTimeline(result),
    vitalTrends: buildVitalTrends(result),
    vitalTrendMeta: buildVitalTrendMeta(result, dataQualityWarnings),
    keyDriverContributions: buildKeyDriverContributions(result),
    baselineDeviation: buildBaselineDeviation(result, baselineAvailability),
    baselineAvailability: baselineAvailability.available
      ? baselineAvailability
      : {
          available: false,
          message: sanitizeLine(baselineAvailability.message || ''),
        },
    mortalityProxy: buildMortalityProxy(result),
    priorityTrajectoryCoverage: buildPriorityTrajectoryCoverage(result),
    timeToCritical: buildTimeToCriticalRows(result),
    clinicalTimeline: buildClinicalTimeline(result),
    riskTrajectory: buildRiskTrajectory(result),
    redFlagTimeline: buildRedFlagTimeline(result),
    visitToVisitDelta: buildVisitToVisitDelta(result),
    diagnosticHypothesisEvolution: buildDiagnosticHypothesisEvolution(result),
    dataQualityWarnings,
    uncertaintyNotes,
  };
}
