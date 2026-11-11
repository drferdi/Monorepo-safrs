// Designed and constructed by Drferdi.

import { logShadowComparison } from './audit-logger';
import { classifyChronicDisease } from './chronic-disease-classifier';
import {
  compareDiagnosisVersions,
  isDiagnosisV2ShadowEnabled,
  runDiagnosisV2Shadow,
  shadowComparisonToAuditMetadata,
} from './diagnosis-v2';
import { runDiagnosisEngine } from './engine';
import { getDiagnosisEngineConfig } from './feature-flags';
import type { HybridTrajectoryResult } from './hybrid-trajectory';
import { generatePharmacotherapyPlan, type PharmacotherapyPlan } from './pharmacotherapy-reasoner';
import { extractSafetyAlertsFromTrajectory } from './trajectory-safety-bridge';

import { getICD10Details } from '@/lib/rag';
import type {
  APIResponse,
  CDSSResponse,
  ClinicalDataPresenceState,
  ClinicalInputDataState,
  ClinicalReasoningPayload,
  ClinicalReasoningStatusCode,
  DiagnosisRequestContext,
} from '@/types/api';
import { createLogger } from '@/utils/logger';
import type { Encounter } from '~/utils/types';

type DiagnosisSuggestion = CDSSResponse['diagnosis_suggestions'][number];
type MedicationRecommendation = CDSSResponse['medication_recommendations'][number];
const flowLog = createLogger('DiagnosisFlow', 'global');

function generateSessionId(encounter: Encounter): string {
  if (encounter.id) return `session-${encounter.id}`;
  return `session-${Date.now()}`;
}

const ICD_PATTERN = /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/;
const ICD_EMERGENCY_HEAD_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
};

function normalizePresenceState(
  value: string | undefined,
  options: { allowUnknown?: boolean } = {}
): ClinicalDataPresenceState {
  if (value === undefined || value === null) return options.allowUnknown ? 'unknown' : 'absent';
  if (!value.trim()) return 'absent';
  return 'present';
}

function normalizeNumericPresence(
  value: number | undefined,
  minValue = 0
): ClinicalDataPresenceState {
  if (value === undefined || value === null) return 'unknown';
  if (!Number.isFinite(value)) return 'insufficient';
  if (value <= minValue) return 'insufficient';
  return 'present';
}

function buildInputDataState(
  context: DiagnosisRequestContext,
  encounter: Encounter
): ClinicalInputDataState {
  const chiefComplaint = normalizePresenceState(
    context.keluhan_utama?.trim() || encounter.anamnesa?.keluhan_utama?.trim()
  );
  const additionalComplaint = normalizePresenceState(
    context.keluhan_tambahan?.trim() || encounter.anamnesa?.keluhan_tambahan?.trim(),
    { allowUnknown: true }
  );

  const ageState: ClinicalDataPresenceState = normalizeNumericPresence(context.patient_age, 0);
  const genderState: ClinicalDataPresenceState = context.patient_gender ? 'present' : 'unknown';

  const allergies = Array.isArray(context.allergies) ? context.allergies : undefined;
  const allergiesState: ClinicalDataPresenceState =
    allergies === undefined ? 'unknown' : allergies.length === 0 ? 'absent' : 'present';

  const vitalSignValues = context.vital_signs;
  const vitalState: ClinicalDataPresenceState = vitalSignValues
    ? ['systolic', 'diastolic', 'heart_rate', 'respiratory_rate', 'temperature'].every(
        (field) =>
          typeof (vitalSignValues as Record<string, unknown>)[field] === 'number' &&
          Number.isFinite((vitalSignValues as Record<string, unknown>)[field] as number)
      )
      ? 'present'
      : 'insufficient'
    : 'unknown';

  return {
    chief_complaint: chiefComplaint,
    additional_complaint: additionalComplaint,
    vitals: vitalState,
    age: ageState,
    gender: genderState,
    allergies: allergiesState,
  };
}

