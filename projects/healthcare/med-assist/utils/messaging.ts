// Designed and constructed by Drferdi.
/**
 * Precision-Architected. Future-Built by Docsyanpse
 * Sentra Healthcare Artificial Intelligence
 */

// Typed messaging definitions for Sentra Assist
// Based on SENTRA-SPEC-001 v1.2.0 Section 4.4
// Uses @webext-core/messaging for compile-time type safety

import { defineExtensionMessaging } from '@webext-core/messaging';
import { browser } from 'wxt/browser';

import type {
  AnamnesaFillPayload,
  DiagnosaFillPayload,
  Encounter,
  FillResult,
  PageReadyInfo,
  ResepFillPayload,
  RMETransferPayload,
  RMETransferResult,
  ScrapePayload,
  ScrapeRequest,
} from './types';

import type { MiraStatus } from '@/lib/diagnosis-engine/mira-supervisor';
import type { CDSSEngineStatus } from '@/lib/iskandar-diagnosis-engine/engine';
import type {
  QueueStatisticRow,
  ReferralStatisticRow,
  ShiftOverviewSnapshot,
  StatisticPageScanResult,
  StockStatisticRow,
} from '@/lib/statistics/types';
import type {
  APIResponse,
  CDSSAlert,
  CDSSResponse,
  DiagnosisRequestContext,
  DrugInteraction,
  PediatricDose,
  PediatricDoseRequest,
  PrescriptionRequestContext,
} from '@/types/api';

const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 60000;
const ALLOWED_ATURAN_PAKAI = new Set(['1', '2', '3', '4', '5']);

function toTimeout(rawValue: unknown, fallback: number): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.round(parsed)));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function asAturanPakai(value: unknown): Encounter['resep'][number]['aturan_pakai'] {
  if (typeof value === 'string' && ALLOWED_ATURAN_PAKAI.has(value)) {
    return value as Encounter['resep'][number]['aturan_pakai'];
  }
  return '3';
}

function asDiagnosaJenis(value: unknown): Encounter['diagnosa']['jenis'] {
  return value === 'SEKUNDER' ? 'SEKUNDER' : 'PRIMER';
}

function asDiagnosaKasus(value: unknown): Encounter['diagnosa']['kasus'] {
  return value === 'LAMA' ? 'LAMA' : 'BARU';
}

