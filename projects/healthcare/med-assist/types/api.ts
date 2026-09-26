// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

/**
 * Sentra API Type Definitions
 * CDSS Backend Integration Types
 *
 * @module types/api
 * @version 1.0.0
 */

// =============================================================================
// DIAGNOSIS TYPES
// =============================================================================

/**
 * AI-suggested diagnosis with confidence scoring
 */
export interface DiagnosisSuggestion {
  /** Rank in suggestion list */
  rank: number;
  /** ICD-10 code (e.g., "J06.9", "A09") */
  icd_x: string;
  /** Diagnosis name in Indonesian */
  nama: string;
  /** English diagnosis name */
  diagnosis_name?: string;
  /** Alias for ICD code compatibility */
  icd10_code?: string;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** Clinical rationale for this suggestion */
  rationale: string;
  /** Alias for rationale */
  reasoning?: string;
  /** Red flags associated with this diagnosis */
  red_flags?: string[];
  /** Recommended actions */
  recommended_actions?: string[];
}

// =============================================================================
// MEDICATION TYPES
// =============================================================================

/**
 * AI-recommended medication with safety information
 */
export interface MedicationRecommendation {
  /** Drug name with strength (e.g., "Paracetamol 500mg") */
  nama_obat: string;
  /** Dosage regimen (e.g., "3x1", "2x500mg") */
  dosis: string;
  /** Administration instructions */
  aturan_pakai: AturanPakaiText;
  /** Treatment duration (e.g., "3 hari", "5 hari") */
  durasi?: string;
  /** Clinical rationale for this recommendation */
  rationale: string;
  /** Safety assessment result */
  safety_check: SafetyStatus;
  /** Known contraindications for this patient */
  contraindications?: string[];
  /** Structured regimen role when available from engine/composition */
  role?: 'utama' | 'adjuvant' | 'vitamin';
  /** Marks mandatory continuation from prior chronic therapy history */
  isChronicContinuation?: boolean;
}

export type ClinicalReasoningStatusCode =
  | 'ok'
  | 'insufficient_data'
  | 'kb_load_error'
  | 'mock_blocked'
  | 'no_safe_match'
  | 'engine_error';

export type ClinicalDataPresenceState = 'present' | 'absent' | 'unknown' | 'insufficient';

export interface ClinicalInputDataState {
  chief_complaint: ClinicalDataPresenceState;
  additional_complaint: ClinicalDataPresenceState;
  vitals: ClinicalDataPresenceState;
  age: ClinicalDataPresenceState;
  gender: ClinicalDataPresenceState;
  allergies: ClinicalDataPresenceState;
}

export interface ClinicalReasoningPayload {
  status: ClinicalReasoningStatusCode;
  differentialDiagnosis: DiagnosisSuggestion[];
  workingDiagnosis: { icd_x: string; nama: string } | null;
  input_data_state: ClinicalInputDataState;
  supportingExaminations: {
    laboratory: string[];
    additional: string[];
  };
  pharmacotherapy: MedicationRecommendation[];
  redFlags: string[];
  message: string;
}

export type AturanPakaiText =
  | 'Sebelum makan'
  | 'Sesudah makan'
  | 'Pemakaian luar'
  | 'Jika diperlukan'
  | 'Saat makan';

export type SafetyStatus = 'safe' | 'caution' | 'contraindicated';

// =============================================================================
// ALERT TYPES
// =============================================================================

/**
 * Clinical Decision Support Alert
 * Matches lib/cdss/engine.ts:CDSSAlert
 */
export interface CDSSAlert {
  /** Unique alert ID */
  id: string;
  /** Alert type */
  type: CDSSAlertType;
  /** Severity level */
  severity: AlertSeverity;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Related ICD-10 codes */
  icd_codes?: string[];
  /** Recommended action */
  action?: string;
}

export type AlertSeverity = 'emergency' | 'high' | 'medium' | 'low' | 'info';

