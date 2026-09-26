// Designed and constructed by Drferdi.
/**
 * Resep Page Handler
 * Handles auto-fill for Resep/Prescription form in ePuskesmas
 */

import {
  ADD_ROW_BUTTON_SELECTORS,
  ATURAN_PAKAI_OPTIONS,
  getResepRowSelectors,
  RESEP_FIELDS,
} from '@/data/field-mappings';
import type { FillResult } from '@/lib/filler/filler-core';
import { fillAutocomplete, fillSelect, fillTextField } from '@/lib/filler/filler-core';
import { fillViaMainWorld, type MainWorldFieldMapping } from '@/lib/filler/main-world-bridge';
import { waitForElement } from '@/lib/scraper/dom-utils';
import { createLogger } from '@/utils/logger';
import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import type { AturanPakai, ResepFillPayload, ResepMedication } from '@/utils/types';

// =============================================================================
// TIMING CONSTANTS (PRD Section 10.1)
// =============================================================================
const DELAY_BETWEEN_ROWS = 800; // ms
const DELAY_AFTER_ADD_ROW = 1200; // ms
const DELAY_STOCK_CHECK = 1500; // ms (Critical for stock fetch)
const DELAY_SIGNA_LOOKUP = 1000; // ms (Wait for signa/aturan hooks)
const COMMIT_VERIFY_TIMEOUT = 3200; // ms
const COMMIT_VERIFY_POLL_INTERVAL = 160; // ms
const COMMIT_VERIFY_MAX_RETRIES = 2;

const ATURAN_PAKAI_ENTRIES = Object.entries(ATURAN_PAKAI_OPTIONS) as Array<[AturanPakai, string]>;
type ResepAddControl = HTMLButtonElement | HTMLAnchorElement | HTMLInputElement;
type MedicationFormPreference = 'solid' | 'liquid' | 'unknown';

