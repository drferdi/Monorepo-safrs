// Designed and constructed by Drferdi.
import React, { useEffect, useMemo, useState } from 'react';

import {
  resolveDifferentialListErrorMessage,
} from './differential-fetch-error';
import type { ClinicalImpressionViewItem } from './ClinicalImpressionPanel';
import { createDiagnosisPageViewModel } from './diagnosis/diagnosisViewModel';
import type { DiagnosisNextBestActionView, DiagnosisTriageView } from './diagnosis/diagnosisPageProps';
import { DiagnosisStepFlow } from './diagnosis/DiagnosisStepFlow';
import { useRecurrentDiagnoses } from './diagnosis/useRecurrentDiagnoses';

import {
  type CanonicalClinicalEngineOutput,
} from '@/lib/api/bridge-client';
import {
  normalizeRecurrentIcd,
  type RecurrentDiagnosisCandidate,
} from '@/lib/clinical/recurrent-diagnosis';
import {
  MIRA_PREFETCH_READY_KEY,
  PREFETCH_FALLBACK_MS,
} from '@/lib/diagnosis-engine/prefetch-store';
import { buildDiagnosisRequestContext } from '@/lib/diagnosis-engine/request-context';
import { auditLogger } from '@/lib/iskandar-diagnosis-engine/audit-logger';
import { classifyChronicDisease } from '@/lib/iskandar-diagnosis-engine/chronic-disease-classifier';
import {
  runDiagnosisAlgorithm,
  type RankedDiagnosis,
} from '@/lib/iskandar-diagnosis-engine/diagnosis-algorithm';
import {
  deriveAgainstSignals,
  type DifferentialVitals,
} from '@/lib/iskandar-diagnosis-engine/differential-diagnosis';
import {
  getPenyakitByIcd,
  searchPenyakitByName,
} from '@/lib/iskandar-diagnosis-engine/symptom-matcher';
import type { TrajectoryAnalysis } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import {
  evaluateTriageReferralTree,
  type TriageDecisionResult,
} from '@/lib/iskandar-diagnosis-engine/triage-referral-decision-tree';
import { buildRMETransferPayload } from '@/lib/rme/payload-mapper';
import type {
  CDSSAlert,
  DiagnosisSuggestion,
  MedicationRecommendation,
  PharmacotherapyExplainability,
} from '@/types/api';
import { sendMessage } from '@/utils/messaging';
import type {
  RMETransferProgressEvent,
  RMETransferReasonCode,
  RMETransferResult,
  RMETransferStepStatus,
} from '@/utils/types';

interface ClinicalDifferentialProps {
  keluhanUtama: string;
  keluhanTambahan?: string;
  patientAge: number;
  patientGender: 'L' | 'P';
  patientRM: string;
  allergies?: string[];
  confirmedPregnancyStatus?: boolean | null;
  vitals: DifferentialVitals;
  trajectory?: TrajectoryAnalysis;
  canonicalOutput?: CanonicalClinicalEngineOutput | null;
  hasVisitHistory?: boolean;
  chronicTherapies?: string[];
  onBack: () => void;
  onDiagnosisChange?: (diagnosis: { icd_x: string; nama: string } | null) => void;
  onMedicationsChange?: (medications: MedicationRecommendation[]) => void;
}

type LoadState = 'loading' | 'error' | 'ready';
type TherapyState = 'idle' | 'loading' | 'ready' | 'error';
type TransferUiState = 'idle' | 'running' | 'partial' | 'success' | 'failed';
const MAX_DIAGNOSIS_SELECTION = 2;
const EMPTY_CHRONIC_THERAPIES: string[] = [];

/** The case key in the background's `{ key, at }` prefetch-ready record, if any. */
function readyPrefetchKey(value: unknown): string | undefined {
  return value && typeof value === 'object' && 'key' in value && typeof value.key === 'string'
    ? value.key
    : undefined;
}

/** When the ready record was written (ms), or NaN when it has no readable `at`. */
function readyPrefetchTime(value: unknown): number {
  return value && typeof value === 'object' && 'at' in value && typeof value.at === 'string'
    ? Date.parse(value.at)
    : Number.NaN;
}

// Permukaan diagnosis legacy (pre-workspace) disimpan sebagai basis re-skin;
// jangan dihidupkan tanpa keputusan Chief.
const MANUAL_ATURAN_PAKAI_OPTIONS: MedicationRecommendation['aturan_pakai'][] = [
  'Sebelum makan',
  'Sesudah makan',
  'Pemakaian luar',
  'Jika diperlukan',
  'Saat makan',
];

interface ManualMedicationDraft {
  nama_obat: string;
  dosis: string;
  aturan_pakai: MedicationRecommendation['aturan_pakai'];
  durasi: string;
  rationale: string;
}

interface SelectedDiagnosis {
  icd_x: string;
  nama: string;
  source: 'suggested' | 'manual';
  rank?: number;
}

type TransferEligibleDiagnosisInput = {
  icd_x: string;
  nama: string;
  jenis: 'PRIMER' | 'SEKUNDER';
};

interface DiagnosisTherapyResult {
  diagnosis: SelectedDiagnosis;
  medications: MedicationRecommendation[];
  alerts: CDSSAlert[];
  guidelines: string[];
  explainability?: PharmacotherapyExplainability;
  error?: string;
}

type ChromeRuntimeApi = {
  onMessage?: {
    addListener: (
      listener: (message: unknown, sender: unknown, sendResponse: unknown) => void
    ) => void;
    removeListener: (
      listener: (message: unknown, sender: unknown, sendResponse: unknown) => void
    ) => void;
  };
};

type ChromeGlobalApi = {
  runtime?: ChromeRuntimeApi;
};

