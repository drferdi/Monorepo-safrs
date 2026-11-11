// Designed and constructed by Drferdi.
import type { DiagnosisSuggestion } from '@/types/api';
import { ChronicDiseaseType } from './chronic-disease-classifier';
import {
  buildDifferentialInsight,
  type DifferentialInsight,
  type DifferentialVitals,
  extractComplaintSignals,
} from './differential-diagnosis';
import { clamp, round } from './math-utils';
import type { TrajectoryAnalysis } from './trajectory-analyzer';

export interface DiagnosisAlgorithmInput {
  suggestions: DiagnosisSuggestion[];
  keluhanUtama: string;
  keluhanTambahan?: string;
  vitals: DifferentialVitals;
  trajectory?: TrajectoryAnalysis;
  maxResults?: number;
}

export type ConfidenceBand = 'very_high' | 'high' | 'moderate' | 'low';

export interface RankedDiagnosis {
  rank: number;
  suggestion: DiagnosisSuggestion;
  diagnosisScore: number; // 0-100
  adjustedConfidence: number; // 0-1
  confidenceBand: ConfidenceBand;
  scoreBreakdown: {
    baseConfidence: number; // 0-100
    symptomFit: number; // 0-100
    vitalFit: number; // 0-100
    safetyPriority: number; // 0-100
    trajectoryFit: number; // 0-100, SPRINT 1 P0-2
    confirmedChronicFit: number; // 0-100
    chronicPriorityBonus: number; // 0-25
    clinicalMismatchPenalty: number; // 0-70
  };
  insight: DifferentialInsight;
}

function isReadableDiagnosisName(value: string): boolean {
  const cleaned = value.trim();
  if (!cleaned) return false;
  if (cleaned.length < 3) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (!/[A-Za-z]/.test(cleaned)) return false;
  return true;
}

function icdPrefix(icd: string): string {
  const normalized = icd.toUpperCase().trim();
  const match = normalized.match(/^[A-Z][0-9]{1,2}/);
  return match ? match[0] : normalized.slice(0, 3);
}

function deriveSymptomFitScore(matchedSymptoms: string[], complaintSignals: string[]): number {
  if (complaintSignals.length === 0) return 40;
  if (matchedSymptoms.length === 0) return 15;

  const coverage = matchedSymptoms.length / Math.max(3, complaintSignals.length);
  return round(clamp(coverage * 100, 20, 100), 2);
}

function deriveVitalFitScore(suggestion: DiagnosisSuggestion, vitals: DifferentialVitals): number {
  const prefix = icdPrefix(suggestion.icd_x || '');
  const label = suggestion.nama.toLowerCase();

  let score = 20;
  const hasSevereBp = vitals.sbp >= 180 || vitals.dbp >= 120;
  const hasHighBp = vitals.sbp >= 160 || vitals.dbp >= 100;
  const hasSevereGlucose = vitals.glucose >= 300 || (vitals.glucose > 0 && vitals.glucose < 70);
  const hasFeverishInflammatory = vitals.temp >= 38.5 && vitals.hr > 100 && vitals.rr >= 22;
  const hasRespDistress = vitals.rr >= 24 || vitals.hr >= 120;

  if (/^I1[0-6]/.test(prefix) || /(hipertensi|stroke|acs|angina|iskem)/.test(label)) {
    if (hasSevereBp) score += 55;
    else if (hasHighBp) score += 35;
    else score += 10;
  }

  if (/^E1[0-6]/.test(prefix) || /(diabetes|glukosa|hiperglik|hipoglik)/.test(label)) {
    if (hasSevereGlucose) score += 70;
    else if (vitals.glucose >= 200) score += 35;
    else score += 10;
    if (vitals.glucose >= 300) score += 10;
  }

  if (/^J[0-9]/.test(prefix) || /(respir|pneumonia|ispa|bronkit|paru|napas)/.test(label)) {
    if (hasRespDistress) score += 30;
    else if (vitals.rr >= 20) score += 25;
    if (vitals.temp >= 37.8) score += 10;
  }

  if (/^(A|R57|A4)/.test(prefix) || /(sepsis|infeksi sistemik|syok)/.test(label)) {
    if (hasFeverishInflammatory) score += 55;
    else if (vitals.temp >= 38 || vitals.hr >= 100) score += 25;
  }

  return round(clamp(score, 0, 100), 2);
}

function deriveSafetyPriorityScore(
  suggestion: DiagnosisSuggestion,
  insight: DifferentialInsight
): number {
  let score = 10;

  const redFlagCount = suggestion.red_flags?.length || 0;
  score += redFlagCount * 15;

  if (insight.supportingExamPlan.needLevel === 'required') score += 35;
  else if (insight.supportingExamPlan.needLevel === 'recommended') score += 20;
  else score += 8;

  return round(clamp(score, 0, 100), 2);
}