/**
 * ResepRuntimeReasonCode type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export type ResepRuntimeReasonCode =
  | 'STOCK_INSUFFICIENT'
  | 'FORMULATION_MISMATCH'
  | 'SIGNA_INVALID'
  | 'COMMIT_TIMEOUT'
  | 'BF_CACHE_CHANNEL_CLOSED'
  | 'DUPLICATE_MEDICATION'
  | 'ROW_NOT_READY';

type ResepRowState =
  | 'init'
  | 'row_ready'
  | 'medication_selected'
  | 'fields_filled'
  | 'validated'
  | 'committed'
  | 'failed';

interface ResepRowTelemetryEvent {
  runId: string;
  rowIndex: number;
  rowState: ResepRowState;
  reasonCode?: ResepRuntimeReasonCode;
  candidate?: string;
  selectedName?: string;
  message?: string;
  timestamp: string;
}

const resepLog = createLogger('ResepHandler', 'content');

const STOCK_ALERT_SELECTORS = [
  '.alert',
  '.alert-danger',
  '.alert-warning',
  '.toast',
  '.toast-message',
  '.noty_body',
  '.noty_message',
  '.ui-pnotify-text',
  '.swal2-html-container',
  '.gritter-item',
];

const LIQUID_KEYWORDS = ['sirup', 'syrup', 'suspensi', 'drop', 'elixir', 'solution', 'ml'];
const SOLID_KEYWORDS = ['tablet', 'kaplet', 'kapsul', 'capsule', 'caplet', 'tab'];

const ROW_STATE_TRANSITIONS: Record<ResepRowState, ResepRowState[]> = {
  init: ['row_ready', 'failed'],
  row_ready: ['medication_selected', 'failed'],
  medication_selected: ['fields_filled', 'failed'],
  fields_filled: ['validated', 'failed'],
  validated: ['committed', 'failed'],
  committed: ['row_ready', 'failed'],
  failed: ['row_ready'],
};

const MEDICATION_NAME_ALIASES: Record<string, string[]> = {
  amoxicillin: ['amoksisilin'],
  amoksisilin: ['amoxicillin'],
  ampicillin: ['ampisilin'],
  ampisilin: ['ampicillin'],
  acyclovir: ['asiklovir'],
  aciclovir: ['asiklovir'],
  asiklovir: ['acyclovir', 'aciclovir'],
  azithromycin: ['azitromisin'],
  azitromisin: ['azithromycin'],
  chloramphenicol: ['kloramfenikol'],
  kloramfenikol: ['chloramphenicol'],
  clindamycin: ['klindamisin'],
  klindamisin: ['clindamycin'],
  cefadroxil: ['sefadroksil'],
  sefadroksil: ['cefadroxil'],
  paracetamol: ['parasetamol'],
  parasetamol: ['paracetamol'],
  acetaminophen: ['asetaminofen', 'parasetamol'],
  asetaminofen: ['acetaminophen', 'parasetamol'],
  'acetylsalicylic acid': ['asam asetilsalisilat', 'aspirin'],
  aspirin: ['asam asetilsalisilat'],
  'asam asetilsalisilat': ['acetylsalicylic acid', 'aspirin'],
  diclofenac: ['diklofenak'],
  diklofenak: ['diclofenac'],
  'mefenamic acid': ['asam mefenamat'],
  'asam mefenamat': ['mefenamic acid'],
  naproxen: ['naproksen'],
  naproksen: ['naproxen'],
  betamethasone: ['betametason'],
  betametason: ['betamethasone'],
  dexamethasone: ['deksametason'],
  deksametason: ['dexamethasone'],
  hydrocortisone: ['hidrokortison'],
  hidrokortison: ['hydrocortisone'],
  mometasone: ['mometason'],
  mometason: ['mometasone'],
  prednisone: ['prednison'],
  prednison: ['prednisone'],
  triamcinolone: ['triamsinolon'],
  triamsinolon: ['triamcinolone'],
  amlodipine: ['amlodipin'],
  amlodipin: ['amlodipine'],
  bisacodyl: ['bisakodil'],
  bisakodil: ['bisacodyl'],
  cetirizine: ['cetirizin'],
  cetirizin: ['cetirizine', 'setirizin'],
  setirizin: ['cetirizine', 'cetirizin'],
  captopril: ['kaptopril'],
  kaptopril: ['captopril'],
  cefixime: ['sefiksim'],
  sefiksim: ['cefixime'],
  ceftriaxone: ['seftriakson'],
  seftriakson: ['ceftriaxone'],
  ciprofloxacin: ['siprofloksasin'],
  siprofloksasin: ['ciprofloxacin'],
  erythromycin: ['eritromisin'],
  eritromisin: ['erythromycin'],
  gentamicin: ['gentamisin'],
  gentamisin: ['gentamicin'],
  nystatin: ['nistatin'],
  nistatin: ['nystatin'],
  oxytetracycline: ['oksitetrasiklin'],
  oksitetrasiklin: ['oxytetracycline'],
  rifampicin: ['rifampisin'],
  rifampisin: ['rifampicin'],
  chlorpheniramine: ['klorfeniramin', 'ctm'],
  klorfeniramin: ['chlorpheniramine', 'ctm'],
  ctm: ['chlorpheniramine', 'klorfeniramin'],
  'folic acid': ['asam folat'],
  'asam folat': ['folic acid'],
  hydrochlorothiazide: ['hidroklorotiazid'],
  hidroklorotiazid: ['hydrochlorothiazide'],
  methylprednisolone: ['metilprednisolon'],
  metilprednisolon: ['methylprednisolone'],
  theophylline: ['teofilin'],
  teofilin: ['theophylline'],
  tramadol: ['tramadol'],
  omeprazole: ['omeprazol'],
  omeprazol: ['omeprazole'],
  'vitamin c': ['asam askorbat'],
  'asam askorbat': ['vitamin c'],
};

function createRunId(): string {
  return `resep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitRowTelemetry(event: ResepRowTelemetryEvent): void {
  resepLog.debug('Row telemetry', event);
}

function transitionRowState(
  runId: string,
  rowIndex: number,
  current: ResepRowState,
  next: ResepRowState,
  info?: Omit<ResepRowTelemetryEvent, 'runId' | 'rowIndex' | 'rowState' | 'timestamp'>
): ResepRowState {
  const allowed = ROW_STATE_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    resepLog.warn('Invalid row state transition', { current, next, runId, rowIndex });
  }
  emitRowTelemetry({
    runId,
    rowIndex,
    rowState: next,
    timestamp: new Date().toISOString(),
    ...info,
  });
  return next;
}

function normalizeRacikanValue(raw: unknown): string {
  if (raw === true || raw === 'true') return '1';
  if (raw === false || raw === 'false') return '0';
  if (raw === undefined || raw === null || raw === '') return '0';
  return String(raw);
}

function normalizeAturanPakaiValue(raw: unknown): AturanPakai | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const exactCode = ATURAN_PAKAI_ENTRIES.find(([code]) => code === value);
  if (exactCode) return exactCode[0];

  const normalized = value.toLowerCase();
  const byLabel = ATURAN_PAKAI_ENTRIES.find(([, label]) => label.toLowerCase() === normalized);
  if (byLabel) return byLabel[0];

  return null;
}

function resolveAturanPakaiCandidates(raw: unknown): string[] {
  const normalized = normalizeAturanPakaiValue(raw);
  if (normalized) {
    const label = ATURAN_PAKAI_OPTIONS[normalized];
    return [normalized, label];
  }

  if (raw === undefined || raw === null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  return [text];
}

function getSelectedOptionValue(selector: string): string {
  const selectEl = document.querySelector(selector) as HTMLSelectElement | null;
  return selectEl?.value?.trim() || '';
}

async function fillAturanPakaiField(selector: string, rawValue: unknown): Promise<FillResult> {
  const candidates = resolveAturanPakaiCandidates(rawValue);
  if (candidates.length === 0) {
    return {
      success: true,
      field: `select:${selector}`,
      value: '',
      method: 'select',
    };
  }

  for (const candidate of candidates) {
    const attempt = await fillSelect(selector, candidate);
    if (!attempt.success) continue;

    const selected = getSelectedOptionValue(selector);
    if (selected) return attempt;
  }

  return {
    success: false,
    field: `select:${selector}`,
    value: String(rawValue ?? ''),
    method: 'select',
    error: 'Option not found for aturan_pakai',
  };
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSignaInput(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, '').replace(/[xX×]/g, 'x');
  const match = compact.match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return compact || '1x1';
  const left = Math.max(1, Number(match[1]));
  const right = Math.max(1, Number(match[2]));
  return `${left}x${right}`;
}

function isValidSignaFormat(value: string): boolean {
  return /^\d+x\d+$/i.test(value.trim());
}

function getInputValue(selector: string): string {
  const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
  return el?.value?.trim() || '';
}

function hasIndexedResepLayout(): boolean {
  const probes = [
    'input[name*="obat_nama["]',
    'input[name*="ResepDetail["][name*="[obat_nama]"]',
    'input[name*="resepdetail["][name*="[obat_nama]"]',
  ];
  return probes.some((selector) => Boolean(document.querySelector(selector)));
}

function generateOrthographicMedicationVariants(rawValue: string): string[] {
  const base = rawValue.trim().replace(/\s+/g, ' ');
  if (!base) return [];

  const tokens = base.split(' ');
  const variants = new Set<string>();
  const transformToken = (token: string): string[] => {
    const lower = token.toLowerCase();
    const transformed = new Set<string>();

    if (/^c[aeiouyrl]/.test(lower)) transformed.add(`k${token.slice(1)}`);
    if (/^c[eiy]/.test(lower)) transformed.add(`s${token.slice(1)}`);
    if (/^k[aeiouyrl]/.test(lower)) transformed.add(`c${token.slice(1)}`);
    if (/^s[eiy]/.test(lower)) transformed.add(`c${token.slice(1)}`);
    if (lower.includes('ph')) transformed.add(token.replace(/ph/gi, 'f'));
    if (lower.includes('x')) transformed.add(token.replace(/x/gi, 'ks'));
    if (lower.includes('y')) transformed.add(token.replace(/y/gi, 'i'));
    if (lower.length > 4 && lower.endsWith('e')) transformed.add(token.slice(0, -1));

    return Array.from(transformed);
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const transformedTokens = transformToken(token);
    for (const nextToken of transformedTokens) {
      const nextTokens = [...tokens];
      nextTokens[i] = nextToken;
      variants.add(nextTokens.join(' '));
    }
  }

  return Array.from(variants);
}

function buildMedicationNameCandidates(rawName: string): string[] {
  const base = rawName.trim();
  if (!base) return [];
  const candidates: string[] = [base];

  const stripDose = (value: string): string =>
    value
      .replace(/\b\d+\s*(mg|ml|mcg|g|gr|iu)\b/gi, ' ')
      .replace(/\b\d+\/\d+\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const removeParen = (value: string): string =>
    value.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

  const pushCandidate = (value: string) => {
    if (!value || value.length < 2) return;
    if (!candidates.includes(value)) candidates.push(value);
  };

  pushCandidate(stripDose(base));
  pushCandidate(removeParen(base));
  pushCandidate(stripDose(removeParen(base)));

  for (const [term, aliases] of Object.entries(MEDICATION_NAME_ALIASES)) {
    const matcher = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
    if (!matcher.test(base)) continue;

    for (const alias of aliases) {
      const replaced = base.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, 'ig'), alias);
      pushCandidate(replaced);
      pushCandidate(stripDose(replaced));
      pushCandidate(removeParen(replaced));
      pushCandidate(stripDose(removeParen(replaced)));
    }
  }

  for (const variant of generateOrthographicMedicationVariants(base)) {
    pushCandidate(variant);
    pushCandidate(stripDose(variant));
    pushCandidate(removeParen(variant));
    pushCandidate(stripDose(removeParen(variant)));
  }

  const compactName = stripDose(removeParen(base));
  const formPreference = detectPreferredMedicationForm(base);
  if (compactName.length >= 2) {
    if (formPreference === 'solid' || formPreference === 'unknown') {
      pushCandidate(`${compactName} tablet`);
      pushCandidate(`${compactName} kaplet`);
      pushCandidate(`${compactName} kapsul`);
    }
    if (formPreference === 'liquid') {
      pushCandidate(`${compactName} sirup`);
      pushCandidate(`${compactName} suspensi`);
      pushCandidate(`${compactName} drop`);
    }
  }

  return rankMedicationNameCandidates(base, candidates);
}

function normalizeMedicationLabel(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized
    .replace(/\bph/g, 'f')
    .replace(/x/g, 'ks')
    .replace(/y/g, 'i')
    .replace(/\bc(?=[eiy])/g, 's')
    .replace(/\bc(?=[aouklnrt])/g, 'k')
    .replace(/\b([a-z]{4,})e\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractDoseMgValues(value: string): number[] {
  const normalized = normalizeMedicationLabel(value);
  const values: number[] = [];
  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*mg\b/g)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) values.push(parsed);
  }
  return values;
}

/**
 * detectPreferredMedicationForm
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function detectPreferredMedicationForm(value: string): MedicationFormPreference {
  const normalized = normalizeMedicationLabel(value);
  if (!normalized) return 'unknown';
  if (hasKeyword(normalized, LIQUID_KEYWORDS) || /\bmg\s*\/\s*\d+\s*ml\b/.test(normalized)) {
    return 'liquid';
  }
  if (hasKeyword(normalized, SOLID_KEYWORDS)) return 'solid';
  const mgValues = extractDoseMgValues(value);
  return mgValues.length > 0 ? 'solid' : 'unknown';
}

function isLiquidMedicationLabel(value: string): boolean {
  const normalized = normalizeMedicationLabel(value);
  return hasKeyword(normalized, LIQUID_KEYWORDS);
}

function extractMedicationTokens(value: string): string[] {
  const stopwords = new Set(['mg', 'ml', 'tablet', 'tab', 'kaplet', 'kapsul', 'sirup', 'syrup']);
  return normalizeMedicationLabel(value)
    .split(' ')
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token));
}

/**
 * scoreMedicationNameCandidate
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function scoreMedicationNameCandidate(requestedName: string, candidate: string): number {
  const requestedNorm = normalizeMedicationLabel(requestedName);
  const candidateNorm = normalizeMedicationLabel(candidate);
  if (!requestedNorm || !candidateNorm) return -999;

  let score = 0;
  if (requestedNorm === candidateNorm) score += 120;
  else if (candidateNorm.includes(requestedNorm) || requestedNorm.includes(candidateNorm))
    score += 80;

  const requestedTokens = extractMedicationTokens(requestedName);
  const candidateTokens = extractMedicationTokens(candidate);
  if (requestedTokens.length > 0 && candidateTokens.length > 0) {
    const overlap = requestedTokens.filter((token) => candidateTokens.includes(token)).length;
    score += (overlap / requestedTokens.length) * 70;
    if (overlap === 0) score -= 40;
  }

  const requestedForm = detectPreferredMedicationForm(requestedName);
  const candidateForm = detectPreferredMedicationForm(candidate);
  if (requestedForm === 'solid' && candidateForm === 'unknown') score -= 45;
  if (requestedForm === 'solid' && candidateForm === 'liquid') score -= 80;
  if (requestedForm === 'liquid' && candidateForm === 'solid') score -= 45;
  if (requestedForm !== 'unknown' && requestedForm === candidateForm) score += 45;

  const requestedMg = extractDoseMgValues(requestedName);
  const candidateMg = extractDoseMgValues(candidate);
  if (requestedMg.length > 0 && candidateMg.length > 0) {
    const exact = requestedMg.some((expected) =>
      candidateMg.some((actual) => Math.abs(actual - expected) < 0.5)
    );
    if (exact) score += 24;
    else score -= 18;
  }
  if (requestedMg.length > 0 && candidateMg.length === 0 && candidateForm === 'unknown') {
    score -= 25;
  }

  return score;
}

/**
 * rankMedicationNameCandidates
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function rankMedicationNameCandidates(
  requestedName: string,
  rawCandidates: string[]
): string[] {
  const unique = Array.from(new Set(rawCandidates.filter(Boolean)));
  const ranked = unique
    .map((candidate) => ({
      candidate,
      score: scoreMedicationNameCandidate(requestedName, candidate),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.candidate.length - b.candidate.length;
    })
    .map((item) => item.candidate);
  return ranked.slice(0, 12);
}

function isMedicationSelectionValid(actualValue: string, expectedValue: string): boolean {
  const actualNorm = normalizeMedicationLabel(actualValue);
  if (!actualNorm) return false;
  const expectedNorm = normalizeMedicationLabel(expectedValue);
  const expectedLiquid = isLiquidMedicationLabel(expectedNorm);
  const actualLiquid = isLiquidMedicationLabel(actualNorm);
  if (!expectedLiquid && actualLiquid) return false;

  const expectedTokens = extractMedicationTokens(expectedValue);
  if (expectedTokens.length === 0) {
    if (expectedNorm.length < 3) return false;
    return actualNorm.includes(expectedNorm);
  }

  return expectedTokens.some((token) => actualNorm.includes(token));
}

function isSameMedicationName(a: string, b: string): boolean {
  const an = normalizeMedicationLabel(a);
  const bn = normalizeMedicationLabel(b);
  if (!an || !bn) return false;
  return an === bn;
}

/**
 * isStockInsufficientAlert
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function isStockInsufficientAlert(text: string): boolean {
  const normalized = normalizeMedicationLabel(text);
  if (!normalized) return false;
  const hasStockCue =
    normalized.includes('stok obat') ||
    (normalized.includes('stok') && normalized.includes('obat'));
  const hasFailureCue =
    normalized.includes('tidak mencukupi') ||
    normalized.includes('tidak cukup') ||
    normalized.includes('silahkan pilih obat lain') ||
    normalized.includes('pilih obat lain');
  return hasStockCue && hasFailureCue;
}

/**
 * extractMedicationNameFromStockAlert
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function extractMedicationNameFromStockAlert(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const patterns = [
    /stok obat\s+(.+?)\s+di ruangan/i,
    /stok obat\s+(.+?)\s+tidak\s+(?:mencukupi|cukup)/i,
  ];
  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function isVisibleElement(element: Element | null): element is HTMLElement {
  return Boolean(
    element instanceof HTMLElement &&
    element.isConnected &&
    !element.hasAttribute('disabled') &&
    element.offsetParent !== null
  );
}

function getButtonLabel(button: ResepAddControl): string {
  const raw = button instanceof HTMLInputElement ? button.value : button.textContent;
  return (raw || '').trim().toLowerCase();
}

function getNearbyContextText(element: Element): string {
  const area = element.closest('table, form, .panel, .box, .card, .content, .row');
  return (area?.textContent || '').toLowerCase();
}

function getResepAnchorElement(): Element | null {
  const selectors = [
    'input[placeholder*="Nama Obat"]',
    'input[name*="obat_nama"]',
    'input[name*="[obat_nama]"]',
    'input[name*="resepdetail"][name*="obat_nama"]',
    'input[placeholder*="Cari Resep"]',
    'select[name*="aturan_pakai"]',
  ];

  for (const selector of selectors) {
    const found = document.querySelector(selector);
    if (isVisibleElement(found)) return found;
  }
  return null;
}

function clickElementLikeHuman(target: ResepAddControl): void {
  const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  for (const type of events) {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
  }
}

function findAddResepButton(): ResepAddControl | null {
  const anchor = getResepAnchorElement();
  const localScope = anchor?.closest('table, form, .panel, .box, .card, .content, .row') || null;

  if (localScope) {
    for (const selector of ADD_ROW_BUTTON_SELECTORS) {
      const localDirect = localScope.querySelector(selector);
      if (!isVisibleElement(localDirect)) continue;
      if (
        localDirect instanceof HTMLButtonElement ||
        localDirect instanceof HTMLAnchorElement ||
        localDirect instanceof HTMLInputElement
      ) {
        return localDirect;
      }
    }
  }

  for (const selector of ADD_ROW_BUTTON_SELECTORS) {
    const direct = document.querySelector(selector);
    if (!isVisibleElement(direct)) continue;
    if (
      direct instanceof HTMLButtonElement ||
      direct instanceof HTMLAnchorElement ||
      direct instanceof HTMLInputElement
    ) {
      return direct;
    }
  }

  const collectCandidates = (root: ParentNode): ResepAddControl[] =>
    Array.from(
      root.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"]')
    ).filter((el): el is ResepAddControl => {
      if (!(
        el instanceof HTMLButtonElement ||
        el instanceof HTMLAnchorElement ||
        el instanceof HTMLInputElement
      )) {
        return false;
      }
      if (!isVisibleElement(el)) return false;
      const label = getButtonLabel(el);
      return label === 'tambah' || label === 'simpan';
    });

  const localCandidates = localScope ? collectCandidates(localScope) : [];
  if (localCandidates.length > 0) {
    return localCandidates[0];
  }

  const candidates = collectCandidates(document);

  const best = candidates
    .map((candidate) => {
      const id = (candidate.id || '').toLowerCase();
      const className = (candidate.className || '').toLowerCase();
      const nearby = getNearbyContextText(candidate);
      let score = 0;
      if (nearby.includes('resep') || nearby.includes('nama obat')) score += 100;
      if (nearby.includes('signa') || nearby.includes('aturan pakai')) score += 30;
      if (
        id.includes('tambah') ||
        className.includes('btn-add') ||
        className.includes('btn-tambah')
      )
        score += 20;
      if (getButtonLabel(candidate) === 'tambah') score += 10;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  return best && best.score > 0 ? best.candidate : null;
}

async function clickAddResepButton(): Promise<boolean> {
  const button = findAddResepButton();
  if (!button) return false;
  clickElementLikeHuman(button);
  if (button instanceof HTMLInputElement && button.type === 'submit') {
    button.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
  button.click();
  await waitMs(500);
  return true;
}

function isRenderableNotificationElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  if (!element.isConnected) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
    return false;
  return true;
}

function collectVisibleNotificationTexts(): string[] {
  const notifications = STOCK_ALERT_SELECTORS.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
  )
    .filter(isRenderableNotificationElement)
    .map((element) => element.textContent?.trim() || '')
    .filter(Boolean);
  return Array.from(new Set(notifications));
}

function detectNewStockIssue(
  baselineNotifications: string[],
  selectedName: string,
  attemptedCandidate: string
): { hasIssue: boolean; alertText?: string } {
  const baseline = new Set(baselineNotifications);
  const current = collectVisibleNotificationTexts();
  const freshAlerts = current.filter((text) => !baseline.has(text));
  const inspectedAlerts = freshAlerts.length > 0 ? freshAlerts : current;
  const selectedTokens = extractMedicationTokens(selectedName || attemptedCandidate);

  for (const text of inspectedAlerts) {
    if (!isStockInsufficientAlert(text)) continue;
    const extractedMedication = extractMedicationNameFromStockAlert(text);
    if (!extractedMedication) {
      return { hasIssue: true, alertText: text };
    }
    const extractedNorm = normalizeMedicationLabel(extractedMedication);
    const selectedNorm = normalizeMedicationLabel(selectedName || attemptedCandidate);
    if (!selectedNorm) return { hasIssue: true, alertText: text };
    if (extractedNorm.includes(selectedNorm) || selectedNorm.includes(extractedNorm)) {
      return { hasIssue: true, alertText: text };
    }
    if (selectedTokens.some((token) => extractedNorm.includes(token))) {
      return { hasIssue: true, alertText: text };
    }
  }

  return { hasIssue: false };
}

interface RowDraftSignature {
  nama: string;
  signa: string;
  jumlah: string;
}

function getRowDraftSignature(
  selector: ReturnType<typeof getResepRowSelectors>
): RowDraftSignature {
  return {
    nama: getInputValue(selector.obat_nama),
    signa: getInputValue(selector.obat_signa),
    jumlah: getInputValue(selector.obat_jumlah),
  };
}

function isRowDraftCleared(selector: ReturnType<typeof getResepRowSelectors>): boolean {
  const signature = getRowDraftSignature(selector);
  return !signature.nama && !signature.signa && !signature.jumlah;
}

function countFilledMedicationDrafts(): number {
  const selectors = [
    'input[name*="obat_nama["]',
    'input[name*="[obat_nama]"]',
    'input[name="obat_nama"]',
  ];

  return selectors
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
    .filter((input) => input.value.trim().length > 0).length;
}

function hasNextRowInput(currentRowIndex: number): boolean {
  const nextSelector = getResepRowSelectors(currentRowIndex + 1).obat_nama;
  return Boolean(document.querySelector(nextSelector));
}

async function waitForCommitEvidence(
  rowIndex: number,
  selector: ReturnType<typeof getResepRowSelectors>,
  beforeSignature: RowDraftSignature,
  beforeFilledCount: number,
  timeoutMs: number
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (isRowDraftCleared(selector)) return true;
    const nowSignature = getRowDraftSignature(selector);
    if (
      nowSignature.nama !== beforeSignature.nama ||
      nowSignature.signa !== beforeSignature.signa ||
      nowSignature.jumlah !== beforeSignature.jumlah
    ) {
      return true;
    }
    if (countFilledMedicationDrafts() > beforeFilledCount) return true;
    if (hasNextRowInput(rowIndex)) return true;
    await waitMs(COMMIT_VERIFY_POLL_INTERVAL);
  }
  return false;
}

async function commitRowWithVerification(
  rowIndex: number,
  selector: ReturnType<typeof getResepRowSelectors>
): Promise<{ ok: boolean; reasonCode?: ResepRuntimeReasonCode; message: string }> {
  for (let attempt = 1; attempt <= COMMIT_VERIFY_MAX_RETRIES; attempt++) {
    const beforeSignature = getRowDraftSignature(selector);
    const beforeFilledCount = countFilledMedicationDrafts();
    const clicked = await clickAddResepButton();
    if (!clicked) {
      return {
        ok: false,
        reasonCode: 'COMMIT_TIMEOUT',
        message: 'Tombol Tambah tidak ditemukan saat commit resep.',
      };
    }

    const committed = await waitForCommitEvidence(
      rowIndex,
      selector,
      beforeSignature,
      beforeFilledCount,
      COMMIT_VERIFY_TIMEOUT
    );
    if (committed) {
      return { ok: true, message: `Commit row berhasil pada attempt ${attempt}.` };
    }
  }

  return {
    ok: false,
    reasonCode: 'COMMIT_TIMEOUT',
    message: 'Commit row timeout: evidence perubahan baris tidak terdeteksi.',
  };
}

async function fillSignaField(selector: string, value: string): Promise<FillResult> {
  const normalizedValue = normalizeSignaInput(value);
  const bridgeAttempt = await fillViaMainWorld(
    [{ selector, value: normalizedValue, type: 'autocomplete', autocompleteTimeout: 2200 }],
    7000,
    120
  );
  if (bridgeAttempt.success.length > 0) {
    const ok = bridgeAttempt.success[0];
    return {
      success: true,
      field: ok.field || `autocomplete:${selector}`,
      value: ok.value || normalizedValue,
      method: 'autocomplete',
    };
  }

  const autocompleteResult = await fillAutocomplete(selector, normalizedValue, {
    timeout: 1500,
    typeDelay: 40,
    retries: 2,
  });
  if (autocompleteResult.success) return autocompleteResult;

  const fallbackTextResult = await fillTextField(selector, normalizedValue);
  if (fallbackTextResult.success) return fallbackTextResult;

  const bridgeError = bridgeAttempt.failed[0]?.error || 'Bridge signa fill failed';
  return {
    ...fallbackTextResult,
    error: `${bridgeError} | ${autocompleteResult.error || 'Autocomplete signa failed'} | ${fallbackTextResult.error || 'Text fallback failed'}`,
  };
}

async function ensureRequiredRowFields(
  selector: ReturnType<typeof getResepRowSelectors>,
  med: ResepFillPayload['medications'][number]
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  const namaValue = getInputValue(selector.obat_nama);
  if (!namaValue) {
    errors.push('nama_obat kosong');
  }

  const expectedSigna = normalizeSignaInput(String(med.signa || '1x1'));
  const signaValue = normalizeSignaInput(getInputValue(selector.obat_signa) || expectedSigna);
  if (!isValidSignaFormat(signaValue)) {
    const retry = await fillSignaField(selector.obat_signa, expectedSigna);
    if (
      !retry.success ||
      !isValidSignaFormat(normalizeSignaInput(getInputValue(selector.obat_signa)))
    ) {
      errors.push('signa invalid');
    }
  }

  return { ok: errors.length === 0, errors };
}

function inferRuntimeReasonCode(
  errorMessage: string,
  fallback?: ResepRuntimeReasonCode
): ResepRuntimeReasonCode | undefined {
  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes('back/forward cache') ||
    normalized.includes('message channel is closed')
  ) {
    return 'BF_CACHE_CHANNEL_CLOSED';
  }
  if (
    normalized.includes('stok') &&
    (normalized.includes('mencukupi') || normalized.includes('cukup'))
  ) {
    return 'STOCK_INSUFFICIENT';
  }
  if (normalized.includes('mismatch')) return 'FORMULATION_MISMATCH';
  if (normalized.includes('duplikasi')) return 'DUPLICATE_MEDICATION';
  if (normalized.includes('signa')) return 'SIGNA_INVALID';
  if (normalized.includes('commit') || normalized.includes('tambah')) return 'COMMIT_TIMEOUT';
  return fallback;
}

function withReasonCode(errorMessage: string, reasonCode?: ResepRuntimeReasonCode): string {
  return reasonCode ? `[${reasonCode}] ${errorMessage}` : errorMessage;
}

function isSuccessfulFillResult(result: FillResult | null): result is FillResult {
  return Boolean(result && result.success);
}

interface ScrapedResepData {
  medications: ResepMedication[];
  alergi?: string;
  berat_badan?: string;
  tinggi_badan?: string;
}

// =============================================================================
// MAIN FILL FUNCTION - CASCADING ROW FILLER
// =============================================================================

/**
 * Fill Resep form with medication list
 * Implements strict cascading timing to handle dynamic row addition and AJAX
 */
