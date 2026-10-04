// Designed and constructed by Drferdi.
import { ChevronDown, RefreshCw } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { browser } from 'wxt/browser';

import { TextEffect } from '@/components/ui/TextEffect';
import {
  BRIDGE_AUTH_REQUIRED_HINT,
  evaluateCanonicalClinicalEngine,
  extractClinicalAnamnesis,
  getOnlineDoctors,
  sendConsultToDoctor,
  type CanonicalClinicalEngineOutput,
  type ConsultMiraDifferential,
  type ConsultPayload,
  type OnlineDoctor,
} from '@/lib/api/bridge-client';
import { APP_ASSIST_ID } from '@/lib/app-identity';
import { makeFieldMeta, type FieldMeta } from '@/lib/clinical/aassist-v2/field-priority';
import {
  buildAnamnesisShadowSuggestion,
  composeAnamnesaDraft,
  composeAnamnesaDraftFromExtraction,
  type ComposedAnamnesaDraft,
} from '@/lib/clinical/anamnesa-composer';
import {
  type AutosenPreset,
  type DisabilityType,
  type ObesityConfirmation,
} from '@/lib/clinical/autosen-types';
import {
  buildCanonicalRequestId,
  buildCanonicalTriageInput,
} from '@/lib/clinical/canonical-triage-builder';
import {
  formatVisitRelativeDay,
  formatVisitSummaryDate,
  getLatestVisitRecord,
  getVisitTimestampMs,
} from '@/lib/clinical/visit-history-format';
import {
  buildVitalAutofill,
  filterVitalAutofillByFieldPriority,
} from '@/lib/clinical/vital-autocomplete';
import { assessVitalGuardrails, normalizeVitalInput } from '@/lib/clinical/vital-guardrails';
import { getVitalScreeningProfile } from '@/lib/clinical/vital-screening-thresholds';
import { resolveActionProtocolId } from '@/lib/emergency-detector/action-protocol-resolver';
import { CLINICAL_PATTERNS } from '@/lib/emergency-detector/clinical-patterns';
import { buildClinicalSnapshot } from '@/lib/emergency-detector/clinical-snapshot';
import { classifyBloodGlucose } from '@/lib/emergency-detector/glucose-classifier';
import {
  classifyHypertension,
  getHTNSeverity,
  type BPMeasurementSession,
} from '@/lib/emergency-detector/htn-classifier';
import {
  detectOccultShock,
  type HistoricalBP,
  type OccultShockInput,
} from '@/lib/emergency-detector/occult-shock-detector';
import { evaluatePatterns, patternMatchesToAlerts } from '@/lib/emergency-detector/pattern-engine';
import { computeTriageVerdict, type TriageVerdict } from '@/lib/emergency-detector/triage-verdict';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import { createLogger } from '@/utils/logger';
import { playSound } from '@/utils/sound';
import type { AnamnesisMissingField } from '@/utils/types';

/**
 * ScreeningAlert interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface ScreeningAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'warning';
  title: string;
  gate: string;
  reasoning: string;
  recommendations: string[];
  actionProtocolId?: string;
  clinicalData?: {
    sbp?: number;
    dbp?: number;
    hr?: number;
    rr?: number;
    temp?: number;
    spo2?: number;
    glucose?: number;
    map?: number;
  };
}

/**
 * TTVInferenceData interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface TTVInferenceData {
  patient: {
    name: string;
    gender: 'L' | 'P';
    age: number;
    rm: string;
    dob?: string;
    bloodType?: string;
    bpjsStatus?: 'aktif' | 'nonaktif' | 'mandiri' | null;
    kelurahan?: string;
  };
  vitals: {
    sbp: number;
    dbp: number;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    glucose: number;
  };
  symptomText: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
  disabilityType: DisabilityType;
  obesityConfirmation: ObesityConfirmation;
  autosenPreset: AutosenPreset;
  alerts: ScreeningAlert[];
  summary: string;
  anamnesaDraft: ComposedAnamnesaDraft;
  generatedAt: string;
}

interface TTVStateShape {
  gcs?: string;
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
  symptomText: string;
  allergies: string[];
  pregnancyStatus: boolean | null;
  disabilityType: DisabilityType;
  obesityConfirmation: ObesityConfirmation;
  autosenPreset: AutosenPreset;
  avpu: 'A' | 'C' | 'V' | 'P' | 'U';
  supplemental_o2: boolean;
  pain_score: string;
}

export type VitalFieldKey = 'sbp' | 'dbp' | 'hr' | 'rr' | 'temp' | 'spo2' | 'glucose';
const VITAL_FIELD_KEYS: readonly VitalFieldKey[] = [
  'sbp',
  'dbp',
  'hr',
  'rr',
  'temp',
  'spo2',
  'glucose',
];

/**
 * Tags freshly RME-extracted vitals as the highest-priority field source so
 * AutoComplete+ (rank 'ASIST-autocomplete') can never overwrite them —
 * physician manual typing is untouched, since updateField() always re-tags
 * as 'ASIST-manual' regardless of the existing source. Pure so it can be
 * unit-tested without mounting the (very large) TTVInferenceUI component.
 */
export function applyRmeVitalTags(
  currentFieldMeta: Partial<Record<VitalFieldKey, FieldMeta>>,
  rmeVitalFieldKeys: VitalFieldKey[],
  state: Record<VitalFieldKey, string>
): Partial<Record<VitalFieldKey, FieldMeta>> {
  if (rmeVitalFieldKeys.length === 0) return currentFieldMeta;

  const next = { ...currentFieldMeta };
  rmeVitalFieldKeys.forEach((field) => {
    const value = state[field];
    if (typeof value === 'string' && value.trim() !== '') {
      next[field] = makeFieldMeta(value, 'RME-manual');
    }
  });
  return next;
}

type BootScrambleField =
  | VitalFieldKey
  | 'gcs'
  | 'symptomText'
  | 'allergy'
  | 'pregnancy'
  | 'disability'
  | 'obesity'
  | 'preset'
  | 'pain';

const BOOT_SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%+-';
const BOOT_SCRAMBLE_LENGTHS: Record<BootScrambleField, number> = {
  symptomText: 42,
  allergy: 14,
  pregnancy: 14,
  disability: 14,
  obesity: 14,
  preset: 14,
  pain: 14,
  gcs: 2,
  sbp: 3,
  dbp: 3,
  hr: 3,
  rr: 3,
  temp: 4,
  spo2: 3,
  glucose: 3,
};

const createBootScrambleText = (length: number): string =>
  Array.from({ length }, () => {
    const index = Math.floor(Math.random() * BOOT_SCRAMBLE_CHARS.length);
    return BOOT_SCRAMBLE_CHARS[index] ?? '#';
  }).join('');

const createBootScrambleValues = (): Record<BootScrambleField, string> =>
  (Object.keys(BOOT_SCRAMBLE_LENGTHS) as BootScrambleField[]).reduce(
    (acc, field) => ({
      ...acc,
      [field]: createBootScrambleText(BOOT_SCRAMBLE_LENGTHS[field]),
    }),
    {} as Record<BootScrambleField, string>
  );

const createUplinkScrambleText = (): string => createBootScrambleText(7);

const BOOT_SCRAMBLE_FIELDS: BootScrambleField[] = Object.keys(
  BOOT_SCRAMBLE_LENGTHS
) as BootScrambleField[];
const BOOT_FIELD_HOLD_MS = 130;
const BOOT_FIELD_JITTER_MS = 70;

const shuffleBootFields = (fields: readonly BootScrambleField[]): BootScrambleField[] => {
  const next = [...fields];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

type VitalGhostLane = 'bp' | 'glucose' | 'hr' | 'rr' | 'temp' | 'spo2';

interface TTVInferenceUIProps {
  patientName?: string;
  patientGender?: 'L' | 'P';
  patientAge?: number;
  patientRM?: string;
  patientDOB?: string;
  patientBloodType?: string;
  patientBPJSStatus?: 'aktif' | 'nonaktif' | 'mandiri' | null;
  patientKelurahan?: string;
  onComplete?: (data: TTVInferenceData) => void;
  onAlertsChange?: (alerts: ScreeningAlert[]) => void;
  onTriageVerdictChange?: (verdict: TriageVerdict<ScreeningAlert>) => void;
  onAccessEmergency?: () => void;
  showMaskedName?: boolean;
  ttvState?: TTVStateShape;
  onTTVStateChange?: (state: TTVStateShape) => void;
  onRefreshPatient?: () => void | Promise<void>;
  isLoadingPatient?: boolean;
  onNavigateToTrajectory?: () => void;
  /** The MIRA differential of the active encounter, sent with the consult when there is one. */
  getMiraDifferential?: () => Promise<ConsultMiraDifferential | null>;
  onChronicHistoryChange?: (summary: string) => void;
  prefilledHistoryFlags?: Record<string, boolean>;
  extractedSpecialConditions?: string[];
  extractedPregnancyRisk?: string;
  extractedFacilityName?: string;
  extractedPayerLabel?: string;
  extractedAllergies?: string[];
  extractedPregnancyStatus?: boolean | null;
  canonicalOutput?: CanonicalClinicalEngineOutput | null;
  prefetchedVisits?: VisitRecord[];
  onSentraUplink?: () => void | Promise<void>;
  bootSequenceActive?: boolean;
  rmeVitalFieldKeys?: VitalFieldKey[];
  /**
   * When false, triage stays standby even if vital fields are filled.
   * Prevents age:0 (unknown / failed OCR) from being scored as infant.
   * Defaults to patientAge > 0 for backward compatibility.
   */
  patientAgeKnown?: boolean;
}

export interface TTVInferenceUIHandle {
  setField: (field: keyof TTVStateShape, value: string | boolean | string[] | null) => void;
  runAutocompleteSymptoms: () => Promise<void>;
  runAutocompleteVitals: () => Promise<void>;
  runSentraUplink: () => Promise<void>;
}

const DEFAULT_STATE: TTVStateShape = {
  gcs: '',
  sbp: '',
  dbp: '',
  hr: '',
  rr: '',
  temp: '',
  spo2: '',
  glucose: '',
  symptomText: '',
  allergies: [],
  pregnancyStatus: null,
  disabilityType: '',
  obesityConfirmation: '',
  autosenPreset: '',
  avpu: 'A',
  supplemental_o2: false,
  pain_score: '',
};

const historyItems = [
  { id: 'dm', label: 'DM' },
  { id: 'ht', label: 'HIPERTENSI' },
  { id: 'jantung', label: 'Jantung' },
  { id: 'stroke', label: 'Stroke' },
  { id: 'ginjal', label: 'Ginjal' },
  { id: 'asma', label: 'Asma' },
] as const;

const allergyPresets = ['Makanan', 'Kulit', 'Debu', 'Obat'] as const;
const PAIN_SCORE_OPTIONS = Array.from({ length: 11 }, (_, index) => String(index));
const HETEROANAMNESIS_PREFIX = 'Heteroanamnesa (dari pengantar): ';
const VITAL_GHOST_LANES: VitalGhostLane[] = ['bp', 'glucose', 'hr', 'rr', 'temp', 'spo2'];
const VITAL_GHOST_LANE_FIELDS: Record<VitalGhostLane, VitalFieldKey[]> = {
  bp: ['sbp', 'dbp'],
  glucose: ['glucose'],
  hr: ['hr'],
  rr: ['rr'],
  temp: ['temp'],
  spo2: ['spo2'],
};
const disabilityOptions: DisabilityType[] = [
  '',
  'Netra',
  'Rungu',
  'Daksa',
  'Mental',
  'Hiperaktivitas',
  'Spektrum Autis (ASD)',
];

function sanitizeGcsInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function normalizeGcsInput(value: string): string {
  const sanitized = sanitizeGcsInput(value);
  if (!sanitized) return '';
  const parsed = Number.parseInt(sanitized, 10);
  if (!Number.isFinite(parsed)) return '';
  return Math.min(15, Math.max(3, parsed)).toString();
}

function deriveAvpuFromGcs(value: string): TTVStateShape['avpu'] | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 15) return 'A';
  if (parsed >= 13) return 'C';
  if (parsed >= 9) return 'V';
  if (parsed >= 4) return 'P';
  return 'U';
}

function formatBloodPressureValue(sbp: string, dbp: string): string {
  const left = sbp.trim();
  const right = dbp.trim();
  if (!left && !right) return '';
  if (!right) return left;
  return `${left}/${right}`;
}

function parseBloodPressureInput(value: string): { sbp: string; dbp: string } {
  const parts = value
    .trim()
    .replace(/[^\d/\\\s]/g, '')
    .split(/[\/\\\s]+/)
    .filter(Boolean);

  return {
    sbp: parts[0]?.slice(0, 3) ?? '',
    dbp: parts[1]?.slice(0, 3) ?? '',
  };
}

const presetLabels: Record<AutosenPreset, string> = {
  '': 'Pilih di sini',
  hypertension: 'Hipertensi',
  hyperglycemia: 'Hiperglikema',
  hypoglycemia: 'Hipoglikemi',
  hypotension: 'Hipotensi',
  glucose_tolerance: 'Gangguan Toleransi glukosa',
  adl: 'ADL Terganggu',
};

const parseNumber = (value: string): number => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const shuffleGhostLanes = (lanes: readonly VitalGhostLane[]): VitalGhostLane[] => {
  const next = [...lanes];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

const getSelectedHistoryLabels = (flags: Record<string, boolean>): string[] =>
  historyItems.filter((item) => flags[item.id]).map((item) => item.label);

const createEmptyHistoryFlags = (): Record<string, boolean> =>
  historyItems.reduce(
    (accumulator, item) => {
      accumulator[item.id] = false;
      return accumulator;
    },
    {} as Record<string, boolean>
  );

export const AVAILABILITY_LABELS: Record<
  NonNullable<OnlineDoctor['availability_status']>,
  string
> = {
  online: 'ONLINE',
  busy: 'BUSY',
  away: 'AWAY',
  offline: 'OFFLINE',
};

const AVAILABILITY_RANK: Record<NonNullable<OnlineDoctor['availability_status']>, number> = {
  online: 0,
  busy: 1,
  away: 2,
  offline: 3,
};

const normalizeText = (value?: string): string => (value || '').trim().toLowerCase();

const SPECIAL_CONDITION_HEADER_TOKENS = new Set([
  'warna',
  'status',
  'icd',
  'icdx',
  'x',
  'penyakit',
  'khusus',
]);

const normalizeSpecialConditionArtifactText = (value: string): string =>
  normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isNonClinicalSpecialCondition = (value: string): boolean => {
  const normalized = normalizeSpecialConditionArtifactText(value);
  if (/^warna\s+icd\s*x?\s+penyakit(?:\s|$)/.test(normalized)) {
    return true;
  }

  const tokens = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/g)
    .filter(Boolean);

  return tokens.length > 0 && tokens.every((token) => SPECIAL_CONDITION_HEADER_TOKENS.has(token));
};

const cleanSpecialConditions = (conditions: string[]): string[] =>
  Array.from(
    new Set(
      conditions
        .map((condition) => condition.trim())
        .filter(Boolean)
        .filter((condition) => !isNonClinicalSpecialCondition(condition))
    )
  );

const HYBRID_AUTOTEXT_ENABLED = import.meta.env.VITE_ENABLE_HYBRID_AUTOTEXT !== 'false';
const ttvLog = createLogger('TTVInferenceUI', 'content');

