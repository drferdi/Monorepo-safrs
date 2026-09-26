import { ChronicDiseaseType, classifyChronicDisease } from './chronic-disease-classifier';
import {
  buildClinicalTrajectoryIntelligence,
  type ClinicalEarlyWarningSeverity,
  type ClinicalLongitudinalContext,
  type ClinicalTrajectorySignalSeverity,
  type ClinicalTrajectoryIntelligenceResult,
} from './clinical-trajectory-intelligence';
import { clamp, round } from './math-utils';
import {
  analyzeSymphonyTrajectory,
  trajectoryMomentumFromAnalysis,
  type SymphonyConsciousnessLevel,
  type SymphonyTrajectoryAnalysis,
  type SymphonyTrajectoryRiskLevel,
  type SymphonyVitalsInput,
} from './symphony-trajectory-core';
import type { VisitRecord } from './visit-history-store';

import { normalizeVisitTherapySummary } from '@/lib/clinical/visit-history-format';
import {
  sanitizeTrajectoryPresentationLines,
  sanitizeTrajectoryPresentationText,
  sanitizeTrajectoryRecommendations,
} from '@/lib/iskandar-diagnosis-engine/presentation-safety';
import type {
  ClinicalSafeOutput,
  ConfirmedChronicDiagnosis,
  GlobalDeteriorationState,
  RiskLevel,
  TimeToCriticalEstimate,
  TrajectoryAnalysis,
  TrajectoryRecommendation,
  TrendDirection,
  VitalTrend,
} from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import { analyzeTrajectory } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';

const STROKE_KEYWORDS = [
  'pelo',
  'mulut mencong',
  'lemah sebelah',
  'kebas',
  'baal',
  'bicara pelo',
  'sakit kepala hebat',
];

const ACS_KEYWORDS = [
  'nyeri dada',
  'sesak',
  'keringat dingin',
  'nyeri menjalar',
  'mual',
  'dada berat',
];

const RESPIRATORY_KEYWORDS = ['sesak', 'napas', 'batuk', 'mengi', 'asma', 'ppo', 'oksigen'];
const INFECTIOUS_KEYWORDS = ['demam', 'menggigil', 'meriang', 'infeksi'];
const HIGH_RISK_THERAPY_RULES = [
  {
    id: 'insulin',
    label: 'Insulin/obat glikemik intensif',
    pattern: /\binsulin\b|\bmetformin\b|\bglimepirid\b/i,
  },
  {
    id: 'cardio',
    label: 'Terapi kardiovaskular aktif',
    pattern:
      /\bnitro\b|\bclopidogrel\b|\baspilet\b|\bbisoprolol\b|\bamlodipine\b|\bcaptopril\b|\bfurosemide\b/i,
  },
  {
    id: 'respiratory',
    label: 'Terapi respirasi aktif',
    pattern: /\bsalbutamol\b|\bbudesonide\b|\bnebul/i,
  },
];

const RISK_ORDER: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];

type LegacyVitalKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'glucose';

const LEGACY_VITAL_META: Record<
  LegacyVitalKey,
  {
    label: string;
    unit: string;
    symphonyKey: keyof HybridTrajectoryResult['physiologicalInput'][number];
  }
> = {
  sbp: { label: 'Tekanan Darah Sistolik', unit: 'mmHg', symphonyKey: 'systolicBp' },
  dbp: { label: 'Tekanan Darah Diastolik', unit: 'mmHg', symphonyKey: 'diastolicBp' },
  hr: { label: 'Denyut Nadi', unit: 'x/mnt', symphonyKey: 'heartRate' },
  rr: { label: 'Laju Pernapasan', unit: 'x/mnt', symphonyKey: 'respiratoryRate' },
  temp: { label: 'Suhu Tubuh', unit: '°C', symphonyKey: 'temperatureC' },
  glucose: { label: 'Gula Darah Sewaktu', unit: 'mg/dL', symphonyKey: 'glucoseMgDl' },
};

export interface HybridTrajectoryInput {
  visits: VisitRecord[];
  currentEncounter?: {
    keluhanUtama?: string;
    keluhanTambahan?: string;
    spo2?: number;
    consciousness?: SymphonyConsciousnessLevel;
    ageYears?: number;
  };
}

export interface ComplaintSignal {
  id: string;
  label: string;
  reviewSeverityFloor: RiskLevel;
  matchedKeywords: string[];
  rationale: string;
}

export interface HistoricalDiagnosisSignal {
  id: string;
  label: string;
  reviewSeverityFloor: RiskLevel;
  diagnoses: ConfirmedChronicDiagnosis[];
  rationale: string;
}

export interface TherapySignal {
  id: string;
  label: string;
  reviewSeverityFloor: RiskLevel;
  matchedTherapies: string[];
  rationale: string;
}

export interface ClinicianSourceContext {
  sourceBreakdown: {
    scrapeCount: number;
    uplinkCount: number;
  };
  clinicianAttributionCount: number;
  latestClinicianNames: string[];
  hasHistoricalClinicianContext: boolean;
}

export interface ClinicalContextExtraction {
  complaintSignals: ComplaintSignal[];
  historicalDiagnosisSignals: HistoricalDiagnosisSignal[];
  therapySignals: TherapySignal[];
  clinicianContext: ClinicianSourceContext;
  dataQualityScore: number;
  dataQualityWarnings: string[];
  confirmedChronicDiagnoses: ConfirmedChronicDiagnosis[];
}

export interface HybridTrajectoryRedFlag {
  id: string;
  severity: RiskLevel;
  source: 'physiological' | 'complaint' | 'history' | 'therapy' | 'data-quality';
  title: string;
  rationale: string;
}

export interface HybridIntegratedAssessment {
  physiologicalSeverity: RiskLevel;
  contextReviewFloor: RiskLevel;
  calibratedSeverity: RiskLevel;
  physiologicalState: string;
  finalState: GlobalDeteriorationState;
  physiologicalDeteriorationScore: number;
  calibratedDeteriorationScore: number;
  confidence: number;
  rationale: string[];
  recommendedAction: string;
}

export interface HybridTrajectoryLongitudinalFrame {
  visitLabel: string;
  observedAt: string;
  source: VisitRecord['source'];
  complaint?: string;
  diagnosisCode?: string;
  diagnosisLabel?: string;
  therapySummary?: string;
  vitalsSnapshot: {
    systolicBp?: number;
    diastolicBp?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperatureC?: number;
    glucoseMgDl?: number;
    spo2?: number;
    consciousness?: SymphonyConsciousnessLevel;
  };
  trajectorySummary: {
    overallTrend: SymphonyTrajectoryAnalysis['overallTrend'];
    physiologyState: SymphonyTrajectoryAnalysis['globalDeterioration']['state'];
    riskLevel: RiskLevel;
    deteriorationScore: number;
    confidence: number;
    news2AggregateScore: number;
  };
  redFlagTitles: string[];
  hypothesisLabels: string[];
}

