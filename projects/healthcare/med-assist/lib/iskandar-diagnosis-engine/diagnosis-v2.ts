// Designed and constructed by Drferdi.
import type { DiagnosisRequestContext, DiagnosisSuggestion, VitalSigns } from '@/types/api';
import type { RankedDiagnosis } from './diagnosis-algorithm';
import { runDiagnosisAlgorithm } from './diagnosis-algorithm';
import type { DifferentialVitals } from './differential-diagnosis';

export type DiagnosisV2UncertaintyLevel = 'low' | 'moderate' | 'high';

export interface DiagnosisV2Comparison {
  v1_top5_icd: string[];
  v2_top5_icd: string[];
  top1_changed: boolean;
  critical_differential_added: boolean;
  v2_uncertainty_level: DiagnosisV2UncertaintyLevel;
  v2_primary_abstained: boolean;
}

export interface DiagnosisV2ShadowResult {
  suggestions: DiagnosisSuggestion[];
  uncertaintyLevel: DiagnosisV2UncertaintyLevel;
  primaryAbstained: boolean;
  guidance:
    'support diagnostic reasoning; differential considerations; physician remains final decision-maker';
}

const MIN_PRIMARY_CONFIDENCE = 0.45;
const MODERATE_PRIMARY_CONFIDENCE = 0.6;
const LOW_MARGIN = 0.08;
const MODERATE_MARGIN = 0.15;
const CRITICAL_PREFIXES = [/^A41/, /^E1[0-6]/, /^I2[0-4]/, /^I6[0-4]/, /^J96/, /^O1[4-5]/, /^R57/];

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

function normalizeIcd(code: string | undefined): string {
  return String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
}

function toDifferentialVitals(vitalSigns?: VitalSigns): DifferentialVitals {
  return {
    sbp: vitalSigns?.systolic ?? 0,
    dbp: vitalSigns?.diastolic ?? 0,
    hr: vitalSigns?.heart_rate ?? 0,
    rr: vitalSigns?.respiratory_rate ?? 0,
    temp: vitalSigns?.temperature ?? 0,
    glucose: 0,
  };
}

function isCriticalSuggestion(suggestion: DiagnosisSuggestion): boolean {
  const icd = normalizeIcd(suggestion.icd_x || suggestion.icd10_code);
  if (suggestion.red_flags && suggestion.red_flags.length > 0) return true;
  return CRITICAL_PREFIXES.some((pattern) => pattern.test(icd));
}

function getTop5Icd(suggestions: DiagnosisSuggestion[]): string[] {
  return suggestions
    .slice(0, 5)
    .map((item) => normalizeIcd(item.icd_x || item.icd10_code))
    .filter(Boolean);
}

function buildShadowRationale(item: RankedDiagnosis, uncertaintyLevel: DiagnosisV2UncertaintyLevel): string {
  const anchors: string[] = [];

  if (item.insight.matchedSymptoms.length > 0) {
    anchors.push(`kecocokan keluhan: ${item.insight.matchedSymptoms.slice(0, 3).join(', ')}`);
  }
  if (item.insight.vitalDrivers.length > 0) {
    anchors.push(`dukungan TTV: ${item.insight.vitalDrivers.slice(0, 2).join('; ')}`);
  }
  if (anchors.length === 0) {
    anchors.push('dukungan klinis awal masih terbatas');
  }

  const caution =
    uncertaintyLevel === 'high'
      ? 'Gunakan sebagai differential considerations sementara dan lengkapi evaluasi klinis.'
      : 'Gunakan untuk support diagnostic reasoning bersama temuan klinis lain.';

  return `${anchors.join('. ')}. ${caution} Physician remains final decision-maker.`;
}

function deriveUncertaintyLevel(ranked: RankedDiagnosis[]): DiagnosisV2UncertaintyLevel {
  if (ranked.length === 0) return 'high';

  const top1 = ranked[0];
  const top2 = ranked[1];
  const margin = top2 ? top1.adjustedConfidence - top2.adjustedConfidence : top1.adjustedConfidence;

  if (top1.adjustedConfidence < MIN_PRIMARY_CONFIDENCE || margin < LOW_MARGIN) {
    return 'high';
  }

  if (top1.adjustedConfidence < MODERATE_PRIMARY_CONFIDENCE || margin < MODERATE_MARGIN) {
    return 'moderate';
  }

  return 'low';
}