export async function fillResepForm(payload: ResepFillPayload): Promise<{
  success: FillResult[];
  failed: FillResult[];
  skipped: string[];
}> {
  console.warn('[ResepHandler] Starting fill cascade...');

  const result = {
    success: [] as FillResult[],
    failed: [] as FillResult[],
    skipped: [] as string[],
  };

  const startTime = Date.now();
  const runId = createRunId();
  const totalRows = payload.medications.length;
  let useSingleEntryFlow = false;
  let lastCommittedMedicationName = '';
  const pushFailedResult = (
    rowIndex: number,
    failure: FillResult,
    reasonCode?: ResepRuntimeReasonCode,
    candidate?: string,
    selectedName?: string
  ): void => {
    const enriched = {
      ...failure,
      error: withReasonCode(failure.error || 'Unknown row failure', reasonCode),
    };
    result.failed.push(enriched);
    emitRowTelemetry({
      runId,
      rowIndex,
      rowState: 'failed',
      reasonCode,
      candidate,
      selectedName,
      message: enriched.error,
      timestamp: new Date().toISOString(),
    });
  };

  try {
    // 0. Fill Global Fields (Alergi, BB, TB) if present
    if (payload.static?.no_resep) {
      const noResepResult = await fillTextField(
        RESEP_FIELDS.no_resep.selector,
        payload.static.no_resep
      );
      if (noResepResult.success) result.success.push(noResepResult);
      else result.failed.push(noResepResult);
    }

    const legacyPayload = payload as ResepFillPayload & {
      alergi?: string;
      berat_badan?: string | number;
      tinggi_badan?: string | number;
    };
    const alergiText = payload.static?.alergi || legacyPayload.alergi;
    if (alergiText) {
      await fillTextField(RESEP_FIELDS.alergi.selector, alergiText);
    }
    const beratBadanSelector = RESEP_FIELDS.berat_badan?.selector;
    if (legacyPayload.berat_badan && beratBadanSelector) {
      await fillTextField(beratBadanSelector, String(legacyPayload.berat_badan));
    }
    const tinggiBadanSelector = RESEP_FIELDS.tinggi_badan?.selector;
    if (legacyPayload.tinggi_badan && tinggiBadanSelector) {
      await fillTextField(tinggiBadanSelector, String(legacyPayload.tinggi_badan));
    }

    if (payload.prioritas) {
      const prioritasResult = await fillSelect(RESEP_FIELDS.prioritas.selector, payload.prioritas);
      if (prioritasResult.success) result.success.push(prioritasResult);
      else result.failed.push(prioritasResult);
    }

    // 0b. Fill AJAX global fields through MAIN world bridge (jQuery-aware).
    // Dokter/perawat hardcoded per Chief directive — always override payload.
    const ajaxMappings: MainWorldFieldMapping[] = [
      {
        selector: RESEP_FIELDS.dokter_nama_bpjs.selector,
        value: DOKTER_NAMA,
        type: 'autocomplete',
        autocompleteTimeout: 4000,
      },
      {
        selector: RESEP_FIELDS.perawat_nama.selector,
        value: PERAWAT_NAMA,
        type: 'autocomplete',
        autocompleteTimeout: 4000,
      },
    ];

    if (ajaxMappings.length > 0) {
      const bridgeResult = await fillViaMainWorld(ajaxMappings, 25000, 220);
      for (const ok of bridgeResult.success) {
        result.success.push({
          success: true,
          field: ok.field,
          value: ok.value,
          method: 'autocomplete',
        });
      }

      for (const failedBridge of bridgeResult.failed) {
        const fallbackResult = await fillAutocomplete(failedBridge.field, failedBridge.value, {
          timeout: 2500,
          typeDelay: 60,
          retries: 2,
        });
        if (fallbackResult.success) {
          result.success.push(fallbackResult);
        } else {
          result.failed.push({
            ...fallbackResult,
            error: `${failedBridge.error || 'Bridge fill failed'} | ${fallbackResult.error || 'Fallback failed'}`,
          });
        }
      }
    }

    // Iterate through medications
    for (let i = 0; i < totalRows; i++) {
      const med = payload.medications[i];
      const rowIdx = useSingleEntryFlow ? 0 : i;
      let sel = getResepRowSelectors(rowIdx);
      const rowNum = i + 1;
      let rowState: ResepRowState = 'init';

      console.warn(`[ResepHandler] Processing row ${rowNum}/${totalRows}: ${med.nama_obat}`);

      rowState = transitionRowState(runId, rowNum, rowState, 'row_ready', {
        message: `Row ${rowNum} started`,
      });

      // STEP 1: Ensure Row Exists
      if (!useSingleEntryFlow && i > 0) {
        const rowReady = await ensureRowExists(i);
        if (!rowReady) {
          if (hasIndexedResepLayout()) {
            pushFailedResult(
              rowNum,
              {
                success: false,
                field: `row:${rowNum}`,
                value: med.nama_obat,
                method: 'direct',
                error: 'Gagal menambah baris indexed resep',
              },
              'ROW_NOT_READY'
            );
            break;
          }

          useSingleEntryFlow = true;
          sel = getResepRowSelectors(0);
          console.warn(
            '[ResepHandler] Switching to single-entry flow (row fields reused after Tambah)'
          );
        } else {
          await waitMs(DELAY_AFTER_ADD_ROW);
        }
      }

      // STEP 2: Fill Nama Obat (Autocomplete + stock-aware candidate retry)
      const nameCandidates = buildMedicationNameCandidates(String(med.nama_obat));
      const rejectedCandidates = new Set<string>();
      let namaResult: FillResult | null = null;
      let selectedMedicationName = '';

      const tryFillMedicationName = async (candidateSelector: string): Promise<boolean> => {
        const normalizedCandidate = normalizeMedicationLabel(candidateSelector);
        if (!normalizedCandidate || rejectedCandidates.has(normalizedCandidate)) return false;

        const baselineNotifications = collectVisibleNotificationTexts();
        const attempt = await fillAutocomplete(sel.obat_nama, candidateSelector, {
          timeout: 3200,
          typeDelay: 65,
          allowFirstItemFallback: false,
          requireDropdownSelection: true,
          ignoreExistingDropdown: true,
        });
        if (!attempt.success) {
          namaResult = attempt;
          const reason = inferRuntimeReasonCode(attempt.error || '', 'FORMULATION_MISMATCH');
          emitRowTelemetry({
            runId,
            rowIndex: rowNum,
            rowState: 'row_ready',
            reasonCode: reason,
            candidate: candidateSelector,
            message: attempt.error,
            timestamp: new Date().toISOString(),
          });
          rejectedCandidates.add(normalizedCandidate);
          return false;
        }

        const selectedName = getInputValue(sel.obat_nama);
        if (!isMedicationSelectionValid(selectedName, candidateSelector)) {
          namaResult = {
            success: false,
            field: attempt.field,
            value: selectedName || candidateSelector,
            method: 'autocomplete',
            error: `Nama obat mismatch setelah autocomplete (target: ${candidateSelector}, actual: ${selectedName || '-'})`,
          };
          rejectedCandidates.add(normalizedCandidate);
          return false;
        }
        if (i > 0 && isSameMedicationName(selectedName, lastCommittedMedicationName)) {
          namaResult = {
            success: false,
            field: attempt.field,
            value: selectedName || candidateSelector,
            method: 'autocomplete',
            error: `Duplikasi obat terdeteksi dengan row sebelumnya: ${selectedName || '-'}`,
          };
          rejectedCandidates.add(normalizedCandidate);
          return false;
        }

        await waitMs(DELAY_STOCK_CHECK);
        const stockIssue = detectNewStockIssue(
          baselineNotifications,
          selectedName,
          candidateSelector
        );
        if (stockIssue.hasIssue) {
          namaResult = {
            success: false,
            field: attempt.field,
            value: selectedName || candidateSelector,
            method: 'autocomplete',
            error:
              stockIssue.alertText ||
              `Stok tidak mencukupi untuk ${selectedName || candidateSelector}`,
          };
          rejectedCandidates.add(normalizedCandidate);
          emitRowTelemetry({
            runId,
            rowIndex: rowNum,
            rowState: 'row_ready',
            reasonCode: 'STOCK_INSUFFICIENT',
            candidate: candidateSelector,
            selectedName,
            message: stockIssue.alertText,
            timestamp: new Date().toISOString(),
          });
          return false;
        }

        namaResult = attempt;
        selectedMedicationName = selectedName || candidateSelector;
        return true;
      };

      for (const nameCandidate of nameCandidates) {
        const selected = await tryFillMedicationName(nameCandidate);
        if (selected) break;
      }

      let namaResultOk = isSuccessfulFillResult(namaResult);

      if (!namaResultOk && !useSingleEntryFlow && i > 0) {
        const singleSel = getResepRowSelectors(0);
        useSingleEntryFlow = true;
        sel = singleSel;
        console.warn(
          '[ResepHandler] Row-index selector unavailable, fallback to single-entry selector'
        );

        for (const nameCandidate of nameCandidates) {
          const selected = await tryFillMedicationName(nameCandidate);
          if (selected) break;
        }
      }

      namaResultOk = isSuccessfulFillResult(namaResult);
      if (!namaResultOk) {
        const fallbackFailure =
          namaResult ||
          ({
            success: false,
            field: sel.obat_nama,
            value: med.nama_obat,
            method: 'autocomplete',
            error: 'Nama obat kandidat kosong',
          } as FillResult);
        const reasonCode = inferRuntimeReasonCode(
          fallbackFailure.error || '',
          fallbackFailure.error?.toLowerCase().includes('stok')
            ? 'STOCK_INSUFFICIENT'
            : 'FORMULATION_MISMATCH'
        );
        pushFailedResult(rowNum, fallbackFailure, reasonCode);
        console.warn(`[ResepHandler] Failed to fill nama_obat for row ${rowNum}`);
        continue;
      }
      const confirmedNamaResult = namaResult!;
      result.success.push(confirmedNamaResult);
      rowState = transitionRowState(runId, rowNum, rowState, 'medication_selected', {
        candidate: String(confirmedNamaResult.value || ''),
        selectedName: selectedMedicationName || String(confirmedNamaResult.value || ''),
      });

      // STEP 3: Racikan (select)
      const racikanResult = await fillSelect(sel.obat_racikan, normalizeRacikanValue(med.racikan));
      if (racikanResult.success) result.success.push(racikanResult);
      else result.failed.push(racikanResult);

      // STEP 4: Jumlah Permintaan
      if (med.jumlah_permintaan !== undefined && med.jumlah_permintaan !== null) {
        const permintaanResult = await fillTextField(
          sel.obat_jumlah_permintaan,
          String(med.jumlah_permintaan)
        );
        if (permintaanResult.success) result.success.push(permintaanResult);
        else result.failed.push(permintaanResult);
      }

      // STEP 5: Jumlah
      if (med.jumlah !== undefined && med.jumlah !== null) {
        const jumResult = await fillTextField(sel.obat_jumlah, String(med.jumlah));
        if (jumResult.success) result.success.push(jumResult);
        else result.failed.push(jumResult);
      }

      // STEP 6: Signa
      if (med.signa) {
        const signaResult = await fillSignaField(sel.obat_signa, String(med.signa));
        if (signaResult.success) result.success.push(signaResult);
        else result.failed.push(signaResult);
      }

      // STEP 7: Aturan Pakai
      await waitMs(DELAY_SIGNA_LOOKUP);

      if (med.aturan_pakai) {
        const aturanResult = await fillAturanPakaiField(sel.aturan_pakai, med.aturan_pakai);
        if (aturanResult.success) result.success.push(aturanResult);
        else result.failed.push(aturanResult);
      }

      // STEP 8: Keterangan (Optional)
      if (med.keterangan) {
        const ketResult = await fillTextField(sel.obat_keterangan, med.keterangan);
        if (ketResult.success) result.success.push(ketResult);
        else result.failed.push(ketResult);
      }
      rowState = transitionRowState(runId, rowNum, rowState, 'fields_filled', {
        selectedName: selectedMedicationName,
      });

      // STEP 9: Mandatory field validation
      const requiredCheck = await ensureRequiredRowFields(sel, med);
      if (!requiredCheck.ok) {
        const reasonCode = requiredCheck.errors.some((item) => item.includes('signa'))
          ? 'SIGNA_INVALID'
          : 'FORMULATION_MISMATCH';
        pushFailedResult(
          rowNum,
          {
            success: false,
            field: `row:${rowNum}`,
            value: med.nama_obat,
            method: 'direct',
            error: `Mandatory row check failed: ${requiredCheck.errors.join(', ')}`,
          },
          reasonCode,
          med.nama_obat,
          selectedMedicationName
        );
        break;
      }
      rowState = transitionRowState(runId, rowNum, rowState, 'validated', {
        selectedName: selectedMedicationName,
      });

      // STEP 10: Commit row deterministically
      const commitResult = await commitRowWithVerification(rowIdx, sel);
      if (!commitResult.ok) {
        pushFailedResult(
          rowNum,
          {
            success: false,
            field: `row:${rowNum}`,
            value: selectedMedicationName || med.nama_obat,
            method: 'direct',
            error: commitResult.message,
          },
          commitResult.reasonCode || 'COMMIT_TIMEOUT',
          med.nama_obat,
          selectedMedicationName
        );
        break;
      }
      rowState = transitionRowState(runId, rowNum, rowState, 'committed', {
        selectedName: selectedMedicationName,
        message: commitResult.message,
      });
      lastCommittedMedicationName = selectedMedicationName || lastCommittedMedicationName;

      if (i < totalRows - 1) {
        await waitMs(DELAY_BETWEEN_ROWS);
      }
    }

    const duration = Date.now() - startTime;
    console.warn(`[ResepHandler] Fill cascade complete in ${duration}ms`);
    console.warn(
      `[ResepHandler] Results: ${result.success.length} success, ${result.failed.length} failed, ${result.skipped.length} skipped`
    );

    return result;
  } catch (error) {
    console.error('[ResepHandler] Fill cascade error:', error);
    result.failed.push({
      success: false,
      field: 'resep-cascade',
      error: error instanceof Error ? error.message : 'Unknown error',
      value: '',
      method: 'direct',
    });
    return result;
  }
}