/**
 * ParseResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface ParseResult<T> {
  ok: boolean;
  reasons: string[];
  value?: T;
}

export const MESSAGE_TIMEOUTS = {
  default: toTimeout(import.meta.env.VITE_MESSAGE_TIMEOUT_DEFAULT, 10000),
  fill: toTimeout(import.meta.env.VITE_MESSAGE_TIMEOUT_FILL, 8000),
  scrape: toTimeout(import.meta.env.VITE_MESSAGE_TIMEOUT_SCRAPE, 5000),
  visitFetch: toTimeout(import.meta.env.VITE_MESSAGE_TIMEOUT_VISIT_FETCH, 15000),
  ai: toTimeout(import.meta.env.VITE_MESSAGE_TIMEOUT_AI, 30000),
} as const;

/**
 * TabMessageErrorKind type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type TabMessageErrorKind = 'TIMEOUT' | 'NO_RECEIVER' | 'TAB_CLOSED' | 'UNKNOWN';

/**
 * classifyTabMessageError
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function classifyTabMessageError(error: unknown): TabMessageErrorKind {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('timeout')) return 'TIMEOUT';
  if (
    normalized.includes('no content-script receiver') ||
    normalized.includes('receiving end does not exist') ||
    normalized.includes('could not establish connection') ||
    normalized.includes('message channel is closed') ||
    normalized.includes('moved into back/forward cache') ||
    normalized.includes('back/forward cache')
  ) {
    return 'NO_RECEIVER';
  }
  if (
    normalized.includes('no tab with id') ||
    normalized.includes('tab not found') ||
    normalized.includes('frame was removed')
  ) {
    return 'TAB_CLOSED';
  }

  return 'UNKNOWN';
}

// Message protocol interface
// All messages between Panel ↔ Worker ↔ Content
interface ProtocolMap {
  // ========================================
  // Panel → Worker → Content (Fill Commands)
  // ========================================
  fillResep(data: ResepFillPayload): Promise<FillResult>;
  fillAnamnesa(data: AnamnesaFillPayload): Promise<FillResult>;
  fillDiagnosa(data: DiagnosaFillPayload): Promise<FillResult>;
  transferRME(data: RMETransferPayload): Promise<RMETransferResult>;
  cancelRMETransfer(data: { runId: string }): Promise<{
    success: boolean;
    reasonCode?: string;
    message?: string;
  }>;

  // ========================================
  // Content → Worker (Status Updates)
  // ========================================
  pageReady(info: PageReadyInfo): Promise<void>;
  scrapeResult(data: ScrapePayload): Promise<void>;

  // ========================================
  // Worker → Content (Direct Commands)
  // ========================================
  execFill(cmd: {
    pageType: 'resep' | 'anamnesa' | 'diagnosa';
    payload: ResepFillPayload | AnamnesaFillPayload | DiagnosaFillPayload;
  }): Promise<FillResult>;
  execScrape(req: ScrapeRequest): Promise<ScrapePayload>;

  // ========================================
  // Worker → Panel (State Updates)
  // ========================================
  // Panel → Worker (CDSS AI Requests)
  // ========================================
  getSuggestions(context: DiagnosisRequestContext): Promise<APIResponse<CDSSResponse>>;
  getRecommendations(context: PrescriptionRequestContext): Promise<APIResponse<CDSSResponse>>;
  checkInteractions(drugs: string[]): Promise<APIResponse<DrugInteraction[]>>;
  checkAllergies(context: {
    medications: string[];
    allergies: string[];
  }): Promise<APIResponse<CDSSAlert[]>>;
  calculatePediatricDose(context: PediatricDoseRequest): Promise<APIResponse<PediatricDose>>;

  // ========================================
  // Panel → Worker (CDSS Engine Status)
  // ========================================
  getCDSSStatus(data: undefined): Promise<CDSSEngineStatus>;
  initializeCDSS(data: undefined): Promise<boolean>;
  miraEnsure(data: undefined): Promise<MiraStatus>;

  // ========================================
  // Panel → Worker → Content (Diagnostic)
  // ========================================
  scanFields(data: undefined): Promise<{
    success: boolean;
    error?: string;
    fields: Array<{
      tag: string;
      type: string;
      name: string;
      id: string;
      placeholder: string;
      className: string;
    }>;
  }>;

  // Panel → Worker → Content (Medical History Scan)
  scanMedicalHistory(data: undefined): Promise<{
    success: boolean;
    error?: string;
    history: Array<{
      code: string;
      description: string;
      shortLabel: string;
    }>;
  }>;

  // Panel → Worker → Content (Visit History Scan)
  scanVisitHistory(data: undefined): Promise<{
    success: boolean;
    error?: string;
    diagnostics?: string[];
    visits: Array<{
      encounter_id: string;
      date: string;
      vitals: {
        sbp: number;
        dbp: number;
        hr: number;
        rr: number;
        temp: number;
        glucose: number;
      };
      keluhan_utama: string;
      diagnosa: { icd_x: string; nama: string } | null;
    }>;
  }>;

  // Panel -> Worker -> Content (Clinical Context Scan)
  scanClinicalContext(data: undefined): Promise<{
    success: boolean;
    error?: string;
    context?: {
      facilityName?: string;
      payerLabel?: string;
      pregnancyRisk?: string;
      /** Parsed from ePuskesmas label (boolean | null); not a free-text PHI field */
      pregnancyStatus?: boolean | null;
      specialConditions?: string[];
      allergies?: string[];
    };
  }>;

  // Panel -> Worker -> Content (Vital Sign RME Extraction)
  scanVitalSigns(data: undefined): Promise<{
    success: boolean;
    error?: string;
    vitals?: {
      sbp?: string;
      dbp?: string;
      hr?: string;
      rr?: string;
      temp?: string;
      spo2?: string;
      glucose?: string;
    };
  }>;

  // Panel → Worker → Content (Tenaga Medis Resolver)
  resolveTenagaMedis(data: undefined): Promise<{
    success: boolean;
    error?: string;
    tenagaMedis?: {
      dokterNama: string;
      perawatNama: string;
      source: string[];
      capturedAt: string;
    };
  }>;

  // Content → Worker → Panel (Visit History Scraped Acknowledgment)
  visitHistoryScraped(data: {
    visits: Array<{
      encounter_id: string;
      date: string;
      vitals: {
        sbp: number;
        dbp: number;
        hr: number;
        rr: number;
        temp: number;
        glucose: number;
      };
      keluhan_utama: string;
      diagnosa: { icd_x: string; nama: string } | null;
    }>;
    timestamp: number;
    patientRM: string;
  }): Promise<void>;

  scanQueueStatistics(data: { page?: number }): Promise<StatisticPageScanResult<QueueStatisticRow>>;
  scanReferralStatistics(data: {
    page?: number;
  }): Promise<StatisticPageScanResult<ReferralStatisticRow>>;
  scanStockStatistics(data: { page?: number }): Promise<StatisticPageScanResult<StockStatisticRow>>;
  collectShiftOverview(data: {
    phases: Array<'phase1' | 'phase2'>;
  }): Promise<ShiftOverviewSnapshot>;
}