export type CDSSAlertType =
  | 'red_flag'
  | 'validation_warning'
  | 'api_error'
  | 'low_confidence'
  | 'allergy'
  | 'ddi'
  | 'dosing'
  | 'guideline'
  | 'chronic_disease'
  | 'vital_sign'
  | 'sepsis_warning';

/** @deprecated Use AlertSeverity instead */
export type AlertLevel = 'critical' | 'warning' | 'info';

/** @deprecated Use CDSSAlertType instead */
export type AlertType = CDSSAlertType;

// =============================================================================
// DRUG INTERACTION TYPES
// =============================================================================

/**
 * Drug-Drug Interaction result
 */
export interface DrugInteraction {
  /** First drug in the interaction pair */
  drug_a: string;
  /** Second drug in the interaction pair */
  drug_b: string;
  /** Interaction severity */
  severity: DDISeverity;
  /** Clinical description of the interaction */
  description: string;
  /** Recommended action */
  recommendation?: string;
  /** Evidence source (e.g., "Lexicomp", "Micromedex") */
  source?: string;
}

export type DDISeverity = 'contraindicated' | 'major' | 'moderate' | 'minor';

// =============================================================================
// PEDIATRIC DOSING TYPES
// =============================================================================

/**
 * Pediatric dose calculation result
 */
export interface PediatricDose {
  /** Drug name */
  drug: string;
  /** Calculated dose */
  recommended_dose: string;
  /** Maximum safe dose */
  max_dose: string;
  /** Available formulation (e.g., "Sirup 60mg/5mL") */
  formulation?: string;
  /** Calculation method used */
  method: PediatricDosingMethod;
  /** Safety warnings specific to pediatric use */
  warnings?: string[];
}

export type PediatricDosingMethod =
  | 'weight_based'
  | 'age_based'
  | 'bsa_based'
  | 'clarks_rule'
  | 'youngs_rule';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Main CDSS API response structure
 */
export interface CDSSResponse {
  /** Suggested diagnoses with confidence scores */
  diagnosis_suggestions: DiagnosisSuggestion[];
  /** Recommended medications with safety checks */
  medication_recommendations: MedicationRecommendation[];
  /** Clinical alerts (allergy, DDI, dosing, etc.) */
  alerts: CDSSAlert[];
  /** Evidence-based clinical guidelines */
  clinical_guidelines?: string[];
  /** Detected drug interactions */
  drug_interactions?: DrugInteraction[];
  /** Explainability payload for pharmacotherapy reasoning */
  pharmacotherapy_explainability?: PharmacotherapyExplainability;
  /** Validation summary from diagnosis engine */
  validation_summary?: {
    total_raw: number;
    total_validated: number;
    unverified_codes: string[];
    warnings: string[];
  };
  /** Response metadata */
  meta?: CDSSResponseMeta;
  /** Fail-closed clinical reasoning summary */
  clinical_reasoning?: ClinicalReasoningPayload;
}

export interface PharmacotherapyExplainability {
  /** Confidence score (0-100) of therapy proposal */
  confidence: number;
  /** Clinical/rule drivers that shaped recommendation */
  drivers: string[];
  /** Missing data that may reduce confidence */
  missing_data: string[];
  /** Risk tier inferred for follow-up intensity */
  risk_tier: 'routine' | 'urgent' | 'emergency';
  /** Recommended review window based on risk */
  review_window: '6h' | '24h' | '48h';
  /** Trace of pipeline branch used */
  pathway:
    | 'knowledge-only'
    | 'knowledge+syndrome-intent'
    | 'syndrome-intent-only'
    | 'legacy-fallback';
}

export interface CDSSResponseMeta {
  /** Request processing time in ms */
  processing_time_ms: number;
  /** AI model version used */
  model_version: string;
  /** Request timestamp */
  timestamp: string;
  /** Whether this is a mock response */
  is_mock?: boolean;
  /** Whether inference executed locally on edge/browser runtime */
  is_local?: boolean;
}