export interface HybridTrajectoryResult {
  physiologicalInput: SymphonyVitalsInput[];
  physiologicalResult: SymphonyTrajectoryAnalysis;
  clinicalIntelligence: ClinicalTrajectoryIntelligenceResult;
  clinicalContext: ClinicalContextExtraction;
  integratedAssessment: HybridIntegratedAssessment;
  longitudinalFrames: HybridTrajectoryLongitudinalFrame[];
  uncertaintyNotes: string[];
  missingDataWarnings: string[];
  redFlags: HybridTrajectoryRedFlag[];
}

export interface HybridTrajectoryComparison {
  oldTrajectory: TrajectoryAnalysis;
  jewelPhysiologicalResult: SymphonyTrajectoryAnalysis;
  hybridTrajectory: HybridTrajectoryResult;
  agreement: string[];
  upgrades: string[];
  confidenceLimits: string[];
  evaluationReport: string[];
}

function toFlagBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function getProcessEnv(name: string): string | undefined {
  const maybeProcess = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return maybeProcess.process?.env?.[name];
}

function getImportMetaEnv(name: string): string | boolean | undefined {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  return env[name];
}

function getRuntimeFeatureFlag(name: string): string | boolean | undefined {
  const maybeGlobal = globalThis as {
    __SENTRA_FEATURE_FLAGS__?: Record<string, string | boolean | undefined>;
  };
  return maybeGlobal.__SENTRA_FEATURE_FLAGS__?.[name];
}

