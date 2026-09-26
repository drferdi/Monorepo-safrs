import { classifyChronicDisease } from '@/lib/iskandar-diagnosis-engine/chronic-disease-classifier';
import type {
  CDSSAlert,
  CDSSResponse,
  DiagnosisSuggestion,
  DrugInteraction,
  MedicationRecommendation,
  PharmacotherapyExplainability,
} from '@/types/api';

const ICD_PATTERN = /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/;
const ICD_EMERGENCY_HEAD_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
};
const ALLOWED_ATURAN_PAKAI: readonly MedicationRecommendation['aturan_pakai'][] = [
  'Sebelum makan',
  'Sesudah makan',
  'Pemakaian luar',
  'Jika diperlukan',
  'Saat makan',
];
const ALLOWED_SAFETY_CHECK: readonly MedicationRecommendation['safety_check'][] = [
  'safe',
  'caution',
  'contraindicated',
];
const ALLOWED_MEDICATION_ROLE: NonNullable<MedicationRecommendation['role']>[] = [
  'utama',
  'adjuvant',
  'vitamin',
];
const ALLOWED_ALERT_TYPES: readonly CDSSAlert['type'][] = [
  'red_flag',
  'validation_warning',
  'api_error',
  'low_confidence',
  'allergy',
  'ddi',
  'dosing',
  'guideline',
  'chronic_disease',
  'vital_sign',
  'sepsis_warning',
];
const ALLOWED_ALERT_SEVERITY: readonly CDSSAlert['severity'][] = [
  'emergency',
  'high',
  'medium',
  'low',
  'info',
];
const ALLOWED_DDI_SEVERITY: readonly DrugInteraction['severity'][] = [
  'contraindicated',
  'major',
  'moderate',
  'minor',
];
const ALLOWED_RISK_TIER: readonly PharmacotherapyExplainability['risk_tier'][] = [
  'routine',
  'urgent',
  'emergency',
];
const ALLOWED_REVIEW_WINDOW: readonly PharmacotherapyExplainability['review_window'][] = [
  '6h',
  '24h',
  '48h',
];
const ALLOWED_PATHWAY: readonly PharmacotherapyExplainability['pathway'][] = [
  'knowledge-only',
  'knowledge+syndrome-intent',
  'syndrome-intent-only',
  'legacy-fallback',
];

type DiagnosisSuggestionInput = Partial<DiagnosisSuggestion> &
  Pick<DiagnosisSuggestion, 'rank'> & {
    icd10_code?: string | null;
    diagnosis_name?: string | null;
    red_flags?: Array<string | null | undefined> | null;
    recommended_actions?: Array<string | null | undefined> | null;
  };

function compactText(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeTextList(values: Array<unknown> | null | undefined, max = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values || []) {
    const text = compactText(value);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(text);
    if (result.length >= max) break;
  }

  return result;
}

