// Designed and constructed by Drferdi.
/**
 * Sentra Assist — Dashboard Bridge Client
 * Polls the Puskesmas Dashboard Bridge API for pending transfer requests.
 * Also supports outbound consult: Assist → Dashboard (Send to Doctor).
 *
 * Flow (inbound): Dashboard → Bridge API → Assist polls → auto-fill ePuskesmas
 * Flow (outbound): Assist → POST /api/consult → Dashboard → Doctor
 */

import { getAuthConfig, getStoredSession } from './auth-client';
import {
  authedFetch,
  AuthRequiredError,
  BridgeApiError,
  BridgeResponseFormatError,
} from './authed-fetch';
import type { PatientSyncPayload } from './patient-sync-payload';
import { assertNoPII } from './pii-guard';

import { type APP_SLUG } from '@/lib/app-identity';
import { createLogger } from '~/utils/logger';
import type {
  AnamnesisExtractionResult,
  AnamnesisMissingField,
  RMETransferPayload,
  RMETransferResult,
} from '~/utils/types';

const log = createLogger('BridgeClient', 'background');
const COOKIE_SESSION_ACCESS_TOKEN = 'cookie-session';
/** Pesan singkat — dipakai saat API bridge dipanggil tanpa sesi/token */
export const BRIDGE_AUTH_REQUIRED_HINT =
  'Bridge memerlukan sesi Dashboard (host sama dengan Crew API di Settings) atau Bridge Automation Token di Settings → Agent.';

const BRIDGE_TOKEN_REQUIRED_MESSAGE = BRIDGE_AUTH_REQUIRED_HINT;

// ============================================================================
// TYPES
// ============================================================================

export interface BridgeEntry {
  id: string;
  status: string;
  createdAt: string;
  createdBy: string;
  pelayananId: string;
  patientName?: string;
  hasAnamnesa: boolean;
  hasDiagnosa: boolean;
  hasResep: boolean;
}

/**
 * BridgeEntryDetail interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface BridgeEntryDetail {
  id: string;
  status: string;
  createdAt: string;
  createdBy: string;
  pelayananId: string;
  patientName?: string;
  payload: RMETransferPayload;
}

interface BridgeListResponse {
  ok: boolean;
  items: BridgeEntry[];
  count: number;
  error?: string;
}

interface BridgeDetailResponse {
  ok: boolean;
  entry: BridgeEntryDetail;
  error?: string;
}

interface BridgePatchResponse {
  ok: boolean;
  entry: { id: string; status: string };
  error?: string;
}

// ============================================================================
// CONFIG — bridge-specific settings only (auth handled by auth-store)
// ============================================================================

const STORAGE_KEY = 'sentra:bridge-config';

/**
 * BridgeConfig interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface BridgeConfig {
  enabled: boolean;
  pollIntervalMinutes: number;
}

/**
 * BridgeAuthSource type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type BridgeAuthSource = 'none' | 'dashboard-session' | 'automation-token';
/**
 * BridgeRuntimeReadiness type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type BridgeRuntimeReadiness =
  'ready' | 'disabled' | 'auth_required' | 'server_unreachable' | 'server_error';

/**
 * BridgeRuntimeStatus interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface BridgeRuntimeStatus {
  readiness: BridgeRuntimeReadiness;
  authSource: BridgeAuthSource;
  enabled: boolean;
  serverReachable: boolean;
  serverAuthorized: boolean;
  message: string;
}

const DEFAULT_CONFIG: BridgeConfig = {
  enabled: true,
  pollIntervalMinutes: 0.5,
};

function hasBridgeAutomationToken(token: string | null | undefined): boolean {
  return Boolean(token?.trim());
}

async function hasBridgeSessionAuth(): Promise<boolean> {
  const session = await getStoredSession();
  if (!session?.tokens?.accessToken) return false;
  if (session.tokens.expiresAt <= Date.now() + 60_000) return false;
  return session.tokens.accessToken === COOKIE_SESSION_ACCESS_TOKEN;
}

async function getBridgeAuthSource(): Promise<BridgeAuthSource> {
  const authConfig = await getAuthConfig();
  if (hasBridgeAutomationToken(authConfig.automationToken)) return 'automation-token';
  if (await hasBridgeSessionAuth()) return 'dashboard-session';
  return 'none';
}

/**
 * getBridgeConfig
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function getBridgeConfig(): Promise<BridgeConfig> {
  try {
    const raw = await browser.storage.local.get(STORAGE_KEY);
    const stored = raw[STORAGE_KEY] as Partial<BridgeConfig> | undefined;
    if (!stored) return DEFAULT_CONFIG;

    const cleaned: Partial<BridgeConfig> = {};
    if (typeof stored.enabled === 'boolean') cleaned.enabled = stored.enabled;
    if (stored.pollIntervalMinutes) cleaned.pollIntervalMinutes = stored.pollIntervalMinutes;
    return { ...DEFAULT_CONFIG, ...cleaned };
  } catch (e) {
    log.warn('[BridgeClient] Failed to load config, using safe defaults', {
      reason: e instanceof Error ? e.message : String(e),
    });
    return DEFAULT_CONFIG;
  }
}

/**
 * saveBridgeConfig
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function saveBridgeConfig(config: Partial<BridgeConfig>): Promise<BridgeConfig> {
  const current = await getBridgeConfig();
  const updated = { ...current, ...config };
  await browser.storage.local.set({ [STORAGE_KEY]: updated });
  log.debug('[BridgeClient] Config saved', { enabled: updated.enabled });
  return updated;
}

/**
 * Check if bridge is ready (authenticated + enabled).
 */