function normalizeText(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim().toLowerCase() || '';
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getRiskWeight(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

function maxRiskLevel(...levels: RiskLevel[]): RiskLevel {
  return levels.reduce(
    (best, next) => (getRiskWeight(next) > getRiskWeight(best) ? next : best),
    'low'
  );
}

function symphonyRiskToLegacy(level: SymphonyTrajectoryRiskLevel): RiskLevel {
  return level;
}

function formatVisitLabel(index: number): string {
  return `Kunjungan ${index + 1}`;
}

function parseVisitTime(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickSpo2FromVisit(visit: VisitRecord): number | undefined {
  const vitals = asObject(visit.vitals);
  const raw = vitals?.spo2;
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

function buildChronicDiagnosesFromVisits(visits: VisitRecord[]): ConfirmedChronicDiagnosis[] {
  const byType = new Map<ChronicDiseaseType, ConfirmedChronicDiagnosis>();

  for (const visit of [...visits].sort(
    (a, b) => parseVisitTime(b.timestamp) - parseVisitTime(a.timestamp)
  )) {
    const diagnosis = visit.diagnosa;
    if (!diagnosis?.icd_x) continue;
    const chronic = classifyChronicDisease(diagnosis.icd_x);
    if (!chronic) continue;
    if (byType.has(chronic.type)) continue;
    byType.set(chronic.type, {
      icd_x: diagnosis.icd_x.trim().toUpperCase(),
      nama: diagnosis.nama?.trim() || chronic.fullName,
      disease_type: chronic.type,
      confirmed_at: visit.timestamp,
    });
  }

  return Array.from(byType.values());
}

export function adaptVisitRecordsToSymphonyVitals(
  visits: VisitRecord[],
  currentEncounter?: HybridTrajectoryInput['currentEncounter']
): SymphonyVitalsInput[] {
  const sorted = [...visits].sort(
    (a, b) => parseVisitTime(a.timestamp) - parseVisitTime(b.timestamp)
  );
  const latestEncounterId = sorted.at(-1)?.encounter_id;

  return sorted.map((visit) => {
    const isLatest = visit.encounter_id === latestEncounterId;
    const visitSpo2 = pickSpo2FromVisit(visit);
    return {
      observedAt: visit.timestamp,
      systolicBp: visit.vitals.sbp > 0 ? visit.vitals.sbp : undefined,
      diastolicBp: visit.vitals.dbp > 0 ? visit.vitals.dbp : undefined,
      heartRate: visit.vitals.hr > 0 ? visit.vitals.hr : undefined,
      respiratoryRate: visit.vitals.rr > 0 ? visit.vitals.rr : undefined,
      temperatureC: visit.vitals.temp > 0 ? visit.vitals.temp : undefined,
      glucoseMgDl: visit.vitals.glucose > 0 ? visit.vitals.glucose : undefined,
      spo2: isLatest ? currentEncounter?.spo2 || visitSpo2 : visitSpo2,
      consciousness: isLatest ? currentEncounter?.consciousness : undefined,
    };
  });
}

function extractComplaintSignals(
  complaintText: string,
  physiological: SymphonyTrajectoryAnalysis,
  chronicDiagnoses: ConfirmedChronicDiagnosis[]
): ComplaintSignal[] {
  const normalized = normalizeText(complaintText);
  const signals: ComplaintSignal[] = [];
  const hasHistory = (types: ChronicDiseaseType[]) =>
    chronicDiagnoses.some((item) => types.includes(item.disease_type));

  const matchedStroke = STROKE_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  if (matchedStroke.length > 0) {
    signals.push({
      id: 'stroke-complaint',
      label: 'Keluhan neurologis fokal',
      reviewSeverityFloor: hasHistory([ChronicDiseaseType.STROKE, ChronicDiseaseType.HYPERTENSION])
        ? 'high'
        : 'moderate',
      matchedKeywords: matchedStroke,
      rationale: 'Keluhan mengarah ke stroke/TIA sehingga prioritas review tidak boleh rendah.',
    });
  }

  const matchedAcs = ACS_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  if (matchedAcs.length > 0) {
    signals.push({
      id: 'acs-complaint',
      label: 'Keluhan kardiopulmoner iskemik',
      reviewSeverityFloor: hasHistory([
        ChronicDiseaseType.CORONARY_HEART,
        ChronicDiseaseType.HEART_FAILURE,
        ChronicDiseaseType.DIABETES,
      ])
        ? 'high'
        : 'moderate',
      matchedKeywords: matchedAcs,
      rationale:
        'Keluhan nyeri dada/sesak perlu membentuk prioritas review walau fisiologi belum ekstrem.',
    });
  }

  const matchedResp = RESPIRATORY_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  if (
    matchedResp.length > 0 &&
    (physiological.acuteAttackRisk24h.shockDecompensationRisk >= 40 ||
      physiological.acuteAttackRisk24h.sepsisLikeDeteriorationRisk >= 40 ||
      physiological.vitalTrends.some((trend) => trend.parameter === 'spo2' && trend.risk !== 'low'))
  ) {
    signals.push({
      id: 'respiratory-complaint',
      label: 'Keluhan respirasi aktif',
      reviewSeverityFloor: 'high',
      matchedKeywords: matchedResp,
      rationale:
        'Keluhan respirasi dikombinasikan dengan sinyal fisiologis meningkatkan urgensi review.',
    });
  }

  const matchedInfectious = INFECTIOUS_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  if (
    matchedInfectious.length > 0 &&
    physiological.acuteAttackRisk24h.sepsisLikeDeteriorationRisk >= 40
  ) {
    signals.push({
      id: 'infectious-complaint',
      label: 'Keluhan infeksi/perburukan sistemik',
      reviewSeverityFloor: 'high',
      matchedKeywords: matchedInfectious,
      rationale:
        'Keluhan infeksi mendukung perlunya review segera bila pola fisiologi mengarah ke sepsis-like deterioration.',
    });
  }

  return signals;
}

function extractDiagnosisHistorySignals(
  visits: VisitRecord[],
  confirmedChronicDiagnoses: ConfirmedChronicDiagnosis[]
): HistoricalDiagnosisSignal[] {
  const signals: HistoricalDiagnosisSignal[] = [];
  const recurringIcd = new Map<string, number>();

  for (const visit of visits) {
    const code = visit.diagnosa?.icd_x?.trim().toUpperCase();
    if (!code) continue;
    recurringIcd.set(code, (recurringIcd.get(code) || 0) + 1);
  }

  const recurrentHighRisk = confirmedChronicDiagnoses.filter((item) =>
    [
      ChronicDiseaseType.CORONARY_HEART,
      ChronicDiseaseType.HEART_FAILURE,
      ChronicDiseaseType.CHRONIC_KIDNEY,
      ChronicDiseaseType.STROKE,
      ChronicDiseaseType.DIABETES,
    ].includes(item.disease_type)
  );

  if (recurrentHighRisk.length > 0) {
    signals.push({
      id: 'confirmed-high-risk-chronic',
      label: 'Riwayat kronik risiko tinggi',
      reviewSeverityFloor: 'high',
      diagnoses: recurrentHighRisk,
      rationale:
        'Riwayat kronik terkonfirmasi meningkatkan relevansi review dan differential, terutama saat trajectory memburuk.',
    });
  }

  const repeatedCoronary = Array.from(recurringIcd.entries()).filter(
    ([code, count]) => count >= 2 && (/^I2[0-5]/.test(code) || /^I6[0-4]/.test(code))
  );
  if (repeatedCoronary.length > 0) {
    signals.push({
      id: 'recurrent-cardiovascular-diagnosis',
      label: 'Riwayat diagnosis kardiovaskular berulang',
      reviewSeverityFloor: 'high',
      diagnoses: confirmedChronicDiagnoses.filter((item) =>
        repeatedCoronary.some(([code]) => item.icd_x.startsWith(code.slice(0, 3)))
      ),
      rationale:
        'Diagnosis kardiovaskular/stroke berulang menjaga prioritas review tetap tinggi walau snapshot fisiologi terlihat parsial.',
    });
  }

  return signals;
}

function extractTherapySignals(visits: VisitRecord[]): TherapySignal[] {
  const therapyLines = uniqueStrings(
    visits.map((visit) => normalizeVisitTherapySummary(visit.terapi_obat)).filter(Boolean)
  );
  const combined = therapyLines.join(' | ');
  if (!combined) return [];

  const signals: TherapySignal[] = [];
  for (const rule of HIGH_RISK_THERAPY_RULES) {
    const matches = therapyLines.filter((line) => rule.pattern.test(line));
    if (matches.length === 0) continue;
    signals.push({
      id: `therapy-${rule.id}`,
      label: rule.label,
      reviewSeverityFloor: rule.id === 'cardio' ? 'high' : 'moderate',
      matchedTherapies: matches,
      rationale: `${rule.label} memberi konteks bahwa pasien sudah berada pada jalur terapi yang relevan dengan trajectory saat ini.`,
    });
  }

  return signals;
}

function buildClinicianSourceContext(visits: VisitRecord[]): ClinicianSourceContext {
  const scrapeCount = visits.filter((visit) => visit.source === 'scrape').length;
  const uplinkCount = visits.filter((visit) => visit.source === 'uplink').length;
  const latest = [...visits].sort(
    (a, b) => parseVisitTime(b.timestamp) - parseVisitTime(a.timestamp)
  )[0];
  const latestClinicianNames = uniqueStrings(
    [latest?.dokter_penanganan?.trim() || '', latest?.perawat_penanganan?.trim() || ''].filter(
      Boolean
    )
  );
  const clinicianAttributionCount = visits.filter((visit) =>
    Boolean(visit.dokter_penanganan?.trim() || visit.perawat_penanganan?.trim())
  ).length;

  return {
    sourceBreakdown: {
      scrapeCount,
      uplinkCount,
    },
    clinicianAttributionCount,
    latestClinicianNames,
    hasHistoricalClinicianContext: clinicianAttributionCount > 0,
  };
}

function buildClinicalIntelligenceHistory(visits: VisitRecord[]): string[] {
  return uniqueStrings(
    visits.flatMap((visit) => [
      visit.keluhan_utama,
      visit.diagnosa?.nama || '',
      visit.diagnosa?.icd_x || '',
    ])
  );
}

function buildClinicalLongitudinalContext(
  visits: VisitRecord[],
  confirmedChronicDiagnoses: ConfirmedChronicDiagnosis[]
): ClinicalLongitudinalContext {
  const timestamps = visits
    .map((visit) => parseVisitTime(visit.timestamp))
    .filter((timestamp) => Number.isFinite(timestamp));
  const spanDays =
    timestamps.length >= 2
      ? Math.max(0, Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000))
      : null;
  const diagnosisCounts = new Map<string, number>();

  for (const visit of visits) {
    const code = visit.diagnosa?.icd_x?.trim().toUpperCase();
    if (!code) continue;
    diagnosisCounts.set(code, (diagnosisCounts.get(code) || 0) + 1);
  }

  const historyText = visits
    .flatMap((visit) => [
      visit.keluhan_utama,
      visit.diagnosa?.icd_x || '',
      visit.diagnosa?.nama || '',
    ])
    .join(' ')
    .toLowerCase();

  return {
    visitCount: visits.length,
    spanDays,
    hasDiabetes: confirmedChronicDiagnoses.some(
      (item) => item.disease_type === ChronicDiseaseType.DIABETES
    ),
    hasChronicKidney: confirmedChronicDiagnoses.some(
      (item) => item.disease_type === ChronicDiseaseType.CHRONIC_KIDNEY
    ),
    hasRenalHistory: /ginjal|renal|ckd|gagal ginjal|n18/.test(historyText),
    repeatedDiagnosisCount: Array.from(diagnosisCounts.values()).filter((count) => count >= 2)
      .length,
  };
}

function buildDataQuality(
  visits: VisitRecord[],
  physiologicalInput: SymphonyVitalsInput[],
  currentEncounter?: HybridTrajectoryInput['currentEncounter']
): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  const visitDepthScore = clamp(visits.length / 5, 0, 1);
  if (visits.length < 2) warnings.push('history_depth_lt2');
  if (visits.length < 5) warnings.push('history_depth_lt5');

  const latest = physiologicalInput.at(-1);
  const latestCoverage = latest
    ? [
        latest.systolicBp,
        latest.diastolicBp,
        latest.heartRate,
        latest.respiratoryRate,
        latest.temperatureC,
        latest.glucoseMgDl,
        latest.spo2,
      ].filter((value) => typeof value === 'number' && value > 0).length / 7
    : 0;
  if ((latest?.spo2 ?? 0) <= 0) warnings.push('latest_spo2_missing');

  const historicalSpo2Coverage =
    physiologicalInput.slice(0, -1).filter((sample) => (sample.spo2 ?? 0) > 0).length /
    Math.max(1, physiologicalInput.slice(0, -1).length);
  if (historicalSpo2Coverage === 0) warnings.push('historical_spo2_missing');

  const complaintCoverage = currentEncounter?.keluhanUtama?.trim() ? 1 : 0.4;
  if (!currentEncounter?.keluhanUtama?.trim()) warnings.push('current_complaint_sparse');
  if (!currentEncounter?.ageYears || currentEncounter.ageYears <= 0) {
    warnings.push('patient_age_missing_for_trajectory');
  }
  if (!latest?.consciousness || latest.consciousness === 'unknown') {
    warnings.push('patient_consciousness_missing_for_trajectory');
  }

  const diagnosisCoverage =
    visits.filter((visit) => Boolean(visit.diagnosa?.icd_x?.trim() && visit.diagnosa?.nama?.trim()))
      .length / Math.max(1, visits.length);
  if (diagnosisCoverage < 0.4) warnings.push('diagnosis_history_sparse');

  const therapyCoverage =
    visits.filter((visit) => Boolean(normalizeVisitTherapySummary(visit.terapi_obat))).length /
    Math.max(1, visits.length);
  if (therapyCoverage < 0.25) warnings.push('therapy_history_sparse');

  const timestampQuality =
    visits.filter((visit) => Number.isFinite(parseVisitTime(visit.timestamp))).length /
    Math.max(1, visits.length);
  if (timestampQuality < 1) warnings.push('timestamp_quality_partial');

  const score = clamp(
    round(
      visitDepthScore * 0.25 +
        latestCoverage * 0.3 +
        complaintCoverage * 0.15 +
        diagnosisCoverage * 0.12 +
        therapyCoverage * 0.08 +
        historicalSpo2Coverage * 0.05 +
        timestampQuality * 0.05,
      2
    ),
    0.1,
    0.98
  );

  return { score, warnings: uniqueStrings(warnings) };
}

export function extractClinicalTrajectoryContext(
  input: HybridTrajectoryInput,
  physiologicalResult: SymphonyTrajectoryAnalysis
): ClinicalContextExtraction {
  const confirmedChronicDiagnoses = buildChronicDiagnosesFromVisits(input.visits);
  const complaintText = [
    input.currentEncounter?.keluhanUtama,
    input.currentEncounter?.keluhanTambahan,
  ]
    .filter(Boolean)
    .join(' ');
  const complaintSignals = extractComplaintSignals(
    complaintText,
    physiologicalResult,
    confirmedChronicDiagnoses
  );
  const historicalDiagnosisSignals = extractDiagnosisHistorySignals(
    input.visits,
    confirmedChronicDiagnoses
  );
  const therapySignals = extractTherapySignals(input.visits);
  const clinicianContext = buildClinicianSourceContext(input.visits);
  const dataQuality = buildDataQuality(
    input.visits,
    adaptVisitRecordsToSymphonyVitals(input.visits, input.currentEncounter),
    input.currentEncounter
  );

  return {
    complaintSignals,
    historicalDiagnosisSignals,
    therapySignals,
    clinicianContext,
    dataQualityScore: dataQuality.score,
    dataQualityWarnings: dataQuality.warnings,
    confirmedChronicDiagnoses,
  };
}

function severityFloorFromSignals(context: ClinicalContextExtraction): RiskLevel {
  const signalFloors = [
    ...context.complaintSignals.map((item) => item.reviewSeverityFloor),
    ...context.historicalDiagnosisSignals.map((item) => item.reviewSeverityFloor),
    ...context.therapySignals.map((item) => item.reviewSeverityFloor),
  ];
  return signalFloors.length > 0 ? maxRiskLevel(...signalFloors) : 'low';
}

function severityToState(
  severity: RiskLevel,
  physiologicalState: string
): GlobalDeteriorationState {
  if (severity === 'critical') return 'critical';
  if (physiologicalState === 'improving' && severity !== 'high') return 'improving';
  if (severity === 'high' || physiologicalState === 'deteriorating') return 'deteriorating';
  return 'stable';
}

function buildRecommendedAction(severity: RiskLevel, confidence: number): string {
  if (severity === 'critical') {
    return 'EMERGENCY REVIEW: Stabilkan pasien, korelasikan dengan konteks klinis, dan siapkan eskalasi/rujukan sesuai indikasi.';
  }
  if (severity === 'high') {
    return 'URGENT REVIEW: Review klinis segera, cek ulang vital sign, dan korelasikan dengan keluhan, riwayat, serta terapi aktif.';
  }
  if (severity === 'moderate') {
    return confidence < 0.5
      ? 'REVIEW SAME DAY: Data belum lengkap, lakukan verifikasi klinis tambahan sebelum memberi reassurance.'
      : 'REVIEW SAME DAY: Korelasikan trajectory dengan pemeriksaan klinis dan respons terapi.';
  }
  return confidence < 0.45
    ? 'MONITOR WITH CAUTION: Trajectory tampak ringan namun data masih terbatas, hindari reassurance berlebihan.'
    : 'ROUTINE REVIEW: Lanjutkan monitoring dan follow-up terjadwal.';
}

function buildUncertaintyNotes(
  context: ClinicalContextExtraction,
  physiological: SymphonyTrajectoryAnalysis,
  calibratedSeverity: RiskLevel,
  physiologicalSeverity: RiskLevel
): string[] {
  const notes = [...context.dataQualityWarnings];
  if (
    getRiskWeight(calibratedSeverity) > getRiskWeight(physiologicalSeverity) &&
    context.complaintSignals.length > 0
  ) {
    notes.push('contextual_escalation_applied');
  }
  if (physiological.clinicalSafeOutput.missingData.length > 0) {
    notes.push(...physiological.clinicalSafeOutput.missingData);
  }
  if (context.dataQualityScore < 0.45) {
    notes.push('low_data_quality_limits_confidence');
  }
  return uniqueStrings(notes);
}

function selectedPatternReference(
  intelligence: ClinicalTrajectoryIntelligenceResult,
  gates: string[]
): string {
  const ids = uniqueStrings(
    intelligence.selectedPatterns
      .filter((pattern) => gates.includes(pattern.gate))
      .map((pattern) => pattern.id)
  );
  return ids.length > 0 ? ` Selected CP: ${ids.join(', ')}.` : '';
}

function selectedPatternGatesForWarning(patternId: string): string[] {
  if (/^RESP_/.test(patternId)) return ['GATE_RESP_FAILURE'];
  if (/SEPSIS|SIRS/.test(patternId)) return ['GATE_SEPSIS_EARLY', 'GATE_SEPTIC_SHOCK_HIGH'];
  return [];
}

function trajectorySignalSource(signalId: string): HybridTrajectoryRedFlag['source'] {
  return ['T-13', 'T-16', 'T-45', 'T-46', 'T-50', 'T-52', 'T-54', 'T-59'].includes(signalId)
    ? 'physiological'
    : 'history';
}

function buildRedFlags(
  physiological: SymphonyTrajectoryAnalysis,
  context: ClinicalContextExtraction,
  calibratedSeverity: RiskLevel,
  intelligence: ClinicalTrajectoryIntelligenceResult
): HybridTrajectoryRedFlag[] {
  const flags: HybridTrajectoryRedFlag[] = [];

  if (physiological.acuteAttackRisk24h.sepsisLikeDeteriorationRisk >= 70) {
    flags.push({
      id: 'physio-sepsis-like',
      severity: 'critical',
      source: 'physiological',
      title: 'Pola perburukan sistemik',
      rationale: 'Jewel physiology mendeteksi sepsis-like deterioration risk tinggi.',
    });
  }
  if (physiological.acuteAttackRisk24h.hypertensiveCrisisRisk >= 70) {
    flags.push({
      id: 'physio-ht-crisis',
      severity: 'high',
      source: 'physiological',
      title: 'Risiko krisis hipertensi',
      rationale: 'Trajectory fisiologis menunjukkan risiko tinggi krisis hipertensi.',
    });
  }
  if (context.complaintSignals.some((item) => item.id === 'stroke-complaint')) {
    flags.push({
      id: 'complaint-stroke-review',
      severity: 'high',
      source: 'complaint',
      title: 'Keluhan neurologis fokal',
      rationale:
        'Keluhan stroke-like harus memandu review prioritas tinggi meski skor fisiologi parsial.',
    });
  }
  if (context.complaintSignals.some((item) => item.id === 'acs-complaint')) {
    flags.push({
      id: 'complaint-acs-review',
      severity: 'high',
      source: 'complaint',
      title: 'Keluhan nyeri dada/sesak',
      rationale: 'Keluhan iskemik meningkatkan prioritas review dan relevansi differential.',
    });
  }
  if (context.dataQualityScore < 0.35 && calibratedSeverity === 'low') {
    flags.push({
      id: 'data-quality-no-reassurance',
      severity: 'moderate',
      source: 'data-quality',
      title: 'Data terlalu terbatas untuk reassurance',
      rationale: 'Kualitas data rendah harus menghasilkan kehati-hatian, bukan reassurance palsu.',
    });
  }
  if (intelligence.news2.scoreableParameters >= 2 && intelligence.news2.riskLevel !== 'low') {
    const isHigh = intelligence.news2.riskLevel === 'high';
    const abnormalParams = intelligence.news2.parameterScores
      .filter((parameter) => parameter.score > 0)
      .slice(0, 4)
      .map((parameter) => `${parameter.parameter} skor ${parameter.score}`);
    flags.push({
      id: isHigh ? 'clinical-news2-high' : 'clinical-news2-elevated',
      severity: isHigh ? 'high' : 'moderate',
      source: 'physiological',
      title: isHigh ? 'NEWS2 tinggi' : 'NEWS2 meningkat',
      rationale: `NEWS2 aggregate ${intelligence.news2.aggregateScore}; parameter aktif ${abnormalParams.join(', ') || 'tidak ada'}.`,
    });
  }
  if (intelligence.shockIndex) {
    flags.push({
      id: 'clinical-shock-index-high',
      severity: intelligenceSeverityToRisk(intelligence.shockIndex.severity),
      source: 'physiological',
      title: 'Shock Index tinggi',
      rationale: `${intelligence.shockIndex.criteriaMet.join('; ')}.${selectedPatternReference(
        intelligence,
        ['GATE_SHOCK_INDEX']
      )}`,
    });
  }
  for (const warning of intelligence.earlyWarnings) {
    const cpReference = selectedPatternReference(
      intelligence,
      selectedPatternGatesForWarning(warning.patternId)
    );
    flags.push({
      id: `clinical-pattern-${warning.patternId.toLowerCase().replace(/_/g, '-')}`,
      severity: intelligenceSeverityToRisk(warning.severity),
      source: 'physiological',
      title: warning.patternName,
      rationale: `${warning.condition}. ${warning.criteriaMet.slice(0, 4).join('; ')}.${cpReference}`,
    });
  }
  for (const signal of intelligence.trajectorySignals) {
    if (signal.id === 'T-51') continue;
    flags.push({
      id: `clinical-trajectory-${signal.id.toLowerCase().replace('-', '')}`,
      severity: trajectorySignalSeverityToRisk(signal.severity),
      source: trajectorySignalSource(signal.id),
      title: signal.label,
      rationale: `${signal.id}: ${signal.rationale} Evidence: ${signal.evidence.slice(0, 3).join('; ')}.`,
    });
  }

  return flags;
}

function intelligenceSeverityToRisk(severity: ClinicalEarlyWarningSeverity): RiskLevel {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  return 'moderate';
}

function trajectorySignalSeverityToRisk(severity: ClinicalTrajectorySignalSeverity): RiskLevel {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'moderate') return 'moderate';
  return 'low';
}

function buildIntegratedRationale(
  context: ClinicalContextExtraction,
  physiological: SymphonyTrajectoryAnalysis,
  calibratedSeverity: RiskLevel
): string[] {
  const rationale = [
    `Physiology: ${physiological.globalDeterioration.state} / risk ${physiological.clinicalSafeOutput.riskTier}.`,
    ...context.complaintSignals.map((item) => `Complaint signal: ${item.label}.`),
    ...context.historicalDiagnosisSignals.map((item) => `History signal: ${item.label}.`),
    ...context.therapySignals.map((item) => `Therapy signal: ${item.label}.`),
  ];

  if (context.dataQualityScore < 0.45) {
    rationale.push(`Data quality rendah (${Math.round(context.dataQualityScore * 100)}%).`);
  }
  rationale.push(`Calibrated review severity: ${calibratedSeverity}.`);
  return rationale.slice(0, 8);
}

function buildLongitudinalFrameRedFlagTitles(
  intelligence: ClinicalTrajectoryIntelligenceResult
): string[] {
  const prioritizedSignals = [
    'T-45',
    'T-46',
    'T-59',
    'T-13',
    'T-16',
    'T-50',
    'T-54',
    'T-52',
    'T-58',
    'T-38',
    'T-25',
  ];
  const titles = [
    ...(intelligence.shockIndex?.severity === 'high' ||
    intelligence.shockIndex?.severity === 'critical'
      ? ['Hemodynamic instability concern']
      : []),
    ...intelligence.trajectorySignals
      .filter((signal) => signal.severity === 'high' || signal.severity === 'critical')
      .sort(
        (left, right) => prioritizedSignals.indexOf(left.id) - prioritizedSignals.indexOf(right.id)
      )
      .map((signal) => sanitizeTrajectoryPresentationText(signal.label)),
    ...intelligence.earlyWarnings
      .filter((warning) => warning.severity === 'high' || warning.severity === 'critical')
      .map((warning) => sanitizeTrajectoryPresentationText(warning.patternName)),
  ];

  return uniqueStrings(titles).slice(0, 5);
}

function buildLongitudinalFrameHypotheses(
  visit: VisitRecord,
  intelligence: ClinicalTrajectoryIntelligenceResult
): string[] {
  return uniqueStrings([
    sanitizeTrajectoryPresentationText(visit.diagnosa?.nama?.trim() || ''),
    ...intelligence.trajectorySignals
      .filter((signal) => signal.severity === 'critical')
      .slice(0, 1)
      .map((signal) => sanitizeTrajectoryPresentationText(signal.label)),
    ...intelligence.selectedPatterns
      .slice(0, 2)
      .map((pattern) => sanitizeTrajectoryPresentationText(pattern.title)),
  ]).slice(0, 4);
}

function buildLongitudinalClinicalFrames(
  visits: VisitRecord[],
  physiologicalInput: SymphonyVitalsInput[],
  currentEncounter?: HybridTrajectoryInput['currentEncounter']
): HybridTrajectoryLongitudinalFrame[] {
  const chronologicalVisits = [...visits].sort(
    (a, b) => parseVisitTime(a.timestamp) - parseVisitTime(b.timestamp)
  );

  return chronologicalVisits.map((visit, index) => {
    const prefixVisits = chronologicalVisits.slice(0, index + 1);
    const prefixPhysiologicalInput = physiologicalInput.slice(0, index + 1);
    const prefixPhysiology = analyzeSymphonyTrajectory(prefixPhysiologicalInput);
    const prefixChronicDiagnoses = buildChronicDiagnosesFromVisits(prefixVisits);
    const isLatestVisit = index === chronologicalVisits.length - 1;
    const intelligence = buildClinicalTrajectoryIntelligence({
      latestVitals: prefixPhysiologicalInput.at(-1),
      chiefComplaint: isLatestVisit
        ? currentEncounter?.keluhanUtama || visit.keluhan_utama
        : visit.keluhan_utama,
      additionalComplaint: isLatestVisit ? currentEncounter?.keluhanTambahan : undefined,
      medicalHistory: buildClinicalIntelligenceHistory(prefixVisits),
      hasCOPD: prefixVisits.some((item) =>
        /j4[0-4]|ppok|copd/i.test(`${item.diagnosa?.icd_x || ''} ${item.diagnosa?.nama || ''}`)
      ),
      ageYears: isLatestVisit ? currentEncounter?.ageYears : undefined,
      longitudinalContext: buildClinicalLongitudinalContext(prefixVisits, prefixChronicDiagnoses),
      mortalityProxy: prefixPhysiology.mortalityProxy,
      treatmentResponse: prefixPhysiology.treatmentResponse,
      earlyWarningBurden: prefixPhysiology.earlyWarningBurden,
    });
    const latestVitals = prefixPhysiologicalInput.at(-1);

    return {
      visitLabel: formatVisitLabel(index),
      observedAt: visit.timestamp,
      source: visit.source,
      complaint: visit.keluhan_utama
        ? sanitizeTrajectoryPresentationText(visit.keluhan_utama)
        : undefined,
      diagnosisCode: visit.diagnosa?.icd_x?.trim().toUpperCase() || undefined,
      diagnosisLabel: visit.diagnosa?.nama
        ? sanitizeTrajectoryPresentationText(visit.diagnosa.nama)
        : undefined,
      therapySummary: normalizeVisitTherapySummary(visit.terapi_obat) || undefined,
      vitalsSnapshot: {
        systolicBp: latestVitals?.systolicBp,
        diastolicBp: latestVitals?.diastolicBp,
        heartRate: latestVitals?.heartRate,
        respiratoryRate: latestVitals?.respiratoryRate,
        temperatureC: latestVitals?.temperatureC,
        glucoseMgDl: latestVitals?.glucoseMgDl,
        spo2: latestVitals?.spo2,
        consciousness: latestVitals?.consciousness,
      },
      trajectorySummary: {
        overallTrend: prefixPhysiology.overallTrend,
        physiologyState: prefixPhysiology.globalDeterioration.state,
        riskLevel: symphonyRiskToLegacy(prefixPhysiology.clinicalSafeOutput.riskTier),
        deteriorationScore: round(prefixPhysiology.globalDeterioration.deteriorationScore, 1),
        confidence: round(prefixPhysiology.clinicalSafeOutput.confidence, 2),
        news2AggregateScore: intelligence.news2.aggregateScore,
      },
      redFlagTitles: buildLongitudinalFrameRedFlagTitles(intelligence),
      hypothesisLabels: buildLongitudinalFrameHypotheses(visit, intelligence),
    };
  });
}

export function analyzeHybridTrajectory(input: HybridTrajectoryInput): HybridTrajectoryResult {
  const physiologicalInput = adaptVisitRecordsToSymphonyVitals(
    input.visits,
    input.currentEncounter
  );
  const physiologicalResult = analyzeSymphonyTrajectory(physiologicalInput);
  const clinicalContext = extractClinicalTrajectoryContext(input, physiologicalResult);
  const clinicalIntelligence = buildClinicalTrajectoryIntelligence({
    latestVitals: physiologicalInput.at(-1),
    chiefComplaint: input.currentEncounter?.keluhanUtama,
    additionalComplaint: input.currentEncounter?.keluhanTambahan,
    medicalHistory: buildClinicalIntelligenceHistory(input.visits),
    hasCOPD: input.visits.some((visit) =>
      /j4[0-4]|ppok|copd/i.test(`${visit.diagnosa?.icd_x || ''} ${visit.diagnosa?.nama || ''}`)
    ),
    ageYears: input.currentEncounter?.ageYears,
    longitudinalContext: buildClinicalLongitudinalContext(
      input.visits,
      clinicalContext.confirmedChronicDiagnoses
    ),
    mortalityProxy: physiologicalResult.mortalityProxy,
    treatmentResponse: physiologicalResult.treatmentResponse,
    earlyWarningBurden: physiologicalResult.earlyWarningBurden,
  });
  const physiologicalSeverity = symphonyRiskToLegacy(
    physiologicalResult.clinicalSafeOutput.riskTier
  );
  const contextReviewFloor = severityFloorFromSignals(clinicalContext);
  const calibratedSeverity = maxRiskLevel(physiologicalSeverity, contextReviewFloor);
  const calibratedScore = clamp(
    round(
      physiologicalResult.globalDeterioration.deteriorationScore +
        Math.max(0, getRiskWeight(calibratedSeverity) - getRiskWeight(physiologicalSeverity)) * 8,
      1
    ),
    0,
    100
  );
  const confidence = round(
    clamp(
      physiologicalResult.clinicalSafeOutput.confidence * 0.7 +
        clinicalContext.dataQualityScore * 0.3,
      0.1,
      0.95
    ),
    2
  );
  const integratedAssessment: HybridIntegratedAssessment = {
    physiologicalSeverity,
    contextReviewFloor,
    calibratedSeverity,
    physiologicalState: physiologicalResult.globalDeterioration.state,
    finalState: severityToState(calibratedSeverity, physiologicalResult.globalDeterioration.state),
    physiologicalDeteriorationScore: physiologicalResult.globalDeterioration.deteriorationScore,
    calibratedDeteriorationScore: calibratedScore,
    confidence,
    rationale: buildIntegratedRationale(clinicalContext, physiologicalResult, calibratedSeverity),
    recommendedAction: buildRecommendedAction(calibratedSeverity, confidence),
  };

  const uncertaintyNotes = buildUncertaintyNotes(
    clinicalContext,
    physiologicalResult,
    calibratedSeverity,
    physiologicalSeverity
  );
  const missingDataWarnings = uniqueStrings([
    ...physiologicalResult.clinicalSafeOutput.missingData,
    ...clinicalContext.dataQualityWarnings,
  ]);
  const redFlags = buildRedFlags(
    physiologicalResult,
    clinicalContext,
    calibratedSeverity,
    clinicalIntelligence
  );
  const longitudinalFrames = buildLongitudinalClinicalFrames(
    input.visits,
    physiologicalInput,
    input.currentEncounter
  );

  return {
    physiologicalInput,
    physiologicalResult,
    clinicalIntelligence,
    clinicalContext,
    integratedAssessment,
    longitudinalFrames,
    uncertaintyNotes,
    missingDataWarnings,
    redFlags,
  };
}

function buildLegacyVitalTrendDates(
  input: SymphonyVitalsInput[],
  symphonyKey: keyof SymphonyVitalsInput
): string[] {
  return input
    .filter((item) => typeof item[symphonyKey] === 'number' && (item[symphonyKey] as number) > 0)
    .map((item) => {
      const date = new Date(item.observedAt);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
}

function mapVitalTrendsForLegacy(result: HybridTrajectoryResult): VitalTrend[] {
  const trendsByKey = new Map(
    result.physiologicalResult.vitalTrends.map((trend) => [trend.parameter, trend])
  );
  const legacyOrder: LegacyVitalKey[] = ['sbp', 'dbp', 'hr', 'rr', 'temp', 'glucose'];

  return legacyOrder.map((key) => {
    const meta = LEGACY_VITAL_META[key];
    const trend = trendsByKey.get(meta.symphonyKey as never);
    const values = trend?.values || [];
    const risk = symphonyRiskToLegacy(trend?.risk || 'low');
    const mappedTrend: TrendDirection = trend?.trend || 'insufficient_data';
    return {
      parameter: key,
      label: meta.label,
      unit: meta.unit,
      values,
      dates: buildLegacyVitalTrendDates(result.physiologicalInput, meta.symphonyKey),
      trend: mappedTrend,
      changePercent: trend?.changePercent || 0,
      isNormal: risk === 'low',
      risk,
      note:
        mappedTrend === 'declining'
          ? `${meta.label} memerlukan korelasi klinis lebih lanjut.`
          : mappedTrend === 'improving'
            ? `${meta.label} menunjukkan perbaikan fisiologis.`
            : mappedTrend === 'stable'
              ? `${meta.label} relatif stabil.`
              : `Data ${meta.label} belum cukup untuk analisis trend.`,
    };
  });
}

function mapTimeToCriticalForLegacy(result: HybridTrajectoryResult): TimeToCriticalEstimate {
  return {
    sbp_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.systolicBpHoursToCritical,
    dbp_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.diastolicBpHoursToCritical,
    gds_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.glucoseMgDlHoursToCritical,
    temp_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.temperatureCHoursToCritical,
    hr_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.heartRateHoursToCritical,
    rr_hours_to_critical:
      result.physiologicalResult.timeToCriticalEstimate.respiratoryRateHoursToCritical,
  };
}

function buildLegacyRecommendations(result: HybridTrajectoryResult): TrajectoryRecommendation[] {
  const recommendations: TrajectoryRecommendation[] = [
    {
      category: 'action',
      priority:
        result.integratedAssessment.calibratedSeverity === 'critical' ||
        result.integratedAssessment.calibratedSeverity === 'high'
          ? 'high'
          : 'medium',
      text: result.integratedAssessment.recommendedAction,
    },
    ...result.redFlags.slice(0, 3).map((flag): TrajectoryRecommendation => ({
      category: 'concern',
      priority: flag.severity === 'critical' || flag.severity === 'high' ? 'high' : 'medium',
      text: `${flag.title}: ${flag.rationale}`,
    })),
  ];

  if (result.uncertaintyNotes.length > 0) {
    recommendations.push({
      category: 'monitoring',
      priority: 'medium',
      text: `Ketidakpastian data: ${result.uncertaintyNotes.slice(0, 3).join(', ')}.`,
    });
  }

  return recommendations;
}

export function mapHybridTrajectoryToLegacyAnalysis(
  result: HybridTrajectoryResult
): TrajectoryAnalysis {
  const physiological = result.physiologicalResult;
  const clinicalSafeOutput: ClinicalSafeOutput = {
    risk_tier: result.integratedAssessment.calibratedSeverity,
    confidence: result.integratedAssessment.confidence,
    drivers: sanitizeTrajectoryPresentationLines(result.integratedAssessment.rationale),
    missing_data: result.missingDataWarnings,
    recommended_action: sanitizeTrajectoryPresentationText(
      result.integratedAssessment.recommendedAction
    ),
    review_window: '24h',
  };

  return {
    overallTrend: physiological.overallTrend,
    overallRisk: result.integratedAssessment.calibratedSeverity,
    vitalTrends: mapVitalTrendsForLegacy(result),
    recommendations: sanitizeTrajectoryRecommendations(buildLegacyRecommendations(result)),
    summary: sanitizeTrajectoryPresentationText(
      `${physiological.summary} Context review severity ${result.integratedAssessment.calibratedSeverity}.`
    ),
    visitCount: physiological.visitCount,
    global_deterioration: {
      state: result.integratedAssessment.finalState,
      deterioration_score: result.integratedAssessment.calibratedDeteriorationScore,
    },
    acute_attack_risk_24h: {
      hypertensive_crisis_risk: physiological.acuteAttackRisk24h.hypertensiveCrisisRisk,
      glycemic_crisis_risk: physiological.acuteAttackRisk24h.glycemicCrisisRisk,
      sepsis_like_deterioration_risk: physiological.acuteAttackRisk24h.sepsisLikeDeteriorationRisk,
      shock_decompensation_risk: physiological.acuteAttackRisk24h.shockDecompensationRisk,
      stroke_acs_suspicion_risk: physiological.acuteAttackRisk24h.strokeAcsSuspicionRisk,
    },
    early_warning_burden: {
      total_breaches_last5: physiological.earlyWarningBurden.totalBreachesLast5,
      breach_frequency: physiological.earlyWarningBurden.breachFrequency,
      breach_breakdown: {
        sbp_ge_160_count: physiological.earlyWarningBurden.breachBreakdown.sbpGe160Count,
        temp_ge_38_5_count: physiological.earlyWarningBurden.breachBreakdown.tempGe385Count,
        gds_ge_300_count: physiological.earlyWarningBurden.breachBreakdown.glucoseGe300Count,
        hr_extreme_count: physiological.earlyWarningBurden.breachBreakdown.hrExtremeCount,
        rr_extreme_count: physiological.earlyWarningBurden.breachBreakdown.rrExtremeCount,
      },
    },
    trajectory_volatility: {
      volatility_index: physiological.trajectoryVolatility.volatilityIndex,
      stability_label: physiological.trajectoryVolatility.stabilityLabel,
    },
    time_to_critical_estimate: mapTimeToCriticalForLegacy(result),
    mortality_proxy: {
      mortality_proxy_tier: physiological.mortalityProxy.tier,
      mortality_proxy_score: physiological.mortalityProxy.score,
      clinical_urgency_tier: physiological.mortalityProxy.clinicalUrgencyTier,
    },
    clinical_safe_output: clinicalSafeOutput,
    confirmed_chronic_diagnoses: result.clinicalContext.confirmedChronicDiagnoses,
  };
}

export function compareTrajectoryEngines(input: HybridTrajectoryInput): HybridTrajectoryComparison {
  const oldTrajectory = analyzeTrajectory(input.visits);
  const hybridTrajectory = analyzeHybridTrajectory(input);
  const jewelPhysiologicalResult = hybridTrajectory.physiologicalResult;

  const agreement: string[] = [];
  if (oldTrajectory.overallTrend === jewelPhysiologicalResult.overallTrend) {
    agreement.push(`Trend sepakat: ${oldTrajectory.overallTrend}.`);
  }
  if (oldTrajectory.overallRisk === hybridTrajectory.integratedAssessment.calibratedSeverity) {
    agreement.push(`Severity akhir sepakat: ${oldTrajectory.overallRisk}.`);
  }
  if (oldTrajectory.confirmed_chronic_diagnoses.length > 0) {
    agreement.push('Riwayat diagnosis kronik tetap terbawa ke hasil hybrid.');
  }

  const upgrades: string[] = [];
  if (
    trajectoryMomentumFromAnalysis(jewelPhysiologicalResult) !== 'insufficient_data' &&
    trajectoryMomentumFromAnalysis(jewelPhysiologicalResult) !== 'flat'
  ) {
    upgrades.push(
      `Hybrid menambah momentum fisiologis: ${trajectoryMomentumFromAnalysis(jewelPhysiologicalResult)}.`
    );
  }
  if (jewelPhysiologicalResult.timeToCriticalDetail.spo2) {
    upgrades.push('Hybrid menambah time-to-critical untuk SpO2 yang tidak ada di engine lama.');
  }
  if (
    getRiskWeight(hybridTrajectory.integratedAssessment.calibratedSeverity) >
    getRiskWeight(oldTrajectory.overallRisk)
  ) {
    upgrades.push(
      `Hybrid menaikkan review severity dari ${oldTrajectory.overallRisk} ke ${hybridTrajectory.integratedAssessment.calibratedSeverity} karena context klinis.`
    );
  }
  if (hybridTrajectory.redFlags.length > 0) {
    upgrades.push(
      `Hybrid menambah ${hybridTrajectory.redFlags.length} red flag lintas fisiologi + context.`
    );
  }

  const confidenceLimits = hybridTrajectory.uncertaintyNotes.map((item) => item.replace(/_/g, ' '));
  const evaluationReport = [
    `Old engine: trend=${oldTrajectory.overallTrend}, risk=${oldTrajectory.overallRisk}.`,
    `Jewel physiology: trend=${jewelPhysiologicalResult.overallTrend}, risk=${jewelPhysiologicalResult.clinicalSafeOutput.riskTier}, momentum=${trajectoryMomentumFromAnalysis(jewelPhysiologicalResult)}.`,
    `Hybrid final: severity=${hybridTrajectory.integratedAssessment.calibratedSeverity}, confidence=${Math.round(hybridTrajectory.integratedAssessment.confidence * 100)}%, redFlags=${hybridTrajectory.redFlags.length}.`,
    ...agreement.map((line) => `AGREE: ${line}`),
    ...upgrades.map((line) => `UPGRADE: ${line}`),
    ...confidenceLimits.slice(0, 4).map((line) => `LIMIT: ${line}`),
  ];

  return {
    oldTrajectory,
    jewelPhysiologicalResult,
    hybridTrajectory,
    agreement,
    upgrades,
    confidenceLimits,
    evaluationReport,
  };
}

export function isHybridTrajectoryEngineEnabled(): boolean {
  return (
    toFlagBool(getRuntimeFeatureFlag('USE_HYBRID_TRAJECTORY_ENGINE')) ||
    toFlagBool(getRuntimeFeatureFlag('VITE_USE_HYBRID_TRAJECTORY_ENGINE')) ||
    toFlagBool(getImportMetaEnv('USE_HYBRID_TRAJECTORY_ENGINE')) ||
    toFlagBool(getImportMetaEnv('VITE_USE_HYBRID_TRAJECTORY_ENGINE')) ||
    toFlagBool(getProcessEnv('USE_HYBRID_TRAJECTORY_ENGINE')) ||
    toFlagBool(getProcessEnv('VITE_USE_HYBRID_TRAJECTORY_ENGINE'))
  );
}

export function isTrajectoryVisualizationPanelEnabled(): boolean {
  return (
    toFlagBool(getRuntimeFeatureFlag('USE_TRAJECTORY_VISUALIZATION_PANEL')) ||
    toFlagBool(getRuntimeFeatureFlag('VITE_USE_TRAJECTORY_VISUALIZATION_PANEL')) ||
    toFlagBool(getImportMetaEnv('USE_TRAJECTORY_VISUALIZATION_PANEL')) ||
    toFlagBool(getImportMetaEnv('VITE_USE_TRAJECTORY_VISUALIZATION_PANEL')) ||
    toFlagBool(getProcessEnv('USE_TRAJECTORY_VISUALIZATION_PANEL')) ||
    toFlagBool(getProcessEnv('VITE_USE_TRAJECTORY_VISUALIZATION_PANEL'))
  );
}

export function isClinicalTrajectoryV2Enabled(): boolean {
  return (
    toFlagBool(getRuntimeFeatureFlag('USE_CLINICAL_TRAJECTORY_V2')) ||
    toFlagBool(getRuntimeFeatureFlag('VITE_USE_CLINICAL_TRAJECTORY_V2')) ||
    toFlagBool(getImportMetaEnv('USE_CLINICAL_TRAJECTORY_V2')) ||
    toFlagBool(getImportMetaEnv('VITE_USE_CLINICAL_TRAJECTORY_V2')) ||
    toFlagBool(getProcessEnv('USE_CLINICAL_TRAJECTORY_V2')) ||
    toFlagBool(getProcessEnv('VITE_USE_CLINICAL_TRAJECTORY_V2'))
  );
}

export function isTrajectoryCompareModeEnabled(): boolean {
  return (
    toFlagBool(getRuntimeFeatureFlag('TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getRuntimeFeatureFlag('VITE_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getRuntimeFeatureFlag('SENTRA_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getRuntimeFeatureFlag('VITE_SENTRA_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getImportMetaEnv('TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getImportMetaEnv('VITE_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getImportMetaEnv('SENTRA_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getImportMetaEnv('VITE_SENTRA_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getProcessEnv('TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getProcessEnv('VITE_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getProcessEnv('SENTRA_TRAJECTORY_COMPARE_MODE')) ||
    toFlagBool(getProcessEnv('VITE_SENTRA_TRAJECTORY_COMPARE_MODE'))
  );
}