function getChromeGlobal(): ChromeGlobalApi | undefined {
  return (globalThis as { chrome?: ChromeGlobalApi }).chrome;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

const ICD_PATTERN = /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/;
const ICD_EMERGENCY_HEAD_MAP: Record<string, string> = {
  '0': 'O',
  '1': 'I',
  '5': 'S',
  '8': 'B',
};

/**
 * normalizeIcdCode
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function normalizeIcdCode(value: string | undefined): string {
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

/**
 * isReadableDiagnosisName
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function isReadableDiagnosisName(value: string | undefined): boolean {
  const cleaned = (value || '').trim();
  if (!cleaned) return false;
  if (cleaned.length < 3) return false;
  if (/^\d+$/.test(cleaned)) return false;
  if (!/[A-Za-z]/.test(cleaned)) return false;
  return true;
}

function isCodeLikeDiagnosisName(value: string | undefined): boolean {
  const cleaned = (value || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  if (/^DIAGNOSIS\s+[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/.test(cleaned)) return true;
  return /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?$/.test(cleaned);
}

/**
 * isLikelyIcdCode
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function isLikelyIcdCode(value: string | undefined): boolean {
  const normalized = normalizeIcdCode(value);
  return ICD_PATTERN.test(normalized);
}

function resolveDiagnosisDisplayName(icd_x: string, nama: string | undefined): string {
  const normalizedIcd = normalizeIcdCode(icd_x);
  const cleaned = (nama || '').replace(/\s+/g, ' ').trim();
  if (isReadableDiagnosisName(cleaned) && !isCodeLikeDiagnosisName(cleaned)) {
    return cleaned;
  }
  const classification = classifyChronicDisease(normalizedIcd);
  if (classification) return classification.fullName;
  if (normalizedIcd) return `Diagnosis ${normalizedIcd}`;
  return 'Diagnosis belum terklasifikasi';
}

type PregnancyStatus = boolean;

function pregnancyStatusLabel(status: PregnancyStatus): string {
  if (status === true) return 'Confirmed: Pregnant';
  return 'Confirmed: Not Pregnant';
}

/**
 * buildConfirmedChronicSuggestion
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildConfirmedChronicSuggestion(diagnosis: {
  icd_x: string;
  nama: string;
}): DiagnosisSuggestion {
  return {
    rank: 0,
    icd_x: diagnosis.icd_x,
    nama: diagnosis.nama,
    confidence: 0.98,
    rationale:
      'Diagnosis kronis terkonfirmasi dari riwayat kunjungan pasien. Prioritaskan sebagai differential utama.',
    red_flags: [],
    recommended_actions: [
      'Verifikasi status diagnosis kronis terkonfirmasi pada kunjungan berjalan',
    ],
  };
}

/**
 * buildUiFallbackDiagnoses
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildUiFallbackDiagnoses(
  _keluhanUtama: string,
  _vitals: DifferentialVitals
): DiagnosisSuggestion[] {
  return [
    {
      rank: 1,
      icd_x: 'R69',
      nama: 'Data belum cukup untuk diagnosis spesifik',
      confidence: 0.12,
      rationale:
        'Diagnosis canonical/CDSS tidak tersedia atau bukti klinis belum cukup untuk menetapkan diagnosis spesifik.',
      red_flags: [],
      recommended_actions: ['Lengkapi anamnesis terarah dan pemeriksaan fisik.'],
    },
  ];
}

/** A diagnosis from the patient's visit record, offered before the engine's list. */
export function buildRecurrentSuggestion(candidate: RecurrentDiagnosisCandidate): DiagnosisSuggestion {
  return {
    rank: 0,
    icd_x: candidate.icd,
    nama: candidate.name,
    confidence: candidate.label === 'Kronis' ? 0.9 : 0.6,
    rationale: `Tercatat ${candidate.count} kali dalam 12 bulan terakhir.`,
    engine_tag: candidate.label,
    red_flags: [],
    recommended_actions: [],
  };
}

/** The engine's list; when it is empty, the UI fallback only if the record offers no history. */
export function resolveBaseSuggestions(
  suggestions: DiagnosisSuggestion[],
  hasRecurrent: boolean,
  fallback: () => DiagnosisSuggestion[]
): DiagnosisSuggestion[] {
  if (suggestions.length > 0) return suggestions;
  return hasRecurrent ? [] : fallback();
}

/** History and engine codes agree when their 3-character roots do (record E11.9, engine E11). */
function icdRoot(code: string): string {
  return normalizeRecurrentIcd(code).slice(0, 3);
}

export function buildTransferEligibleDiagnosisInput(
  diagnosis:
    | {
        icd_x: string;
        nama: string;
      }
    | null
    | undefined,
  jenis: 'PRIMER' | 'SEKUNDER'
): TransferEligibleDiagnosisInput | undefined {
  const normalizedCode = normalizeIcdCode(diagnosis?.icd_x);
  if (!normalizedCode || normalizedCode.toUpperCase() === 'R69') {
    return undefined;
  }

  return {
    icd_x: normalizedCode,
    nama: diagnosis?.nama?.trim() || normalizedCode,
    jenis,
  };
}

function riskTierUi(riskTier: PharmacotherapyExplainability['risk_tier']): {
  label: string;
  badgeClass: string;
} {
  if (riskTier === 'emergency') {
    return { label: 'EMERGENCY', badgeClass: 'border-red-600/35 text-red-400 bg-red-600/10' };
  }
  if (riskTier === 'urgent') {
    return { label: 'URGENT', badgeClass: 'border-amber-600/35 text-amber-400 bg-amber-600/10' };
  }
  return {
    label: 'ROUTINE',
    badgeClass: 'border-emerald-600/35 text-emerald-400 bg-emerald-600/10',
  };
}

function pathwayUi(pathway: PharmacotherapyExplainability['pathway']): string {
  if (pathway === 'knowledge+syndrome-intent') return 'Knowledge + Syndrome-Intent';
  if (pathway === 'knowledge-only') return 'Knowledge Only';
  if (pathway === 'syndrome-intent-only') return 'Syndrome-Intent Only';
  return 'Legacy Fallback';
}

function canonicalSeverityWeight(
  severity?: CanonicalClinicalEngineOutput['alerts'][number]['severity']
): number {
  if (severity === 'emergency') return 45;
  if (severity === 'urgent') return 30;
  if (severity === 'warning') return 15;
  return 0;
}

const TRANSFER_STEP_ORDER: RMETransferStepStatus[] = ['anamnesa', 'diagnosa', 'resep'];

const REASON_CODE_LABELS: Record<RMETransferReasonCode, string> = {
  DUPLICATE_SUPPRESSED: 'Transfer duplikat diblok dalam window idempotency.',
  USER_CANCELLED: 'Transfer dibatalkan oleh pengguna.',
  NO_ACTIVE_TAB: 'Tab ePuskesmas tidak ditemukan.',
  PAGE_NOT_READY: 'Halaman belum siap, coba reload halaman ePuskesmas.',
  STEP_TIMEOUT: 'Waktu eksekusi step habis.',
  FIELD_NOT_FOUND: 'Field target RME tidak ditemukan.',
  NO_FIELDS_FILLED: 'Tidak ada field yang berhasil diisi.',
  RETRY_EXHAUSTED: 'Retry habis sebelum step berhasil.',
  DIAGNOSA_PAYLOAD_EMPTY: 'Payload diagnosa kosong.',
  RESEP_PAYLOAD_EMPTY: 'Payload resep kosong.',
  RESEP_EMPTY_AFTER_SAFETY: 'Semua pilihan resep perlu ditinjau ulang karena keamanan.',
  RESEP_TRIAD_INCOMPLETE: 'Komponen triad regimen belum lengkap.',
  PREGNANCY_UNKNOWN_DEFAULT_FALSE: 'Status kehamilan tidak diketahui, default ke tidak hamil.',
  UNKNOWN_STEP_FAILURE: 'Step gagal tanpa klasifikasi spesifik.',
};

function filterReasonCodesForStep(
  reasonCodes: RMETransferReasonCode[],
  step: RMETransferStepStatus
): RMETransferReasonCode[] {
  return reasonCodes.filter((code) => {
    if (step !== 'diagnosa' && code === 'DIAGNOSA_PAYLOAD_EMPTY') return false;
    if (
      step !== 'resep' &&
      (code === 'RESEP_PAYLOAD_EMPTY' ||
        code === 'RESEP_EMPTY_AFTER_SAFETY' ||
        code === 'RESEP_TRIAD_INCOMPLETE')
    ) {
      return false;
    }
    return true;
  });
}

function mapTransferStateToUi(state: RMETransferResult['state']): TransferUiState {
  if (state === 'success') return 'success';
  if (state === 'partial') return 'partial';
  return 'failed';
}

function stepLabel(step: RMETransferStepStatus): string {
  if (step === 'anamnesa') return 'Anamnesa';
  if (step === 'diagnosa') return 'Diagnosa';
  return 'Resep';
}

function makeInitialTransferSteps(): RMETransferResult['steps'] {
  return {
    anamnesa: {
      step: 'anamnesa',
      state: 'pending',
      attempt: 0,
      latencyMs: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    },
    diagnosa: {
      step: 'diagnosa',
      state: 'pending',
      attempt: 0,
      latencyMs: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    },
    resep: {
      step: 'resep',
      state: 'pending',
      attempt: 0,
      latencyMs: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
    },
  };
}

function medicationSelectionKey(med: MedicationRecommendation): string {
  const namaObat = med.nama_obat.toLowerCase().trim();
  const dosis = med.dosis.toLowerCase().trim();
  const aturanPakai = med.aturan_pakai.toLowerCase().trim();
  const durasi = (med.durasi || '').toLowerCase().trim();
  return `${namaObat}|${dosis}|${aturanPakai}|${durasi}`;
}

function cleanClinicalPhrase(value: string | undefined): string {
  return humanize(value || '')
    .replace(/\.$/, '')
    .trim();
}

function uniqueClinicalPhrases(values: Array<string | undefined>, max = 3): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const cleaned = cleanClinicalPhrase(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(cleaned);
    if (items.length >= max) break;
  }

  return items;
}

function isGenericDiagnosisUiPhrase(value: string | undefined): boolean {
  const cleaned = cleanClinicalPhrase(value);
  if (!cleaned) return true;
  if (cleaned.length > 96) return true;

  return (
    /^(gejala khas belum menonjol|dukungan tanda vital belum dominan|correlate with examination)$/i.test(
      cleaned
    ) ||
    /^(pemeriksaan penunjang wajib segera|evaluasi lebih lanjut terhadap|pertimbangkan konsultasi dengan spesialis|kriteria rujukan)/i.test(
      cleaned
    )
  );
}

function uniqueConcreteClinicalPhrases(values: Array<string | undefined>, max = 3): string[] {
  return uniqueClinicalPhrases(
    values.filter((value) => !isGenericDiagnosisUiPhrase(value)),
    max
  );
}

function confidenceBandPresentation(item: RankedDiagnosis): {
  label: ClinicalImpressionViewItem['confidenceLabel'];
  tone: ClinicalImpressionViewItem['confidenceTone'];
} {
  const hasSparseEvidence =
    item.insight.matchedSymptoms.length === 0 && item.insight.vitalDrivers.length === 0;

  if (hasSparseEvidence && item.adjustedConfidence < 0.45) {
    return { label: 'Insufficient data', tone: 'insufficient' };
  }
  if (item.adjustedConfidence >= 0.7 || item.confidenceBand === 'very_high') {
    return { label: 'High', tone: 'high' };
  }
  if (item.adjustedConfidence >= 0.45 || item.confidenceBand === 'high') {
    return { label: 'Moderate', tone: 'moderate' };
  }
  return { label: 'Low', tone: 'low' };
}

function buildAgainstSignals(
  item: RankedDiagnosis,
  keluhanUtama: string,
  keluhanTambahan: string | undefined,
  vitals: DifferentialVitals
): string[] {
  return deriveAgainstSignals({
    suggestion: item.suggestion,
    matchedSymptoms: item.insight.matchedSymptoms,
    keluhanUtama,
    keluhanTambahan,
    vitals,
    max: 4,
  });
}

function buildMissingSignals(item: RankedDiagnosis): string[] {
  const tests = item.insight.supportingExamPlan.tests.slice(0, 2);
  const signals = [...tests];

  if (item.insight.matchedSymptoms.length < 2) {
    signals.push('Anamnesis terarah tambahan');
  }
  if (item.insight.vitalDrivers.length === 0) {
    signals.push('Tanda vital serial / temuan objektif');
  }

  return uniqueClinicalPhrases(signals, 3);
}

function buildReviewSignals(item: RankedDiagnosis): string[] {
  return uniqueConcreteClinicalPhrases(
    [
      ...(item.suggestion.recommended_actions || []).slice(0, 2),
      item.insight.supportingExamPlan.summary,
      'Correlate with examination',
    ],
    4
  );
}

function buildDoNotMissReason(item: RankedDiagnosis): string | null {
  const redFlag = uniqueClinicalPhrases(item.suggestion.red_flags || [], 1)[0];
  if (redFlag && !/^riwayat penyakit kronis/i.test(redFlag)) {
    return redFlag;
  }
  return null;
}