export async function isBridgeReady(): Promise<boolean> {
  const status = await getBridgeRuntimeStatus();
  return status.readiness === 'ready';
}

// ============================================================================
// HTTP CLIENT — delegates to authed-fetch (reads token from auth-store)
// ============================================================================

async function bridgeFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authConfig = await getAuthConfig();
  const authed =
    hasBridgeAutomationToken(authConfig.automationToken) || (await hasBridgeSessionAuth());
  if (!authed) {
    throw new AuthRequiredError(BRIDGE_TOKEN_REQUIRED_MESSAGE);
  }
  if (options.body !== undefined && options.body !== null) {
    assertNoPII(options.body);
  }
  return authedFetch<T>(path, options);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function fetchPendingEntries(): Promise<BridgeEntry[]> {
  const res = await bridgeFetch<BridgeListResponse>('/api/emr/bridge?status=pending&limit=5');
  if (!res.ok) throw new Error(res.error || 'Failed to fetch pending entries');
  return res.items;
}

/**
 * fetchEntryDetail
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function fetchEntryDetail(id: string): Promise<BridgeEntryDetail> {
  const res = await bridgeFetch<BridgeDetailResponse>(`/api/emr/bridge/${id}`);
  if (!res.ok) throw new Error(res.error || 'Failed to fetch entry detail');
  return res.entry;
}

/**
 * claimEntry
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function claimEntry(id: string): Promise<void> {
  const res = await bridgeFetch<BridgePatchResponse>(`/api/emr/bridge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'claim', claimedBy: 'assist-extension' }),
  });
  if (!res.ok) throw new Error(res.error || 'Failed to claim entry');
}

/**
 * reportProcessing
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function reportProcessing(id: string): Promise<void> {
  await bridgeFetch<BridgePatchResponse>(`/api/emr/bridge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'processing' }),
  });
}

/**
 * reportComplete
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function reportComplete(id: string, result: RMETransferResult): Promise<void> {
  await bridgeFetch<BridgePatchResponse>(`/api/emr/bridge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'complete', result }),
  });
}

/**
 * reportFailed
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function reportFailed(
  id: string,
  error: string,
  result?: RMETransferResult
): Promise<void> {
  await bridgeFetch<BridgePatchResponse>(`/api/emr/bridge/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'fail', error, result }),
  });
}

// ============================================================================
// SEND TO DOCTOR — Outbound consult from Assist → Intelligence Dashboard
// ============================================================================

export interface OnlineDoctor {
  id: string;
  name: string;
  role: string;
  poli?: string;
  location_name?: string;
  room_name?: string;
  availability_status?: 'online' | 'busy' | 'away' | 'offline';
  last_seen_at?: string;
  /** Nama lengkap profesional dengan gelar (e.g. "dr. Ferdi Iskandar") */
  professional_name?: string;
  /** Nama lengkap non-gelar */
  full_name?: string;
}

interface OnlineDoctorsResponse {
  ok: boolean;
  doctors: OnlineDoctor[];
  error?: string;
}

function isNetworkReachabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Tidak dapat terhubung') || error.message.includes('Request timeout')
  );
}