// =============================================================================
// API REQUEST TYPES
// =============================================================================

/**
 * Diagnosis suggestion request context
 */
export interface DiagnosisRequestContext {
  /** Chief complaint / Keluhan utama */
  keluhan_utama: string;
  /** Additional complaints / Keluhan tambahan */
  keluhan_tambahan?: string;
  /** Patient age in years */
  patient_age: number;
  /** Patient gender */
  patient_gender: 'M' | 'F';
  /** Vital signs if available */
  vital_signs?: VitalSigns;
  /** Known allergies */
  allergies?: string[];
  /** Known chronic diseases */
  chronic_diseases?: string[];
}

/**
 * Prescription recommendation request context
 */
export interface PrescriptionRequestContext {
  /** Selected ICD-10 diagnosis code */
  icd_x: string;
  /** Patient age in years */
  patient_age: number;
  /** Patient weight in kg */
  patient_weight?: number;
  /** Known drug allergies */
  alergi: string[];
  /** Chronic disease conditions */
  penyakit_kronis: string[];
  /** Currently prescribed medications */
  current_medications?: string[];
  /** Optional complaint context for reasoner */
  keluhan_utama?: string;
  /** Optional selected diagnosis label from UI */
  selected_diagnosis_name?: string;
  /** Optional vitals context to improve safety filtering */
  vital_signs?: VitalSigns;
  /** Explicit pregnancy status (preferred over text/ICD inference when provided) */
  is_pregnant?: boolean;
  /** Source provenance of selected diagnosis */
  diagnosis_source?: 'suggested' | 'manual';
  /** Confidence from diagnosis selection flow */
  diagnosis_confidence?: number;
}

/**
 * DDI check request
 */
export interface DDICheckRequest {
  /** List of drug names to check */
  drugs: string[];
}

/**
 * Allergy check request
 */
export interface AllergyCheckRequest {
  /** Medications to prescribe */
  medications: string[];
  /** Known patient allergies */
  allergies: string[];
}

/**
 * Pediatric dosing request
 */
export interface PediatricDoseRequest {
  /** Drug name */
  drug: string;
  /** Patient age in months */
  patient_age_months: number;
  /** Patient weight in kg */
  patient_weight_kg: number;
}

// =============================================================================
// VITAL SIGNS
// =============================================================================

export interface VitalSigns {
  /** Systolic blood pressure (mmHg) */
  systolic?: number;
  /** Diastolic blood pressure (mmHg) */
  diastolic?: number;
  /** Heart rate (bpm) */
  heart_rate?: number;
  /** Respiratory rate (breaths/min) */
  respiratory_rate?: number;
  /** Temperature (Celsius) */
  temperature?: number;
  /** Oxygen saturation (%) */
  spo2?: number;
  /** Glasgow Coma Scale (3-15) */
  gcs?: number;
}

// =============================================================================
// API ERROR TYPES
// =============================================================================

export interface APIError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

export interface APIResponse<T> {
  /** Whether the request succeeded */
  success: boolean;
  /** Response data if successful */
  data?: T;
  /** Error information if failed */
  error?: APIError;
  /** Indicates fallback to local rules was used */
  fallback?: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isCDSSAlert(obj: unknown): obj is CDSSAlert {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'severity' in obj &&
    'type' in obj &&
    'message' in obj
  );
}

export function isDrugInteraction(obj: unknown): obj is DrugInteraction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'drug_a' in obj &&
    'drug_b' in obj &&
    'severity' in obj
  );
}

export function isCriticalAlert(alert: CDSSAlert): boolean {
  return alert.severity === 'emergency' || alert.severity === 'high';
}

export function isContraindicated(interaction: DrugInteraction): boolean {
  return interaction.severity === 'contraindicated';
}