export const ClinicalDifferential: React.FC<ClinicalDifferentialProps> = ({
  keluhanUtama,
  keluhanTambahan,
  patientAge,
  patientGender,
  patientRM,
  allergies = [],
  confirmedPregnancyStatus,
  vitals,
  trajectory,
  canonicalOutput,
  hasVisitHistory,
  chronicTherapies = EMPTY_CHRONIC_THERAPIES,
  onBack,
  onDiagnosisChange,
  onMedicationsChange,
}) => {
  const [phase, setPhase] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestions, setSuggestions] = useState<DiagnosisSuggestion[]>([]);
  // The last getSuggestions request failed (no reply, or an unsuccessful one), as opposed to an
  // engine that answered with no diagnosis; both leave the list empty.
  const [suggestionsFailed, setSuggestionsFailed] = useState(false);
  // MIRA's first next best action for this request; the legacy engine sends none.
  const [nextBestAction, setNextBestAction] = useState<DiagnosisNextBestActionView | null>(null);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<SelectedDiagnosis[]>([]);
  const [triageResult, setTriageResult] = useState<TriageDecisionResult | null>(null);
  const [manualIcd, setManualIcd] = useState('');
  const [manualName, setManualName] = useState('');
  const [showManualDiagnosisInput, setShowManualDiagnosisInput] = useState(false);
  const [, setIsPrimaryDiagnosisConfirmed] = useState(false);
  const [showWriteDx, setShowWriteDx] = useState(false);
  const [manualDiagnosisQuery, setManualDiagnosisQuery] = useState('');
  const [, setManualDiagnosisSuggestions] = useState<Array<{ icd_x: string; nama: string }>>([]);
  const [, setDoctorSelectedDiagnosis] = useState<{ icd_x: string; nama: string } | null>(null);
  const [therapyState, setTherapyState] = useState<TherapyState>('idle');
  const [, setTherapyError] = useState('');
  const [therapyByDiagnosis, setTherapyByDiagnosis] = useState<DiagnosisTherapyResult[]>([]);
  const [showManualMedicationInput, setShowManualMedicationInput] = useState(true);
  const [manualMedications, setManualMedications] = useState<MedicationRecommendation[]>([]);
  const [manualMedicationDraft, setManualMedicationDraft] = useState<ManualMedicationDraft>({
    nama_obat: '',
    dosis: '',
    aturan_pakai: 'Sesudah makan',
    durasi: '',
    rationale: 'Input manual operator',
  });
  const [selectedMedicationKeys, setSelectedMedicationKeys] = useState<string[]>([]);
  const [, setProcessingTimeMs] = useState<number | null>(null);
  const [transferUiState, setTransferUiState] = useState<TransferUiState>('idle');
  const [transferRunId, setTransferRunId] = useState<string | null>(null);
  const [transferReasonCodes, setTransferReasonCodes] = useState<RMETransferReasonCode[]>([]);
  const [transferSteps, setTransferSteps] = useState<RMETransferResult['steps']>(
    makeInitialTransferSteps()
  );
  const [transferError, setTransferError] = useState('');
  const [transferResult, setTransferResult] = useState<RMETransferResult | null>(null);
  const [lastTriggeredStep, setLastTriggeredStep] = useState<RMETransferStepStatus>('anamnesa');
  const [tenagaMedis, setTenagaMedis] = useState<{
    dokterNama: string;
    perawatNama: string;
    source: string[];
    capturedAt: string;
  }>({
    dokterNama: '',
    perawatNama: '',
    source: [],
    capturedAt: '',
  });
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus>(
    patientGender === 'L'
      ? false
      : typeof confirmedPregnancyStatus === 'boolean'
        ? confirmedPregnancyStatus
        : false
  );

  useEffect(() => {
    if (patientGender === 'L') {
      setPregnancyStatus(false);
      return;
    }
    if (typeof confirmedPregnancyStatus === 'boolean') {
      setPregnancyStatus(confirmedPregnancyStatus);
      return;
    }
    setPregnancyStatus(false);
  }, [patientGender, confirmedPregnancyStatus]);

  const confirmedChronicDiagnoses = useMemo(
    () =>
      (trajectory?.confirmed_chronic_diagnoses || [])
        .map((item) => {
          const icd_x = normalizeIcdCode(item.icd_x);
          const classification = classifyChronicDisease(icd_x);
          if (!classification) return null;

          return {
            icd_x,
            nama: isReadableDiagnosisName(item.nama) ? item.nama.trim() : classification.fullName,
          };
        })
        .filter((item): item is { icd_x: string; nama: string } => Boolean(item?.icd_x)),
    [trajectory]
  );
  const { candidates: recurrent, loaded: recurrentLoaded } = useRecurrentDiagnoses(patientRM);
  const recurrentByIcd = useMemo(
    () => new Map(recurrent.map((candidate) => [icdRoot(candidate.icd), candidate])),
    [recurrent]
  );
  // Same mapping and order as the Trajectory stage's prefetch, so both requests give one case key.
  const recurrentForRequest = useMemo(
    () => recurrent.map((candidate) => ({ icd: candidate.icd, name: candidate.name })),
    [recurrent]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrapTenagaMedis = async (): Promise<void> => {
      try {
        const response = await sendMessage('resolveTenagaMedis', undefined);
        if (cancelled || !response.success || !response.tenagaMedis) return;
        setTenagaMedis({
          dokterNama: response.tenagaMedis.dokterNama || '',
          perawatNama: response.tenagaMedis.perawatNama || '',
          source: response.tenagaMedis.source || [],
          capturedAt: response.tenagaMedis.capturedAt || '',
        });
      } catch {
        // Non-blocking: fallback will happen at transfer time.
      }
    };

    void bootstrapTenagaMedis();
    return () => {
      cancelled = true;
    };
  }, [patientRM]);

  useEffect(() => {
    // Wait for the visit store so the one request carries the history (and has the Trajectory
    // stage's prefetch case key) instead of a history-less request that starts its own MIRA step.
    if (patientRM.trim() && !recurrentLoaded) return;
    let cancelled = false;
    let reRequested = false;
    let stopListening: (() => void) | null = null;

    const resetForNewRequest = () => {
      setPhase('loading');
      setErrorMsg('');
      setNextBestAction(null);
      setSelectedDiagnoses([]);
      setManualIcd('');
      setManualName('');
      setShowManualDiagnosisInput(false);
      setIsPrimaryDiagnosisConfirmed(false);
      setShowWriteDx(false);
      setManualDiagnosisQuery('');
      setManualDiagnosisSuggestions([]);
      setDoctorSelectedDiagnosis(null);
      setTherapyState('idle');
      setTherapyError('');
      setTherapyByDiagnosis([]);
      setShowManualMedicationInput(true);
      setManualMedications([]);
      setManualMedicationDraft({
        nama_obat: '',
        dosis: '',
        aturan_pakai: 'Sesudah makan',
        durasi: '',
        rationale: 'Input manual operator',
      });
      setSelectedMedicationKeys([]);
    };

    // The background answered before MIRA's prefetch of this case finished: ask once more when
    // the ready record for its case key (`prefetch_key`) arrives, or after PREFETCH_FALLBACK_MS if
    // none does. The re-request keeps the doctor's selection (no reset).
    const reRequestWhenPrefetchReady = (prefetchKey: string, sentAt: number) => {
      if (reRequested || stopListening) return;
      const storage = browser.storage;
      const reRequest = () => {
        if (reRequested || cancelled) return;
        reRequested = true;
        stopListening?.();
        void loadSuggestions();
      };
      const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
        if (area !== 'local') return;
        if (readyPrefetchKey(changes[MIRA_PREFETCH_READY_KEY]?.newValue) === prefetchKey) reRequest();
      };
      storage.onChanged.addListener(onChanged);
      const fallback = setTimeout(reRequest, PREFETCH_FALLBACK_MS);
      stopListening = () => {
        clearTimeout(fallback);
        storage.onChanged.removeListener(onChanged);
        stopListening = null;
      };
      // The prefetch may have finished between the background's reply and this listener; a
      // record older than this request is from an earlier prefetch and is ignored.
      storage.local
        .get(MIRA_PREFETCH_READY_KEY)
        .then((raw) => {
          const record = raw[MIRA_PREFETCH_READY_KEY];
          if (readyPrefetchKey(record) === prefetchKey && readyPrefetchTime(record) >= sentAt) {
            reRequest();
          }
        })
        .catch(() => undefined);
    };

    const loadSuggestions = async () => {
      try {
        // Single dx source = engine getSuggestions (H6). Skip discarded canonical
        // dual-fetch that previously set a conflicting fallback banner.
        const request = buildDiagnosisRequestContext({
          keluhanUtama,
          keluhanTambahan: keluhanTambahan || '',
          patientAge,
          patientGender,
          vitals,
          recurrent: recurrentForRequest,
        });
        const sentAt = Date.now();
        const response = await sendMessage('getSuggestions', request);

        if (cancelled) return;

        if (!response.success || !response.data) {
          setErrorMsg(resolveDifferentialListErrorMessage(0));
          setSuggestions([]);
          setSuggestionsFailed(true);
          setPhase('ready');
          return;
        }

        const incomingSuggestions = (response.data.diagnosis_suggestions || []).slice(0, 5);
        setErrorMsg(
          response.data.engine_notice ||
            resolveDifferentialListErrorMessage(incomingSuggestions.length)
        );
        // An empty list falls back in normalizedSuggestions, which knows about history.
        setSuggestions(incomingSuggestions);
        setSuggestionsFailed(false);
        const firstAction = response.data.next_best_actions?.[0];
        setNextBestAction(firstAction ? { item: firstAction.item, reason: firstAction.reason } : null);
        setProcessingTimeMs(response.data.meta?.processing_time_ms ?? null);
        setPhase('ready');
        if (response.data.engine_pending) {
          // A reply without a key matches no ready record; the fallback timer still asks again.
          reRequestWhenPrefetchReady(response.data.prefetch_key ?? '', sentAt);
        }
      } catch {
        if (cancelled) return;
        setErrorMsg(resolveDifferentialListErrorMessage(0));
        setSuggestions([]);
        setSuggestionsFailed(true);
        setPhase('ready');
      }
    };

    const fetchDifferential = async () => {
      resetForNewRequest();
      await loadSuggestions();
    };

    fetchDifferential();
    return () => {
      cancelled = true;
      stopListening?.();
    };
  }, [
    keluhanUtama,
    keluhanTambahan,
    patientAge,
    patientGender,
    vitals.dbp,
    vitals.hr,
    vitals.rr,
    vitals.sbp,
    vitals.temp,
    recurrentForRequest,
    recurrentLoaded,
    patientRM,
  ]);

  // A history candidate with a usable code always yields a row (its own, or the confirmed
  // chronic row sharing its root), so the page is never empty without the fallback.
  const hasRecurrent = useMemo(
    () => recurrent.some((candidate) => isLikelyIcdCode(normalizeIcdCode(candidate.icd))),
    [recurrent]
  );
  const normalizedSuggestions = useMemo<{
    list: DiagnosisSuggestion[];
    engineIcds: Set<string>;
    historyOnlyCount: number;
  }>(() => {
    const baseSuggestions = resolveBaseSuggestions(
      Array.isArray(suggestions) ? suggestions : [],
      hasRecurrent,
      () => buildUiFallbackDiagnoses(keluhanUtama, vitals)
    );
    const sanitizedBaseSuggestions = baseSuggestions
      .map((item) => {
        const normalizedCode = normalizeIcdCode(item.icd_x);
        if (!isLikelyIcdCode(normalizedCode)) return null;
        return {
          ...item,
          icd_x: normalizedCode,
          nama: resolveDiagnosisDisplayName(normalizedCode, item.nama),
        };
      })
      .filter((item): item is DiagnosisSuggestion => Boolean(item));

    const mergedByIcd = new Map<string, DiagnosisSuggestion>();

    for (const chronic of confirmedChronicDiagnoses) {
      const key = chronic.icd_x;
      if (!key) continue;
      mergedByIcd.set(key, buildConfirmedChronicSuggestion(chronic));
    }

    // History candidates come next, one row per ICD root; a root already held by a confirmed
    // chronic diagnosis is not repeated. Each sits in its own "history:<root>" slot, so an
    // engine code equal to the recorded one (E11.9) can still arrive later as its own row.
    const seededRoots = new Set(Array.from(mergedByIcd.keys(), icdRoot));
    const recurrentSeedByRoot = new Map<string, { slot: string; seed: DiagnosisSuggestion }>();
    for (const candidate of recurrent) {
      const key = normalizeIcdCode(candidate.icd);
      if (!isLikelyIcdCode(key) || seededRoots.has(icdRoot(key))) continue;
      const seed = buildRecurrentSuggestion({ ...candidate, icd: key });
      const slot = `history:${icdRoot(key)}`;
      seededRoots.add(icdRoot(key));
      recurrentSeedByRoot.set(icdRoot(key), { slot, seed });
      mergedByIcd.set(slot, seed);
    }

    // Engine codes merged into a history slot, so a repeat of the same code merges there too.
    const slotByEngineKey = new Map<string, string>();

    for (const suggestion of sanitizedBaseSuggestions) {
      const key = suggestion.icd_x?.trim().toUpperCase();
      if (!key || !isLikelyIcdCode(key)) continue;

      // The first engine row on a history root merges into the history row in place (it stays
      // on top, as agreed history): the engine's code, rationale and tag (so "MIRA" survives),
      // with the higher confidence of the two. A later engine row on that root is its own row.
      const recurrentSeed = recurrentSeedByRoot.get(icdRoot(key));
      if (recurrentSeed) {
        recurrentSeedByRoot.delete(icdRoot(key));
        slotByEngineKey.set(key, recurrentSeed.slot);
        mergedByIcd.set(recurrentSeed.slot, {
          ...suggestion,
          confidence: Math.max(recurrentSeed.seed.confidence, suggestion.confidence),
          rationale: suggestion.rationale || recurrentSeed.seed.rationale,
          engine_tag: suggestion.engine_tag ?? recurrentSeed.seed.engine_tag,
        });
        continue;
      }

      const slot = slotByEngineKey.get(key) ?? key;
      const existing = mergedByIcd.get(slot);
      if (!existing) {
        mergedByIcd.set(slot, suggestion);
        continue;
      }

      mergedByIcd.set(slot, {
        ...suggestion,
        confidence: Math.max(existing.confidence, suggestion.confidence),
        rationale: existing.rationale || suggestion.rationale,
      });
    }

    return {
      list: Array.from(mergedByIcd.values()).map((item, index) => ({
        ...item,
        rank: index + 1,
      })),
      // The list re-ranks every row, so rank cannot tell history-only rows apart.
      engineIcds: new Set(sanitizedBaseSuggestions.map((item) => icdRoot(item.icd_x))),
      // History rows no engine row took over sit above the engine's list; the display caps
      // widen by this many so they never push the engine's last row (often the cannot-miss
      // one) off the page.
      historyOnlyCount: recurrentSeedByRoot.size,
    };
  }, [suggestions, keluhanUtama, vitals, confirmedChronicDiagnoses, recurrent, hasRecurrent]);

  const rankedDiagnoses: RankedDiagnosis[] = useMemo(
    () =>
      runDiagnosisAlgorithm({
        suggestions: normalizedSuggestions.list,
        keluhanUtama,
        keluhanTambahan,
        vitals,
        trajectory, // SPRINT 1 P0-2: Pass trajectory data
        maxResults: 5 + normalizedSuggestions.historyOnlyCount,
      }),
    [normalizedSuggestions, keluhanUtama, keluhanTambahan, vitals, trajectory]
  );
  const displayedDiagnoses = useMemo(() => {
    if (!canonicalOutput) {
      return rankedDiagnoses;
    }

    // Annotate scores for transparency when canonical context exists, but do not
    // re-sort — engine order remains the single ranking authority (audit H3).
    const immediateActions = canonicalOutput.recommendations.immediate_actions.map((item) =>
      item.toLowerCase()
    );
    const maxSeverity = canonicalOutput.alerts.reduce<
      CanonicalClinicalEngineOutput['alerts'][number]['severity'] | undefined
    >((current, alert) => {
      const currentWeight = canonicalSeverityWeight(current);
      const nextWeight = canonicalSeverityWeight(alert.severity);
      return nextWeight > currentWeight ? alert.severity : current;
    }, undefined);
    const globalSeverityBoost = canonicalSeverityWeight(maxSeverity);

    return rankedDiagnoses.map((item) => {
      const redFlagBoost =
        (item.suggestion.red_flags?.length || 0) * (globalSeverityBoost > 0 ? 8 : 2);
      const requiresExamBoost =
        item.insight.supportingExamPlan.needLevel === 'required'
          ? globalSeverityBoost > 0
            ? 18
            : 6
          : item.insight.supportingExamPlan.needLevel === 'recommended'
            ? 6
            : 0;
      const actionText = (item.suggestion.recommended_actions || []).join(' ').toLowerCase();
      const matchesImmediateAction = immediateActions.some((action) => {
        const [firstToken] = action.split(' ');
        return firstToken ? actionText.includes(firstToken) : false;
      });
      const canonicalActionBoost = matchesImmediateAction ? 20 : 0;
      const canonicalScore =
        item.diagnosisScore + redFlagBoost + requiresExamBoost + canonicalActionBoost;

      return {
        ...item,
        diagnosisScore: canonicalScore,
      };
    });
  }, [canonicalOutput, rankedDiagnoses]);

  const diagnosisKey = (diagnosis: SelectedDiagnosis): string =>
    diagnosis.source === 'manual'
      ? `manual:${diagnosis.icd_x}`
      : `suggested:${diagnosis.rank ?? 0}:${diagnosis.icd_x}`;

  const isDiagnosisSelected = (diagnosis: SelectedDiagnosis): boolean =>
    selectedDiagnoses.some((item) => diagnosisKey(item) === diagnosisKey(diagnosis));

  const impressionItems = useMemo<ClinicalImpressionViewItem[]>(() => {
    return displayedDiagnoses.slice(0, 5 + normalizedSuggestions.historyOnlyCount).map((item) => {
      const normalizedSuggestionIcd = normalizeIcdCode(item.suggestion.icd_x);
      const selectedDiagnosis: SelectedDiagnosis = {
        icd_x: normalizedSuggestionIcd || item.suggestion.icd_x,
        nama: resolveDiagnosisDisplayName(
          normalizedSuggestionIcd || item.suggestion.icd_x,
          item.suggestion.nama
        ),
        source: 'suggested',
        rank: item.rank,
      };
      const confidence = confidenceBandPresentation(item);
      const supports = uniqueClinicalPhrases(
        [
          ...item.insight.matchedSymptoms,
          ...item.insight.vitalDrivers.slice(0, 2),
          item.suggestion.recommended_actions?.[0],
        ],
        4
      );
      const recurrentMatch = recurrentByIcd.get(icdRoot(selectedDiagnosis.icd_x));
      const engineAgrees = normalizedSuggestions.engineIcds.has(icdRoot(selectedDiagnosis.icd_x));

      return {
        id: `${item.rank}-${selectedDiagnosis.icd_x}`,
        rank: item.rank,
        icd_x: selectedDiagnosis.icd_x,
        nama: selectedDiagnosis.nama,
        displayLabel: `${selectedDiagnosis.icd_x} - ${humanize(selectedDiagnosis.nama)}${
          item.suggestion.engine_tag ? ` · ${item.suggestion.engine_tag}` : ''
        }`,
        confidenceLabel: confidence.label,
        confidenceTone: confidence.tone,
        supports,
        against: buildAgainstSignals(item, keluhanUtama, keluhanTambahan, vitals),
        missing: buildMissingSignals(item),
        reviewItems: buildReviewSignals(item),
        doNotMissReason: buildDoNotMissReason(item),
        history: recurrentMatch
          ? {
              label: recurrentMatch.label,
              count: recurrentMatch.count,
              visitsConsidered: recurrentMatch.visitsConsidered,
              lastSeen: recurrentMatch.lastSeen,
              engineAgrees,
              engineSource: engineAgrees
                ? /^MIRA/.test(item.suggestion.engine_tag ?? '')
                  ? 'mira'
                  : 'legacy'
                : null,
            }
          : undefined,
        isSelected: isDiagnosisSelected(selectedDiagnosis),
        isSelectionBlocked:
          !isDiagnosisSelected(selectedDiagnosis) &&
          selectedDiagnoses.length >= MAX_DIAGNOSIS_SELECTION,
        audit: {
          rationale: humanize(
            item.suggestion.rationale ||
              item.suggestion.reasoning ||
              'Rasional klinis tidak tersedia'
          ),
          matchedSymptoms: uniqueClinicalPhrases(item.insight.matchedSymptoms, 4),
          vitalDrivers: uniqueClinicalPhrases(item.insight.vitalDrivers, 4),
          suggestedTests: uniqueClinicalPhrases(item.insight.supportingExamPlan.tests, 4),
          supportingExamSummary: cleanClinicalPhrase(item.insight.supportingExamPlan.summary),
          supportingExamNeedLevel: item.insight.supportingExamPlan.needLevel,
          scoreBreakdown: item.scoreBreakdown,
          diagnosisScore: item.diagnosisScore,
          adjustedConfidence: item.adjustedConfidence,
          redFlags: uniqueClinicalPhrases(item.suggestion.red_flags || [], 4),
          recommendedActions: uniqueClinicalPhrases(item.suggestion.recommended_actions || [], 4),
        },
        raw: item,
      };
    });
  }, [
    displayedDiagnoses,
    selectedDiagnoses,
    keluhanUtama,
    keluhanTambahan,
    vitals,
    recurrentByIcd,
    normalizedSuggestions,
  ]);

  const primaryImpression = impressionItems[0] || null;

  const activeDiagnosisIcd = selectedDiagnoses[0]?.icd_x ?? primaryImpression?.icd_x ?? '';
  const activeConfidenceBand = primaryImpression?.raw?.confidenceBand ?? 'moderate';

  useEffect(() => {
    let cancelled = false;
    const icd = activeDiagnosisIcd.trim();

    if (!icd || icd.toUpperCase() === 'R69') {
      setTriageResult(null);
      return;
    }

    void getPenyakitByIcd(icd)
      .then((disease) => {
        if (cancelled) return;
        if (!disease) {
          setTriageResult(null);
          return;
        }

        const complaintText = `${keluhanUtama} ${keluhanTambahan || ''}`.trim();
        const complaintSignals = complaintText
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .filter((token) => token.length >= 3);

        setTriageResult(
          evaluateTriageReferralTree({
            complaintSignals,
            complaintText,
            vitals,
            disease,
            confidenceBand: activeConfidenceBand,
            pregnant: pregnancyStatus === true,
            chronicDiseases: confirmedChronicDiagnoses.map((item) => item.nama).filter(Boolean),
            allergies,
          })
        );
      })
      .catch(() => {
        if (!cancelled) setTriageResult(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeDiagnosisIcd,
    activeConfidenceBand,
    keluhanUtama,
    keluhanTambahan,
    vitals,
    pregnancyStatus,
    allergies,
    confirmedChronicDiagnoses,
  ]);
  const safetyConsiderations = useMemo(
    () =>
      impressionItems
        .filter(
          (item) =>
            item.audit.redFlags.length > 0 || item.audit.supportingExamNeedLevel === 'required'
        )
        .slice(0, 3),
    [impressionItems]
  );
  const missingVerificationNeeds = useMemo(
    () =>
      uniqueConcreteClinicalPhrases(
        impressionItems.flatMap((item) => item.missing),
        6
      ),
    [impressionItems]
  );
  const suggestedClinicalReview = useMemo(
    () =>
      uniqueConcreteClinicalPhrases(
        [
          ...(primaryImpression?.reviewItems || []),
          ...(primaryImpression?.audit.recommendedActions || []),
          ...(safetyConsiderations[0]?.audit.suggestedTests || []),
          'Correlate with examination',
        ],
        6
      ),
    [primaryImpression, safetyConsiderations]
  );
  const supportingExamItems = useMemo(
    () =>
      uniqueConcreteClinicalPhrases(
        [
          primaryImpression?.audit.supportingExamNeedLevel !== 'optional'
            ? primaryImpression?.audit.supportingExamSummary
            : undefined,
          ...(primaryImpression?.audit.suggestedTests || []),
          ...missingVerificationNeeds,
        ],
        6
      ),
    [missingVerificationNeeds, primaryImpression]
  );
  const differentialRedFlagItems = useMemo(
    () =>
      uniqueConcreteClinicalPhrases(
        safetyConsiderations.flatMap((item) => item.audit.redFlags),
        6
      ),
    [safetyConsiderations]
  );
  useEffect(() => {
    if (!showWriteDx || manualDiagnosisQuery.trim().length < 2) {
      setManualDiagnosisSuggestions([]);
      return;
    }

    let cancelled = false;
    void searchPenyakitByName(manualDiagnosisQuery, 5).then((candidates) => {
      if (cancelled) return;
      setManualDiagnosisSuggestions(candidates);
    });

    return () => {
      cancelled = true;
    };
  }, [manualDiagnosisQuery, showWriteDx]);

  useEffect(() => {
    let cancelled = false;

    const loadPharmacotherapy = async () => {
      if (selectedDiagnoses.length === 0) {
        setTherapyByDiagnosis([]);
        setTherapyState('idle');
        setTherapyError('');
        return;
      }

      setTherapyState('loading');
      setTherapyError('');

      try {
        const results = await Promise.all(
          selectedDiagnoses.map(async (diagnosis): Promise<DiagnosisTherapyResult> => {
            try {
              const response = await sendMessage('getRecommendations', {
                icd_x: diagnosis.icd_x,
                patient_age: patientAge > 0 ? patientAge : 0,
                alergi: allergies.filter((item) => item.toLowerCase() !== 'tidak ada'),
                penyakit_kronis: [],
                current_medications: chronicTherapies,
                keluhan_utama: keluhanUtama,
                selected_diagnosis_name: diagnosis.nama,
                is_pregnant: pregnancyStatus === true,
                vital_signs: {
                  systolic: vitals.sbp,
                  diastolic: vitals.dbp,
                  heart_rate: vitals.hr,
                  respiratory_rate: vitals.rr,
                  temperature: vitals.temp,
                },
              });

              if (!response.success || !response.data) {
                return {
                  diagnosis,
                  medications: [],
                  alerts: [],
                  guidelines: [],
                  error: response.error?.message || 'Gagal mengambil rekomendasi farmakoterapi.',
                };
              }

              return {
                diagnosis,
                medications: response.data.medication_recommendations || [],
                alerts: response.data.alerts || [],
                guidelines: response.data.clinical_guidelines || [],
                explainability: response.data.pharmacotherapy_explainability,
              };
            } catch (error) {
              return {
                diagnosis,
                medications: [],
                alerts: [],
                guidelines: [],
                error:
                  error instanceof Error
                    ? error.message
                    : 'Gagal mengambil rekomendasi farmakoterapi.',
              };
            }
          })
        );

        if (cancelled) return;

        setTherapyByDiagnosis(results);

        if (results.some((result) => Boolean(result.error))) {
          setTherapyState('error');
          setTherapyError('Sebagian diagnosis gagal dimuat farmakoterapinya.');
          return;
        }

        setTherapyState('ready');
      } catch (error) {
        if (cancelled) return;
        setTherapyByDiagnosis([]);
        setTherapyState('error');
        setTherapyError(
          error instanceof Error ? error.message : 'Gagal mengambil rekomendasi farmakoterapi.'
        );
      }
    };

    loadPharmacotherapy();
    return () => {
      cancelled = true;
    };
  }, [
    selectedDiagnoses,
    patientAge,
    allergies,
    keluhanUtama,
    keluhanTambahan,
    patientGender,
    pregnancyStatus,
    chronicTherapies,
    vitals.sbp,
    vitals.dbp,
    vitals.hr,
    vitals.rr,
    vitals.temp,
  ]);

  useEffect(() => {
    const chromeGlobal = getChromeGlobal();
    const runtime = chromeGlobal?.runtime;
    const onMessage = runtime?.onMessage;
    if (!runtime || !onMessage) return;

    const listener = (message: unknown) => {
      const payload = message as { type?: string; data?: unknown };
      if (payload.type !== 'RME_TRANSFER_PROGRESS') return;

      const progress = payload.data as RMETransferProgressEvent;
      if (transferRunId && progress.runId !== transferRunId) return;

      setTransferRunId(progress.runId);
      setTransferSteps(progress.steps);
      setTransferReasonCodes(progress.reasonCodes);

      if (progress.state === 'running') {
        setTransferUiState('running');
        return;
      }

      if (progress.transferState === 'cancelled') {
        setTransferUiState('failed');
        setTransferError(REASON_CODE_LABELS.USER_CANCELLED);
        return;
      }

      setTransferUiState(
        progress.transferState === 'success'
          ? 'success'
          : progress.transferState === 'partial'
            ? 'partial'
            : 'failed'
      );
    };

    onMessage.addListener(listener);
    return () => {
      onMessage.removeListener(listener);
    };
  }, [transferRunId]);

  const selectedDiagnosisForTransfer = selectedDiagnoses[0] || null;
  const candidateTransferMedications = useMemo(() => {
    const combined: MedicationRecommendation[] = [];
    if (selectedDiagnoses.length > 0) {
      const selectedKeys = new Set(selectedDiagnoses.map((item) => diagnosisKey(item)));
      combined.push(
        ...therapyByDiagnosis
          .filter((item) => selectedKeys.has(diagnosisKey(item.diagnosis)))
          .flatMap((item) => item.medications)
      );
    }
    combined.push(...manualMedications);

    const deduped = new Map<string, MedicationRecommendation>();
    for (const med of combined) {
      const key = medicationSelectionKey(med);
      if (!deduped.has(key)) deduped.set(key, med);
    }
    return Array.from(deduped.values());
  }, [selectedDiagnoses, therapyByDiagnosis, manualMedications]);

  const selectedMedicationKeySet = useMemo(
    () => new Set(selectedMedicationKeys),
    [selectedMedicationKeys]
  );

  const selectedTransferMedications = useMemo(
    () =>
      candidateTransferMedications.filter((med) =>
        selectedMedicationKeySet.has(medicationSelectionKey(med))
      ),
    [candidateTransferMedications, selectedMedicationKeySet]
  );

  useEffect(() => {
    const availableMedicationKeys = new Set(
      candidateTransferMedications.map((med) => medicationSelectionKey(med))
    );
    setSelectedMedicationKeys((prev) => prev.filter((key) => availableMedicationKeys.has(key)));
  }, [candidateTransferMedications]);

  // Lift selected diagnosis and medications to parent (for uplink from TTVInferenceUI)
  useEffect(() => {
    const first = selectedDiagnoses[0];
    onDiagnosisChange?.(first ? { icd_x: first.icd_x, nama: first.nama } : null);
  }, [selectedDiagnoses, onDiagnosisChange]);

  useEffect(() => {
    onMedicationsChange?.(selectedTransferMedications);
  }, [selectedTransferMedications, onMedicationsChange]);

  const toggleMedicationSelection = (med: MedicationRecommendation): void => {
    const key = medicationSelectionKey(med);
    setSelectedMedicationKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
    setTransferError('');
  };

  const selectAllRecommendedMedications = (): void => {
    const allKeys = Array.from(
      new Set(candidateTransferMedications.map((med) => medicationSelectionKey(med)))
    );
    setSelectedMedicationKeys(allKeys);
    setTransferError('');
  };

  const clearSelectedMedications = (): void => {
    setSelectedMedicationKeys([]);
    setTransferError('');
  };

  const updateManualMedicationDraft = <TField extends keyof ManualMedicationDraft>(
    field: TField,
    value: ManualMedicationDraft[TField]
  ): void => {
    setManualMedicationDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addManualMedication = (): void => {
    const namaObat = manualMedicationDraft.nama_obat.trim();
    const dosis = manualMedicationDraft.dosis.trim();

    if (!namaObat || !dosis) {
      setTherapyState('error');
      setTherapyError('Obat manual butuh minimal Nama Obat dan Dosis.');
      return;
    }

    const manualMedication: MedicationRecommendation = {
      nama_obat: namaObat,
      dosis,
      aturan_pakai: manualMedicationDraft.aturan_pakai,
      durasi: manualMedicationDraft.durasi.trim() || undefined,
      rationale: manualMedicationDraft.rationale.trim() || 'Input manual operator',
      safety_check: 'caution',
      contraindications: [],
    };

    const medKey = medicationSelectionKey(manualMedication);
    const hasDuplicate = manualMedications.some((item) => medicationSelectionKey(item) === medKey);
    if (hasDuplicate) {
      setTherapyState('error');
      setTherapyError('Obat manual dengan regimen yang sama sudah ada.');
      return;
    }

    setManualMedications((prev) => [...prev, manualMedication]);
    setSelectedMedicationKeys((prev) => (prev.includes(medKey) ? prev : [...prev, medKey]));
    setManualMedicationDraft((prev) => ({
      ...prev,
      nama_obat: '',
      dosis: '',
      durasi: '',
      rationale: 'Input manual operator',
    }));
    setTherapyError('');
  };

  const removeManualMedication = (medication: MedicationRecommendation): void => {
    const medKey = medicationSelectionKey(medication);
    setManualMedications((prev) => prev.filter((item) => medicationSelectionKey(item) !== medKey));
    setSelectedMedicationKeys((prev) => prev.filter((item) => item !== medKey));
    setTherapyError('');
  };

  const selectedMedicationCount = selectedTransferMedications.length;
  const candidateMedicationCount = candidateTransferMedications.length;

  const transferEligibleDiagnosis = buildTransferEligibleDiagnosisInput(
    selectedDiagnosisForTransfer,
    'PRIMER'
  );
  const hasDiagnosisForTransfer = Boolean(transferEligibleDiagnosis);
  const hasCandidateResepMedication = candidateMedicationCount > 0;
  const hasResepPayloadReady =
    hasDiagnosisForTransfer &&
    therapyState !== 'loading' &&
    selectedMedicationCount > 0 &&
    (therapyState === 'ready' || therapyByDiagnosis.length > 0);

  const diagnosisViewModel = useMemo(() => {
    const selectedPrimaryDiagnosis = selectedDiagnoses[0] || null;
    const primaryViewInput =
      selectedPrimaryDiagnosis?.source === 'manual'
        ? {
            code: selectedPrimaryDiagnosis.icd_x,
            name: selectedPrimaryDiagnosis.nama,
            displayLabel: `${selectedPrimaryDiagnosis.icd_x} - ${humanize(selectedPrimaryDiagnosis.nama)}`,
            confidenceLabel: 'Manual review',
            isSelected: true,
            isSelectionBlocked: false,
            isInsufficient: false,
            missingEvidence: [],
            reviewItems: ['Review dokter'],
            redFlags: [],
          }
        : primaryImpression
          ? {
              code: primaryImpression.icd_x,
              name: primaryImpression.nama,
              displayLabel: primaryImpression.displayLabel,
              confidenceLabel: primaryImpression.confidenceLabel,
              isSelected: primaryImpression.isSelected,
              isSelectionBlocked: primaryImpression.isSelectionBlocked,
              isInsufficient:
                primaryImpression.icd_x.toUpperCase() === 'R69' ||
                primaryImpression.confidenceLabel.toLowerCase().includes('insufficient'),
              missingEvidence: primaryImpression.missing,
              reviewItems: primaryImpression.reviewItems,
              redFlags: primaryImpression.audit.redFlags,
            }
          : null;

    return createDiagnosisPageViewModel({
      context: {
        patientRM,
        patientAge: patientAge > 0 ? patientAge : null,
        patientGender,
        pregnancyLabel: pregnancyStatusLabel(pregnancyStatus),
        allergySummary: allergies.length > 0 ? allergies.join(', ') : 'Tidak ada alergi',
        chronicTherapySummary:
          chronicTherapies.length > 0 ? chronicTherapies.join(', ') : 'Tidak ada terapi kronis',
        chronicDiagnosisSummary: confirmedChronicDiagnoses
          .map((item) => item.nama)
          .filter(Boolean)
          .join(', '),
      },
      primary: primaryViewInput,
      evidence: {
        supports: primaryImpression?.supports || [],
        against: primaryImpression?.against || [],
        missing: supportingExamItems,
        review: suggestedClinicalReview,
        redFlags: differentialRedFlagItems,
        doNotMiss: safetyConsiderations
          .map((item) => item.doNotMissReason)
          .filter((item): item is string => Boolean(item)),
      },
      candidates: impressionItems.map((item) => ({
        id: item.id,
        rank: item.rank,
        code: item.icd_x,
        name: item.nama,
        displayLabel: item.displayLabel,
        confidenceLabel: item.confidenceLabel,
        source: 'suggested',
        isSelected: item.isSelected,
        isSelectionBlocked: item.isSelectionBlocked,
        supports: item.supports,
        against: item.against,
        missing: item.missing,
        review: item.reviewItems,
        history: item.history,
      })),
      selectedDiagnoses: selectedDiagnoses.map((diagnosis) => ({
        key: diagnosisKey(diagnosis),
        displayLabel: `${diagnosis.icd_x} - ${humanize(diagnosis.nama)}`,
        sourceLabel: diagnosis.source === 'manual' ? 'Input dokter' : 'Rekomendasi sistem',
      })),
      therapy: {
        state: therapyState,
        hasDiagnosisBasis: selectedDiagnoses.length > 0,
        selectedDiagnosisCount: selectedDiagnoses.length,
        selectedMedicationCount,
        candidateMedicationCount,
        manualMedicationAvailable: showManualMedicationInput,
        reviewOnly: true,
        diagnosisBasisLabel:
          selectedDiagnoses.length > 0
            ? selectedDiagnoses.map((item) => item.icd_x).join(', ')
            : 'Belum dipilih',
        groups: selectedDiagnoses.map((diagnosis) => {
          const therapyResult = therapyByDiagnosis.find(
            (result) => diagnosisKey(result.diagnosis) === diagnosisKey(diagnosis)
          );
          const explainability = therapyResult?.explainability;
          const explainabilityRiskUi = explainability ? riskTierUi(explainability.risk_tier) : null;
          const detailItems = [
            therapyResult?.error,
            explainabilityRiskUi ? `Risk ${explainabilityRiskUi.label}` : undefined,
            explainability ? `Confidence ${Math.round(explainability.confidence)}%` : undefined,
            explainability ? `Review ${explainability.review_window}` : undefined,
            explainability ? pathwayUi(explainability.pathway) : undefined,
            ...(explainability?.drivers || [])
              .slice(0, 5)
              .map((driver) => `Driver: ${humanize(driver)}`),
            ...(explainability?.missing_data || []).map(
              (item) => `Missing data: ${humanize(item)}`
            ),
            ...(therapyResult?.alerts || [])
              .filter((alert) => alert.type === 'red_flag' && alert.severity === 'emergency')
              .slice(0, 2)
              .map((alert) => `${humanize(alert.title)}: ${humanize(alert.message)}`),
            ...(therapyResult?.guidelines || []),
          ].filter((item): item is string => Boolean(item));
          const medications = (therapyResult?.medications || []).map((med) => ({
            key: medicationSelectionKey(med),
            name: med.nama_obat,
            doseLine: `${med.dosis} • ${med.aturan_pakai} • ${med.durasi || '-'}`,
            rationale: humanize(med.rationale),
            safetyLabel: med.safety_check.toUpperCase(),
            contraindications: (med.contraindications || []).map((item) => humanize(item)),
            isSelected: selectedMedicationKeySet.has(medicationSelectionKey(med)),
            sourceLabel: 'PROPOSAL',
          }));
          const manualMedicationViews = manualMedications.map((med) => ({
            key: medicationSelectionKey(med),
            name: med.nama_obat,
            doseLine: `${med.dosis} • ${med.aturan_pakai} • ${med.durasi || '-'}`,
            rationale: humanize(med.rationale),
            safetyLabel: med.safety_check.toUpperCase(),
            contraindications: (med.contraindications || []).map((item) => humanize(item)),
            isSelected: selectedMedicationKeySet.has(medicationSelectionKey(med)),
            sourceLabel: 'MANUAL',
          }));

          return {
            diagnosisKey: diagnosisKey(diagnosis),
            diagnosisLabel: `${diagnosis.icd_x} - ${humanize(diagnosis.nama)}`,
            sourceLabel: diagnosis.source === 'manual' ? 'Input dokter' : 'Rekomendasi sistem',
            statusText: therapyResult?.error || therapyState,
            detailItems,
            medications: [...medications, ...manualMedicationViews],
          };
        }),
      },
      transfer: {
        state: transferUiState,
        diagnosisReady: hasDiagnosisForTransfer,
        resepReady: hasResepPayloadReady,
        canAutoFill: transferUiState !== 'running',
        selectedDiagnosisLabel: selectedDiagnosisForTransfer
          ? `${selectedDiagnosisForTransfer.icd_x} - ${humanize(selectedDiagnosisForTransfer.nama)}`
          : null,
        selectedMedicationCount,
        candidateMedicationCount,
        reasonLabels: transferReasonCodes.map((code) => REASON_CODE_LABELS[code] || code),
        error: transferError,
        resultSummary: transferResult
          ? `runId: ${transferResult.runId} • total: ${transferResult.totalLatencyMs}ms`
          : null,
        readinessMessage:
          !hasDiagnosisForTransfer || !hasResepPayloadReady
            ? 'Pilih diagnosis terlebih dahulu, lalu pilih minimal 1 obat proposal atau manual sebelum uplink Pharmacotherapy.'
            : null,
        steps: TRANSFER_STEP_ORDER.map((step) => {
          const status = transferSteps[step];
          return {
            key: step,
            label: stepLabel(step),
            state: status.state,
            detail: `ok:${status.successCount} fail:${status.failedCount} skip:${status.skippedCount} • ${status.latencyMs}ms • try ${status.attempt}`,
            reason: status.reasonCode ? REASON_CODE_LABELS[status.reasonCode] : null,
            message: status.message || null,
          };
        }),
      },
    });
  }, [
    allergies,
    candidateMedicationCount,
    chronicTherapies,
    differentialRedFlagItems,
    hasDiagnosisForTransfer,
    hasResepPayloadReady,
    impressionItems,
    manualMedications,
    patientAge,
    patientGender,
    patientRM,
    pregnancyStatus,
    primaryImpression,
    safetyConsiderations,
    selectedDiagnoses,
    selectedDiagnosisForTransfer,
    selectedMedicationCount,
    selectedMedicationKeySet,
    showManualMedicationInput,
    suggestedClinicalReview,
    supportingExamItems,
    therapyByDiagnosis,
    therapyState,
    transferError,
    transferReasonCodes,
    transferResult,
    transferSteps,
    transferUiState,
  ]);

  const handleTransferToRME = async (
    targetStep: RMETransferStepStatus,
    forceRun = false
  ): Promise<void> => {
    if (targetStep === 'diagnosa' && !hasDiagnosisForTransfer) {
      setTransferUiState('failed');
      setTransferError(
        'Diagnosis belum cukup untuk dikirim ke RME. Lengkapi data atau pilih diagnosis berbasis evidence.'
      );
      return;
    }

    if (targetStep === 'resep') {
      if (!hasDiagnosisForTransfer) {
        setTransferUiState('failed');
        setTransferError(
          'Diagnosis belum cukup untuk mendasari uplink Resep. Lengkapi data atau pilih diagnosis berbasis evidence.'
        );
        return;
      }
      if (therapyState === 'loading') {
        setTransferUiState('failed');
        setTransferError('Farmakoterapi masih diproses. Tunggu sampai selesai lalu uplink Resep.');
        return;
      }
      if (!hasCandidateResepMedication) {
        setTransferUiState('failed');
        setTransferError(
          'Resep belum siap. Muat rekomendasi farmakologi dulu agar uplink Resep tidak kosong.'
        );
        return;
      }
      if (selectedMedicationCount === 0) {
        setTransferUiState('failed');
        setTransferError('Pilih minimal 1 obat (proposal/manual) sebelum uplink Resep.');
        return;
      }
    }

    let resolvedTenagaMedis = tenagaMedis;
    try {
      const tenagaMedisResponse = await sendMessage('resolveTenagaMedis', undefined);
      if (tenagaMedisResponse.success && tenagaMedisResponse.tenagaMedis) {
        resolvedTenagaMedis = {
          dokterNama: tenagaMedisResponse.tenagaMedis.dokterNama || '',
          perawatNama: tenagaMedisResponse.tenagaMedis.perawatNama || '',
          source: tenagaMedisResponse.tenagaMedis.source || [],
          capturedAt: tenagaMedisResponse.tenagaMedis.capturedAt || '',
        };
        setTenagaMedis(resolvedTenagaMedis);
      }
    } catch {
      // Keep last known value in state.
    }

    const mapped = buildRMETransferPayload({
      keluhanUtama,
      keluhanTambahan,
      patientGender,
      pregnancyStatus,
      allergies,
      vitalSigns: {
        sbp: vitals.sbp,
        dbp: vitals.dbp,
        hr: vitals.hr,
        rr: vitals.rr,
        temp: vitals.temp,
        glucose: vitals.glucose,
      },
      diagnosis: transferEligibleDiagnosis
        ? {
            icd_x: transferEligibleDiagnosis.icd_x,
            nama: transferEligibleDiagnosis.nama,
            jenis: transferEligibleDiagnosis.jenis,
            // kasus, prognosa, penyakit_kronis auto-detected by payload-mapper
          }
        : undefined,
      medications: selectedTransferMedications,
      tenagaMedis:
        resolvedTenagaMedis.dokterNama || resolvedTenagaMedis.perawatNama
          ? {
              dokterNama: resolvedTenagaMedis.dokterNama || undefined,
              perawatNama: resolvedTenagaMedis.perawatNama || undefined,
              ruangan: 'POLI UMUM',
            }
          : undefined,
      trajectory,
      hasVisitHistory,
    });

    const scopedReasonCodes = filterReasonCodesForStep(mapped.reasonCodes, targetStep);

    const requestId = `rme-${Date.now()}`;
    setTransferRunId(requestId);
    setLastTriggeredStep(targetStep);
    setTransferUiState('running');
    setTransferError('');
    setTransferResult(null);
    setTransferSteps(makeInitialTransferSteps());
    setTransferReasonCodes(scopedReasonCodes);

    try {
      const scopedPayload = {
        ...mapped.payload,
        options: {
          ...mapped.payload.options,
          requestId,
          forceRun,
          startFromStep: targetStep,
          onlyStep: targetStep,
        },
        meta: {
          ...mapped.payload.meta,
          reasonCodes: scopedReasonCodes,
        },
      };

      const result = await sendMessage('transferRME', {
        ...scopedPayload,
      });
      setTransferResult(result);
      setTransferRunId(result.runId);
      setTransferSteps(result.steps);
      setTransferReasonCodes(result.reasonCodes);
      setTransferUiState(mapTransferStateToUi(result.state));
      if (result.state !== 'success') {
        const firstReason = result.reasonCodes[0];
        setTransferError(
          firstReason ? REASON_CODE_LABELS[firstReason] : 'Transfer RME tidak sepenuhnya berhasil.'
        );
      }
    } catch (error) {
      setTransferUiState('failed');
      setTransferError(error instanceof Error ? error.message : 'Transfer RME gagal.');
    }
  };

  const handleAutoFillAll = async (forceRun = false): Promise<void> => {
    let resolvedTenagaMedis = tenagaMedis;
    try {
      const tenagaMedisResponse = await sendMessage('resolveTenagaMedis', undefined);
      if (tenagaMedisResponse.success && tenagaMedisResponse.tenagaMedis) {
        resolvedTenagaMedis = {
          dokterNama: tenagaMedisResponse.tenagaMedis.dokterNama || '',
          perawatNama: tenagaMedisResponse.tenagaMedis.perawatNama || '',
          source: tenagaMedisResponse.tenagaMedis.source || [],
          capturedAt: tenagaMedisResponse.tenagaMedis.capturedAt || '',
        };
        setTenagaMedis(resolvedTenagaMedis);
      }
    } catch {
      // Keep last known value in state.
    }

    const diagnosisInput = transferEligibleDiagnosis;

    const mapped = buildRMETransferPayload({
      keluhanUtama,
      keluhanTambahan,
      patientGender,
      pregnancyStatus,
      allergies,
      vitalSigns: {
        sbp: vitals.sbp,
        dbp: vitals.dbp,
        hr: vitals.hr,
        rr: vitals.rr,
        temp: vitals.temp,
        glucose: vitals.glucose,
      },
      diagnosis: diagnosisInput,
      medications: selectedTransferMedications,
      tenagaMedis:
        resolvedTenagaMedis.dokterNama || resolvedTenagaMedis.perawatNama
          ? {
              dokterNama: resolvedTenagaMedis.dokterNama || undefined,
              perawatNama: resolvedTenagaMedis.perawatNama || undefined,
              ruangan: 'POLI UMUM',
            }
          : undefined,
      trajectory,
      hasVisitHistory,
    });

    const requestId = `rme-auto-${Date.now()}`;
    setTransferRunId(requestId);
    setLastTriggeredStep('anamnesa');
    setTransferUiState('running');
    setTransferError('');
    setTransferResult(null);
    setTransferSteps(makeInitialTransferSteps());
    setTransferReasonCodes(mapped.reasonCodes);

    try {
      const result = await sendMessage('transferRME', {
        ...mapped.payload,
        options: {
          ...mapped.payload.options,
          requestId,
          forceRun,
        },
        meta: {
          ...mapped.payload.meta,
          reasonCodes: mapped.reasonCodes,
        },
      });
      setTransferResult(result);
      setTransferRunId(result.runId);
      setTransferSteps(result.steps);
      setTransferReasonCodes(result.reasonCodes);
      setTransferUiState(mapTransferStateToUi(result.state));
      if (result.state !== 'success') {
        const firstReason = result.reasonCodes[0];
        setTransferError(
          firstReason ? REASON_CODE_LABELS[firstReason] : 'Transfer RME tidak sepenuhnya berhasil.'
        );
      }
    } catch (error) {
      setTransferUiState('failed');
      setTransferError(error instanceof Error ? error.message : 'Transfer RME gagal.');
    }
  };

  const handleCancelTransfer = async (): Promise<void> => {
    if (!transferRunId) return;
    try {
      await sendMessage('cancelRMETransfer', { runId: transferRunId });
      setTransferUiState('failed');
      setTransferError(REASON_CODE_LABELS.USER_CANCELLED);
    } catch (error) {
      setTransferUiState('failed');
      setTransferError(error instanceof Error ? error.message : 'Gagal membatalkan transfer.');
    }
  };

  const selectSuggestedDiagnosis = (item: RankedDiagnosis): void => {
    const normalizedIcd = normalizeIcdCode(item.suggestion.icd_x);
    const diagnosis: SelectedDiagnosis = {
      icd_x: normalizedIcd || item.suggestion.icd_x,
      nama: resolveDiagnosisDisplayName(
        normalizedIcd || item.suggestion.icd_x,
        item.suggestion.nama
      ),
      source: 'suggested',
      rank: item.rank,
    };

    let exceeded = false;
    setSelectedDiagnoses((prev) => {
      const exists = prev.some((entry) => diagnosisKey(entry) === diagnosisKey(diagnosis));
      if (exists) {
        return prev.filter((entry) => diagnosisKey(entry) !== diagnosisKey(diagnosis));
      }
      if (prev.length >= MAX_DIAGNOSIS_SELECTION) {
        exceeded = true;
        return prev;
      }
      return [...prev, diagnosis];
    });

    if (exceeded) {
      setTherapyState('error');
      setTherapyError(`Maksimal ${MAX_DIAGNOSIS_SELECTION} diagnosis dapat dipilih.`);
    } else {
      setTherapyError('');
    }

    // Audit the doctor's pick of a row the visit record offered (not the un-pick, not a
    // pick refused by the selection limit). The logger hashes the session id itself.
    const history = recurrentByIcd.get(icdRoot(diagnosis.icd_x));
    const isNewPick =
      !isDiagnosisSelected(diagnosis) && selectedDiagnoses.length < MAX_DIAGNOSIS_SELECTION;
    if (history && isNewPick) {
      void auditLogger.log('suggestion_selected', {
        session_id: patientRM ? `rm-${patientRM}` : 'rm-unknown',
        suggestions: [{ icd10_code: diagnosis.icd_x, confidence: item.suggestion.confidence }],
        metadata: {
          selected_icd: diagnosis.icd_x,
          source: 'riwayat',
          history_label: history.label,
          history_count: history.count,
          visits_considered: history.visitsConsidered,
        },
      });
    }
  };

  const selectManualDiagnosis = (): void => {
    const icd = normalizeIcdCode(manualIcd);
    if (!icd) {
      setTherapyState('error');
      setTherapyError('Kode ICD-X manual wajib diisi sebelum mengambil farmakoterapi.');
      return;
    }
    if (!isLikelyIcdCode(icd)) {
      setTherapyState('error');
      setTherapyError('Format ICD-X manual tidak valid. Contoh: I10, N18.9, E11.9.');
      return;
    }

    const resolvedName = resolveDiagnosisDisplayName(icd, manualName.trim() || undefined);
    const diagnosis: SelectedDiagnosis = {
      icd_x: icd,
      nama: resolvedName,
      source: 'manual',
    };

    setDoctorSelectedDiagnosis({ icd_x: icd, nama: resolvedName });
    setSelectedDiagnoses([diagnosis]);
    setIsPrimaryDiagnosisConfirmed(false);
    setTherapyError('');
    setManualIcd('');
    setManualName('');
  };

  const removeDiagnosis = (diagnosis: SelectedDiagnosis): void => {
    setSelectedDiagnoses((prev) =>
      prev.filter((entry) => diagnosisKey(entry) !== diagnosisKey(diagnosis))
    );
    setTherapyError('');
  };

  const handleToggleCandidateById = (id: string): void => {
    const item = impressionItems.find((candidate) => candidate.id === id);
    if (!item) return;
    selectSuggestedDiagnosis(item.raw);
  };

  const handleRemoveDiagnosisByKey = (key: string): void => {
    const diagnosis = selectedDiagnoses.find((item) => diagnosisKey(item) === key);
    if (!diagnosis) return;
    removeDiagnosis(diagnosis);
  };

  const handleToggleMedicationByKey = (key: string): void => {
    const medication = candidateTransferMedications.find(
      (item) => medicationSelectionKey(item) === key
    );
    if (!medication) return;
    toggleMedicationSelection(medication);
  };

  const handleRemoveManualMedicationByKey = (key: string): void => {
    const medication = manualMedications.find((item) => medicationSelectionKey(item) === key);
    if (!medication) return;
    removeManualMedication(medication);
  };

  const triageView: DiagnosisTriageView | null = useMemo(() => {
    if (!triageResult) return null;
    const presentation: Record<
      TriageDecisionResult['outcome'],
      { headline: string; tone: DiagnosisTriageView['tone'] }
    > = {
      emergency: { headline: 'Perlu tindakan darurat', tone: 'danger' },
      urgent_review: { headline: 'Perlu tinjauan segera', tone: 'warning' },
      refer: { headline: 'Pertimbangkan rujukan', tone: 'warning' },
      insufficient: { headline: 'Data belum cukup untuk triase', tone: 'default' },
      treat_locally: { headline: 'Dapat ditangani di layanan primer', tone: 'primary' },
    };
    const view = presentation[triageResult.outcome];
    return {
      outcome: triageResult.outcome,
      headline: view.headline,
      tone: view.tone,
      firedCriteria: triageResult.firedCriteria,
      referralGuidance: triageResult.referralGuidance,
    };
  }, [triageResult]);

  return (
    <>
      <DiagnosisStepFlow
        viewModel={diagnosisViewModel}
        phase={phase}
        triage={triageView}
        recurrentOnlyMessage={
          phase === 'ready' && !suggestionsFailed && suggestions.length === 0 && hasRecurrent
            ? 'Data hari ini belum cukup untuk engine; riwayat menunjukkan pola berikut.'
            : undefined
        }
        nextBestAction={nextBestAction}
        errorMessage={errorMsg}
        complaintSummary={keluhanUtama}
        secondaryComplaint={keluhanTambahan}
        showManualDiagnosisInput={showManualDiagnosisInput}
        manualIcd={manualIcd}
        manualName={manualName}
        showManualMedicationInput={showManualMedicationInput}
        manualMedicationDraft={manualMedicationDraft}
        manualMedicationOptions={MANUAL_ATURAN_PAKAI_OPTIONS}
        onCompleteData={onBack}
        onTogglePrimaryCandidate={() => {
          if (primaryImpression) selectSuggestedDiagnosis(primaryImpression.raw);
        }}
        onToggleManualDiagnosisInput={() => setShowManualDiagnosisInput((prev) => !prev)}
        onManualIcdChange={setManualIcd}
        onManualNameChange={setManualName}
        onSubmitManualDiagnosis={selectManualDiagnosis}
        onToggleCandidate={handleToggleCandidateById}
        onRemoveDiagnosis={handleRemoveDiagnosisByKey}
        onSelectAllMedications={selectAllRecommendedMedications}
        onClearMedications={clearSelectedMedications}
        onToggleManualMedicationInput={() => setShowManualMedicationInput((prev) => !prev)}
        onManualMedicationDraftChange={(field, value) =>
          updateManualMedicationDraft(field as keyof ManualMedicationDraft, value)
        }
        onAddManualMedication={addManualMedication}
        onToggleMedication={handleToggleMedicationByKey}
        onRemoveManualMedication={handleRemoveManualMedicationByKey}
        onAutoFillRME={() => {
          void handleAutoFillAll(false);
        }}
        onTransferDiagnosis={() => {
          void handleTransferToRME('diagnosa', false);
        }}
        onTransferResep={() => {
          void handleTransferToRME('resep', false);
        }}
        onTransferAnamnesa={() => {
          void handleTransferToRME('anamnesa', false);
        }}
        onRetryTransfer={() => {
          void handleTransferToRME(lastTriggeredStep, true);
        }}
        onCancelTransfer={() => {
          void handleCancelTransfer();
        }}
      />
    </>
  );
};