function getBridgeVerificationMessage(authSource: BridgeAuthSource): string {
  if (authSource === 'automation-token') {
    return 'Bridge terverifikasi ke server via automation token.';
  }
  if (authSource === 'dashboard-session') {
    return 'Bridge terverifikasi ke server via sesi Dashboard.';
  }
  return BRIDGE_AUTH_REQUIRED_HINT;
}

/**
 * getBridgeRuntimeStatus
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function getBridgeRuntimeStatus(): Promise<BridgeRuntimeStatus> {
  const config = await getBridgeConfig();
  if (!config.enabled) {
    return {
      readiness: 'disabled',
      authSource: 'none',
      enabled: false,
      serverReachable: false,
      serverAuthorized: false,
      message: 'Bridge dimatikan di Settings.',
    };
  }

  const authSource = await getBridgeAuthSource();
  if (authSource === 'none') {
    return {
      readiness: 'auth_required',
      authSource,
      enabled: true,
      serverReachable: false,
      serverAuthorized: false,
      message: BRIDGE_AUTH_REQUIRED_HINT,
    };
  }

  try {
    const res = await bridgeFetch<OnlineDoctorsResponse>('/api/doctors/online');
    if (!res.ok) {
      return {
        readiness: 'server_error',
        authSource,
        enabled: true,
        serverReachable: true,
        serverAuthorized: true,
        message: res.error || 'Server bridge menolak verifikasi runtime.',
      };
    }

    return {
      readiness: 'ready',
      authSource,
      enabled: true,
      serverReachable: true,
      serverAuthorized: true,
      message: getBridgeVerificationMessage(authSource),
    };
  } catch (error) {
    if (
      error instanceof AuthRequiredError ||
      (error instanceof BridgeApiError && (error.status === 401 || error.status === 403))
    ) {
      return {
        readiness: 'auth_required',
        authSource,
        enabled: true,
        serverReachable: true,
        serverAuthorized: false,
        message: error.message || BRIDGE_AUTH_REQUIRED_HINT,
      };
    }

    if (isNetworkReachabilityError(error)) {
      return {
        readiness: 'server_unreachable',
        authSource,
        enabled: true,
        serverReachable: false,
        serverAuthorized: false,
        message:
          error instanceof Error
            ? error.message
            : 'Server bridge tidak dapat dijangkau. Periksa koneksi dan Base URL.',
      };
    }

    return {
      readiness: 'server_error',
      authSource,
      enabled: true,
      serverReachable: true,
      serverAuthorized: false,
      message:
        error instanceof Error
          ? error.message
          : 'Verifikasi bridge gagal karena error yang tidak dikenali.',
    };
  }
}

/**
 * CanonicalPregnancyStatus type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type CanonicalPregnancyStatus = 'hamil' | 'tidak_hamil' | 'tidak_relevan' | 'tidak_diisi';

/**
 * CanonicalTriageInput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface CanonicalTriageInput {
  request_id: string;
  request_time: string;
  source: {
    app: typeof APP_SLUG;
    app_version?: string;
    engine_mode: 'preview' | 'canonical';
  };
  patient: {
    patient_id: string;
    rm: string;
    name?: string;
    gender: 'L' | 'P';
    age: number;
    dob?: string;
    payer_label?: string;
    bpjs_status?: 'aktif' | 'nonaktif' | 'mandiri' | null;
    kelurahan?: string;
    facility_name?: string;
  };
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose?: {
      value: number;
      type: 'GDS';
    };
    avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
    supplemental_o2?: boolean;
    pain_score?: number;
    has_copd?: boolean;
    weight_kg?: number;
    height_cm?: number;
    measurement_time?: string;
  };
  narrative: {
    symptom_text_raw: string;
    keluhan_utama: string;
    keluhan_tambahan?: string;
    autocomplete_summary?: string;
    autosen_preset?: string;
  };
  context: {
    chronic_diseases: string[];
    allergies: string[];
    pregnancy_status: CanonicalPregnancyStatus;
    pregnancy_risk?: string;
    special_conditions: string[];
    disability_type?: string;
    obesity_confirmation?: 'confirmed' | 'not_confirmed';
  };
  bedside_signs?: {
    structured_signs_text?: string;
    deterioration_summary_text?: string;
  };
  history?: {
    visits_used?: number;
    prefetched_visits?: Array<{
      encounter_id: string;
      timestamp: string;
      keluhan_utama: string;
      source: 'scrape';
      vitals: {
        sbp: number;
        dbp: number;
        hr: number;
        rr: number;
        temp: number;
        glucose: number;
        spo2: number;
      };
      diagnosa?: {
        icd_x: string;
        nama: string;
      };
    }>;
  };
}

/**
 * CanonicalClinicalEngineOutput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface CanonicalClinicalEngineOutput {
  request_id: string;
  processed_at: string;
  source: {
    engine: 'dashboard-clinical-engine';
    engine_version: string;
    mode: 'canonical';
  };
  scoring: {
    news2?: {
      score: number;
      risk_level: 'low' | 'low-medium' | 'medium' | 'high';
      drivers: string[];
    };
    map?: {
      value: number;
      interpretation: string;
    };
    occult_shock?: {
      risk_level: 'low' | 'moderate' | 'high' | 'critical';
      suspected: boolean;
      reasoning: string[];
    };
  };
  alerts: Array<{
    id: string;
    family: 'red_flag' | 'news2' | 'early_warning' | 'trajectory' | 'governance';
    severity: 'emergency' | 'urgent' | 'warning' | 'info';
    title: string;
    message: string;
    action?: string;
    criteria_met?: string[];
  }>;
  early_warning_patterns?: Array<{
    id: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    reasoning: string[];
    recommendations: string[];
  }>;
  trajectory?: {
    available: boolean;
    visit_count: number;
    overall_trend?: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    overall_risk?: 'low' | 'moderate' | 'high' | 'critical';
    momentum_level?: string;
    deterioration_state?: 'improving' | 'stable' | 'deteriorating' | 'critical';
    narrative?: string;
    recommendations?: Array<{
      category: 'improvement' | 'concern' | 'action' | 'monitoring';
      priority: 'high' | 'medium' | 'low';
      text: string;
    }>;
    raw_context?: {
      trajectory_context?: {
        momentumLevel: string;
        convergencePattern: string;
        convergenceScore: number;
        worseningParams: string[];
        isAccelerating: boolean;
        timeToCriticalDays: number | null;
        treatmentResponseNote: string;
        narrative: string;
        visitCount?: number;
      };
      deterioration_summary_text?: string;
    };
  };
  recommendations: {
    immediate_actions: string[];
    monitoring_actions: string[];
    referral_actions: string[];
    next_best_questions: string[];
  };
  governance: {
    disclaimer: string;
    review_required: boolean;
    authoritative_engine: 'dashboard';
  };
}

interface CanonicalEngineResponse {
  ok: boolean;
  data?: CanonicalClinicalEngineOutput;
  error?: string;
}

/**
 * CanonicalDifferentialInput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface CanonicalDifferentialInput {
  request_id: string;
  patient: {
    age: number;
    gender: 'L' | 'P';
  };
  narrative: {
    keluhan_utama: string;
    keluhan_tambahan?: string;
  };
  vitals: {
    sbp?: number;
    dbp?: number;
    hr?: number;
    rr?: number;
    temp?: number;
    spo2?: number;
    glucose?: number;
  };
  context?: {
    allergies?: string[];
    chronic_diseases?: string[];
    is_pregnant?: boolean;
  };
  canonical_clinical?: {
    trajectory_context?: NonNullable<
      NonNullable<CanonicalClinicalEngineOutput['trajectory']>['raw_context']
    >['trajectory_context'];
    deterioration_summary_text?: string;
  };
}

/**
 * CanonicalDifferentialOutput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface CanonicalDifferentialOutput {
  diagnosis_suggestions: Array<{
    rank: number;
    icd_x: string;
    nama: string;
    diagnosis_name?: string;
    icd10_code?: string;
    confidence: number;
    rationale: string;
    reasoning?: string;
    red_flags?: string[];
    recommended_actions?: string[];
  }>;
  alerts: Array<{
    severity: 'emergency' | 'urgent' | 'warning';
    condition: string;
    action: string;
    criteria_met: string[];
    icd_codes?: string[];
  }>;
  validation_summary?: {
    total_raw: number;
    total_validated: number;
    unverified_codes: string[];
    warnings: string[];
  };
  meta: {
    processing_time_ms: number;
    source: 'dashboard-canonical-differential';
    model_version: string;
  };
}

interface CanonicalDifferentialResponse {
  ok: boolean;
  data?: CanonicalDifferentialOutput;
  error?: string;
}

interface ClinicalAnamnesisExtractionResponse {
  ok: boolean;
  data?: AnamnesisExtractionResult;
  error?: string;
}

const EXTRACTION_CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;
let extractionCircuitOpenUntilMs = 0;
let extractionCircuitReason = '';

/**
 * Contract artifact for CI/docs parity checks.
 * Keep this minimal and focused on required fields that must exist for safe rendering.
 */