// =============================================================================
// HELPER: DYNAMIC ROW ADDITION
// =============================================================================

async function ensureRowExists(rowIndex: number): Promise<boolean> {
  const sel = getResepRowSelectors(rowIndex);
  const rowEl = document.querySelector(sel.obat_nama);

  if (rowEl) {
    // Row already exists
    return true;
  }

  console.warn(`[ResepHandler] Adding new medication row ${rowIndex + 1}`);
  const clicked = await clickAddResepButton();
  if (!clicked) {
    console.warn(`[ResepHandler] Could not add row ${rowIndex + 1} - add button not found`);
    return false;
  }

  const newRow = document.querySelector(sel.obat_nama);
  if (newRow) {
    console.warn(`[ResepHandler] Row ${rowIndex + 1} added successfully`);
    return true;
  }

  console.warn(`[ResepHandler] Row ${rowIndex + 1} not detected after click`);
  return false;
}

// =============================================================================
// SCRAPE FUNCTION
// =============================================================================

/**
 * Scrape current values from Resep form
 */
export async function scrapeResepForm(): Promise<ScrapedResepData> {
  console.warn('[ResepHandler] Scraping resep form...');

  await waitForElement(RESEP_FIELDS.alergi.selector, 3000);

  const data: ScrapedResepData = {
    medications: [],
  };

  // Global fields
  const alergiEl = document.querySelector(RESEP_FIELDS.alergi.selector) as HTMLInputElement;
  if (alergiEl) data.alergi = alergiEl.value;

  const bbSelector = RESEP_FIELDS.berat_badan?.selector;
  if (bbSelector) {
    const bbEl = document.querySelector(bbSelector) as HTMLInputElement | null;
    if (bbEl) data.berat_badan = bbEl.value;
  }

  const tbSelector = RESEP_FIELDS.tinggi_badan?.selector;
  if (tbSelector) {
    const tbEl = document.querySelector(tbSelector) as HTMLInputElement | null;
    if (tbEl) data.tinggi_badan = tbEl.value;
  }

  // Scrape rows (limit 20 for safety)
  for (let i = 0; i < 20; i++) {
    const sel = getResepRowSelectors(i);
    const namaEl = document.querySelector(sel.obat_nama) as HTMLInputElement;

    if (!namaEl) break; // End of rows

    // If row exists but is empty/hidden, check if it has value
    // (Some interfaces keep 10 rows but visible=false, check offsetParent)
    if (namaEl.offsetParent === null && namaEl.value === '') continue;

    const med: ResepMedication = {
      racikan: '0',
      nama_obat: namaEl.value,
      jumlah: 0,
      signa: '',
      aturan_pakai: '2',
      keterangan: '',
    };

    const racikanEl = document.querySelector(sel.obat_racikan) as HTMLSelectElement | null;
    if (racikanEl && racikanEl.value) med.racikan = racikanEl.value;

    const jumEl = document.querySelector(sel.obat_jumlah) as HTMLInputElement | null;
    if (jumEl && jumEl.value) med.jumlah = Number(jumEl.value);

    const signaEl = document.querySelector(sel.obat_signa) as HTMLInputElement | null;
    if (signaEl && signaEl.value) med.signa = signaEl.value;

    const ruleEl = document.querySelector(sel.aturan_pakai) as HTMLSelectElement | null;
    if (ruleEl && ruleEl.value) {
      const normalizedAturanPakai = normalizeAturanPakaiValue(ruleEl.value);
      if (normalizedAturanPakai) med.aturan_pakai = normalizedAturanPakai;
    }

    const ketEl = document.querySelector(sel.obat_keterangan) as
      HTMLInputElement | HTMLTextAreaElement | null;
    if (ketEl && ketEl.value) med.keterangan = ketEl.value;

    data.medications.push(med);
  }

  console.warn(`[ResepHandler] Scraped ${data.medications.length} medication rows`);
  return data;
}

// =============================================================================
// PAGE INITIALIZATION
// =============================================================================

/**
 * Called from content script when page is detected as resep
 */
export function initResepPage(): void {
  console.warn('[ResepHandler] Page handler initialized');
}

export const __resepInternals = {
  detectPreferredMedicationForm,
  scoreMedicationNameCandidate,
  rankMedicationNameCandidates,
  isStockInsufficientAlert,
  extractMedicationNameFromStockAlert,
  normalizeSignaInput,
  isValidSignaFormat,
};