/**
 * SPRINT 1 P0-2: Calculate trajectory fit score (0-100)
 * Boosts chronic diseases if patient has declining trajectory
 * Penalizes acute diagnoses if patient has stable chronic pattern
 */
function calculateTrajectoryFit(
  suggestion: DiagnosisSuggestion,
  trajectory: TrajectoryAnalysis | undefined
): number {
  if (!trajectory || trajectory.visitCount < 2) return 50; // Neutral if insufficient data

  const icdCode = (suggestion.icd_x || '').toUpperCase();
  const label = suggestion.nama.toLowerCase();

  // Chronic disease patterns
  const isChronicHTN = /^I1[0-5]/.test(icdCode) || /hipertensi/.test(label);
  const isChronicDM = /^E1[0-4]/.test(icdCode) || /diabetes/.test(label);
  const isChronicCardiac = /^I(25|50)/.test(icdCode) || /(jantung|gagal jantung)/.test(label);
  const isChronicCKD = /^N18/.test(icdCode) || /(ginjal kronik|ckd)/.test(label);
  const isChronicResp = /^J(44|45)/.test(icdCode) || /(copd|asma kronik)/.test(label);
  const isChronic =
    isChronicHTN || isChronicDM || isChronicCardiac || isChronicCKD || isChronicResp;

  // Acute syndrome patterns
  const isAcuteInfection =
    /^(A0|J0[0-2]|J[1-2])/.test(icdCode) || /(infeksi|ispa|pneumonia)/.test(label);
  const isAcuteFever = /^R50/.test(icdCode) || /demam/.test(label);
  const isAcute = isAcuteInfection || isAcuteFever;

  let score = 50; // Base neutral

  // CHRONIC DISEASE LOGIC
  if (isChronic) {
    // Get relevant trend (fixed: use 'parameter' not 'vital')
    const sbpTrend = trajectory.vitalTrends.find((v) => v.parameter === 'sbp');
    const glucoseTrend = trajectory.vitalTrends.find((v) => v.parameter === 'glucose');

    const hasWorseningTrend =
      sbpTrend?.trend === 'declining' || glucoseTrend?.trend === 'declining';

    if (hasWorseningTrend) {
      score += 35; // Strong boost for chronic + worsening
    }

    if (trajectory.early_warning_burden.total_breaches_last5 > 3) {
      score += 15; // High breach frequency
    }

    // Fixed: use 'mortality_proxy_tier' not 'risk_tier'
    if (trajectory.mortality_proxy.mortality_proxy_tier === 'very_high') {
      score += 10; // Critical trajectory
    }
  }

  // ACUTE SYNDROME LOGIC
  if (isAcute) {
    const hasStableTrend = trajectory.vitalTrends.some((v) => v.trend === 'stable');

    if (hasStableTrend && trajectory.visitCount >= 4) {
      score -= 20; // Penalize acute diagnosis for stable chronic patient
    }

    // BUT: If acute attack risk is high, boost back (fixed property names)
    const acuteRisk = trajectory.acute_attack_risk_24h;
    const maxAcuteRisk = Math.max(
      acuteRisk.hypertensive_crisis_risk,
      acuteRisk.glycemic_crisis_risk,
      acuteRisk.sepsis_like_deterioration_risk
    );

    if (maxAcuteRisk >= 70) {
      score += 25; // Override: Acute risk detected
    }
  }

  return round(clamp(score, 0, 100), 2);
}

function confidenceBand(score: number): ConfidenceBand {
  if (score >= 85) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  return 'low';
}

function normalizeIcdPrefix(icd: string): string {
  return icdPrefix(icd).toUpperCase();
}

function deriveConfirmedChronicFitScore(
  suggestion: DiagnosisSuggestion,
  trajectory: TrajectoryAnalysis | undefined
): number {
  const confirmed = trajectory?.confirmed_chronic_diagnoses || [];
  if (confirmed.length === 0) return 0;

  const targetIcd = (suggestion.icd_x || '').toUpperCase().trim();
  if (!targetIcd) return 0;

  const targetPrefix = normalizeIcdPrefix(targetIcd);
  for (const chronic of confirmed) {
    const chronicIcd = (chronic.icd_x || '').toUpperCase().trim();
    if (!chronicIcd) continue;
    if (chronicIcd === targetIcd) return 100;
    if (normalizeIcdPrefix(chronicIcd) === targetPrefix) return 85;
  }

  return 0;
}