function isCodeLikeDiagnosisName(value: string): boolean {
  if (!value) return false;
  if (/^DIAGNOSIS\s+[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/i.test(value)) return true;
  return ICD_PATTERN.test(value.toUpperCase());
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function preferSuggestion(
  current: DiagnosisSuggestion,
  incoming: DiagnosisSuggestion
): DiagnosisSuggestion {
  if (incoming.rank < current.rank) return incoming;
  if (incoming.rank > current.rank) return current;
  if (incoming.confidence > current.confidence) return incoming;
  return current;
}

function deriveFallbackRiskTier(alerts: CDSSAlert[]): PharmacotherapyExplainability['risk_tier'] {
  if (alerts.some((alert) => alert.severity === 'emergency')) return 'emergency';
  if (alerts.some((alert) => alert.severity === 'high' || alert.severity === 'medium'))
    return 'urgent';
  return 'routine';
}

function deriveFallbackReviewWindow(
  riskTier: PharmacotherapyExplainability['risk_tier']
): PharmacotherapyExplainability['review_window'] {
  if (riskTier === 'emergency') return '6h';
  return '24h';
}

export function normalizeIcdCode(value: unknown): string {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
  if (!raw) return '';

  if (/^[A-Z][0-9]{3,4}$/.test(raw)) {
    return `${raw.slice(0, 3)}.${raw.slice(3)}`;
  }

  const direct = raw.match(/[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?/);
  if (direct?.[0]) return direct[0];

  const compact = raw.replace(/[^A-Z0-9.]/g, '');
  if (!compact) return '';

  if (/^[A-Z][0-9]{3,4}$/.test(compact)) {
    return `${compact.slice(0, 3)}.${compact.slice(3)}`;
  }

  const mappedHead = ICD_EMERGENCY_HEAD_MAP[compact[0]];
  if (mappedHead) {
    const candidate = `${mappedHead}${compact.slice(1)}`;
    if (/^[A-Z][0-9]{3,4}$/.test(candidate)) {
      return `${candidate.slice(0, 3)}.${candidate.slice(3)}`;
    }
    const recovered = candidate.match(/^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?/);
    if (recovered?.[0]) return recovered[0];
  }

  return compact;
}

export function isLikelyIcdCode(value: unknown): boolean {
  return ICD_PATTERN.test(normalizeIcdCode(value));
}

export function resolveDiagnosisDisplayName(
  icdCode: string,
  primaryName: unknown,
  secondaryName?: unknown
): string {
  const normalizedIcd = normalizeIcdCode(icdCode);
  const primary = compactText(primaryName);
  if (primary && !isCodeLikeDiagnosisName(primary) && /[A-Za-z]/.test(primary)) {
    return primary;
  }

  const secondary = compactText(secondaryName);
  if (secondary && !isCodeLikeDiagnosisName(secondary) && /[A-Za-z]/.test(secondary)) {
    return secondary;
  }

  const classification = classifyChronicDisease(normalizedIcd);
  if (classification) return classification.fullName;
  if (normalizedIcd) return `Diagnosis ${normalizedIcd}`;
  return 'Diagnosis belum terklasifikasi';
}

function sanitizeDiagnosisSuggestion(
  item: DiagnosisSuggestionInput | null | undefined,
  index: number
): DiagnosisSuggestion | null {
  const normalizedCode = normalizeIcdCode(item?.icd_x || item?.icd10_code);
  if (!isLikelyIcdCode(normalizedCode)) return null;

  const parsedRank = Number(item?.rank);
  const parsedConfidence = Number(item?.confidence);
  return {
    rank: Number.isFinite(parsedRank) && parsedRank > 0 ? Math.floor(parsedRank) : index + 1,
    icd_x: normalizedCode,
    nama: resolveDiagnosisDisplayName(normalizedCode, item?.nama, item?.diagnosis_name),
    diagnosis_name: compactText(item?.diagnosis_name) || undefined,
    icd10_code: normalizedCode,
    confidence: Number.isFinite(parsedConfidence) ? clampNumber(parsedConfidence, 0, 1) : 0.5,
    rationale:
      compactText(item?.rationale || item?.reasoning) ||
      `Diagnosis ${normalizedCode} perlu dikorelasikan dengan temuan klinis.`,
    reasoning: compactText(item?.reasoning) || undefined,
    red_flags: sanitizeTextList(item?.red_flags || [], 5),
    recommended_actions: sanitizeTextList(item?.recommended_actions || [], 5),
  };
}

export function sanitizeDiagnosisSuggestions(
  suggestions: Array<DiagnosisSuggestionInput | null | undefined> | null | undefined,
  limit = 5
): DiagnosisSuggestion[] {
  const deduped = new Map<string, DiagnosisSuggestion>();

  for (const [index, item] of (suggestions || []).entries()) {
    const sanitized = sanitizeDiagnosisSuggestion(item, index);
    if (!sanitized) continue;

    const existing = deduped.get(sanitized.icd_x);
    deduped.set(sanitized.icd_x, existing ? preferSuggestion(existing, sanitized) : sanitized);
  }

  return Array.from(deduped.values())
    .sort((left, right) => left.rank - right.rank || right.confidence - left.confidence)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function sanitizeMedicationRecommendation(
  item: MedicationRecommendation | null | undefined
): MedicationRecommendation | null {
  const namaObat = compactText(item?.nama_obat);
  const dosis = compactText(item?.dosis);
  if (!namaObat || !dosis) return null;

  return {
    nama_obat: namaObat,
    dosis,
    aturan_pakai: isOneOf(item?.aturan_pakai, ALLOWED_ATURAN_PAKAI)
      ? item.aturan_pakai
      : 'Sesudah makan',
    durasi: compactText(item?.durasi) || undefined,
    rationale: compactText(item?.rationale) || 'Perlu verifikasi klinis sebelum diresepkan.',
    safety_check: isOneOf(item?.safety_check, ALLOWED_SAFETY_CHECK) ? item.safety_check : 'caution',
    contraindications: sanitizeTextList(item?.contraindications || [], 4),
    role: isOneOf(item?.role, ALLOWED_MEDICATION_ROLE) ? item.role : undefined,
    isChronicContinuation:
      typeof item?.isChronicContinuation === 'boolean' ? item.isChronicContinuation : undefined,
  };
}

function sanitizeAlert(item: CDSSAlert | null | undefined, index: number): CDSSAlert | null {
  const message = compactText(item?.message);
  if (!message) return null;

  const rawSeverity = compactText(item?.severity).toLowerCase();
  const severity: CDSSAlert['severity'] = isOneOf(item?.severity, ALLOWED_ALERT_SEVERITY)
    ? item.severity
    : rawSeverity === 'critical' || rawSeverity === 'urgent'
      ? 'high'
      : 'info';

  return {
    id: compactText(item?.id) || `alert-${index + 1}`,
    type: isOneOf(item?.type, ALLOWED_ALERT_TYPES) ? item.type : 'api_error',
    severity,
    title: compactText(item?.title) || 'Peringatan klinis',
    message,
    icd_codes: sanitizeTextList(item?.icd_codes || [], 4),
    action: compactText(item?.action) || undefined,
  };
}

function sanitizeDrugInteraction(item: DrugInteraction | null | undefined): DrugInteraction | null {
  const drugA = compactText(item?.drug_a);
  const drugB = compactText(item?.drug_b);
  const description = compactText(item?.description);
  if (!drugA || !drugB || !description) return null;

  return {
    drug_a: drugA,
    drug_b: drugB,
    severity: isOneOf(item?.severity, ALLOWED_DDI_SEVERITY) ? item.severity : 'moderate',
    description,
    recommendation: compactText(item?.recommendation) || undefined,
    source: compactText(item?.source) || undefined,
  };
}

function sanitizeExplainability(
  item: PharmacotherapyExplainability | null | undefined,
  alerts: CDSSAlert[]
): PharmacotherapyExplainability | undefined {
  if (!item) return undefined;

  const fallbackRiskTier = deriveFallbackRiskTier(alerts);
  const riskTier = isOneOf(item.risk_tier, ALLOWED_RISK_TIER) ? item.risk_tier : fallbackRiskTier;

  return {
    confidence: Number.isFinite(Number(item.confidence))
      ? clampNumber(Number(item.confidence), 0, 100)
      : 50,
    drivers: sanitizeTextList(item.drivers || [], 5),
    missing_data: sanitizeTextList(item.missing_data || [], 5),
    risk_tier: riskTier,
    review_window: isOneOf(item.review_window, ALLOWED_REVIEW_WINDOW)
      ? item.review_window
      : deriveFallbackReviewWindow(riskTier),
    pathway: isOneOf(item.pathway, ALLOWED_PATHWAY) ? item.pathway : 'knowledge-only',
  };
}

export function sanitizePharmacotherapyPayload(
  payload:
    | Pick<
        CDSSResponse,
        | 'medication_recommendations'
        | 'alerts'
        | 'clinical_guidelines'
        | 'drug_interactions'
        | 'pharmacotherapy_explainability'
      >
    | null
    | undefined
): {
  medications: MedicationRecommendation[];
  alerts: CDSSAlert[];
  guidelines: string[];
  drugInteractions: DrugInteraction[];
  explainability?: PharmacotherapyExplainability;
} {
  const medications = (payload?.medication_recommendations || [])
    .map((item) => sanitizeMedicationRecommendation(item))
    .filter((item): item is MedicationRecommendation => Boolean(item));
  const alerts = (payload?.alerts || [])
    .map((item, index) => sanitizeAlert(item, index))
    .filter((item): item is CDSSAlert => Boolean(item));

  return {
    medications,
    alerts,
    guidelines: sanitizeTextList(payload?.clinical_guidelines || [], 6),
    drugInteractions: (payload?.drug_interactions || [])
      .map((item) => sanitizeDrugInteraction(item))
      .filter((item): item is DrugInteraction => Boolean(item)),
    explainability: sanitizeExplainability(payload?.pharmacotherapy_explainability, alerts),
  };
}