function normalizeIcdCode(value: string | undefined): string {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
  if (!raw) return '';

  const direct = raw.match(/[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?/);
  if (direct?.[0]) return direct[0];

  const compact = raw.replace(/[^A-Z0-9.]/g, '');
  if (!compact) return '';

  const mappedHead = ICD_EMERGENCY_HEAD_MAP[compact[0]];
  if (mappedHead) {
    const candidate = `${mappedHead}${compact.slice(1)}`;
    const recovered = candidate.match(/^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?/);
    if (recovered?.[0]) return recovered[0];
  }

  return compact;
}

function isLikelyIcdCode(value: string | undefined): boolean {
  const normalized = normalizeIcdCode(value);
  return ICD_PATTERN.test(normalized);
}

function isReadableDiagnosisName(value: string | undefined): boolean {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 3 && /[A-Za-z]/.test(cleaned) && !/^\d+$/.test(cleaned);
}

function isCodeLikeDiagnosisName(value: string): boolean {
  const cleaned = value.toUpperCase().replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  if (/^DIAGNOSIS\s+[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/.test(cleaned)) return true;
  return isLikelyIcdCode(cleaned);
}

function sanitizeDiagnosisDisplayName(
  rawName: string | undefined,
  icdCode: string,
  preferredName?: string
): string {
  const cleaned = String(rawName || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (isReadableDiagnosisName(cleaned) && !isCodeLikeDiagnosisName(cleaned)) {
    return cleaned;
  }

  const preferred = String(preferredName || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (isReadableDiagnosisName(preferred) && !isCodeLikeDiagnosisName(preferred)) {
    return preferred;
  }

  const normalizedIcd = normalizeIcdCode(icdCode);
  const chronic = classifyChronicDisease(normalizedIcd);
  if (chronic) return chronic.fullName;
  if (normalizedIcd) return `Diagnosis ${normalizedIcd}`;
  return 'Diagnosis belum terklasifikasi';
}

async function hydrateSuggestionDisplayNames(
  suggestions: DiagnosisSuggestion[]
): Promise<DiagnosisSuggestion[]> {
  const codes = Array.from(
    new Set(
      suggestions
        .map((item) => normalizeIcdCode(item.icd_x))
        .filter((code): code is string => Boolean(code && isLikelyIcdCode(code)))
    )
  );
  if (codes.length === 0) {
    return suggestions.map((item) => {
      const normalizedCode = normalizeIcdCode(item.icd_x);
      return {
        ...item,
        icd_x: normalizedCode || item.icd_x,
        nama: sanitizeDiagnosisDisplayName(item.nama, normalizedCode || item.icd_x),
      };
    });
  }

  try {
    const details = await getICD10Details(codes);
    const labelByCode = new Map<string, string>();
    for (const detail of details) {
      const code = normalizeIcdCode(detail.code);
      if (!code) continue;
      const label = detail.name_id || detail.name_en || '';
      if (!labelByCode.has(code)) labelByCode.set(code, label);
      const prefix = code.split('.')[0];
      if (!labelByCode.has(prefix)) labelByCode.set(prefix, label);
    }

    return suggestions.map((item) => {
      const code = normalizeIcdCode(item.icd_x);
      const preferred = labelByCode.get(code) || labelByCode.get(code.split('.')[0]) || '';
      return {
        ...item,
        icd_x: code || item.icd_x,
        nama: sanitizeDiagnosisDisplayName(item.nama, code || item.icd_x, preferred),
      };
    });
  } catch {
    return suggestions.map((item) => {
      const normalizedCode = normalizeIcdCode(item.icd_x);
      return {
        ...item,
        icd_x: normalizedCode || item.icd_x,
        nama: sanitizeDiagnosisDisplayName(item.nama, normalizedCode || item.icd_x),
      };
    });
  }
}

async function buildMedicationRecommendations(
  diagnosisSuggestions: DiagnosisSuggestion[],
  _encounter: Encounter,
  context: DiagnosisRequestContext
): Promise<MedicationRecommendation[]> {
  if (diagnosisSuggestions.length === 0) return [];
  const primary = diagnosisSuggestions[0];
  const icdCode = primary.icd_x;
  if (!icdCode) return [];

  const prescriptionContext = {
    icd_x: icdCode,
    patient_age: context.patient_age,
    patient_weight: undefined,
    alergi: context.allergies || [],
    penyakit_kronis: context.chronic_diseases || [],
    current_medications: [],
    keluhan_utama: context.keluhan_utama,
    selected_diagnosis_name: primary.nama,
    vital_signs: context.vital_signs,
  };

  try {
    const plan: PharmacotherapyPlan = await generatePharmacotherapyPlan(prescriptionContext);
    return plan.medications;
  } catch {
    return [];
  }
}

function uniqueStrings(items: string[], limit: number): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function buildClinicalReasoningPayload(
  status: ClinicalReasoningStatusCode,
  diagnosisSuggestions: DiagnosisSuggestion[],
  medicationRecommendations: MedicationRecommendation[],
  message: string,
  inputDataState: ClinicalInputDataState
): ClinicalReasoningPayload {
  const workingDiagnosis = diagnosisSuggestions[0]
    ? {
        icd_x: diagnosisSuggestions[0].icd_x,
        nama: diagnosisSuggestions[0].nama,
      }
    : null;
  const examSignals = workingDiagnosis
    ? uniqueStrings(
        diagnosisSuggestions
          .slice(0, 3)
          .flatMap((item) => item.recommended_actions || [])
          .filter(Boolean),
        6
      )
    : [];

  return {
    status,
    differentialDiagnosis: status === 'ok' ? diagnosisSuggestions : [],
    workingDiagnosis: status === 'ok' ? workingDiagnosis : null,
    input_data_state: inputDataState,
    supportingExaminations: {
      laboratory: examSignals.filter((item) => /lab|cbc|darah|creat|troponin|elektro/i.test(item)),
      additional: examSignals.filter((item) => !/lab|cbc|darah|creat|troponin|elektro/i.test(item)),
    },
    pharmacotherapy: status === 'ok' ? medicationRecommendations : [],
    redFlags: uniqueStrings(
      diagnosisSuggestions.slice(0, 3).flatMap((item) => item.red_flags || []),
      6
    ),
    message,
  };
}

function buildFailClosedResponse(
  status: ClinicalReasoningStatusCode,
  message: string,
  inputDataState: ClinicalInputDataState
): APIResponse<CDSSResponse> {
  return {
    success: true,
    data: {
      diagnosis_suggestions: [],
      medication_recommendations: [],
      alerts: [],
      clinical_reasoning: buildClinicalReasoningPayload(status, [], [], message, inputDataState),
      meta: {
        processing_time_ms: 0,
        model_version: 'IDE-V1-fail-closed',
        timestamp: new Date().toISOString(),
        is_local: true,
        is_mock: false,
      },
    },
  };
}

/**
 * runGetSuggestionsFlow
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export async function runGetSuggestionsFlow(
  encounter: Encounter,
  context: DiagnosisRequestContext,
  trajectoryResult?: HybridTrajectoryResult | null
): Promise<APIResponse<CDSSResponse>> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const inputDataState = buildInputDataState(context, encounter);
    return buildFailClosedResponse(
      'mock_blocked',
      'Clinical reasoning diblok karena runtime masih berada pada mock mode.',
      inputDataState
    );
  }

  const inputDataState = buildInputDataState(context, encounter);
  if (!encounter.anamnesa?.keluhan_utama?.trim() && !context.keluhan_utama?.trim()) {
    return buildFailClosedResponse(
      'insufficient_data',
      'Clinical reasoning is unavailable or insufficient for this case. Physician assessment remains required.',
      inputDataState
    );
  }

  try {
    flowLog.debug('diagnosis_flow_input', {
      source: 'get-suggestions-flow',
      caseId: generateSessionId(encounter),
      payloadCompleteness: {
        hasChiefComplaint: Boolean(
          context.keluhan_utama?.trim() || encounter.anamnesa?.keluhan_utama?.trim()
        ),
        hasAdditionalComplaint: Boolean(
          context.keluhan_tambahan?.trim() || encounter.anamnesa?.keluhan_tambahan?.trim()
        ),
        hasVitals: Boolean(context.vital_signs),
        ageKnown: Number.isFinite(context.patient_age) && context.patient_age > 0,
        genderKnown: Boolean(context.patient_gender),
      },
      kbLoaded: null,
      kbDiseaseCount: 0,
      mockMode: false,
      candidatesCount: 0,
      selectedDiagnosis: null,
      status: 'queued',
    });
    const engineResult = await runDiagnosisEngine(encounter, undefined, context);
    const mappedEngineSuggestions = engineResult.suggestions.map((s, index) => ({
      rank: index + 1,
      icd_x: normalizeIcdCode(s.icd10_code),
      nama: s.diagnosis_name,
      confidence: s.confidence,
      rationale: s.reasoning,
      red_flags: s.red_flags || [],
      recommended_actions: s.recommended_actions || [],
    }));

    const engineSuggestions = (await hydrateSuggestionDisplayNames(mappedEngineSuggestions)).filter(
      (item) => isLikelyIcdCode(item.icd_x)
    );

    const diagnosisSuggestions = engineSuggestions;
    const config = getDiagnosisEngineConfig();
    const medicationRecommendations = config.enableTherapy
      ? await buildMedicationRecommendations(diagnosisSuggestions, encounter, context)
      : [];
    // SYMPHONY safety bridge: inject trajectory alerts into diagnosis
    const trajectoryAlerts = config.enableTrajectoryBridge
      ? extractSafetyAlertsFromTrajectory(trajectoryResult ?? null)
      : [];
    const mappedTrajectoryAlerts = trajectoryAlerts.map((ta) => ({
      ...ta,
      icd_codes: [] as string[],
    }));
    const status: ClinicalReasoningStatusCode =
      diagnosisSuggestions.length > 0 ? 'ok' : 'no_safe_match';

    flowLog.debug('diagnosis_flow_output', {
      source: 'get-suggestions-flow',
      caseId: generateSessionId(encounter),
      payloadCompleteness: {
        hasChiefComplaint: Boolean(
          context.keluhan_utama?.trim() || encounter.anamnesa?.keluhan_utama?.trim()
        ),
        hasAdditionalComplaint: Boolean(
          context.keluhan_tambahan?.trim() || encounter.anamnesa?.keluhan_tambahan?.trim()
        ),
        hasVitals: Boolean(context.vital_signs),
        ageKnown: Number.isFinite(context.patient_age) && context.patient_age > 0,
        genderKnown: Boolean(context.patient_gender),
      },
      kbLoaded: true,
      kbDiseaseCount: diagnosisSuggestions.length,
      mockMode: false,
      candidatesCount: diagnosisSuggestions.length,
      selectedDiagnosis: diagnosisSuggestions[0]
        ? { id: diagnosisSuggestions[0].icd_x, name: diagnosisSuggestions[0].nama }
        : null,
      status,
    });

    if (isDiagnosisV2ShadowEnabled() && diagnosisSuggestions.length > 0) {
      const v2Shadow = runDiagnosisV2Shadow({
        suggestions: diagnosisSuggestions,
        context: {
          keluhan_utama: context.keluhan_utama,
          keluhan_tambahan: context.keluhan_tambahan,
          vital_signs: context.vital_signs,
        },
      });
      const comparison = compareDiagnosisVersions({
        v1Suggestions: diagnosisSuggestions,
        v2Suggestions: v2Shadow.suggestions,
        v2UncertaintyLevel: v2Shadow.uncertaintyLevel,
        v2PrimaryAbstained: v2Shadow.primaryAbstained,
      });

      logShadowComparison({
        session_id: generateSessionId(encounter),
        suggestions: v2Shadow.suggestions.map((suggestion) => ({
          icd10_code: suggestion.icd_x,
          confidence: suggestion.confidence,
        })),
        model_version: 'IDE-V2-shadow',
        metadata: shadowComparisonToAuditMetadata(comparison),
      }).catch(console.error);
    }

    return {
      success: true,
      data: {
        diagnosis_suggestions: diagnosisSuggestions,
        medication_recommendations: medicationRecommendations,
        alerts: [
          ...engineResult.alerts.map((a) => ({
            id: a.id,
            type: a.type,
            severity: a.severity,
            title: a.title,
            message: a.message,
            icd_codes: a.icd_codes,
            action: a.action,
          })),
          ...mappedTrajectoryAlerts,
        ],
        validation_summary: {
          total_raw: engineResult.validation_summary.total_raw,
          total_validated: engineResult.validation_summary.total_validated,
          unverified_codes: engineResult.validation_summary.unverified_codes,
          warnings: [...engineResult.validation_summary.warnings],
        },
        clinical_reasoning: buildClinicalReasoningPayload(
          status,
          diagnosisSuggestions,
          medicationRecommendations,
          status === 'ok'
            ? 'Clinical reasoning tersedia dari KB matcher lokal.'
            : 'Clinical reasoning is unavailable or insufficient for this case. Physician assessment remains required.',
          inputDataState
        ),
        meta: {
          processing_time_ms: engineResult.processing_time_ms,
          model_version: engineResult.model_version,
          timestamp: new Date().toISOString(),
          is_local: engineResult.source === 'local',
          is_mock: false,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown engine error';
    if (/penyakit\.json|_metadata|missing penyakit array|Invalid penyakit\.json/i.test(message)) {
      return buildFailClosedResponse(
        'kb_load_error',
        'Clinical reasoning is unavailable or insufficient for this case. Physician assessment remains required.',
        inputDataState
      );
    }
    return buildFailClosedResponse(
      'engine_error',
      'Clinical reasoning is unavailable or insufficient for this case. Physician assessment remains required.',
      inputDataState
    );
  }
}