function deriveClinicalMismatchPenalty(
  suggestion: DiagnosisSuggestion,
  complaintSignals: string[],
  trajectory: TrajectoryAnalysis | undefined
): number {
  const prefix = normalizeIcdPrefix(suggestion.icd_x || '');
  const label = (suggestion.nama || '').toLowerCase();
  const complaintText = complaintSignals.join(' ').toLowerCase();
  let penalty = 0;

  if (!isReadableDiagnosisName(suggestion.nama || '')) {
    penalty += 35;
  }

  const isParasitic =
    /^B7[0-9]/.test(prefix) || /(cacing|helmin|hookworm|ancylostoma|parasit)/.test(label);
  const hasParasiticClue =
    /(cacing|cacingan|gatal\s+anus|ground\s+itch|diare|nyeri\s+perut|bab|anemia|pucat|tanah)/.test(
      complaintText
    );
  if (isParasitic && !hasParasiticClue) {
    penalty += 28;
  }

  const hasConfirmedCkd = (trajectory?.confirmed_chronic_diagnoses || []).some(
    (item) => item.disease_type === ChronicDiseaseType.CHRONIC_KIDNEY
  );
  if (hasConfirmedCkd && isParasitic) {
    penalty += 20;
  }

  const isToxicology =
    /^T[3-9]/.test(prefix) || /(keracunan|intoksikasi|overdosis|poisoning)/.test(label);
  const hasToxicologyClue = /(keracunan|intoksikasi|overdosis|racun|paparan|obat\s+berlebih)/.test(
    complaintText
  );
  if (isToxicology && !hasToxicologyClue) {
    penalty += 24;
  }

  return round(clamp(penalty, 0, 70), 2);
}

export function runDiagnosisAlgorithm(input: DiagnosisAlgorithmInput): RankedDiagnosis[] {
  const {
    suggestions,
    keluhanUtama,
    keluhanTambahan = '',
    vitals,
    trajectory,
    maxResults = 5,
  } = input;

  if (!Array.isArray(suggestions) || suggestions.length === 0) return [];

  const complaintSignals = extractComplaintSignals(keluhanUtama, keluhanTambahan, 10);

  const ranked = suggestions.map((suggestion) => {
    const insight = buildDifferentialInsight({
      suggestion,
      keluhanUtama,
      keluhanTambahan,
      vitals,
    });

    const baseConfidence = round(clamp(suggestion.confidence * 100, 0, 100), 2);
    const symptomFit = deriveSymptomFitScore(insight.matchedSymptoms, complaintSignals);
    const vitalFit = deriveVitalFitScore(suggestion, vitals);
    const safetyPriority = deriveSafetyPriorityScore(suggestion, insight);
    const trajectoryFit = calculateTrajectoryFit(suggestion, trajectory);
    const confirmedChronicFit = deriveConfirmedChronicFitScore(suggestion, trajectory);
    const clinicalMismatchPenalty = deriveClinicalMismatchPenalty(
      suggestion,
      complaintSignals,
      trajectory
    );
    const chronicPriorityBonus =
      confirmedChronicFit >= 95 ? 35 : confirmedChronicFit >= 80 ? 18 : 0;

    const diagnosisScore = round(
      clamp(
        baseConfidence * 0.35 +
          symptomFit * 0.2 +
          vitalFit * 0.15 +
          safetyPriority * 0.1 +
          trajectoryFit * 0.2 +
          chronicPriorityBonus -
          clinicalMismatchPenalty,
        0,
        100
      ),
      2
    );

    // Display confidence follows engine suggestion confidence (single ranking authority).
    // Composite diagnosisScore remains in scoreBreakdown for audit/transparency only.
    const adjustedConfidence = round(clamp(suggestion.confidence, 0, 1), 2);

    return {
      rank: 0,
      suggestion,
      diagnosisScore,
      adjustedConfidence,
      confidenceBand: confidenceBand(adjustedConfidence * 100),
      scoreBreakdown: {
        baseConfidence,
        symptomFit,
        vitalFit,
        safetyPriority,
        trajectoryFit,
        confirmedChronicFit,
        chronicPriorityBonus,
        clinicalMismatchPenalty,
      },
      insight,
    };
  });

  // Filter only obvious junk using engine confidence (do not drop via UI composite).
  const MIN_ENGINE_CONFIDENCE = 0.1;

  const finalList = ranked.filter((item) => item.adjustedConfidence >= MIN_ENGINE_CONFIDENCE);

  // Preserve engine / input order — UI must not re-sort the differential.
  return finalList.slice(0, maxResults).map((item, index) => {
    const rank = index + 1;
    return {
      ...item,
      rank,
      suggestion: {
        ...item.suggestion,
        rank,
      },
    };
  });
}