export const CANONICAL_CLINICAL_ENGINE_OUTPUT_SCHEMA = {
  schema_version: '2026-04-08',
  type: 'object',
  required: ['request_id', 'processed_at', 'source', 'alerts', 'recommendations', 'governance'],
  properties: {
    request_id: { type: 'string' },
    processed_at: { type: 'string' },
    source: {
      type: 'object',
      required: ['engine', 'engine_version', 'mode'],
      properties: {
        engine: { const: 'dashboard-clinical-engine' },
        engine_version: { type: 'string' },
        mode: { const: 'canonical' },
      },
    },
    alerts: { type: 'array' },
    recommendations: {
      type: 'object',
      required: [
        'immediate_actions',
        'monitoring_actions',
        'referral_actions',
        'next_best_questions',
      ],
      properties: {
        immediate_actions: { type: 'array', items: { type: 'string' } },
        monitoring_actions: { type: 'array', items: { type: 'string' } },
        referral_actions: { type: 'array', items: { type: 'string' } },
        next_best_questions: { type: 'array', items: { type: 'string' } },
      },
    },
    governance: {
      type: 'object',
      required: ['disclaimer', 'review_required', 'authoritative_engine'],
      properties: {
        disclaimer: { type: 'string' },
        review_required: { type: 'boolean' },
        authoritative_engine: { const: 'dashboard' },
      },
    },
  },
} as const;