/**
 * getDoctorInitials
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const getDoctorInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/**
 * formatLastSeenRelative
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const formatLastSeenRelative = (iso?: string): string => {
  if (!iso) return 'Tidak ada data aktivitas';

  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'Waktu aktivitas tidak valid';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return 'Aktif baru saja';
  if (diffMs < 60 * 60_000) return `Aktif ${Math.max(1, Math.floor(diffMs / 60_000))} menit lalu`;
  if (diffMs < 24 * 60 * 60_000) {
    return `Aktif ${Math.max(1, Math.floor(diffMs / (60 * 60_000)))} jam lalu`;
  }

  return `Aktif ${Math.max(1, Math.floor(diffMs / (24 * 60 * 60_000)))} hari lalu`;
};

/**
 * toSafeAutoTextReason
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const toSafeAutoTextReason = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.trim().toLowerCase();
  if (normalized.startsWith('<!doctype html') || normalized.startsWith('<html')) {
    return 'Server extraction mengembalikan HTML, bukan JSON API. Cek Base URL Bridge dan endpoint extraction.';
  }
  return message;
};

const GERIATRIC_ORTHOSTATIC_KEYWORDS = [
  'pusing',
  'berkunang',
  'limbung',
  'jatuh',
  'sinkop',
  'pingsan',
  'lemas',
  'lemah',
] as const;

const GERIATRIC_ATYPICAL_INFECTION_KEYWORDS = [
  'bingung',
  'delirium',
  'jatuh',
  'lemas',
  'lemah',
  'nafsu makan turun',
  'intake turun',
  'penurunan aktivitas',
  'penurunan fungsi',
] as const;

const hasKeywordSignal = (text: string, keywords: readonly string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

const derivePreferredPoliKeywords = (
  flags: string[],
  preset: AutosenPreset,
  pregnancyStatus: boolean | null
): string[] => {
  const keywords = new Set<string>(['umum']);

  if (pregnancyStatus === true) {
    keywords.add('kia');
    keywords.add('obgyn');
    keywords.add('kandungan');
  }

  if (flags.includes('Jantung')) {
    keywords.add('jantung');
    keywords.add('penyakit dalam');
  }

  if (flags.includes('DM') || preset === 'hyperglycemia' || preset === 'hypoglycemia') {
    keywords.add('penyakit dalam');
    keywords.add('metabolik');
  }

  if (preset === 'hypertension') {
    keywords.add('penyakit dalam');
  }

  return Array.from(keywords);
};

const formatBpjsStatus = (status?: TTVInferenceUIProps['patientBPJSStatus']): string => {
  if (status === 'aktif') return 'BPJS Aktif';
  if (status === 'nonaktif') return 'BPJS Nonaktif';
  if (status === 'mandiri') return 'Mandiri';
  return 'Menunggu data';
};

const formatPayerLabel = (
  extractedPayerLabel?: string,
  patientBPJSStatus?: TTVInferenceUIProps['patientBPJSStatus']
): string => extractedPayerLabel?.trim() || formatBpjsStatus(patientBPJSStatus);

const humanize = (value: string): string => value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

type VisitSummaryRow = {
  label: string;
  value: string;
};

type VisitSummarySection = {
  key: string;
  title: string;
  rows: VisitSummaryRow[];
};

const VISIT_HISTORY_BODY_ENABLED = false;
const DOCTOR_CONSULT_UI_ENABLED = false;

export { formatVisitSummaryDate, getLatestVisitRecord };

export const buildLastVisitSummaryRows = (visits?: VisitRecord[]): VisitSummaryRow[] => {
  const lastVisit = getLatestVisitRecord(visits);
  if (!lastVisit) {
    return [];
  }

  return [
    lastVisit.timestamp
      ? { label: 'Kunjungan Sebelumnya', value: formatVisitSummaryDate(lastVisit.timestamp) }
      : null,
    lastVisit.diagnosa?.nama
      ? {
          label: 'Diagnosa Sebelumnya',
          value: lastVisit.diagnosa.icd_x
            ? `${lastVisit.diagnosa.icd_x} — ${lastVisit.diagnosa.nama}`
            : lastVisit.diagnosa.nama,
        }
      : null,
    lastVisit.terapi_obat
      ? { label: 'Obat / Terapi Sebelumnya', value: lastVisit.terapi_obat }
      : null,
    lastVisit.dokter_penanganan
      ? { label: 'Dokter yang Menangani', value: lastVisit.dokter_penanganan }
      : null,
  ].filter(Boolean) as VisitSummaryRow[];
};

export const buildVisitHistorySections = (
  visits?: VisitRecord[],
  limit: number = 3
): VisitSummarySection[] => {
  if (!visits?.length || limit < 1) {
    return [];
  }

  return [...visits]
    .sort(
      (left, right) => getVisitTimestampMs(right.timestamp) - getVisitTimestampMs(left.timestamp)
    )
    .slice(0, limit)
    .map((visit, index) => {
      const rows = [
        visit.timestamp ? { label: 'Kapan', value: formatVisitRelativeDay(visit.timestamp) } : null,
        visit.diagnosa?.nama
          ? {
              label: 'Diagnosa',
              value: visit.diagnosa.icd_x
                ? `${visit.diagnosa.icd_x} — ${visit.diagnosa.nama}`
                : visit.diagnosa.nama,
            }
          : null,
        visit.terapi_obat ? { label: 'Obat / Terapi', value: visit.terapi_obat } : null,
        visit.dokter_penanganan ? { label: 'DPJP', value: visit.dokter_penanganan } : null,
      ].filter(Boolean) as VisitSummaryRow[];

      return {
        key: visit.encounter_id || `${visit.timestamp || 'visit'}-${index}`,
        title: `Kunjungan ${index + 1}`,
        rows,
      };
    })
    .filter((section) => section.rows.length > 0);
};

const toConsultPregnancyStatus = (
  pregnancyStatus: boolean | null
): ConsultPayload['status_kehamilan'] => {
  if (pregnancyStatus === true) return 'hamil';
  if (pregnancyStatus === false) return 'tidak_hamil';
  return 'tidak_diisi';
};

const buildConsultVisitHistory = (
  visits?: VisitRecord[]
): NonNullable<ConsultPayload['visit_history']> | undefined => {
  if (!visits?.length) return undefined;

  return [...visits]
    .sort(
      (left, right) => getVisitTimestampMs(right.timestamp) - getVisitTimestampMs(left.timestamp)
    )
    .slice(0, 5)
    .map((visit) => ({
      encounter_id: visit.encounter_id,
      timestamp: visit.timestamp,
      vitals: {
        sbp: visit.vitals.sbp,
        dbp: visit.vitals.dbp,
        hr: visit.vitals.hr,
        rr: visit.vitals.rr,
        temp: visit.vitals.temp,
        glucose: visit.vitals.glucose,
      },
      keluhan_utama: visit.keluhan_utama,
      diagnosa: visit.diagnosa ?? null,
      terapi_obat: visit.terapi_obat,
      dokter_penanganan: visit.dokter_penanganan,
      perawat_penanganan: visit.perawat_penanganan,
    }));
};

const buildCanonicalConsultContext = (
  canonicalOutput?: CanonicalClinicalEngineOutput | null
): ConsultPayload['canonical_clinical'] | undefined => {
  if (!canonicalOutput) return undefined;

  return {
    news2: canonicalOutput.scoring.news2,
    trajectory: canonicalOutput.trajectory
      ? {
          overall_trend: canonicalOutput.trajectory.overall_trend,
          overall_risk: canonicalOutput.trajectory.overall_risk,
          deterioration_state: canonicalOutput.trajectory.deterioration_state,
          narrative: canonicalOutput.trajectory.narrative,
        }
      : undefined,
    immediate_actions: canonicalOutput.recommendations.immediate_actions,
  };
};

/**
 * matchesPreferredPoli
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const matchesPreferredPoli = (doctor: OnlineDoctor, keywords: string[]): boolean => {
  const poli = normalizeText(doctor.poli);
  if (!poli) {
    return false;
  }

  return keywords.some((keyword) => poli.includes(keyword));
};

/**
 * matchesPreferredFacility
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const matchesPreferredFacility = (doctor: OnlineDoctor, facilityName?: string): boolean => {
  const locationHint = normalizeText(facilityName);
  if (!locationHint) {
    return false;
  }

  const combinedLocation = normalizeText(
    [doctor.location_name, doctor.room_name].filter(Boolean).join(' ')
  );
  return combinedLocation.includes(locationHint);
};

/**
 * buildAlerts
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const buildAlerts = (
  state: TTVStateShape,
  patient: Pick<TTVInferenceUIProps, 'patientAge' | 'patientGender'>,
  context?: { bpHistory?: HistoricalBP[]; knownHTN?: boolean }
): ScreeningAlert[] => {
  const alerts: ScreeningAlert[] = [];
  const sbp = parseNumber(state.sbp);
  const dbp = parseNumber(state.dbp);
  const hr = parseNumber(state.hr);
  const rr = parseNumber(state.rr);
  const temp = parseNumber(state.temp);
  const spo2 = parseNumber(state.spo2);
  const glucose = parseNumber(state.glucose);
  const map = sbp > 0 && dbp > 0 ? Math.round((sbp + 2 * dbp) / 3) : undefined;
  const physiology = getVitalScreeningProfile(patient.patientAge || 0);
  const ageContext = `${physiology.label.toLowerCase()} (${patient.patientAge || 0} tahun)`;
  const symptomText = normalizeText(state.symptomText);
  const guardrailAssessment = assessVitalGuardrails(
    {
      sbp: state.sbp,
      dbp: state.dbp,
      hr: state.hr,
      rr: state.rr,
      temp: state.temp,
      spo2: state.spo2,
      glucose: state.glucose,
      symptomText: state.symptomText,
      pregnancyStatus: state.pregnancyStatus,
      painScore: state.pain_score,
      disabilityType: state.disabilityType,
      obesityConfirmation: state.obesityConfirmation,
      autosenPreset: state.autosenPreset,
    },
    {
      age: patient.patientAge || 0,
      gender: patient.patientGender || (state.pregnancyStatus === true ? 'P' : 'L'),
    }
  );

  for (const cue of guardrailAssessment.codeRedCues) {
    alerts.push({
      id: `guardrail-code-red-${cue.field}`,
      type: 'code_red_cue',
      severity: 'critical',
      title: cue.title,
      gate: 'GATE_CODE_RED',
      reasoning: cue.message,
      recommendations: [
        'Pertimbangkan aktivasi CODE RED sesuai konteks klinis dan ulang validasi data.',
      ],
      clinicalData: { sbp, dbp, hr, rr, temp, spo2, glucose, map },
    });
  }

  for (const flag of guardrailAssessment.softFlags) {
    if (flag.field === 'pregnancy' && flag.title === 'WASPADA PREEKLAMPSIA') {
      alerts.push({
        id: 'preeclampsia-watch-alert',
        type: 'preeclampsia_watch',
        severity: 'high',
        title: 'WASPADA PREEKLAMPSIA',
        gate: 'GATE_PREGNANCY_BP',
        reasoning: flag.message,
        recommendations: [
          'Ulangi tekanan darah dengan teknik yang benar.',
          'Evaluasi gejala preeklampsia dan segera eskalasi ke dokter.',
        ],
        actionProtocolId: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
        clinicalData: { sbp, dbp, map },
      });
    }

    if (flag.field === 'temp' && flag.title === 'Hipotermia') {
      alerts.push({
        id: 'hypothermia-alert',
        type: 'hypothermia',
        severity: 'high',
        title: 'Hipotermia',
        gate: 'GATE_7_TEMPERATURE',
        reasoning: flag.message,
        recommendations: [
          'Ulangi pengukuran suhu dengan termometer yang sesuai.',
          'Hangatkan pasien dan cari penyebab (sepsis, hipoglikemia, paparan dingin).',
          'Eskalasi ke dokter penanggung jawab.',
        ],
        clinicalData: { temp },
      });
    }

    if (flag.field === 'pain') {
      alerts.push({
        id: 'urgent-pain-alert',
        type: 'urgent_pain',
        severity: 'high',
        title: flag.title,
        gate: 'GATE_PAIN',
        reasoning: flag.message,
        recommendations: [
          'Cantumkan nyeri hebat sebagai prioritas urgent pada ringkasan SEND TO DOCTOR.',
          'Kaji lokasi, karakter, durasi, faktor pemicu, dan red flag terkait.',
        ],
      });
    }
  }

  for (const note of guardrailAssessment.contextNotes) {
    alerts.push({
      id: `context-note-${note.field}-${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      type: 'context_note',
      severity: note.severity === 'critical' ? 'critical' : 'warning',
      title: note.title,
      gate: 'GATE_PATIENT_CONTEXT',
      reasoning: note.message,
      recommendations: [note.message],
      clinicalData: { sbp, dbp, hr, rr, temp, spo2, glucose, map },
    });
  }

  const bloodPressureLabel = dbp > 0 ? `${sbp}/${dbp}` : `sistolik ${sbp}`;

  const hasOrthostaticCue =
    physiology.isOlderAdult && hasKeywordSignal(symptomText, GERIATRIC_ORTHOSTATIC_KEYWORDS);
  const hasAtypicalInfectionCue =
    physiology.isOlderAdult && hasKeywordSignal(symptomText, GERIATRIC_ATYPICAL_INFECTION_KEYWORDS);

  // SBP alone is enough: a missing diastolic value must not hide hypotension.
  const hasHypotension =
    sbp > 0 &&
    (physiology.isPediatric
      ? sbp < physiology.hypotensionSbpFloor
      : Boolean((map && map < 65) || sbp < physiology.hypotensionSbpFloor));

  if (hasHypotension) {
    alerts.push({
      id: 'hypotension-alert',
      type: 'hypotension',
      severity: 'critical',
      title: physiology.isPediatric
        ? `Hipotensi untuk ${physiology.label}`
        : 'Perfusi rendah terdeteksi',
      gate: 'GATE_1_HEMODYNAMIC',
      reasoning: physiology.isPediatric
        ? `Tekanan darah ${bloodPressureLabel} mmHg berada di bawah ambang hipotensi untuk ${ageContext} (SBP < ${physiology.hypotensionSbpFloor} mmHg).`
        : `Tekanan darah ${bloodPressureLabel} mmHg${
            map ? ` dengan MAP ${map} mmHg` : ''
          } mengarah ke perfusi organ yang tidak adekuat.`,
      recommendations: [
        'Aktifkan evaluasi ABC dan ulang tekanan darah manual.',
        'Pertimbangkan cairan resusitasi sesuai konteks klinis.',
        'Segera eskalasi ke dokter penanggung jawab.',
      ],
      clinicalData: { sbp, dbp, map },
    });
  }

  // ── GATE_AVPU: observed consciousness only (ACVPU entry or GCS). Vitals do not imply it. ──
  if (state.avpu !== 'A') {
    const avpuTitleMap: Record<Exclude<TTVStateShape['avpu'], 'A'>, string> = {
      C: 'Kebingungan baru — ACVPU: CONFUSION',
      V: 'Penurunan respons — AVPU: VERBAL',
      P: 'Penurunan kesadaran berat — AVPU: PAIN',
      U: 'TIDAK RESPONSIF — AVPU: UNRESPONSIVE — AKTIFKAN EMERGENCY',
    };
    alerts.push({
      id: 'avpu-alert',
      type: 'avpu_abnormal',
      severity: 'critical',
      title: avpuTitleMap[state.avpu],
      gate: 'GATE_0_AVPU',
      reasoning: `Tingkat kesadaran teramati ${state.avpu} (NEWS2: skor 3 untuk C, V, P, atau U).`,
      recommendations:
        state.avpu === 'U'
          ? [
              'Aktifkan respons emergensi segera — panggil bantuan.',
              'Evaluasi ABC: airway, breathing, circulation.',
              'Posisikan pasien aman — recovery position jika napas ada.',
              'Siapkan AED dan pastikan akses IV.',
            ]
          : state.avpu === 'P'
            ? [
                'Evaluasi tingkat kesadaran dengan GCS segera.',
                'Nilai ABC dan pertahankan airway.',
                'Monitor serial tanda vital setiap 5 menit.',
                'Eskalasi segera ke dokter penanggung jawab.',
              ]
            : [
                'Cek gula darah, SpO2, dan tanda vital segera.',
                'Monitor ketat — nilai ulang kesadaran setiap 15 menit.',
                'Eskalasi ke dokter penanggung jawab.',
              ],
      clinicalData: { sbp, spo2, hr, rr },
    });
  }

  // ── GATE_1B: Occult shock — via detectOccultShock() (MSF Guidelines) ────────
  if (!physiology.isPediatric && sbp > 0 && dbp > 0) {
    const hasDizziness = hasKeywordSignal(symptomText, [
      'pusing',
      'oyong',
      'mau pingsan',
      'berputar',
      'vertigo',
    ]);
    const hasWeakness = hasKeywordSignal(symptomText, [
      'lemas',
      'lemah',
      'tidak kuat',
      'lesu',
      'loyo',
    ]);
    const hasPresyncope = hasKeywordSignal(symptomText, [
      'hampir pingsan',
      'mau jatuh',
      'kunang',
      'gelap',
    ]);
    const hasSyncope = hasKeywordSignal(symptomText, ['pingsan', 'hilang kesadaran', 'jatuh tiba']);

    const shockInput: OccultShockInput = {
      vitals: {
        current_sbp: sbp,
        current_dbp: dbp,
        glucose: glucose > 0 ? glucose : undefined,
      },
      last_3_visits:
        context?.bpHistory?.map((h) => ({
          visit_date: h.visit_date ?? '',
          sbp: h.sbp,
          dbp: h.dbp,
          location: h.location,
        })) ?? [],
      symptoms: {
        dizziness: hasDizziness,
        presyncope: hasPresyncope,
        syncope: hasSyncope,
        weakness: hasWeakness,
      },
      known_htn: Boolean(context?.knownHTN),
    };

    const shockResult = detectOccultShock(shockInput);

    if (
      (shockResult.risk_level === 'CRITICAL' || shockResult.risk_level === 'HIGH') &&
      !hasHypotension
    ) {
      alerts.push({
        id: 'occult-shock-alert',
        type: 'occult_shock',
        severity: shockResult.risk_level === 'CRITICAL' ? 'critical' : 'high',
        title:
          shockResult.risk_level === 'CRITICAL'
            ? `Shock terdeteksi — MAP ${shockResult.map} mmHg${shockResult.delta_sbp ? `, ΔSBP ${shockResult.delta_sbp}` : ''}`
            : `Curiga occult shock — ΔSBP ${shockResult.delta_sbp ?? '?'} mmHg dari baseline`,
        gate: 'GATE_1_HEMODYNAMIC',
        reasoning: [
          ...shockResult.triggers,
          shockResult.baseline_bp
            ? `Baseline pasien: ${shockResult.baseline_bp.sbp}/${shockResult.baseline_bp.dbp} mmHg (median 3 kunjungan).`
            : '',
        ]
          .filter(Boolean)
          .join(' | '),
        recommendations: shockResult.recommendations.filter((r) => r.trim() !== ''),
        clinicalData: { sbp, dbp, map },
      });
    }
  }

  // ── GATE 2: HTN — via htn-classifier.ts (FKTP 2024) ───────────────────────
  if (sbp > 0 && dbp > 0) {
    if (physiology.isPediatric) {
      // Pediatric: tetap pakai physiology thresholds (tabel usia/gender)
      if (sbp >= physiology.severeHypertensionSbp || dbp >= physiology.severeHypertensionDbp) {
        alerts.push({
          id: 'hypertensive-alert',
          type: 'hypertensive_crisis',
          severity: 'critical',
          title: `Tekanan darah sangat tinggi untuk ${physiology.label}`,
          gate: 'GATE_2_BP',
          reasoning: `Tekanan darah ${sbp}/${dbp} mmHg sangat tinggi untuk ${ageContext}. ${physiology.bpScreeningDisclaimer ?? ''}`,
          recommendations: [
            'Nilai gejala target organ seperti nyeri dada, sesak, atau gangguan neurologis.',
            'Ulangi pengukuran setelah pasien istirahat dan posisi benar.',
            'Prioritaskan review dokter di kunjungan ini.',
          ],
          clinicalData: { sbp, dbp, map },
        });
      }
    } else {
      // Adult/geriatric: pakai htn-classifier.ts penuh
      const htnSeverity = getHTNSeverity({ sbp, dbp });

      if (htnSeverity === 'stage1' || htnSeverity === 'stage2' || htnSeverity === 'crisis') {
        const bpSession: BPMeasurementSession = {
          readings: [{ sbp, dbp }],
          final_bp: { sbp, dbp },
          measurement_quality: 'acceptable',
        };

        const knownHTN = Boolean(context?.knownHTN);
        const htnResult = classifyHypertension(
          bpSession,
          // Red flags tidak tersedia dari input manual — default ke undefined
          // sehingga classifier default ke HTN_URGENCY (bukan EMERGENCY) tanpa red flags
          undefined,
          { on_medication: knownHTN }
        );

        const severityMap: Record<string, ScreeningAlert['severity']> = {
          stage1: 'warning',
          stage2: 'high',
        };

        const crisisSeverity: ScreeningAlert['severity'] =
          htnResult.type === 'HTN_EMERGENCY' ? 'critical' : 'high';

        const titleMap: Record<string, string> = {
          stage1: `Hipertensi Grade 1 (${sbp}/${dbp} mmHg)`,
          stage2: `Hipertensi Grade 2 — eskalasi diperlukan (${sbp}/${dbp} mmHg)`,
          crisis:
            htnResult.type === 'HTN_EMERGENCY'
              ? `EMERGENSI HIPERTENSI — rujuk IGD segera (${sbp}/${dbp} mmHg)`
              : `Urgensi Hipertensi — tata laksana segera (${sbp}/${dbp} mmHg)`,
        };

        alerts.push({
          id: 'hypertensive-alert',
          type: 'hypertensive_crisis',
          severity:
            htnSeverity === 'crisis' ? crisisSeverity : (severityMap[htnSeverity] ?? 'high'),
          title: titleMap[htnSeverity] ?? `Hipertensi terdeteksi (${sbp}/${dbp} mmHg)`,
          gate: 'GATE_2_BP',
          reasoning: htnResult.reasoning,
          recommendations: htnResult.recommendations,
          actionProtocolId: 'PROTO_HTN_EMERGENCY',
          clinicalData: { sbp, dbp, map },
        });
      }
    }
  }

  // ── GATE 3: GLUCOSE — via glucose-classifier.ts (PERKENI 2024 / ADA 2026) ─
  if (glucose > 0) {
    const glucoseResult = classifyBloodGlucose({
      gds: glucose,
      sample_type: 'capillary',
      has_classic_symptoms: false, // Tidak ada input gejala klasik dari form TTV
    });

    if (glucoseResult.category === 'HYPOGLYCEMIA_CRISIS') {
      alerts.push({
        id: 'hypoglycemia-alert',
        type: 'hypoglycemia',
        severity: 'critical',
        title: `Hipoglikemia — tangani segera (GDS ${glucose} mg/dL)`,
        gate: 'GATE_3_GLUCOSE',
        reasoning: glucoseResult.reasoning,
        recommendations: glucoseResult.recommendations,
        clinicalData: { glucose },
      });
    } else if (glucoseResult.category === 'HYPERGLYCEMIA_CRISIS') {
      alerts.push({
        id: 'hyperglycemia-crisis-alert',
        type: 'hyperglycemia',
        severity: 'critical',
        title: `Krisis hiperglikemia — curiga DKA/HHS (GDS ${glucose} mg/dL)`,
        gate: 'GATE_3_GLUCOSE',
        reasoning: glucoseResult.reasoning,
        recommendations: glucoseResult.recommendations,
        clinicalData: { glucose },
      });
    } else if (glucoseResult.category === 'DIABETES_CONFIRMED') {
      alerts.push({
        id: 'diabetes-alert',
        type: 'hyperglycemia',
        severity: 'high',
        title: `Hiperglikemia berat — evaluasi DM (GDS ${glucose} mg/dL)`,
        gate: 'GATE_3_GLUCOSE',
        reasoning: glucoseResult.reasoning,
        recommendations: glucoseResult.recommendations,
        clinicalData: { glucose },
      });
    } else if (glucoseResult.category === 'PREDIABETES') {
      alerts.push({
        id: 'prediabetes-alert',
        type: 'hyperglycemia',
        severity: 'warning',
        title: `Prediabetes terdeteksi (GDS ${glucose} mg/dL)`,
        gate: 'GATE_3_GLUCOSE',
        reasoning: glucoseResult.reasoning,
        recommendations: glucoseResult.recommendations,
        clinicalData: { glucose },
      });
    }
  }

  if (spo2 > 0 && spo2 < 90) {
    alerts.push({
      id: 'hypoxia-alert',
      type: 'hypoxia',
      severity: 'critical',
      title: 'Hipoksia signifikan',
      gate: 'GATE_4_RESPIRATORY',
      reasoning: `SpO2 ${spo2}% mengindikasikan kebutuhan intervensi respirasi segera.`,
      recommendations: [
        'Pastikan alat ukur valid dan cek ulang dengan probe yang baik.',
        'Pertimbangkan suplementasi oksigen sesuai protokol.',
        'Amati kerja napas dan tanda kelelahan respirasi.',
      ],
      clinicalData: { spo2, rr },
    });
  } else if (spo2 > 0 && spo2 <= 93) {
    alerts.push({
      id: 'borderline-hypoxia-alert',
      type: 'borderline_hypoxia',
      severity: 'high',
      title: 'Saturasi borderline',
      gate: 'GATE_4_RESPIRATORY',
      reasoning: `SpO2 ${spo2}% perlu pemantauan dekat dan korelasi dengan gejala respirasi.`,
      recommendations: [
        'Nilai ulang SpO2 setelah reposisi atau latihan napas.',
        'Pantau RR dan keluhan sesak.',
      ],
      clinicalData: { spo2, rr },
    });
  }

  if (hr >= physiology.tachycardiaThreshold) {
    alerts.push({
      id: 'tachycardia-alert',
      type: 'tachycardia',
      severity: 'high',
      title: physiology.isPediatric
        ? `Takikardia untuk ${physiology.label}`
        : 'Takikardia bermakna',
      gate: 'GATE_5_CIRCULATION',
      reasoning: physiology.isPediatric
        ? `Nadi ${hr} x/menit berada di atas ambang takikardia untuk ${ageContext} (>= ${physiology.tachycardiaThreshold} x/menit).`
        : `Nadi ${hr} x/menit dapat mencerminkan nyeri, infeksi, dehidrasi, atau syok dini.`,
      recommendations: [
        'Korelasikan dengan suhu, tekanan darah, dan status hidrasi.',
        'Evaluasi kemungkinan infeksi, perdarahan, atau nyeri tidak terkontrol.',
      ],
      clinicalData: { hr },
    });
  }

  if (hr > 0 && hr <= physiology.bradycardiaThreshold) {
    alerts.push({
      id: 'bradycardia-alert',
      type: 'bradycardia',
      severity: physiology.isPediatric ? 'high' : 'warning',
      title: physiology.isPediatric
        ? `Bradikardia untuk ${physiology.label}`
        : 'Bradikardia terdeteksi',
      gate: 'GATE_5B_CIRCULATION_LOW',
      reasoning: physiology.isPediatric
        ? `Nadi ${hr} x/menit berada di bawah ambang bawah untuk ${ageContext} (<= ${physiology.bradycardiaThreshold} x/menit). Korelasikan dengan perfusi, hipoksia, dan tingkat kesadaran.`
        : `Nadi ${hr} x/menit berada di bawah ambang yang diharapkan dan perlu korelasi dengan kondisi klinis pasien.`,
      recommendations: [
        'Nilai perfusi perifer, kesadaran, dan korelasikan dengan SpO2.',
        'Ulangi pengukuran nadi secara manual bila perlu.',
        'Segera eskalasi bila disertai perfusi buruk atau penurunan kesadaran.',
      ],
      clinicalData: { hr, spo2 },
    });
  }

  if (rr >= physiology.tachypneaThreshold) {
    alerts.push({
      id: 'tachypnea-alert',
      type: 'tachypnea',
      severity: 'high',
      title: physiology.isPediatric
        ? `Takipnea untuk ${physiology.label}`
        : 'Frekuensi napas meningkat',
      gate: 'GATE_6_RESP_RATE',
      reasoning: physiology.isPediatric
        ? `RR ${rr} x/menit berada di atas ambang takipnea untuk ${ageContext} (>= ${physiology.tachypneaThreshold} x/menit).`
        : `RR ${rr} x/menit membutuhkan evaluasi beban respirasi dan perfusi.`,
      recommendations: [
        'Nilai retraksi, penggunaan otot bantu, dan pola napas.',
        'Pertimbangkan triase lebih tinggi bila ada sesak atau SpO2 menurun.',
      ],
      clinicalData: { rr, spo2 },
    });
  }

  if (rr > 0 && rr <= physiology.bradypneaThreshold) {
    alerts.push({
      id: 'bradypnea-alert',
      type: 'bradypnea',
      severity: physiology.isPediatric ? 'high' : 'warning',
      title: physiology.isPediatric
        ? `Bradipnea untuk ${physiology.label}`
        : 'Frekuensi napas rendah',
      gate: 'GATE_6B_RESP_RATE_LOW',
      reasoning: physiology.isPediatric
        ? `RR ${rr} x/menit berada di bawah ambang bawah untuk ${ageContext} (<= ${physiology.bradypneaThreshold} x/menit).`
        : `RR ${rr} x/menit lebih rendah dari rentang yang diharapkan dan perlu evaluasi klinis.`,
      recommendations: [
        'Pastikan pasien tidak sedang tidur nyenyak atau menahan napas saat dihitung.',
        'Nilai kesadaran, kerja napas, dan ulangi pengukuran respirasi.',
        'Pertimbangkan eskalasi cepat bila disertai hipoksia atau perfusi buruk.',
      ],
      clinicalData: { rr, spo2 },
    });
  }

  if (hasOrthostaticCue) {
    alerts.push({
      id: 'orthostatic-check-alert',
      type: 'orthostatic_check',
      severity: sbp > 0 && sbp < 100 ? 'high' : 'warning',
      title: 'Perlu skrining hipotensi ortostatik',
      gate: 'GATE_1B_GERIATRIC_ORTHOSTATIC',
      reasoning:
        physiology.geriatricOrthostaticNote ||
        `Keluhan pada ${ageContext} mengarah ke risiko hipotensi ortostatik dan perlu verifikasi posisi.`,
      recommendations: [
        'Ukur tekanan darah serta nadi saat duduk atau berbaring, lalu ulang 1-3 menit setelah berdiri.',
        'Tinjau hidrasi, obat antihipertensi atau diuretik, dan risiko jatuh pasien.',
        'Segera eskalasi bila ada sinkop, jatuh berulang, atau perfusi tetap buruk.',
      ],
      clinicalData: { sbp, dbp, hr, map },
    });
  }

  if (physiology.isOlderAdult) {
    if (temp >= 39) {
      alerts.push({
        id: 'fever-alert',
        type: 'hyperthermia',
        severity: 'warning',
        title: 'Demam tinggi pada usia tua',
        gate: 'GATE_7_TEMPERATURE',
        reasoning: `Suhu ${temp.toFixed(1)} C pada ${ageContext} mendukung proses infeksi atau inflamasi aktif. ${physiology.geriatricTemperatureNote}`,
        recommendations: [
          'Cari fokus infeksi dan pantau tanda sepsis atau penurunan kesadaran.',
          'Pastikan hidrasi adekuat, observasi respons antipiretik, dan verifikasi suhu ulang.',
        ],
        clinicalData: { temp },
      });
    } else if (temp >= (physiology.geriatricSingleFeverThreshold || 37.8)) {
      alerts.push({
        id: 'geriatric-fever-alert',
        type: 'geriatric_fever',
        severity: hasAtypicalInfectionCue ? 'high' : 'warning',
        title: 'Demam pada usia tua perlu evaluasi dini',
        gate: 'GATE_7_TEMPERATURE',
        reasoning: `Suhu ${temp.toFixed(1)} C sudah memenuhi ambang demam skrining untuk ${ageContext}. ${physiology.geriatricTemperatureNote}`,
        recommendations: [
          'Ulangi suhu dan korelasikan dengan fokus infeksi, hidrasi, serta perubahan status fungsional.',
          'Pantau delirium, intake, atau penurunan aktivitas sebagai presentasi infeksi atipikal.',
          'Prioritaskan review dokter bila disertai hemodinamik labil atau hipoksia.',
        ],
        clinicalData: { temp, spo2, rr },
      });
    } else if (temp >= (physiology.geriatricRepeatFeverThreshold || 37.2)) {
      alerts.push({
        id: 'geriatric-low-grade-fever-alert',
        type: 'geriatric_low_grade_fever',
        severity: hasAtypicalInfectionCue ? 'high' : 'warning',
        title: 'Kenaikan suhu ringan pada usia tua',
        gate: 'GATE_7_TEMPERATURE',
        reasoning: `Suhu ${temp.toFixed(1)} C pada ${ageContext} sudah layak dicurigai sebagai demam dini, terutama bila berulang atau meningkat dari baseline.`,
        recommendations: [
          'Ulangi suhu dalam kunjungan ini dan bandingkan dengan baseline bila tersedia.',
          'Cari fokus infeksi, intake menurun, bingung mendadak, atau penurunan fungsi.',
        ],
        clinicalData: { temp },
      });
    } else if (hasAtypicalInfectionCue) {
      alerts.push({
        id: 'geriatric-afebrile-infection-alert',
        type: 'geriatric_afebrile_infection_risk',
        severity: 'warning',
        title: 'Infeksi pada usia tua bisa afebril',
        gate: 'GATE_7B_GERIATRIC_AFEBRILE',
        reasoning: `Keluhan ${ageContext} mengarah ke presentasi infeksi atipikal. ${physiology.geriatricTemperatureNote}`,
        recommendations: [
          'Jangan menunggu demam tinggi untuk menilai fokus infeksi atau dehidrasi.',
          'Pantau perubahan mental, intake, aktivitas, dan ulangi suhu bila keluhan berlanjut.',
        ],
        clinicalData: { temp, spo2, rr },
      });
    }
  } else if (temp >= 39) {
    alerts.push({
      id: 'fever-alert',
      type: 'hyperthermia',
      severity: 'warning',
      title: 'Demam tinggi',
      gate: 'GATE_7_TEMPERATURE',
      reasoning: `Suhu ${temp.toFixed(1)} C mendukung proses infeksi atau inflamasi aktif.`,
      recommendations: [
        'Cari fokus infeksi dan pantau tanda sepsis.',
        'Pastikan hidrasi adekuat dan observasi respons antipiretik.',
      ],
      clinicalData: { temp },
    });
  }

  // ── PATTERN ENGINE v2: Evaluate 70 clinical patterns ──────────────────────
  const snapshot = buildClinicalSnapshot(state, patient, context);
  const existingAlertIds = alerts.map((a) => a.id);
  const patternMatches = evaluatePatterns(snapshot, CLINICAL_PATTERNS, existingAlertIds, {
    tierFilter: ['A', 'B'],
  });
  alerts.push(...patternMatchesToAlerts(patternMatches));

  return alerts.map((alert) => ({
    ...alert,
    actionProtocolId: alert.actionProtocolId ?? resolveActionProtocolId(alert),
  }));
};

export const buildSummary = (
  state: TTVStateShape,
  headlineAlert: ScreeningAlert | null,
  flags: Record<string, boolean>,
  patient: Pick<TTVInferenceUIProps, 'patientName' | 'patientGender' | 'patientAge' | 'patientRM'>
): string => {
  const physiology = getVitalScreeningProfile(patient.patientAge || 0);
  const activeFlags = historyItems
    .filter((item) => flags[item.id])
    .map((item) => item.label)
    .join(', ');

  const lines = [
    '[AUTOSEN ANALYSIS]',
    `Pasien: ${patient.patientName || 'Belum terhubung'} | RM ${patient.patientRM || '-'}`,
    `Profil: ${patient.patientGender || '-'} | ${patient.patientAge || 0} tahun | Preset ${presetLabels[state.autosenPreset]}`,
    `Mode screening fisiologis: ${physiology.label}`,
    ...(physiology.isOlderAdult
      ? [
          'Catatan geriatri: suhu bisa tampak lebih rendah; cek ortostatik bila ada pusing, jatuh, atau sinkop.',
        ]
      : []),
    '',
    `Keluhan utama: ${state.symptomText || 'Belum diisi'}`,
    `Alergi: ${state.allergies.length > 0 ? state.allergies.join(', ') : 'Tidak dilaporkan'}`,
    `Disabilitas: ${state.disabilityType || 'Tidak dipilih'}`,
    `Obesitas: ${
      state.obesityConfirmation === 'confirmed'
        ? 'Obesitas'
        : state.obesityConfirmation === 'morbid_obesity'
          ? 'Obesitas Morbid'
          : state.obesityConfirmation === 'not_confirmed'
            ? 'Tidak Terkonfirmasi'
            : 'Tidak dipilih'
    }`,
    `Risk markers: ${activeFlags || 'Tidak dipilih'}`,
    '',
    `TD ${state.sbp || '-'}/${state.dbp || '-'} mmHg | Nadi ${state.hr || '-'} | RR ${state.rr || '-'} | Suhu ${state.temp || '-'} C`,
    `SpO2 ${state.spo2 || '-'}% | Gula darah ${state.glucose || '-'} mg/dL`,
    '',
    headlineAlert
      ? `Prioritas: ${headlineAlert.severity.toUpperCase()} - ${headlineAlert.title}`
      : 'Prioritas: STABLE - belum ada alert prioritas tinggi',
    headlineAlert
      ? `Tindakan awal: ${headlineAlert.recommendations[0]}`
      : 'Tindakan awal: lanjutkan observasi dan lengkapi data klinis bila perlu',
  ];

  return lines.join('\n');
};

/**
 * buildCanonicalVitalOutput
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const buildCanonicalVitalOutput = (
  canonical: CanonicalClinicalEngineOutput,
  fallback: string,
  context: {
    patientName: string;
    patientAge: number;
    patientRM: string;
    vitalsLine: string;
  }
): string => {
  const lines: string[] = [
    '[CANONICAL AUTO COMPLETE+ VITAL SIGN]',
    `Pasien: ${context.patientName} | RM ${context.patientRM}`,
    `Usia: ${context.patientAge} tahun`,
    context.vitalsLine,
  ];

  if (canonical.scoring.news2) {
    lines.push(
      `NEWS2: ${canonical.scoring.news2.score} • ${canonical.scoring.news2.risk_level.toUpperCase()}`
    );
  }

  if (canonical.trajectory?.overall_trend || canonical.trajectory?.overall_risk) {
    const trend = canonical.trajectory?.overall_trend
      ? canonical.trajectory.overall_trend.toUpperCase()
      : 'TIDAK TERSEDIA';
    const risk = canonical.trajectory?.overall_risk
      ? canonical.trajectory.overall_risk.toUpperCase()
      : 'TIDAK TERSEDIA';
    lines.push(`Trajectory: ${trend} • ${risk}`);
  }

  const immediateActions = canonical.recommendations.immediate_actions || [];
  if (immediateActions.length > 0) {
    lines.push(`Immediate Actions: ${immediateActions.slice(0, 3).join(', ')}`);
  }

  if (canonical.alerts.length > 0) {
    lines.push('Alerts:');
    canonical.alerts.slice(0, 3).forEach((alert) => {
      lines.push(`- ${alert.severity.toUpperCase()} • ${alert.title} • ${alert.message}`);
    });
  }

  if (canonical.governance?.disclaimer) {
    lines.push(`Disclaimer: ${canonical.governance.disclaimer}`);
  }

  lines.push('', 'Fallback lokal:', fallback);
  return lines.join('\n');
};

/**
 * TTVInferenceUI
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export const TTVInferenceUI = forwardRef<TTVInferenceUIHandle, TTVInferenceUIProps>(
  function TTVInferenceUI(
    {
      patientName = 'Pasien belum terhubung',
      patientGender = 'L',
      patientAge = 0,
      patientRM = '-',
      patientDOB = '',
      patientBloodType = '',
      patientBPJSStatus = null,
      patientKelurahan = '',
      onComplete,
      onAlertsChange,
      onTriageVerdictChange,
      ttvState,
      onTTVStateChange,
      onNavigateToTrajectory,
      getMiraDifferential,
      onChronicHistoryChange,
      prefilledHistoryFlags,
      extractedSpecialConditions = [],
      extractedPregnancyRisk = '',
      extractedFacilityName = '',
      extractedPayerLabel = '',
      extractedAllergies = [],
      extractedPregnancyStatus = null,
      canonicalOutput: canonicalOutputProp = null,
      prefetchedVisits,
      onSentraUplink,
      bootSequenceActive = false,
      rmeVitalFieldKeys = [],
      patientAgeKnown,
      onAccessEmergency,
    },
    ref
  ): JSX.Element {
    const [localState, setLocalState] = useState<TTVStateShape>(DEFAULT_STATE);
    const [historyFlags, setHistoryFlags] =
      useState<Record<string, boolean>>(createEmptyHistoryFlags);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingVitals, setIsAnalyzingVitals] = useState(false);
    const [animatedDraftText, setAnimatedDraftText] = useState('');
    const [isDraftTyping, setIsDraftTyping] = useState(false);
    const [lastProcessedSymptomText, setLastProcessedSymptomText] = useState('');
    const [localCanonicalOutput, setLocalCanonicalOutput] =
      useState<CanonicalClinicalEngineOutput | null>(canonicalOutputProp ?? null);
    const [canonicalError, setCanonicalError] = useState('');
    const [isCanonicalLoading, setIsCanonicalLoading] = useState(false);
    const [isGhostFillAnimating, setIsGhostFillAnimating] = useState(false);
    const [ghostActiveLane, setGhostActiveLane] = useState<VitalGhostLane | null>(null);
    const [ghostCompletedLanes, setGhostCompletedLanes] = useState<VitalGhostLane[]>([]);
    const [ghostVisibleValues, setGhostVisibleValues] = useState<
      Partial<Record<VitalFieldKey, string>>
    >({});
    const [bloodPressureDraft, setBloodPressureDraft] = useState<string | null>(null);
    const [bootScrambleValues, setBootScrambleValues] = useState<Record<BootScrambleField, string>>(
      () => createBootScrambleValues()
    );
    const [bootActiveField, setBootActiveField] = useState<BootScrambleField | null>(null);
    const bootSequenceTimeoutsRef = useRef<number[]>([]);
    const [uplinkScrambleText, setUplinkScrambleText] = useState(() => createUplinkScrambleText());

    const [isAllergyOpen, setIsAllergyOpen] = useState(false);
    const [isDisabilityOpen, setIsDisabilityOpen] = useState(false);
    const [isObesityOpen, setIsObesityOpen] = useState(false);
    const [isPresetOpen, setIsPresetOpen] = useState(false);
    const [isPainScoreOpen, setIsPainScoreOpen] = useState(false);
    const [anamnesisMissingFields, setAnamnesisMissingFields] = useState<AnamnesisMissingField[]>(
      []
    );
    const [shadowSuggestion, setShadowSuggestion] = useState('');
    const [onlineDoctors, setOnlineDoctors] = useState<OnlineDoctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
    const [doctorPickerError, setDoctorPickerError] = useState('');
    const [doctorPickerNotice, setDoctorPickerNotice] = useState('');
    const [isConsultFooterOpen, setIsConsultFooterOpen] = useState(false);
    const [uplinkState, setUplinkState] = useState<'idle' | 'processing' | 'completed'>('idle');
    const [sendDoctorState, setSendDoctorState] = useState<'idle' | 'processing' | 'completed'>(
      'idle'
    );
    const [bridgeSyncStatus, setBridgeSyncStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
    const [bridgeSyncError, setBridgeSyncError] = useState('');
    const [uplinkError, setUplinkError] = useState<string | null>(null);
    const [sendDoctorError, setSendDoctorError] = useState<string | null>(null);
    // Per-field source tracking for autocomplete override protection
    const [fieldMeta, setFieldMeta] = useState<Partial<Record<VitalFieldKey, FieldMeta>>>({});
    const fieldMetaRef = useRef<Partial<Record<VitalFieldKey, FieldMeta>>>({});

    // Keep refs in sync with state (prevents stale closure bugs in setTimeout/setInterval)
    useEffect(() => {
      fieldMetaRef.current = fieldMeta;
    }, [fieldMeta]);

    useEffect(() => {
      if (!bootSequenceActive) {
        bootSequenceTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        bootSequenceTimeoutsRef.current = [];
        setBootActiveField(null);
        return;
      }

      let order = shuffleBootFields(BOOT_SCRAMBLE_FIELDS);
      let cursor = 0;

      const activateNextField = () => {
        if (cursor >= order.length) {
          order = shuffleBootFields(BOOT_SCRAMBLE_FIELDS);
          cursor = 0;
        }

        const field = order[cursor];
        cursor += 1;

        if (!field) {
          return;
        }

        setBootScrambleValues((previous) => ({
          ...previous,
          [field]: createBootScrambleText(BOOT_SCRAMBLE_LENGTHS[field]),
        }));
        setBootActiveField(field);

        const holdMs = BOOT_FIELD_HOLD_MS + Math.floor(Math.random() * BOOT_FIELD_JITTER_MS);
        const timeoutId = window.setTimeout(activateNextField, holdMs);
        bootSequenceTimeoutsRef.current.push(timeoutId);
      };

      activateNextField();

      return () => {
        bootSequenceTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        bootSequenceTimeoutsRef.current = [];
      };
    }, [bootSequenceActive]);

    useEffect(() => {
      if (uplinkState !== 'processing') {
        return;
      }

      setUplinkScrambleText(createUplinkScrambleText());
      const intervalId = window.setInterval(() => {
        setUplinkScrambleText(createUplinkScrambleText());
      }, 84);

      return () => window.clearInterval(intervalId);
    }, [uplinkState]);

    // Reset uplink + field meta when patient changes
    useEffect(() => {
      setUplinkState('idle');
      setUplinkError(null);
      setSendDoctorState('idle');
      setSendDoctorError(null);
      setDoctorPickerNotice('');
      setDoctorPickerError('');
      setFieldMeta({});
    }, [patientRM]);

    useEffect(() => {
      if (rmeVitalFieldKeys.length === 0) return;
      setFieldMeta((prev) => applyRmeVitalTags(prev, rmeVitalFieldKeys, state));
    }, [rmeVitalFieldKeys, patientRM]);

    const handleSentraUplink = useCallback(async () => {
      if (!onSentraUplink || uplinkState !== 'idle') return;
      setUplinkState('processing');
      setUplinkError(null);
      try {
        await onSentraUplink();
        setUplinkState('completed');
        playSound('message.mp3');
      } catch (err) {
        setUplinkState('idle');
        setUplinkError(err instanceof Error ? err.message : 'Uplink gagal');
      }
    }, [onSentraUplink, uplinkState]);
    const allergyDropdownRef = useRef<HTMLDivElement | null>(null);
    const disabilityDropdownRef = useRef<HTMLDivElement | null>(null);
    const obesityDropdownRef = useRef<HTMLDivElement | null>(null);
    const presetDropdownRef = useRef<HTMLDivElement | null>(null);
    const painScoreDropdownRef = useRef<HTMLDivElement | null>(null);
    const ghostAnimationTimeoutsRef = useRef<number[]>([]);

    const state = ttvState ?? localState;
    const stateRef = useRef(state);

    useEffect(() => {
      stateRef.current = state;
    }, [state]);

    useEffect(() => {
      return () => {
        ghostAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
        ghostAnimationTimeoutsRef.current = [];
      };
    }, []);

    useEffect(() => {
      setLocalCanonicalOutput(canonicalOutputProp ?? null);
    }, [canonicalOutputProp]);

    const canonicalOutput = localCanonicalOutput ?? canonicalOutputProp;
    const clinicalSpecialConditions = useMemo(
      () => cleanSpecialConditions(extractedSpecialConditions),
      [extractedSpecialConditions]
    );

    const clearGhostAnimationTimers = () => {
      ghostAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      ghostAnimationTimeoutsRef.current = [];
    };

    const displayedVitalValue = (field: VitalFieldKey): string => {
      if (isGhostFillAnimating) {
        return ghostVisibleValues[field] ?? '';
      }

      return state[field];
    };

    const displayedGcsValue = (): string => state.gcs ?? '';

    const displayedBloodPressureValue = (): string => {
      if (bloodPressureDraft !== null) return bloodPressureDraft;
      if (isGhostFillAnimating) {
        return formatBloodPressureValue(ghostVisibleValues.sbp ?? '', ghostVisibleValues.dbp ?? '');
      }

      return formatBloodPressureValue(state.sbp, state.dbp);
    };

    const getVitalGhostItemClassName = (lane: VitalGhostLane): string =>
      [
        'vital-item',
        isGhostFillAnimating ? 'vital-item--ghosting' : '',
        ghostCompletedLanes.includes(lane) ? 'vital-item--ghost-complete' : '',
        ghostActiveLane === lane ? 'vital-item--ghost-active' : '',
      ]
        .filter(Boolean)
        .join(' ');

    const runGhostFillAnimation = (targetState: TTVStateShape): Promise<void> => {
      clearGhostAnimationTimers();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const orderedLanes = shuffleGhostLanes(VITAL_GHOST_LANES);
      const startupDelay = prefersReducedMotion ? 0 : 88;
      const laneDelay = prefersReducedMotion ? 42 : 136;
      const revealDelay = prefersReducedMotion ? 10 : 62;
      const laneHold = prefersReducedMotion ? 54 : 176;

      setIsGhostFillAnimating(true);
      setGhostActiveLane(null);
      setGhostCompletedLanes([]);
      setGhostVisibleValues({});

      return new Promise((resolve) => {
        orderedLanes.forEach((lane, index) => {
          const laneStartAt = startupDelay + index * laneDelay;

          const activateId = window.setTimeout(() => {
            setGhostActiveLane(lane);
          }, laneStartAt);

          const revealId = window.setTimeout(() => {
            setGhostCompletedLanes((previous) =>
              previous.includes(lane) ? previous : [...previous, lane]
            );
            setGhostVisibleValues((previous) => {
              const nextValues = { ...previous };
              VITAL_GHOST_LANE_FIELDS[lane].forEach((field) => {
                nextValues[field] = targetState[field];
              });
              return nextValues;
            });
          }, laneStartAt + revealDelay);

          const deactivateId = window.setTimeout(() => {
            setGhostActiveLane((current) => (current === lane ? null : current));
          }, laneStartAt + laneHold);

          ghostAnimationTimeoutsRef.current.push(activateId, revealId, deactivateId);
        });

        const resolveId = window.setTimeout(
          () => {
            resolve();
          },
          startupDelay + orderedLanes.length * laneDelay + laneHold
        );

        ghostAnimationTimeoutsRef.current.push(resolveId);
      });
    };

    const normalizedPrefilledHistoryFlags = useMemo(
      () =>
        historyItems.reduce(
          (accumulator, item) => {
            accumulator[item.id] = Boolean(prefilledHistoryFlags?.[item.id]);
            return accumulator;
          },
          {} as Record<string, boolean>
        ),
      [prefilledHistoryFlags]
    );

    const commitState = (updater: (prev: TTVStateShape) => TTVStateShape) => {
      const nextState = updater(stateRef.current);

      if (onTTVStateChange) {
        onTTVStateChange(nextState);
        return;
      }

      setLocalState(nextState);
    };

    const applySymptomText = (value: string) => {
      commitState((prev) => ({
        ...prev,
        symptomText: value,
      }));
    };

    const bpHistory = useMemo<HistoricalBP[]>(
      () =>
        (prefetchedVisits ?? [])
          .filter((v) => v.vitals.sbp > 0 && v.vitals.dbp > 0)
          .map((v) => ({ visit_date: v.timestamp, sbp: v.vitals.sbp, dbp: v.vitals.dbp })),
      [prefetchedVisits]
    );

    const effectiveHistoryFlags = useMemo(() => {
      const hasPrefilledSelection = historyItems.some(
        (item) => normalizedPrefilledHistoryFlags[item.id]
      );
      const hasLocalSelection = historyItems.some((item) => historyFlags[item.id]);

      if (!hasLocalSelection && hasPrefilledSelection) {
        return normalizedPrefilledHistoryFlags;
      }

      return historyFlags;
    }, [historyFlags, normalizedPrefilledHistoryFlags]);

    const alerts = useMemo(
      () =>
        buildAlerts(
          state,
          { patientAge, patientGender },
          {
            bpHistory,
            knownHTN: Boolean(effectiveHistoryFlags['ht']),
          }
        ),
      [
        patientAge,
        patientGender,
        state.autosenPreset,
        state.dbp,
        state.disabilityType,
        state.glucose,
        state.hr,
        state.obesityConfirmation,
        state.pain_score,
        state.pregnancyStatus,
        state.rr,
        state.sbp,
        state.spo2,
        state.symptomText,
        state.temp,
        bpHistory,
        effectiveHistoryFlags,
      ]
    );

    const hasVitalsEntered = Boolean(
      state.sbp || state.dbp || state.hr || state.rr || state.temp || state.spo2 || state.glucose
    );
    // Fail closed: unknown age must not activate triage zones (age 0 ≠ confirmed infant).
    const ageKnownForTriage = patientAgeKnown ?? patientAge > 0;
    const triageReady = hasVitalsEntered && ageKnownForTriage;

    useEffect(() => {
      onAlertsChange?.(ageKnownForTriage ? alerts : []);
    }, [alerts, onAlertsChange, ageKnownForTriage]);

    const triageVerdict = useMemo(
      () => computeTriageVerdict(alerts, triageReady),
      [alerts, triageReady]
    );

    useEffect(() => {
      onTriageVerdictChange?.(triageVerdict);
    }, [triageVerdict, onTriageVerdictChange]);

    const vitalGuardrails = useMemo(
      () =>
        assessVitalGuardrails(
          {
            sbp: state.sbp,
            dbp: state.dbp,
            hr: state.hr,
            rr: state.rr,
            temp: state.temp,
            spo2: state.spo2,
            glucose: state.glucose,
            symptomText: state.symptomText,
            pregnancyStatus: state.pregnancyStatus,
            painScore: state.pain_score,
            disabilityType: state.disabilityType,
            obesityConfirmation: state.obesityConfirmation,
            autosenPreset: state.autosenPreset,
          },
          { age: patientAge || 0, gender: patientGender || 'L' }
        ),
      [
        patientAge,
        patientGender,
        state.dbp,
        state.disabilityType,
        state.glucose,
        state.hr,
        state.obesityConfirmation,
        state.pain_score,
        state.pregnancyStatus,
        state.autosenPreset,
        state.rr,
        state.sbp,
        state.spo2,
        state.symptomText,
        state.temp,
      ]
    );
    const primaryVitalGuardrailMessage = vitalGuardrails.hardStops[0]?.message || '';

    const physiologyProfile = useMemo(
      () => getVitalScreeningProfile(patientAge || 0),
      [patientAge]
    );
    const chronicHistoryLabels = getSelectedHistoryLabels(effectiveHistoryFlags);
    const chronicHistorySummary = chronicHistoryLabels.join(', ');
    const allergySummary = state.allergies.join(', ');
    const allergyPlaceholder = allergySummary || 'Pilih di sini';
    const isAllergyPlaceholder = allergyPlaceholder === 'Pilih di sini';
    const disabilityPlaceholder = state.disabilityType || 'Pilih di sini';
    const isDisabilityPlaceholder = disabilityPlaceholder === 'Pilih di sini';
    const obesityPlaceholder =
      state.obesityConfirmation === 'confirmed'
        ? 'Obesitas'
        : state.obesityConfirmation === 'morbid_obesity'
          ? 'Obesitas Morbid'
          : state.obesityConfirmation === 'not_confirmed'
            ? 'Tidak Terkonfirmasi'
            : 'Pilih di sini';
    const isObesityPlaceholder = obesityPlaceholder === 'Pilih di sini';
    const painScoreLockedMessage = vitalGuardrails.uiLocks.painScore || '';
    const isPainScoreLocked = Boolean(painScoreLockedMessage);
    const painScorePlaceholder =
      painScoreLockedMessage ||
      (state.pain_score.trim() ? `${state.pain_score.trim()}/10` : 'Pilih di sini');
    const isPainScorePlaceholder = painScorePlaceholder === 'Pilih di sini';
    const presetPlaceholder = state.autosenPreset
      ? presetLabels[state.autosenPreset]
      : 'Pilih di sini';
    const isPresetPlaceholder = !state.autosenPreset;
    const bootPlaceholder = (
      field: BootScrambleField,
      fallback: string,
      shouldScramble: boolean
    ): string =>
      bootSequenceActive && shouldScramble && bootActiveField === field
        ? bootScrambleValues[field]
        : fallback;
    const displayedVitalPlaceholder = (field: VitalFieldKey): string =>
      bootPlaceholder(field, '---', !state[field].trim());
    const displayedGcsPlaceholder = bootPlaceholder('gcs', '15', !(state.gcs ?? '').trim());
    const displayedBloodPressurePlaceholder = bootPlaceholder(
      'sbp',
      '120/80',
      !state.sbp.trim() && !state.dbp.trim()
    );
    const symptomPlaceholder = bootPlaceholder(
      'symptomText',
      'Ketik keluhan utama, durasi, dan konteks klinis singkat...',
      !state.symptomText.trim()
    );
    const allergyDisplayText = bootPlaceholder('allergy', allergyPlaceholder, isAllergyPlaceholder);
    const pregnancyPlaceholder = bootPlaceholder(
      'pregnancy',
      'Pilih di sini',
      state.pregnancyStatus === null
    );
    const disabilityDisplayText = bootPlaceholder(
      'disability',
      disabilityPlaceholder,
      isDisabilityPlaceholder
    );
    const obesityDisplayText = bootPlaceholder('obesity', obesityPlaceholder, isObesityPlaceholder);
    const presetDisplayText = bootPlaceholder('preset', presetPlaceholder, isPresetPlaceholder);
    const painScoreDisplayText = bootPlaceholder(
      'pain',
      painScorePlaceholder,
      isPainScorePlaceholder
    );
    const isFemalePatient = patientGender === 'P';
    const hasLoadedPatientContext =
      patientAge > 0 &&
      Boolean(patientRM && patientRM !== '-') &&
      patientName !== 'Pasien belum terhubung';
    const showPediatricScreeningMode = hasLoadedPatientContext && physiologyProfile.isPediatric;
    const hasSymptomDraftPending =
      Boolean(state.symptomText.trim()) && state.symptomText.trim() !== lastProcessedSymptomText;
    const isPregnancyStatusRequired = Boolean(vitalGuardrails.uiRequired.pregnancyStatus);
    const isGlucoseRequired = Boolean(vitalGuardrails.uiRequired.glucose);
    const toggleExclusiveDropdown = (
      target: 'allergy' | 'disability' | 'obesity' | 'preset' | 'pain'
    ) => {
      const nextOpenMap = {
        allergy: target === 'allergy' ? !isAllergyOpen : false,
        disability: target === 'disability' ? !isDisabilityOpen : false,
        obesity: target === 'obesity' ? !isObesityOpen : false,
        preset: target === 'preset' ? !isPresetOpen : false,
        pain: target === 'pain' ? !isPainScoreOpen : false,
      };

      setIsAllergyOpen(nextOpenMap.allergy);
      setIsDisabilityOpen(nextOpenMap.disability);
      setIsObesityOpen(nextOpenMap.obesity);
      setIsPresetOpen(nextOpenMap.preset);
      setIsPainScoreOpen(nextOpenMap.pain);
    };

    const handlePregnancySelection = (value: string) => {
      const nextPregnancyStatus = value === 'hamil' ? true : value === 'tidak_hamil' ? false : null;

      if (
        nextPregnancyStatus === true &&
        isFemalePatient &&
        (patientAge < 10 || patientAge > 60) &&
        !window.confirm('Pasien di luar rentang usia kehamilan umum. Lanjutkan?')
      ) {
        return;
      }

      updateField('pregnancyStatus', nextPregnancyStatus);
    };

    const anamnesaDraft = useMemo(
      () =>
        composeAnamnesaDraft({
          symptomText: state.symptomText,
          patientGender,
          chronicDiseases: chronicHistoryLabels,
          allergies: state.allergies,
          pregnancyStatus: state.pregnancyStatus,
          specialConditions: clinicalSpecialConditions,
          pregnancyRisk: extractedPregnancyRisk,
          vitals: {
            sbp: parseNumber(state.sbp),
            dbp: parseNumber(state.dbp),
            hr: parseNumber(state.hr),
            rr: parseNumber(state.rr),
            temp: parseNumber(state.temp),
            spo2: parseNumber(state.spo2),
            glucose: parseNumber(state.glucose),
          },
          disabilityType: state.disabilityType,
          obesityConfirmation: state.obesityConfirmation,
          autosenPresetLabel: presetLabels[state.autosenPreset],
        }),
      [
        chronicHistoryLabels,
        extractedPregnancyRisk,
        clinicalSpecialConditions,
        patientGender,
        state.allergies,
        state.autosenPreset,
        state.dbp,
        state.disabilityType,
        state.glucose,
        state.hr,
        state.obesityConfirmation,
        state.pregnancyStatus,
        state.rr,
        state.sbp,
        state.spo2,
        state.symptomText,
        state.temp,
      ]
    );

    useEffect(() => {
      setShadowSuggestion(buildAnamnesisShadowSuggestion(anamnesisMissingFields));
    }, [anamnesisMissingFields]);
    const preferredPoliKeywords = useMemo(
      () =>
        derivePreferredPoliKeywords(
          chronicHistoryLabels,
          state.autosenPreset,
          state.pregnancyStatus
        ),
      [chronicHistoryLabels, state.autosenPreset, state.pregnancyStatus]
    );
    const consultSummaryRows = useMemo(
      () =>
        [
          {
            label: 'BPJS / Penjamin',
            value: formatPayerLabel(extractedPayerLabel, patientBPJSStatus),
          },
          {
            label: 'Penyakit Khusus',
            value:
              clinicalSpecialConditions.length > 0
                ? clinicalSpecialConditions.join(', ')
                : 'Tidak terdeteksi',
          },
          {
            label: 'Risiko Kehamilan',
            value: extractedPregnancyRisk.trim() || 'Tidak terdeteksi',
          },
          canonicalOutput?.scoring.news2
            ? {
                label: 'Canonical NEWS2',
                value: `${canonicalOutput.scoring.news2.score} • ${canonicalOutput.scoring.news2.risk_level.toUpperCase()}`,
              }
            : null,
          canonicalOutput?.trajectory
            ? {
                label: 'Canonical Trajectory',
                value: `${
                  canonicalOutput.trajectory.overall_trend
                    ? humanize(canonicalOutput.trajectory.overall_trend).toUpperCase()
                    : 'TIDAK TERSEDIA'
                } • ${
                  canonicalOutput.trajectory.overall_risk
                    ? humanize(canonicalOutput.trajectory.overall_risk).toUpperCase()
                    : 'TIDAK TERSEDIA'
                }`,
              }
            : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      [
        canonicalOutput,
        extractedPayerLabel,
        extractedPregnancyRisk,
        clinicalSpecialConditions,
        patientBPJSStatus,
      ]
    );
    const selectedDoctor = useMemo(
      () => onlineDoctors.find((doctor) => doctor.id === selectedDoctorId) || null,
      [onlineDoctors, selectedDoctorId]
    );
    const lastVisitSummaryRows = useMemo(
      () => buildLastVisitSummaryRows(prefetchedVisits),
      [prefetchedVisits]
    );
    const visitHistorySections = useMemo(
      () => buildVisitHistorySections(prefetchedVisits),
      [prefetchedVisits]
    );
    const consultFooterRows = useMemo(
      () =>
        [
          extractedAllergies.length > 0
            ? { label: 'Riwayat Alergi', value: extractedAllergies.join(', ') }
            : null,
          clinicalSpecialConditions.length > 0
            ? { label: 'Penyakit Khusus', value: clinicalSpecialConditions.join(', ') }
            : null,
          extractedPregnancyRisk.trim()
            ? { label: 'Risiko Kehamilan', value: extractedPregnancyRisk.trim() }
            : null,
          ...lastVisitSummaryRows,
        ].filter(Boolean) as VisitSummaryRow[],
      [extractedAllergies, extractedPregnancyRisk, clinicalSpecialConditions, lastVisitSummaryRows]
    );
    const rankDoctorsForCurrentContext = useCallback(
      (doctors: OnlineDoctor[]): OnlineDoctor[] =>
        [...doctors].sort((left, right) => {
          const leftRank = AVAILABILITY_RANK[left.availability_status || 'offline'];
          const rightRank = AVAILABILITY_RANK[right.availability_status || 'offline'];
          if (leftRank !== rightRank) {
            return leftRank - rightRank;
          }

          const leftPoli = normalizeText(left.poli);
          const rightPoli = normalizeText(right.poli);
          const leftPoliScore = preferredPoliKeywords.some((keyword) => leftPoli.includes(keyword))
            ? 0
            : 1;
          const rightPoliScore = preferredPoliKeywords.some((keyword) =>
            rightPoli.includes(keyword)
          )
            ? 0
            : 1;
          if (leftPoliScore !== rightPoliScore) {
            return leftPoliScore - rightPoliScore;
          }

          const locationHint = normalizeText(extractedFacilityName);
          const leftLocationScore =
            locationHint && normalizeText(left.location_name).includes(locationHint) ? 0 : 1;
          const rightLocationScore =
            locationHint && normalizeText(right.location_name).includes(locationHint) ? 0 : 1;
          if (leftLocationScore !== rightLocationScore) {
            return leftLocationScore - rightLocationScore;
          }

          return left.name.localeCompare(right.name);
        }),
      [extractedFacilityName, preferredPoliKeywords]
    );
    const sortedDoctors = useMemo(
      () => rankDoctorsForCurrentContext(onlineDoctors),
      [onlineDoctors, rankDoctorsForCurrentContext]
    );

    useEffect(() => {
      onChronicHistoryChange?.(chronicHistorySummary || 'Menunggu Input');
    }, [chronicHistorySummary, onChronicHistoryChange]);

    useEffect(() => {
      setHistoryFlags(normalizedPrefilledHistoryFlags);
    }, [normalizedPrefilledHistoryFlags, patientRM]);

    useEffect(() => {
      if (patientRM === '-') {
        return;
      }

      commitState((prev) => ({
        ...prev,
        allergies: extractedAllergies,
        pregnancyStatus: extractedPregnancyStatus,
      }));
    }, [extractedAllergies, extractedPregnancyStatus, patientRM]);

    useEffect(() => {
      setLastProcessedSymptomText('');
      setAnimatedDraftText('');
      setIsDraftTyping(false);
      setAnamnesisMissingFields([]);
      setShadowSuggestion('');
    }, [patientRM]);

    const [hasAutoTriggeredSymptoms, setHasAutoTriggeredSymptoms] = useState(false);

    useEffect(() => {
      if (!HYBRID_AUTOTEXT_ENABLED) return;

      const raw = state.symptomText.trim();
      if (raw.length < 8 || isAnalyzing || isDraftTyping) return;

      // Auto-trigger full analysis when 3 or more symptoms are detected
      const symptoms = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 2);
      if (symptoms.length >= 3 && !hasAutoTriggeredSymptoms) {
        setHasAutoTriggeredSymptoms(true);
        handleAnalyze();
        return;
      } else if (symptoms.length < 3) {
        setHasAutoTriggeredSymptoms(false);
      }

      const timerId = window.setTimeout(() => {
        void (async () => {
          const extractionStart = Date.now();
          try {
            const extraction = await extractClinicalAnamnesis(raw);
            setAnamnesisMissingFields(extraction.data_belum_lengkap);
            ttvLog.debug('Hybrid preview extraction updated', {
              source: 'backend',
              missingCount: extraction.data_belum_lengkap.length,
              latencyMs: Date.now() - extractionStart,
            });
          } catch (error) {
            ttvLog.debug('Preview extraction gagal', error);
          }
        })();
      }, 220);

      return () => window.clearTimeout(timerId);
    }, [state.symptomText, isAnalyzing, isDraftTyping]);

    useEffect(() => {
      if (!sortedDoctors.length) {
        setSelectedDoctorId('');
        return;
      }

      setSelectedDoctorId((current) =>
        sortedDoctors.some((doctor) => doctor.id === current) ? current : sortedDoctors[0].id
      );
    }, [sortedDoctors]);

    useEffect(() => {
      if (!isAllergyOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (!allergyDropdownRef.current?.contains(target)) {
          setIsAllergyOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isAllergyOpen]);

    useEffect(() => {
      if (!isDisabilityOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (!disabilityDropdownRef.current?.contains(target)) {
          setIsDisabilityOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isDisabilityOpen]);

    useEffect(() => {
      if (!isObesityOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (!obesityDropdownRef.current?.contains(target)) {
          setIsObesityOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isObesityOpen]);

    useEffect(() => {
      if (!isPresetOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (!presetDropdownRef.current?.contains(target)) {
          setIsPresetOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isPresetOpen]);

    useEffect(() => {
      if (!isPainScoreOpen) {
        return;
      }

      const handlePointerDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (!painScoreDropdownRef.current?.contains(target)) {
          setIsPainScoreOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [isPainScoreOpen]);

    useEffect(() => {
      if (!DOCTOR_CONSULT_UI_ENABLED) {
        return;
      }
      void loadOnlineDoctorOptions();
    }, []);

    useEffect(() => {
      const handler = (message: { type?: string; data?: { ok?: boolean; error?: string } }) => {
        if (message?.type === 'BRIDGE_SYNC_RESULT') {
          const { ok, error } = message.data ?? {};
          setBridgeSyncStatus(ok ? 'ok' : 'fail');
          setBridgeSyncError(error || '');
          if (ok) {
            const timer = setTimeout(() => setBridgeSyncStatus('idle'), 5000);
            return () => clearTimeout(timer);
          }
        }
      };
      browser.runtime.onMessage.addListener(handler);
      return () => browser.runtime.onMessage.removeListener(handler);
    }, []);

    const updateField = (field: keyof TTVStateShape, value: string | boolean | string[] | null) => {
      commitState((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Mark vital fields as ASIST-manual when user types (not when autocomplete fills)
      if (
        (VITAL_FIELD_KEYS as string[]).includes(field as string) &&
        typeof value === 'string' &&
        value.trim() !== ''
      ) {
        const meta = makeFieldMeta(value, 'ASIST-manual');
        setFieldMeta((prev) => ({ ...prev, [field]: meta }));
      }
    };

    useEffect(() => {
      if (!vitalGuardrails.uiDefaults.autosenPreset || state.autosenPreset) return;
      updateField('autosenPreset', vitalGuardrails.uiDefaults.autosenPreset);
    }, [state.autosenPreset, vitalGuardrails.uiDefaults.autosenPreset]);

    const handleVitalBlur = (field: VitalFieldKey) => {
      const normalized = normalizeVitalInput(field, state[field]);
      if (normalized.value !== state[field]) {
        updateField(field, normalized.value);
      }
    };

    const handleGcsChange = (value: string) => {
      const nextGcs = sanitizeGcsInput(value);
      const nextAvpu = deriveAvpuFromGcs(nextGcs);
      commitState((prev) => ({
        ...prev,
        gcs: nextGcs,
        ...(nextAvpu ? { avpu: nextAvpu } : {}),
      }));
    };

    const handleGcsBlur = () => {
      const normalized = normalizeGcsInput(state.gcs ?? '');
      if (normalized === (state.gcs ?? '')) return;
      const nextAvpu = deriveAvpuFromGcs(normalized);
      commitState((prev) => ({
        ...prev,
        gcs: normalized,
        ...(nextAvpu ? { avpu: nextAvpu } : {}),
      }));
    };

    const handleBloodPressureChange = (value: string) => {
      setBloodPressureDraft(value);
      const nextBp = parseBloodPressureInput(value);
      commitState((prev) => ({
        ...prev,
        sbp: nextBp.sbp,
        dbp: nextBp.dbp,
      }));

      const nextMeta: Partial<Record<VitalFieldKey, FieldMeta>> = { ...fieldMetaRef.current };
      if (nextBp.sbp) nextMeta.sbp = makeFieldMeta(nextBp.sbp, 'ASIST-manual');
      if (nextBp.dbp) nextMeta.dbp = makeFieldMeta(nextBp.dbp, 'ASIST-manual');
      setFieldMeta(nextMeta);
    };

    const handleBloodPressureBlur = () => {
      const normalizedSbp = normalizeVitalInput('sbp', state.sbp).value;
      const normalizedDbp = normalizeVitalInput('dbp', state.dbp).value;
      setBloodPressureDraft(null);
      if (normalizedSbp !== state.sbp || normalizedDbp !== state.dbp) {
        commitState((prev) => ({
          ...prev,
          sbp: normalizedSbp,
          dbp: normalizedDbp,
        }));
      }
    };

    const getVitalInputClassName = (field: VitalFieldKey): string =>
      [
        'vital-input',
        'vital-input--centered',
        `vital-input--${vitalGuardrails.fieldStatus[field].severity}`,
      ].join(' ');

    const isVitalInputInvalid = (field: VitalFieldKey): boolean =>
      vitalGuardrails.fieldStatus[field].severity === 'blocked';

    const applyShadowSuggestion = () => {
      if (!shadowSuggestion.trim()) return;

      const current = state.symptomText.trim();
      const nextText = current ? `${current} ${shadowSuggestion}` : shadowSuggestion;
      applySymptomText(nextText);
      setLastProcessedSymptomText(nextText);
      setAnamnesisMissingFields([]);
    };

    const selectAllergy = (label: string) => {
      updateField('allergies', [label]);
      setIsAllergyOpen(false);
    };

    const handleDisabilitySelection = (option: DisabilityType) => {
      commitState((prev) => {
        if (option !== 'Rungu' || prev.symptomText.startsWith(HETEROANAMNESIS_PREFIX)) {
          return {
            ...prev,
            disabilityType: option,
          };
        }

        const existingText = prev.symptomText.trim();
        return {
          ...prev,
          disabilityType: option,
          symptomText: existingText
            ? `${HETEROANAMNESIS_PREFIX}${existingText}`
            : HETEROANAMNESIS_PREFIX,
        };
      });
      setIsDisabilityOpen(false);
    };

    const loadOnlineDoctorOptions = async () => {
      setIsLoadingDoctors(true);
      setDoctorPickerError('');
      setDoctorPickerNotice('');

      try {
        const doctors = await getOnlineDoctors();
        setOnlineDoctors(doctors);
        setSelectedDoctorId((current) => current || doctors[0]?.id || '');
        if (doctors.length === 0) {
          setDoctorPickerError(
            'Tidak ada dokter online saat ini. Pastikan dashboard sudah terbuka dan status online aktif.'
          );
        }
      } catch (error) {
        // Clear stale list — jangan tampilkan fallback dokter ke user saat authenticated
        setOnlineDoctors([]);
        setSelectedDoctorId('');
        const msg = error instanceof Error ? error.message : 'Gagal memuat daftar dokter';
        const isAuthHint =
          error instanceof Error &&
          (error.name === 'AuthRequiredError' || msg.includes('Bridge memerlukan'));
        setDoctorPickerError(
          isAuthHint
            ? `${BRIDGE_AUTH_REQUIRED_HINT} Lalu muat ulang daftar dokter.`
            : `${msg} — Periksa Crew API Base URL dan Automation Token di Settings → Agent.`
        );
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    const buildDoctorConsultPayload = (
      targetDoctorId: string,
      miraDifferential: ConsultMiraDifferential | null
    ): ConsultPayload => {
      const chiefComplaint =
        state.symptomText.trim() ||
        anamnesaDraft.payload.keluhan_utama.trim() ||
        'Keluhan utama belum diisi';
      const additionalComplaint = anamnesaDraft.payload.keluhan_tambahan.trim();
      const canonicalClinical = buildCanonicalConsultContext(canonicalOutput);
      const visitHistory = buildConsultVisitHistory(prefetchedVisits);
      const consultObesityConfirmation =
        state.obesityConfirmation === 'not_confirmed'
          ? 'not_confirmed'
          : state.obesityConfirmation
            ? 'confirmed'
            : undefined;

      return {
        patient: {
          name: patientName,
          age: patientAge,
          gender: patientGender,
          rm: patientRM,
          dob: patientDOB,
          bpjsStatus: patientBPJSStatus,
          kelurahan: patientKelurahan,
        },
        ttv: {
          sbp: state.sbp,
          dbp: state.dbp,
          hr: state.hr,
          rr: state.rr,
          temp: state.temp,
          spo2: state.spo2,
          glucose: state.glucose,
        },
        keluhan_utama: chiefComplaint,
        ...(additionalComplaint ? { keluhan_tambahan: additionalComplaint } : {}),
        risk_factors: alerts.map((alert) => alert.title),
        anthropometrics: {
          tinggi: 0,
          berat: 0,
          imt: 0,
          hasil_imt: 'Tidak tersedia',
          lingkar_perut: 0,
        },
        penyakit_kronis: chronicHistoryLabels,
        alergi: state.allergies,
        status_kehamilan: toConsultPregnancyStatus(state.pregnancyStatus),
        ...(state.disabilityType ? { disability_type: state.disabilityType } : {}),
        ...(consultObesityConfirmation ? { obesity_confirmation: consultObesityConfirmation } : {}),
        clinical_context: {
          ...(extractedFacilityName ? { facility_name: extractedFacilityName } : {}),
          ...(clinicalSpecialConditions.length > 0
            ? { special_conditions: clinicalSpecialConditions }
            : {}),
          ...(extractedPregnancyRisk.trim()
            ? { pregnancy_risk: extractedPregnancyRisk.trim() }
            : {}),
        },
        ...(canonicalClinical ? { canonical_clinical: canonicalClinical } : {}),
        avpu: state.avpu,
        ...(visitHistory ? { visit_history: visitHistory } : {}),
        target_doctor_id: targetDoctorId,
        sent_at: new Date().toISOString(),
        app_version: browser.runtime.getManifest().version,
        assist_id: APP_ASSIST_ID,
        ...(miraDifferential ? { mira_differential: miraDifferential } : {}),
      };
    };

    const handleSendToDoctor = async () => {
      if (sendDoctorState === 'processing') return;

      setSendDoctorState('processing');
      setSendDoctorError(null);
      setDoctorPickerError('');
      setDoctorPickerNotice('');

      try {
        let targetDoctor = selectedDoctor ?? sortedDoctors[0] ?? null;

        if (!targetDoctor) {
          setIsLoadingDoctors(true);
          const doctors = await getOnlineDoctors();
          setOnlineDoctors(doctors);
          const rankedDoctors = rankDoctorsForCurrentContext(doctors);
          targetDoctor = rankedDoctors[0] ?? null;
          setSelectedDoctorId(targetDoctor?.id || '');
        }

        if (!targetDoctor) {
          throw new Error('Tidak ada dokter online untuk menerima consult.');
        }

        // The consult goes out even when the background has no MIRA result to give.
        const miraDifferential = getMiraDifferential
          ? await getMiraDifferential().catch(() => null)
          : null;
        await sendConsultToDoctor(buildDoctorConsultPayload(targetDoctor.id, miraDifferential));
        setDoctorPickerNotice(`Consult terkirim ke ${targetDoctor.name}.`);
        setSendDoctorState('completed');
        playSound('notif1.wav');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengirim consult ke dokter';
        setSendDoctorError(message);
        setDoctorPickerError(message);
        setSendDoctorState('idle');
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    const handleAnalyze = useCallback(async () => {
      setIsAnalyzing(true);

      await new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void (async () => {
            let activeDraft = anamnesaDraft;
            let extractionLatencyMs = 0;

            if (HYBRID_AUTOTEXT_ENABLED) {
              const extractionStart = Date.now();
              try {
                const extraction = await extractClinicalAnamnesis(state.symptomText.trim());
                extractionLatencyMs = Date.now() - extractionStart;
                setAnamnesisMissingFields(extraction.data_belum_lengkap);
                activeDraft = composeAnamnesaDraftFromExtraction(extraction, {
                  symptomText: state.symptomText,
                  patientGender,
                  chronicDiseases: chronicHistoryLabels,
                  allergies: state.allergies,
                  pregnancyStatus: state.pregnancyStatus,
                  specialConditions: clinicalSpecialConditions,
                  pregnancyRisk: extractedPregnancyRisk,
                  vitals: {
                    sbp: parseNumber(state.sbp),
                    dbp: parseNumber(state.dbp),
                    hr: parseNumber(state.hr),
                    rr: parseNumber(state.rr),
                    temp: parseNumber(state.temp),
                    spo2: parseNumber(state.spo2),
                    glucose: parseNumber(state.glucose),
                  },
                  disabilityType: state.disabilityType,
                  obesityConfirmation: state.obesityConfirmation,
                  autosenPresetLabel: presetLabels[state.autosenPreset],
                });
                ttvLog.debug('Hybrid extraction applied', {
                  source: 'backend',
                  missingCount: extraction.data_belum_lengkap.length,
                  latencyMs: extractionLatencyMs,
                });
              } catch (error) {
                setAnamnesisMissingFields([]);
                ttvLog.warn('Hybrid extraction fallback to local composer', {
                  source: 'fallback-local',
                  reason: error instanceof Error ? error.message : 'unknown',
                  latencyMs: Date.now() - extractionStart,
                });
              }
            }

            const draftedSymptomText = activeDraft.payload.keluhan_tambahan;
            const summary = buildSummary(
              state,
              triageVerdict.headlineAlert,
              effectiveHistoryFlags,
              {
                patientName,
                patientGender,
                patientAge,
                patientRM,
              }
            );
            const payload: TTVInferenceData = {
              patient: {
                name: patientName,
                gender: patientGender,
                age: patientAge,
                rm: patientRM,
                dob: patientDOB,
                bloodType: patientBloodType,
                bpjsStatus: patientBPJSStatus,
                kelurahan: patientKelurahan,
              },
              vitals: {
                sbp: parseNumber(state.sbp),
                dbp: parseNumber(state.dbp),
                hr: parseNumber(state.hr),
                rr: parseNumber(state.rr),
                temp: parseNumber(state.temp),
                spo2: parseNumber(state.spo2),
                glucose: parseNumber(state.glucose),
              },
              symptomText: draftedSymptomText,
              allergies: state.allergies,
              pregnancyStatus: state.pregnancyStatus,
              disabilityType: state.disabilityType,
              obesityConfirmation: state.obesityConfirmation,
              autosenPreset: state.autosenPreset,
              alerts,
              summary,
              anamnesaDraft: activeDraft,
              generatedAt: new Date().toISOString(),
            };

            setIsDraftTyping(true);
            setAnimatedDraftText(draftedSymptomText);
            applySymptomText('');

            onComplete?.(payload);
            setIsAnalyzing(false);
            resolve();
          })();
        }, 320);
      });
    }, [
      alerts,
      anamnesaDraft,
      chronicHistoryLabels,
      effectiveHistoryFlags,
      extractedPregnancyRisk,
      clinicalSpecialConditions,
      onComplete,
      patientAge,
      patientBloodType,
      patientBPJSStatus,
      patientDOB,
      patientGender,
      patientKelurahan,
      patientName,
      patientRM,
      state,
    ]);

    const handleDraftAnimationComplete = () => {
      if (!animatedDraftText) {
        setIsDraftTyping(false);
        return;
      }

      applySymptomText(animatedDraftText);
      setLastProcessedSymptomText(animatedDraftText);
      setAnimatedDraftText('');
      setIsDraftTyping(false);
    };

    const handleAnalyzeVitals = useCallback(async () => {
      setIsAnalyzingVitals(true);
      setIsCanonicalLoading(true);
      setCanonicalError('');
      setLocalCanonicalOutput(null);

      await new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void (async () => {
            const currentPreset = stateRef.current.autosenPreset;
            const generated = buildVitalAutofill(currentPreset || 'adl', patientAge, Date.now());

            const filteredVitals = filterVitalAutofillByFieldPriority(
              generated.vitals,
              fieldMetaRef.current
            );

            const nextState: TTVStateShape = {
              ...stateRef.current,
              ...filteredVitals,
              gcs: stateRef.current.gcs || '15',
            };

            // Mark filled fields as ASIST-autocomplete in fieldMeta
            const newMeta: Partial<Record<VitalFieldKey, FieldMeta>> = { ...fieldMetaRef.current };
            for (const field of VITAL_FIELD_KEYS) {
              if (field in filteredVitals && filteredVitals[field] !== undefined) {
                newMeta[field] = makeFieldMeta(filteredVitals[field]!, 'ASIST-autocomplete');
              }
            }
            setFieldMeta(newMeta);
            await runGhostFillAnimation(nextState);
            commitState(() => nextState);

            const settleGhostId = window.setTimeout(() => {
              setIsGhostFillAnimating(false);
              setGhostActiveLane(null);
              setGhostCompletedLanes([]);
              setGhostVisibleValues({});
            }, 96);
            ghostAnimationTimeoutsRef.current.push(settleGhostId);

            const symptomTextRaw = nextState.symptomText.trim();
            const fallbackChiefComplaint =
              symptomTextRaw ||
              `Pemeriksaan vital sign preset ${presetLabels[nextState.autosenPreset]}`;
            const requestTime = new Date().toISOString();
            const canonicalInput = buildCanonicalTriageInput({
              requestId: buildCanonicalRequestId(patientRM),
              requestTime,
              patientName,
              patientGender,
              patientAge,
              patientRM,
              patientDOB,
              patientBPJSStatus,
              patientKelurahan,
              patientFacilityName: extractedFacilityName || undefined,
              patientPayerLabel: extractedPayerLabel || undefined,
              vitals: {
                sbp: parseNumber(nextState.sbp),
                dbp: parseNumber(nextState.dbp),
                hr: parseNumber(nextState.hr),
                rr: parseNumber(nextState.rr),
                temp: parseNumber(nextState.temp),
                spo2: parseNumber(nextState.spo2),
                glucose: parseNumber(nextState.glucose),
                avpu: nextState.avpu,
                supplemental_o2: nextState.supplemental_o2,
                ...(nextState.pain_score !== ''
                  ? { pain_score: Math.min(10, Math.max(0, parseNumber(nextState.pain_score))) }
                  : {}),
              },
              symptomTextRaw,
              keluhanUtama: anamnesaDraft.payload.keluhan_utama || fallbackChiefComplaint,
              keluhanTambahan:
                anamnesaDraft.payload.keluhan_tambahan || symptomTextRaw || undefined,
              chronicHistorySummary,
              allergies: nextState.allergies,
              pregnancyStatus: nextState.pregnancyStatus,
              extractedPregnancyRisk,
              extractedSpecialConditions: clinicalSpecialConditions,
              disabilityType: nextState.disabilityType,
              obesityConfirmation: nextState.obesityConfirmation,
              autosenPreset: nextState.autosenPreset,
              hasCopd: Boolean(effectiveHistoryFlags['asma']),
            });

            try {
              const canonical = await evaluateCanonicalClinicalEngine(canonicalInput);
              setLocalCanonicalOutput(canonical);
            } catch (error) {
              setLocalCanonicalOutput(null);
              // Canonical engine is optional — any failure (auth, HTML response, network, server down)
              // falls back silently. Never show internal API errors to clinical users.
              const errName = error instanceof Error ? error.name : '';
              const errMsg = error instanceof Error ? error.message : '';
              const isAuthOrFormat =
                errName === 'AuthRequiredError' ||
                errName === 'BridgeResponseFormatError' ||
                errMsg.includes('halaman HTML') ||
                errMsg.includes('Belum login') ||
                errMsg.includes('Login diperlukan');
              if (!isAuthOrFormat) {
                // Log unexpected errors for diagnostics but still don't show in UI
                console.warn('[Canonical] fallback to local — unexpected error:', errMsg);
              }
              setCanonicalError('');
            } finally {
              setIsCanonicalLoading(false);
              setIsAnalyzingVitals(false);
              resolve();
            }
          })();
        }, 180);
      });
    }, [
      alerts,
      effectiveHistoryFlags,
      onComplete,
      patientAge,
      patientGender,
      patientName,
      patientRM,
      physiologyProfile.label,
      prefetchedVisits,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        setField: updateField,
        runAutocompleteSymptoms: () => handleAnalyze(),
        runAutocompleteVitals: () => handleAnalyzeVitals(),
        runSentraUplink: () => handleSentraUplink(),
      }),
      [handleAnalyze, handleAnalyzeVitals, handleSentraUplink]
    );

    return (
      <div
        className={`clinical-form-stack clinical-form-stack--v2 flex flex-col gap-3 ${
          bootSequenceActive ? 'clinical-form-stack--boot-sequence' : ''
        }`}
      >
        <div className="form-group">
          <div className="form-group-header form-group-header--cta">
            <div className="form-group-header__title-block">
              <div className="console-label console-label-prominent">Gejala / Keluhan</div>
              {showPediatricScreeningMode ? (
                <div className="screening-mode-indicator">Pediatric screening mode</div>
              ) : null}
            </div>
            <button
              type="button"
              className={`btn-ac-inline btn-ac-inline--sharp${
                hasSymptomDraftPending ? ' engine-btn--pulse' : ''
              }`}
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing || isCanonicalLoading}
              aria-label="AutoComplete+ Gejala"
            >
              {isAnalyzing ? '...' : 'AutoComplete+'}
            </button>
          </div>
          {isDraftTyping && animatedDraftText ? (
            <div
              className="neu-textarea neu-textarea--animated neu-textarea--symptom"
              aria-live="polite"
              aria-label="Draft anamnesa sedang dibangun"
            >
              <TextEffect
                key={animatedDraftText}
                per="char"
                preset="fade"
                trigger
                onAnimationComplete={handleDraftAnimationComplete}
                className="neu-textarea__animated-copy"
              >
                {animatedDraftText}
              </TextEffect>
            </div>
          ) : (
            <textarea
              value={state.symptomText}
              onChange={(event) => updateField('symptomText', event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && shadowSuggestion.trim()) {
                  event.preventDefault();
                  applyShadowSuggestion();
                }
              }}
              placeholder={symptomPlaceholder}
              className="neu-textarea neu-textarea--symptom"
              aria-label="Keluhan utama pasien"
            />
          )}
          {shadowSuggestion ? (
            <div className="field-context-note text-[10px] text-[var(--text-muted)]">
              Suggestion: {shadowSuggestion} (Tekan Tab untuk terapkan)
            </div>
          ) : null}
          {/* Development debug info removed per request */}
        </div>

        <div className="form-row-dual form-row-dual--symmetric">
          <div className="form-group form-group--inline">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Riwayat Alergi</div>
              {extractedAllergies.length > 0 ? (
                <span className="field-extracted-indicator">extracted</span>
              ) : null}
            </div>
            <div ref={allergyDropdownRef} className="history-dropdown">
              <button
                type="button"
                onClick={() => toggleExclusiveDropdown('allergy')}
                className={`collapsible-trigger neu-select font-mono text-[12px] ${
                  isAllergyOpen ? 'collapsible-trigger-open' : ''
                }`}
                aria-expanded={isAllergyOpen}
                aria-controls="riwayat-alergi-panel"
              >
                <span
                  className={`collapsible-trigger__summary field-summary-prominent ${
                    isAllergyPlaceholder ? 'field-summary-prominent--placeholder' : ''
                  }`}
                  title={allergyPlaceholder}
                >
                  {allergyDisplayText}
                </span>
                <ChevronDown
                  className={`collapsible-trigger__icon ${isAllergyOpen ? 'collapsible-trigger__icon-open' : ''}`}
                />
              </button>
              {isAllergyOpen ? (
                <div
                  id="riwayat-alergi-panel"
                  className="history-dropdown__panel option-grid option-grid--single"
                >
                  {allergyPresets.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`option-item option-item--single ${
                        state.allergies.includes(label) ? 'option-item--selected' : ''
                      }`}
                      onClick={() => selectAllergy(label)}
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {extractedAllergies.length > 0 ? (
              <div className="field-context-note">{extractedAllergies.join(', ')}</div>
            ) : null}
          </div>

          <div className="form-group form-group--inline">
            <div className="form-group-header form-group-header--wrap">
              <div className="console-label console-label-prominent">Status Kehamilan</div>
              {isFemalePatient && !extractedPregnancyRisk && state.pregnancyStatus === null ? (
                <span className="field-placeholder-hint">Mohon diisi</span>
              ) : isFemalePatient && extractedPregnancyRisk ? (
                <span className="field-extracted-indicator">risiko terdeteksi</span>
              ) : null}
            </div>
            {isFemalePatient ? (
              <select
                value={
                  state.pregnancyStatus === true
                    ? 'hamil'
                    : state.pregnancyStatus === false
                      ? 'tidak_hamil'
                      : 'pilih'
                }
                onChange={(event) => handlePregnancySelection(event.target.value)}
                className={`neu-select field-summary-prominent select-prominent ${
                  state.pregnancyStatus === null ? 'select-prominent--placeholder' : ''
                } ${isPregnancyStatusRequired ? 'pregnancy-select--required' : ''}`}
                aria-label="Pilih status kehamilan"
                aria-required
                aria-invalid={isPregnancyStatusRequired}
              >
                <option value="pilih">{pregnancyPlaceholder}</option>
                <option value="hamil">Hamil</option>
                <option value="tidak_hamil">Tidak Hamil</option>
              </select>
            ) : (
              <div
                className="neu-select field-summary-prominent select-prominent pregnancy-select--inactive pregnancy-select--static"
                aria-label="Tidak relevan"
              >
                Tidak relevan
              </div>
            )}
            {isFemalePatient && extractedPregnancyRisk ? (
              <div className="field-context-note">{extractedPregnancyRisk}</div>
            ) : null}
          </div>
        </div>

        <div className="form-row-dual form-row-dual--symmetric">
          <div className="form-group form-group--inline">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Disabilitas</div>
            </div>
            <div ref={disabilityDropdownRef} className="history-dropdown">
              <button
                type="button"
                onClick={() => toggleExclusiveDropdown('disability')}
                className={`collapsible-trigger neu-select font-mono text-[12px] ${
                  isDisabilityOpen ? 'collapsible-trigger-open' : ''
                }`}
                aria-expanded={isDisabilityOpen}
                aria-controls="disabilitas-panel"
              >
                <span
                  className={`collapsible-trigger__summary field-summary-prominent ${
                    isDisabilityPlaceholder ? 'field-summary-prominent--placeholder' : ''
                  }`}
                  title={disabilityPlaceholder}
                >
                  {disabilityDisplayText}
                </span>
                <ChevronDown
                  className={`collapsible-trigger__icon ${isDisabilityOpen ? 'collapsible-trigger__icon-open' : ''}`}
                />
              </button>
              {isDisabilityOpen ? (
                <div
                  id="disabilitas-panel"
                  className="history-dropdown__panel option-grid option-grid--single"
                >
                  {disabilityOptions.filter(Boolean).map((option, index) => (
                    <button
                      key={`${option}-${index}`}
                      type="button"
                      className={`option-item option-item--single ${state.disabilityType === option ? 'option-item--selected' : ''}`}
                      onClick={() => {
                        handleDisabilitySelection(option);
                      }}
                    >
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-group form-group--inline">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Obesitas</div>
            </div>
            <div ref={obesityDropdownRef} className="history-dropdown">
              <button
                type="button"
                onClick={() => toggleExclusiveDropdown('obesity')}
                className={`collapsible-trigger neu-select font-mono text-[12px] ${
                  isObesityOpen ? 'collapsible-trigger-open' : ''
                }`}
                aria-expanded={isObesityOpen}
                aria-controls="obesitas-panel"
              >
                <span
                  className={`collapsible-trigger__summary field-summary-prominent ${
                    isObesityPlaceholder ? 'field-summary-prominent--placeholder' : ''
                  }`}
                  title={obesityPlaceholder}
                >
                  {obesityDisplayText}
                </span>
                <ChevronDown
                  className={`collapsible-trigger__icon ${isObesityOpen ? 'collapsible-trigger__icon-open' : ''}`}
                />
              </button>
              {isObesityOpen ? (
                <div
                  id="obesitas-panel"
                  className="history-dropdown__panel option-grid option-grid--single"
                >
                  {[
                    { value: 'confirmed' as ObesityConfirmation, label: 'Obesitas' },
                    { value: 'morbid_obesity' as ObesityConfirmation, label: 'Obesitas Morbid' },
                    { value: 'not_confirmed' as ObesityConfirmation, label: 'Tidak Terkonfirmasi' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`option-item option-item--single ${state.obesityConfirmation === option.value ? 'option-item--selected' : ''}`}
                      onClick={() => {
                        updateField('obesityConfirmation', option.value);
                        setIsObesityOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {clinicalSpecialConditions.length > 0 ? (
          <div className="form-group">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Penyakit Khusus</div>
              <span className="field-extracted-indicator">extracted</span>
            </div>
            <div className="field-context-note">{clinicalSpecialConditions.join(', ')}</div>
          </div>
        ) : null}

        <div className="form-row-dual form-row-dual--assessment form-row-dual--symmetric">
          <div className="form-group form-group--inline">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">AutoSen Preset</div>
            </div>
            <div ref={presetDropdownRef} className="history-dropdown">
              <button
                type="button"
                onClick={() => toggleExclusiveDropdown('preset')}
                className={`collapsible-trigger neu-select font-mono text-[12px] ${
                  isPresetOpen ? 'collapsible-trigger-open' : ''
                }`}
                aria-expanded={isPresetOpen}
                aria-controls="autocomplete-preset-panel"
              >
                <span
                  className={`collapsible-trigger__summary field-summary-prominent ${
                    isPresetPlaceholder ? 'field-summary-prominent--placeholder' : ''
                  }`}
                  title={presetPlaceholder}
                >
                  {presetDisplayText}
                </span>
                <ChevronDown
                  className={`collapsible-trigger__icon ${isPresetOpen ? 'collapsible-trigger__icon-open' : ''}`}
                />
              </button>
              {isPresetOpen ? (
                <div
                  id="autocomplete-preset-panel"
                  className="history-dropdown__panel option-grid option-grid--single"
                >
                  {(Object.keys(presetLabels) as AutosenPreset[])
                    .filter((p) => p !== '')
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`option-item option-item--single ${state.autosenPreset === preset ? 'option-item--selected' : ''}`}
                        onClick={() => {
                          updateField('autosenPreset', preset);
                          setIsPresetOpen(false);
                        }}
                      >
                        <span>{presetLabels[preset]}</span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-group form-group--inline">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Skala Nyeri</div>
            </div>
            <div ref={painScoreDropdownRef} className="history-dropdown">
              <button
                type="button"
                onClick={() => {
                  if (!isPainScoreLocked) toggleExclusiveDropdown('pain');
                }}
                className={`collapsible-trigger neu-select font-mono text-[12px] ${
                  isPainScoreOpen ? 'collapsible-trigger-open' : ''
                } ${isPainScoreLocked ? 'collapsible-trigger--locked' : ''}`}
                aria-expanded={isPainScoreOpen}
                aria-controls="pain-score-panel"
                disabled={isPainScoreLocked}
              >
                <span
                  className={`collapsible-trigger__summary field-summary-prominent ${
                    isPainScorePlaceholder ? 'field-summary-prominent--placeholder' : ''
                  }`}
                  title={painScorePlaceholder}
                >
                  {painScoreDisplayText}
                </span>
                <ChevronDown
                  className={`collapsible-trigger__icon ${
                    isPainScoreOpen ? 'collapsible-trigger__icon-open' : ''
                  }`}
                />
              </button>
              {isPainScoreOpen && !isPainScoreLocked ? (
                <div
                  id="pain-score-panel"
                  className="history-dropdown__panel option-grid option-grid--pain-score"
                >
                  {PAIN_SCORE_OPTIONS.map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={`option-item option-item--single ${
                        state.pain_score === score ? 'option-item--selected' : ''
                      }`}
                      onClick={() => {
                        updateField('pain_score', score);
                        setIsPainScoreOpen(false);
                      }}
                    >
                      <span>{score}/10</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {VISIT_HISTORY_BODY_ENABLED && visitHistorySections.length > 0 ? (
          <div className="form-group">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">
                Riwayat Kunjungan Sebelumnya
              </div>
              <span className="field-extracted-indicator">RME</span>
            </div>
            <div className="visit-history-list" aria-label="Ringkasan riwayat kunjungan">
              {visitHistorySections.map((section) => (
                <section key={section.key} className="visit-history-card">
                  <div className="visit-history-card__title">{section.title}</div>
                  <div className="doctor-picker-footer__rows">
                    {section.rows.map((item) => (
                      <div
                        key={`${section.key}-${item.label}`}
                        className="doctor-picker-footer__row"
                      >
                        <span className="doctor-picker-footer__label">{item.label}</span>
                        <span className="doctor-picker-footer__value" title={item.value}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        <div className="form-group">
          <div className="form-group-header form-group-header--cta">
            <div className="form-group-header__title-block">
              <div className="console-label console-label-prominent console-label-vitals">
                Vital Signs - Cardiopulmonary
              </div>
            </div>
            <button
              type="button"
              className="btn-ac-inline btn-ac-inline--sharp"
              onClick={() => void handleAnalyzeVitals()}
              disabled={isAnalyzingVitals || isCanonicalLoading}
              aria-label="AutoComplete+ Vital Signs"
            >
              {isAnalyzingVitals ? '...' : 'AutoComplete+'}
            </button>
          </div>
          <div
            className={`vitals-grid vitals-grid--redesign vitals-grid--spaced-columns ${
              isGhostFillAnimating ? 'vitals-grid--ghosting' : ''
            }`}
          >
            {/* Row 1 — GCS / TD combined (2-col, teal highlight) */}
            <div className="vitals-row vitals-row--2col vitals-row--tensi">
              <div className={getVitalGhostItemClassName('bp')}>
                <span className="vital-label-inline">GCS</span>
                <input
                  type="text"
                  className="vital-input vital-input--centered"
                  placeholder={displayedGcsPlaceholder}
                  value={displayedGcsValue()}
                  onChange={(event) => handleGcsChange(event.target.value)}
                  onBlur={handleGcsBlur}
                  aria-label="GCS"
                  disabled={isGhostFillAnimating}
                />
              </div>
              <div className={getVitalGhostItemClassName('bp')}>
                <span className="vital-label-inline">T/D :</span>
                <input
                  type="text"
                  className={getVitalInputClassName('sbp')}
                  placeholder={displayedBloodPressurePlaceholder}
                  value={displayedBloodPressureValue()}
                  onFocus={() =>
                    setBloodPressureDraft(formatBloodPressureValue(state.sbp, state.dbp))
                  }
                  onChange={(event) => handleBloodPressureChange(event.target.value)}
                  onBlur={handleBloodPressureBlur}
                  aria-label="T/D"
                  aria-invalid={isVitalInputInvalid('sbp') || isVitalInputInvalid('dbp')}
                  data-vital-severity={vitalGuardrails.fieldStatus.sbp.severity}
                  disabled={isGhostFillAnimating}
                />
              </div>
            </div>

            {/* Row 2 — Nadi / Suhu / Gula (3-col) */}
            <div className="vitals-row vitals-row--3col">
              {[
                { key: 'hr' as const, label: 'Nadi', lane: 'hr' as const },
                { key: 'temp' as const, label: 'Suhu', lane: 'temp' as const },
                { key: 'glucose' as const, label: 'Gula', lane: 'glucose' as const },
              ].map((item) => (
                <div key={item.key} className={getVitalGhostItemClassName(item.lane)}>
                  <span className="vital-label-inline">{item.label}</span>
                  <input
                    type="text"
                    className={getVitalInputClassName(item.key)}
                    placeholder={displayedVitalPlaceholder(item.key)}
                    value={displayedVitalValue(item.key)}
                    onChange={(event) => updateField(item.key, event.target.value)}
                    onBlur={() => handleVitalBlur(item.key)}
                    aria-label={item.label}
                    aria-invalid={isVitalInputInvalid(item.key)}
                    aria-required={item.key === 'glucose' && isGlucoseRequired ? true : undefined}
                    data-vital-severity={vitalGuardrails.fieldStatus[item.key].severity}
                    disabled={isGhostFillAnimating}
                  />
                </div>
              ))}
            </div>

            {/* Row 3 — Pernafasan / Saturasi O2 (2-col) */}
            <div className="vitals-row vitals-row--2col">
              {[
                { key: 'rr' as const, label: 'Pernafasan', lane: 'rr' as const },
                { key: 'spo2' as const, label: 'Saturasi O₂', lane: 'spo2' as const },
              ].map((item) => (
                <div key={item.key} className={getVitalGhostItemClassName(item.lane)}>
                  <span className="vital-label-inline">{item.label}</span>
                  <input
                    type="text"
                    className={getVitalInputClassName(item.key)}
                    placeholder={displayedVitalPlaceholder(item.key)}
                    value={displayedVitalValue(item.key)}
                    onChange={(event) => updateField(item.key, event.target.value)}
                    onBlur={() => handleVitalBlur(item.key)}
                    aria-label={item.label}
                    aria-invalid={isVitalInputInvalid(item.key)}
                    data-vital-severity={vitalGuardrails.fieldStatus[item.key].severity}
                    disabled={isGhostFillAnimating}
                  />
                </div>
              ))}
            </div>
          </div>
          {primaryVitalGuardrailMessage ? (
            <div className="vital-guardrail-feedback" role="alert">
              {primaryVitalGuardrailMessage}
            </div>
          ) : null}
        </div>

        {alerts.length > 0 ? (
          <div className="alert-timeline-preview">
            <div className="alert-timeline-preview__header">
              <span className="alert-timeline-preview__label alert-timeline-preview__label--pulse">
                TEMUAN KLINIS
              </span>
              <span className="alert-timeline-preview__count">{alerts.length}</span>
            </div>
            <div className="alert-timeline-preview__track">
              {alerts.slice(0, 3).map((alert, i) => (
                <div
                  key={alert.id}
                  className="alert-timeline-entry"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="alert-timeline-entry__spine">
                    <div className="alert-timeline-entry__dot" />
                    {i < Math.min(alerts.length, 3) - 1 && (
                      <div className="alert-timeline-entry__line" />
                    )}
                  </div>
                  <div className="alert-timeline-entry__body">
                    <div className="alert-timeline-entry__gate">
                      {alert.gate.replace('GATE_', 'G').replace(/_/g, '·')}
                    </div>
                    <div className="alert-timeline-entry__title">{alert.title}</div>
                    <div className="alert-timeline-entry__reasoning">{alert.reasoning}</div>
                    <div
                      className="alert-timeline-entry__access"
                      role="button"
                      tabIndex={0}
                      onClick={() => onAccessEmergency?.()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onAccessEmergency?.();
                      }}
                    >
                      Akses Darurat ↑
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {DOCTOR_CONSULT_UI_ENABLED ? (
          <div className="form-group">
            <div className="form-group-header">
              <div className="console-label console-label-prominent">Dokter Online</div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void loadOnlineDoctorOptions()}
                title="Refresh dokter online"
                aria-label="Refresh dokter online"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDoctors ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="doctor-picker-panel">
              <div className="doctor-picker-panel__subtitle">
                Pilih dokter online terlebih dahulu, lalu klik Forward to Doctor.
              </div>

              <div className="doctor-picker-summary">
                <div className="doctor-picker-summary__title">Consult Snapshot</div>
                <div className="doctor-picker-summary__rows">
                  {consultSummaryRows.map((item) => (
                    <div key={item.label} className="doctor-picker-summary__row">
                      <span className="doctor-picker-summary__label">{item.label}</span>
                      <span className="doctor-picker-summary__value" title={item.value}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="doctor-picker-panel__list">
                {sortedDoctors.map((doctor) => {
                  const isSelected = doctor.id === selectedDoctorId;

                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      className={`doctor-option ${isSelected ? 'doctor-option--active' : ''}`}
                      onClick={() => setSelectedDoctorId(doctor.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="doctor-option__name">{doctor.name}</span>
                    </button>
                  );
                })}

                {!isLoadingDoctors && sortedDoctors.length === 0 ? (
                  <div className="doctor-picker-panel__empty">
                    Data dokter online belum tersedia.
                  </div>
                ) : null}
              </div>

              {doctorPickerError ? (
                <div className="doctor-picker-panel__feedback doctor-picker-panel__feedback--error">
                  {doctorPickerError}
                </div>
              ) : null}

              {bridgeSyncStatus === 'ok' ? (
                <div className="doctor-picker-panel__feedback doctor-picker-panel__feedback--success">
                  Data pasien berhasil dikirim ke Dashboard.
                </div>
              ) : null}

              {bridgeSyncStatus === 'fail' ? (
                <div className="doctor-picker-panel__feedback doctor-picker-panel__feedback--error">
                  Gagal kirim data ke Dashboard: {bridgeSyncError}
                </div>
              ) : null}

              {consultFooterRows.length > 0 ? (
                <div className="doctor-picker-footer">
                  <button
                    type="button"
                    className={`doctor-picker-footer__toggle ${
                      isConsultFooterOpen ? 'doctor-picker-footer__toggle--open' : ''
                    }`}
                    onClick={() => setIsConsultFooterOpen((prev) => !prev)}
                    aria-expanded={isConsultFooterOpen}
                    aria-controls="doctor-consult-footer-panel"
                  >
                    <span className="doctor-picker-footer__title">
                      Footer Consult{selectedDoctor ? ` • ${selectedDoctor.name}` : ''}
                    </span>
                    <ChevronDown
                      className={`doctor-picker-footer__icon ${
                        isConsultFooterOpen ? 'doctor-picker-footer__icon--open' : ''
                      }`}
                    />
                  </button>
                  {isConsultFooterOpen ? (
                    <div id="doctor-consult-footer-panel" className="doctor-picker-footer__rows">
                      {consultFooterRows.map((item) => (
                        <div key={item.label} className="doctor-picker-footer__row">
                          <span className="doctor-picker-footer__label">{item.label}</span>
                          <span className="doctor-picker-footer__value" title={item.value}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="action-bar action-bar--split action-bar--tri-tabs">
          <button
            type="button"
            className={[
              'engine-btn',
              'engine-tab',
              'active',
              'btn-sentra-uplink',
              uplinkState === 'processing' ? 'sentra-uplink--processing' : '',
              uplinkState === 'completed' ? 'sentra-uplink--completed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => void handleSentraUplink()}
            disabled={
              !onSentraUplink || uplinkState === 'processing' || vitalGuardrails.hasHardStop
            }
            aria-label="Uplink"
            aria-pressed={uplinkState === 'completed'}
            data-sound="button5.mp3"
          >
            <span
              className={`sentra-uplink__label ${
                uplinkState === 'processing' ? 'sentra-uplink__label--scrambling' : ''
              }`}
            >
              {uplinkState === 'processing'
                ? uplinkScrambleText
                : uplinkState === 'completed'
                  ? 'UPLINKED'
                  : 'Uplink'}
            </span>
          </button>
          <button
            type="button"
            className={[
              'engine-btn',
              'engine-tab',
              'active',
              'btn-sentra-uplink',
              'btn-sentra-uplink--doctor',
              sendDoctorState === 'processing' ? 'sentra-uplink--processing' : '',
              sendDoctorState === 'completed' ? 'sentra-uplink--completed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => void handleSendToDoctor()}
            disabled={sendDoctorState === 'processing' || vitalGuardrails.hasHardStop}
            aria-label="Doctor"
            aria-pressed={sendDoctorState === 'completed'}
            data-sound="button5.mp3"
          >
            Doctor
          </button>
          <button
            type="button"
            className={[
              'engine-btn',
              'engine-tab',
              'active',
              'btn-sentra-uplink',
              'btn-sentra-uplink--trajectory',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onNavigateToTrajectory}
            disabled={!onNavigateToTrajectory}
            aria-label="Trajectory"
            data-sound="button5.mp3"
          >
            Trajectory
          </button>
        </div>
        {uplinkError ? (
          <p className="action-bar__hint action-bar__hint--error">{uplinkError}</p>
        ) : null}
        {sendDoctorError ? (
          <p className="action-bar__hint action-bar__hint--error">{sendDoctorError}</p>
        ) : null}

        {doctorPickerNotice ? (
          <div className="doctor-picker-panel__feedback doctor-picker-panel__feedback--success">
            {doctorPickerNotice}
          </div>
        ) : null}

        {canonicalError && canonicalError.length > 0 ? (
          <div className="doctor-picker-panel__feedback doctor-picker-panel__feedback--error">
            Canonical vital sign fallback ke hasil lokal: {canonicalError}
          </div>
        ) : null}
      </div>
    );
  }
);

export { TTVInferenceUI as default };