export const PROTOCOL_MESSAGE_NAMES = [
  'fillResep',
  'fillAnamnesa',
  'fillDiagnosa',
  'transferRME',
  'cancelRMETransfer',
  'pageReady',
  'scrapeResult',
  'execFill',
  'execScrape',
  'getSuggestions',
  'getRecommendations',
  'checkInteractions',
  'checkAllergies',
  'calculatePediatricDose',
  'getCDSSStatus',
  'initializeCDSS',
  'miraEnsure',
  'scanFields',
  'scanMedicalHistory',
  'scanVisitHistory',
  'scanClinicalContext',
  'scanVitalSigns',
  'resolveTenagaMedis',
  'visitHistoryScraped',
  'scanQueueStatistics',
  'scanReferralStatistics',
  'scanStockStatistics',
  'collectShiftOverview',
] as const satisfies readonly (keyof ProtocolMap)[];

export type ProtocolMessageName = (typeof PROTOCOL_MESSAGE_NAMES)[number];

type AssertNever<T extends never> = T;
export type ProtocolMessageNameCoverage = AssertNever<
  Exclude<keyof ProtocolMap, ProtocolMessageName>
>;
export type ProtocolMessageNameNoExtra = AssertNever<
  Exclude<ProtocolMessageName, keyof ProtocolMap>
>;

// Export typed messaging functions
export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

// Type guards for message validation
export function isResepPayload(payload: unknown): payload is ResepFillPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'static' in payload &&
    'ajax' in payload &&
    'medications' in payload
  );
}

/**
 * isAnamnesaPayload
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-02-04
 */

export function isAnamnesaPayload(payload: unknown): payload is AnamnesaFillPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'keluhan_utama' in payload &&
    'alergi' in payload
  );
}

/**
 * isDiagnosaPayload
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-02-04
 */

export function isDiagnosaPayload(payload: unknown): payload is DiagnosaFillPayload {
  return (
    typeof payload === 'object' && payload !== null && 'icd_x' in payload && 'jenis' in payload
  );
}