/**
 * Contract artifact for CI/docs parity checks.
 */
export const CANONICAL_DIFFERENTIAL_OUTPUT_SCHEMA = {
  schema_version: '2026-04-08',
  type: 'object',
  required: ['diagnosis_suggestions', 'alerts', 'meta'],
  properties: {
    diagnosis_suggestions: { type: 'array' },
    alerts: { type: 'array' },
    meta: {
      type: 'object',
      required: ['processing_time_ms', 'source', 'model_version'],
      properties: {
        processing_time_ms: { type: 'number' },
        source: { const: 'dashboard-canonical-differential' },
        model_version: { type: 'string' },
      },
    },
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAnamnesisMissingField(value: unknown): value is AnamnesisMissingField {
  return (
    value === 'keluhan_utama' ||
    value === 'onset' ||
    value === 'lokasi' ||
    value === 'kualitas' ||
    value === 'keparahan' ||
    value === 'faktor_pemicu' ||
    value === 'faktor_peredam'
  );
}

/**
 * isAnamnesisExtractionResult
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function isAnamnesisExtractionResult(value: unknown): value is AnamnesisExtractionResult {
  const candidate = asRecord(value);
  if (!candidate) return false;
  if (typeof candidate.keluhan_utama !== 'string') return false;
  if (candidate.onset !== null && typeof candidate.onset !== 'string') return false;
  if (candidate.lokasi !== null && typeof candidate.lokasi !== 'string') return false;
  if (candidate.kualitas !== null && typeof candidate.kualitas !== 'string') return false;
  if (candidate.keparahan !== null && typeof candidate.keparahan !== 'number') return false;
  if (!isStringArray(candidate.faktor_pemicu)) return false;
  if (!isStringArray(candidate.faktor_peredam)) return false;
  if (
    candidate.chronology_summary !== undefined &&
    candidate.chronology_summary !== null &&
    typeof candidate.chronology_summary !== 'string'
  ) {
    return false;
  }
  if (
    candidate.associated_symptoms !== undefined &&
    !isStringArray(candidate.associated_symptoms)
  ) {
    return false;
  }
  if (
    candidate.pertinent_negatives !== undefined &&
    !isStringArray(candidate.pertinent_negatives)
  ) {
    return false;
  }
  if (
    candidate.functional_impact !== undefined &&
    candidate.functional_impact !== null &&
    typeof candidate.functional_impact !== 'string'
  ) {
    return false;
  }
  if (candidate.red_flag_signs !== undefined && !isStringArray(candidate.red_flag_signs)) {
    return false;
  }
  if (
    candidate.clinician_questions !== undefined &&
    !isStringArray(candidate.clinician_questions)
  ) {
    return false;
  }
  if (!Array.isArray(candidate.data_belum_lengkap)) return false;
  if (!candidate.data_belum_lengkap.every((item) => isAnamnesisMissingField(item))) return false;
  return true;
}

/**
 * isCanonicalClinicalEngineOutput
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function isCanonicalClinicalEngineOutput(
  value: unknown
): value is CanonicalClinicalEngineOutput {
  const candidate = asRecord(value);
  if (!candidate) return false;

  const source = asRecord(candidate.source);
  const alerts = candidate.alerts;
  const recommendations = asRecord(candidate.recommendations);
  const governance = asRecord(candidate.governance);

  if (typeof candidate.request_id !== 'string') return false;
  if (typeof candidate.processed_at !== 'string') return false;
  if (!source || typeof source.engine !== 'string') return false;
  if (!Array.isArray(alerts)) return false;
  if (!recommendations) return false;
  if (!governance) return false;

  if (!isStringArray(recommendations.immediate_actions)) return false;
  if (!isStringArray(recommendations.monitoring_actions)) return false;
  if (!isStringArray(recommendations.referral_actions)) return false;
  if (!isStringArray(recommendations.next_best_questions)) return false;

  if (typeof governance.disclaimer !== 'string') return false;
  if (typeof governance.review_required !== 'boolean') return false;

  return true;
}

/**
 * isCanonicalDifferentialOutput
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function isCanonicalDifferentialOutput(
  value: unknown
): value is CanonicalDifferentialOutput {
  const candidate = asRecord(value);
  if (!candidate) return false;

  const diagnosisSuggestions = candidate.diagnosis_suggestions;
  const alerts = candidate.alerts;
  const meta = asRecord(candidate.meta);

  if (!Array.isArray(diagnosisSuggestions)) return false;
  if (!Array.isArray(alerts)) return false;
  if (!meta) return false;
  if (typeof meta.processing_time_ms !== 'number') return false;
  if (typeof meta.source !== 'string') return false;
  if (typeof meta.model_version !== 'string') return false;

  return true;
}

/**
 * ConsultPayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface ConsultPayload {
  patient: {
    name: string;
    age: number;
    gender: string;
    rm: string;
    dob?: string;
    bpjsStatus?: string | null;
    kelurahan?: string;
  };
  ttv: {
    sbp: string;
    dbp: string;
    hr: string;
    rr: string;
    temp: string;
    spo2: string;
    glucose: string;
  };
  keluhan_utama: string;
  keluhan_tambahan?: string;
  risk_factors: string[];
  anthropometrics: {
    tinggi: number;
    berat: number;
    imt: number;
    hasil_imt: string;
    lingkar_perut: number;
  };
  penyakit_kronis: string[];
  alergi: string[];
  status_kehamilan: 'hamil' | 'tidak_hamil' | 'tidak_diisi';
  disability_type?: string;
  obesity_confirmation?: 'confirmed' | 'not_confirmed';
  clinical_context?: {
    facility_name?: string;
    special_conditions?: string[];
    pregnancy_risk?: string;
  };
  canonical_clinical?: {
    news2?: {
      score: number;
      risk_level: 'low' | 'low-medium' | 'medium' | 'high';
      drivers: string[];
    };
    trajectory?: {
      overall_trend?: 'improving' | 'declining' | 'stable' | 'insufficient_data';
      overall_risk?: 'low' | 'moderate' | 'high' | 'critical';
      deterioration_state?: 'improving' | 'stable' | 'deteriorating' | 'critical';
      narrative?: string;
    };
    immediate_actions?: string[];
  };
  /** AVPU consciousness level at time of consult */
  avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
  /** Physical exam context derived from keluhan + TTV — keyed by organ system */
  physical_exam_context?: Record<string, string>;
  /**
   * Riwayat kunjungan terakhir pasien dari ePuskesmas (max 5, scraped).
   * Digunakan Dashboard untuk clinical trajectory engine (Iskandar CDSS).
   */
  visit_history?: Array<{
    encounter_id: string;
    timestamp: string;
    vitals: {
      sbp: number;
      dbp: number;
      hr: number;
      rr: number;
      temp: number;
      glucose: number;
      spo2?: number;
    };
    keluhan_utama: string;
    diagnosa?: { icd_x: string; nama: string } | null;
    terapi_obat?: string;
    dokter_penanganan?: string;
    perawat_penanganan?: string;
  }>;
  target_doctor_id: string;
  sent_at: string;
  /** UUID v4 generated by ASSIST before POST; used for audit idempotency */
  event_id?: string;
  screening_result?: {
    status: 'positive' | 'negative' | 'inconclusive';
    score?: number;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    summary?: string;
  };
  /** Pseudonym token for patient (not raw RM) */
  patient_id_token?: string;
  screening_id?: string;
  facility_id?: string;
  app_version?: string;
  assist_id?: string;
}

interface ConsultResponse {
  ok: boolean;
  consultId?: string;
  event_id?: string;
  error?: string;
}

/**
 * Filters API doctor list for UI display:
 * 1. Only role === 'dokter'
 * 2. Prefer professional_name > full_name > name
 * 3. Exclude fallback IDs if real doctors present
 * 4. Deduplicate by normalized name
 */
export function filterDoctorsForDisplay(doctors: OnlineDoctor[]): OnlineDoctor[] {
  const onlyDokter = doctors.filter((d) => d.role === 'dokter');

  const withDisplayName = onlyDokter.map((d) => ({
    ...d,
    name: d.professional_name || d.full_name || d.name,
  }));

  const hasRealDoctors = withDisplayName.some((d) => !d.id.startsWith('fallback-'));
  const filtered = hasRealDoctors
    ? withDisplayName.filter((d) => !d.id.startsWith('fallback-'))
    : withDisplayName;

  const seen = new Set<string>();
  return filtered.filter((d) => {
    const key = d.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * getOnlineDoctors
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function getOnlineDoctors(): Promise<OnlineDoctor[]> {
  const authSource = await getBridgeAuthSource();
  if (authSource === 'none') {
    throw new AuthRequiredError(BRIDGE_TOKEN_REQUIRED_MESSAGE);
  }

  const res = await bridgeFetch<OnlineDoctorsResponse>('/api/doctors/online');
  if (!res.ok) {
    throw new Error(res.error || 'Gagal memuat daftar dokter dari server.');
  }

  return filterDoctorsForDisplay(res.doctors);
}

export interface DoctorContact {
  id: string;
  name: string;
  whatsappNumber: string;
}

interface DoctorContactsResponse {
  ok: boolean;
  doctors: DoctorContact[];
  error?: string;
}

/** Active doctors with a WhatsApp number from the crew portal; numbers are kept in memory only. */
export async function getDoctorContacts(): Promise<DoctorContact[]> {
  const authSource = await getBridgeAuthSource();
  if (authSource === 'none') {
    throw new AuthRequiredError(BRIDGE_TOKEN_REQUIRED_MESSAGE);
  }
  const res = await bridgeFetch<DoctorContactsResponse>('/api/doctors/contacts');
  if (!res.ok) {
    throw new Error(res.error || 'Gagal memuat kontak dokter dari server.');
  }
  return res.doctors;
}

/**
 * sendConsultToDoctor
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function sendConsultToDoctor(
  payload: ConsultPayload
): Promise<{ consultId: string; eventId: string }> {
  const eventId = payload.event_id ?? crypto.randomUUID();
  const enrichedPayload: ConsultPayload = { ...payload, event_id: eventId };

  const doSend = () =>
    bridgeFetch<ConsultResponse>('/api/consult', {
      method: 'POST',
      body: JSON.stringify(enrichedPayload),
    });

  let res: ConsultResponse;
  try {
    res = await doSend();
  } catch (error) {
    const isRetryable =
      (error instanceof BridgeApiError && error.status === 503) ||
      (error instanceof Error && error.message.includes('Tidak dapat terhubung'));

    if (isRetryable) {
      log.warn('[BridgeClient] Consult send failed (retryable), retrying in 3s...');
      await new Promise<void>((r) => setTimeout(r, 3_000));
      res = await doSend();
    } else {
      throw error;
    }
  }

  if (!res.ok) throw new Error(res.error || 'Failed to send consult');

  return {
    consultId: res.consultId ?? '',
    eventId: res.event_id ?? eventId,
  };
}

/**
 * evaluateCanonicalClinicalEngine
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function evaluateCanonicalClinicalEngine(
  payload: CanonicalTriageInput
): Promise<CanonicalClinicalEngineOutput> {
  const res = await bridgeFetch<CanonicalEngineResponse>('/api/clinical/engine/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Failed to evaluate canonical clinical engine');
  }
  if (!isCanonicalClinicalEngineOutput(res.data)) {
    throw new Error('Canonical clinical engine contract mismatch');
  }
  return res.data;
}

/**
 * evaluateCanonicalDifferential
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function evaluateCanonicalDifferential(
  payload: CanonicalDifferentialInput
): Promise<CanonicalDifferentialOutput> {
  const res = await bridgeFetch<CanonicalDifferentialResponse>(
    '/api/clinical/differential/evaluate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok || !res.data) {
    throw new Error(res.error || 'Failed to evaluate canonical differential');
  }
  if (!isCanonicalDifferentialOutput(res.data)) {
    throw new Error('Canonical differential contract mismatch');
  }
  return res.data;
}

/**
 * extractClinicalAnamnesis
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export async function extractClinicalAnamnesis(
  inputText: string
): Promise<AnamnesisExtractionResult> {
  const now = Date.now();
  if (extractionCircuitOpenUntilMs > now) {
    const remainingMinutes = Math.ceil((extractionCircuitOpenUntilMs - now) / 60_000);
    throw new Error(
      `Hybrid extraction backend nonaktif sementara (${remainingMinutes}m): ${extractionCircuitReason}`
    );
  }

  try {
    const res = await bridgeFetch<ClinicalAnamnesisExtractionResponse>(
      '/api/clinical/anamnesis/extract',
      {
        method: 'POST',
        body: JSON.stringify({ text: inputText }),
      }
    );
    if (!res.ok || !res.data) {
      throw new Error(res.error || 'Failed to extract clinical anamnesis');
    }
    if (!isAnamnesisExtractionResult(res.data)) {
      throw new Error('Clinical anamnesis extraction contract mismatch');
    }

    extractionCircuitOpenUntilMs = 0;
    extractionCircuitReason = '';
    return res.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown extraction error';
    const lowerMessage = message.toLowerCase();
    const shouldOpenCircuit =
      error instanceof BridgeResponseFormatError ||
      (error instanceof BridgeApiError &&
        [404, 405, 406, 415, 500, 501, 502, 503].includes(error.status)) ||
      lowerMessage.includes('html') ||
      lowerMessage.includes('base url bridge');

    if (shouldOpenCircuit) {
      extractionCircuitOpenUntilMs = Date.now() + EXTRACTION_CIRCUIT_COOLDOWN_MS;
      extractionCircuitReason =
        'Endpoint extraction tidak tersedia pada base URL saat ini (server membalas non-API/HTML).';
      log.warn('[BridgeClient] Extraction circuit opened', {
        cooldownMs: EXTRACTION_CIRCUIT_COOLDOWN_MS,
        reason: extractionCircuitReason,
      });
      throw new Error(`${extractionCircuitReason} Retry otomatis dalam 10 menit.`);
    }

    throw error;
  }
}

// ============================================================================
// PATIENT SYNC — Send scraped data from Ghost → Dashboard EMR page
// ============================================================================

interface PatientSyncResponse {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * PatientSyncResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface PatientSyncResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send scraped patient data from Assist to Dashboard EMR page.
 * Retries up to 3 times on retryable errors (503, network failure).
 * Dashboard receives via POST /api/emr/patient-sync → Socket.IO → EMR form auto-fill.
 */
export async function syncPatientToDashboard(
  payload: PatientSyncPayload
): Promise<PatientSyncResult> {
  const doSync = () =>
    bridgeFetch<PatientSyncResponse>('/api/emr/patient-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await doSync();
      if (!res.ok) {
        return { ok: false, error: res.error || 'Dashboard menolak data pasien' };
      }
      log.debug('[BridgeClient] Patient synced to Dashboard:', res.id);
      return { ok: true, id: res.id ?? '' };
    } catch (error) {
      const isRetryable =
        (error instanceof BridgeApiError && error.status === 503) ||
        (error instanceof Error && error.message.includes('Tidak dapat terhubung'));

      if (isRetryable && attempt < MAX_RETRIES) {
        log.warn(
          `[BridgeClient] Patient sync attempt ${attempt}/${MAX_RETRIES} failed (retryable), retrying in ${RETRY_DELAY_MS / 1000}s...`
        );
        await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }

      const message = error instanceof Error ? error.message : 'Unknown sync error';
      log.error(`[BridgeClient] Patient sync failed after ${attempt} attempt(s):`, message);
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: 'Sync gagal setelah 3 percobaan' };
}