function shouldAbstainPrimary(
  ranked: RankedDiagnosis[],
  uncertaintyLevel: DiagnosisV2UncertaintyLevel
): boolean {
  if (ranked.length === 0) return true;
  if (uncertaintyLevel === 'high') return true;
  return ranked[0].insight.supportingExamPlan.needLevel === 'required' && uncertaintyLevel !== 'low';
}

function mapRankedToSuggestions(
  ranked: RankedDiagnosis[],
  uncertaintyLevel: DiagnosisV2UncertaintyLevel
): DiagnosisSuggestion[] {
  return ranked.slice(0, 5).map((item, index) => ({
    ...item.suggestion,
    rank: index + 1,
    confidence: item.adjustedConfidence,
    rationale: buildShadowRationale(item, uncertaintyLevel),
    reasoning: buildShadowRationale(item, uncertaintyLevel),
  }));
}

export function isDiagnosisV2ShadowEnabled(): boolean {
  return (
    toFlagBool(getImportMetaEnv('SENTRA_DIAGNOSIS_V2_SHADOW')) ||
    toFlagBool(getImportMetaEnv('VITE_SENTRA_DIAGNOSIS_V2_SHADOW')) ||
    toFlagBool(getProcessEnv('SENTRA_DIAGNOSIS_V2_SHADOW')) ||
    toFlagBool(getProcessEnv('VITE_SENTRA_DIAGNOSIS_V2_SHADOW'))
  );
}

export function runDiagnosisV2Shadow(input: {
  suggestions: DiagnosisSuggestion[];
  context: Pick<DiagnosisRequestContext, 'keluhan_utama' | 'keluhan_tambahan' | 'vital_signs'>;
  maxResults?: number;
}): DiagnosisV2ShadowResult {
  const ranked = runDiagnosisAlgorithm({
    suggestions: input.suggestions,
    keluhanUtama: input.context.keluhan_utama,
    keluhanTambahan: input.context.keluhan_tambahan,
    vitals: toDifferentialVitals(input.context.vital_signs),
    maxResults: Math.max(5, input.maxResults ?? 5),
  });

  const uncertaintyLevel = deriveUncertaintyLevel(ranked);
  const primaryAbstained = shouldAbstainPrimary(ranked, uncertaintyLevel);

  return {
    suggestions: mapRankedToSuggestions(ranked, uncertaintyLevel),
    uncertaintyLevel,
    primaryAbstained,
    guidance:
      'support diagnostic reasoning; differential considerations; physician remains final decision-maker',
  };
}

export function compareDiagnosisVersions(input: {
  v1Suggestions: DiagnosisSuggestion[];
  v2Suggestions: DiagnosisSuggestion[];
  v2UncertaintyLevel: DiagnosisV2UncertaintyLevel;
  v2PrimaryAbstained: boolean;
}): DiagnosisV2Comparison {
  const v1Top5 = getTop5Icd(input.v1Suggestions);
  const v2Top5 = getTop5Icd(input.v2Suggestions);
  const v1TopSet = new Set(v1Top5);

  const criticalDifferentialAdded = input.v2Suggestions
    .slice(0, 5)
    .some((suggestion) => isCriticalSuggestion(suggestion) && !v1TopSet.has(normalizeIcd(suggestion.icd_x || suggestion.icd10_code)));

  return {
    v1_top5_icd: v1Top5,
    v2_top5_icd: v2Top5,
    top1_changed: (v1Top5[0] || '') !== (v2Top5[0] || ''),
    critical_differential_added: criticalDifferentialAdded,
    v2_uncertainty_level: input.v2UncertaintyLevel,
    v2_primary_abstained: input.v2PrimaryAbstained,
  };
}

export function shadowComparisonToAuditMetadata(
  comparison: DiagnosisV2Comparison
): Record<string, string | boolean> {
  return {
    v1_top5_icd: JSON.stringify(comparison.v1_top5_icd),
    v2_top5_icd: JSON.stringify(comparison.v2_top5_icd),
    top1_changed: comparison.top1_changed,
    critical_differential_added: comparison.critical_differential_added,
    v2_uncertainty_level: comparison.v2_uncertainty_level,
    v2_primary_abstained: comparison.v2_primary_abstained,
  };
}