/**
 * sendMessageToTabWithTimeout
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export async function sendMessageToTabWithTimeout<T>(
  tabId: number,
  message: { type: string; data?: unknown; [key: string]: unknown },
  timeoutMs: number = MESSAGE_TIMEOUTS.default
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const normalizedMessage = {
    ...message,
    timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Message timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      browser.tabs.sendMessage(tabId, normalizedMessage),
      timeoutPromise,
    ]);
    return result as T;
  } catch (error) {
    const kind = classifyTabMessageError(error);
    if (kind === 'TIMEOUT') {
      throw new Error(`Tab communication timeout (${timeoutMs}ms) for "${normalizedMessage.type}"`);
    }
    if (kind === 'NO_RECEIVER') {
      throw new Error(`No content-script receiver for "${normalizedMessage.type}" on tab ${tabId}`);
    }
    if (kind === 'TAB_CLOSED') {
      throw new Error(`Target tab unavailable for "${normalizedMessage.type}" (tab ${tabId})`);
    }
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * parseAnamnesaData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function parseAnamnesaData(data: unknown): ParseResult<Encounter['anamnesa']> {
  const reasons: string[] = [];
  const candidate = asRecord(data);

  if (!candidate) {
    return { ok: false, reasons: ['anamnesa payload is not an object'] };
  }

  const keluhanUtama = asTrimmedString(candidate.keluhan_utama);
  if (!keluhanUtama) reasons.push('keluhan_utama is required');

  const lamaSakitInput = asRecord(candidate.lama_sakit);
  const alergiInput = asRecord(candidate.alergi);

  const normalized: Encounter['anamnesa'] = {
    keluhan_utama: keluhanUtama,
    keluhan_tambahan: asString(candidate.keluhan_tambahan, ''),
    lama_sakit: {
      thn: asNumber(lamaSakitInput?.thn, 0),
      bln: asNumber(lamaSakitInput?.bln, 0),
      hr: asNumber(lamaSakitInput?.hr, 0),
    },
    ...(typeof candidate.is_pregnant === 'boolean' ? { is_pregnant: candidate.is_pregnant } : {}),
    riwayat_penyakit:
      typeof candidate.riwayat_penyakit === 'string' ? candidate.riwayat_penyakit : null,
    alergi: {
      obat: asStringArray(alergiInput?.obat),
      makanan: asStringArray(alergiInput?.makanan),
      udara: asStringArray(alergiInput?.udara),
      lainnya: asStringArray(alergiInput?.lainnya),
    },
  };

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  return { ok: true, reasons, value: normalized };
}

/**
 * parseDiagnosaData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function parseDiagnosaData(data: unknown): ParseResult<Encounter['diagnosa']> {
  const reasons: string[] = [];
  const candidate = asRecord(data);

  if (!candidate) {
    return { ok: false, reasons: ['diagnosa payload is not an object'] };
  }

  const icdX = asTrimmedString(candidate.icd_x);
  if (!icdX) reasons.push('icd_x is required');

  const normalized: Encounter['diagnosa'] = {
    icd_x: icdX,
    nama: asString(candidate.nama, ''),
    jenis: asDiagnosaJenis(candidate.jenis),
    kasus: asDiagnosaKasus(candidate.kasus),
    prognosa: asString(candidate.prognosa, ''),
    penyakit_kronis: asStringArray(candidate.penyakit_kronis),
  };

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  return { ok: true, reasons, value: normalized };
}

/**
 * parseResepData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function parseResepData(data: unknown): ParseResult<Encounter['resep']> {
  if (!Array.isArray(data)) {
    return { ok: false, reasons: ['resep payload must be an array'] };
  }

  const reasons: string[] = [];
  const normalized: Encounter['resep'] = [];

  data.forEach((item, index) => {
    const candidate = asRecord(item);
    if (!candidate) {
      reasons.push(`item[${index}] is not an object`);
      return;
    }

    const namaObat = asTrimmedString(candidate.nama_obat);
    if (!namaObat) {
      reasons.push(`item[${index}].nama_obat is required`);
      return;
    }

    normalized.push({
      racikan: asString(candidate.racikan, ''),
      nama_obat: namaObat,
      jumlah: asNumber(candidate.jumlah, 0),
      signa: asString(candidate.signa, ''),
      aturan_pakai: asAturanPakai(candidate.aturan_pakai),
      keterangan: asString(candidate.keterangan, ''),
    });
  });

  if (data.length > 0 && normalized.length === 0) {
    return { ok: false, reasons: reasons.length > 0 ? reasons : ['no valid resep item found'] };
  }

  return { ok: true, reasons, value: normalized };
}

/**
 * isAnamnesaData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function isAnamnesaData(data: unknown): boolean {
  return parseAnamnesaData(data).ok;
}

/**
 * isDiagnosaData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function isDiagnosaData(data: unknown): boolean {
  return parseDiagnosaData(data).ok;
}

/**
 * isResepData
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function isResepData(data: unknown): boolean {
  return parseResepData(data).ok;
}
