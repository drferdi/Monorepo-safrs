// Designed and constructed by Drferdi.

import { mapTrajectoryToPrognosis } from './prognosis-mapper';
import { truncateDeepStrings } from './truncate';

import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { classifyChronicDisease } from '@/lib/iskandar-diagnosis-engine/chronic-disease-classifier';
import type { TrajectoryAnalysis } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import stockDatabase from '@/public/data/stok_obat.json';
import type { MedicationRecommendation } from '@/types/api';
import type {
  AnamnesaFillPayload,
  AturanPakai,
  DiagnosaFillPayload,
  ResepFillPayload,
  RMETransferPayload,
  RMETransferReasonCode,
} from '@/utils/types';

type TriadRole = 'utama' | 'adjuvant' | 'vitamin';
type RMEAnamnesaDraftPayload = Pick<AnamnesaFillPayload, 'lama_sakit' | 'riwayat_penyakit'> &
  Partial<Pick<AnamnesaFillPayload, 'keluhan_utama' | 'keluhan_tambahan'>>;

/**
 * RMETransferMapperInput interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface RMETransferMapperInput {
  keluhanUtama: string;
  keluhanTambahan?: string;
  patientGender: 'L' | 'P';
  patientAge?: number;
  pregnancyStatus?: boolean | null;
  allergies?: string[];
  vitalSigns?: {
    sbp?: number;
    dbp?: number;
    hr?: number;
    rr?: number;
    temp?: number;
    glucose?: number;
  };
  diagnosis?: Partial<DiagnosaFillPayload> | null;
  medications?: MedicationRecommendation[];
  tenagaMedis?: {
    dokterNama?: string;
    perawatNama?: string;
    ruangan?: string;
  };
  trajectory?: TrajectoryAnalysis;
  hasVisitHistory?: boolean;
  // Extended state from TTV form
  spo2?: number;
  avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
  painScore?: number;
  disabilityType?: string;
  obesityConfirmation?: boolean;
  // Pre-built anamnesa from anamnesa-composer (overrides lama_sakit + riwayat_penyakit)
  anamnesaDraftPayload?: RMEAnamnesaDraftPayload;
}

/**
 * PregnancyMappingResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface PregnancyMappingResult {
  is_pregnant: boolean;
  reasonCode?: RMETransferReasonCode;
}

const VITAMIN_KEYWORDS = ['vitamin', 'ascorb', 'multivit', 'b complex', 'zinc'];
const ADJUVANT_KEYWORDS = [
  'paracetamol',
  'parasetamol',
  'acetaminophen',
  'cetirizine',
  'cetirizin',
  'ctm',
  'domperidone',
  'ambroxol',
  'oralit',
  'omeprazole',
  'attapulgite',
];

const ATURAN_PAKAI_MAP: Record<string, AturanPakai> = {
  'sebelum makan': '1',
  'sesudah makan': '2',
  'pemakaian luar': '3',
  'jika diperlukan': '4',
  'saat makan': '5',
};

const MEDICATION_NAME_SYNONYMS: Record<string, string> = {
  amoxicillin: 'amoksisilin',
  amoksisilin: 'amoksisilin',
  ampicillin: 'ampisilin',
  ampisilin: 'ampisilin',
  acyclovir: 'asiklovir',
  aciclovir: 'asiklovir',
  asiklovir: 'asiklovir',
  azithromycin: 'azitromisin',
  azitromisin: 'azitromisin',
  paracetamol: 'parasetamol',
  parasetamol: 'parasetamol',
  acetaminophen: 'parasetamol',
  asetaminofen: 'parasetamol',
  'acetylsalicylic acid': 'asam asetilsalisilat',
  aspirin: 'asam asetilsalisilat',
  'asam asetilsalisilat': 'asam asetilsalisilat',
  diclofenac: 'diklofenak',
  diklofenak: 'diklofenak',
  'mefenamic acid': 'asam mefenamat',
  'asam mefenamat': 'asam mefenamat',
  naproxen: 'naproksen',
  naproksen: 'naproksen',
  betamethasone: 'betametason',
  betametason: 'betametason',
  dexamethasone: 'deksametason',
  deksametason: 'deksametason',
  hydrocortisone: 'hidrokortison',
  hidrokortison: 'hidrokortison',
  mometasone: 'mometason',
  mometason: 'mometason',
  prednisone: 'prednison',
  prednison: 'prednison',
  triamcinolone: 'triamsinolon',
  triamsinolon: 'triamsinolon',
  amlodipine: 'amlodipin',
  amlodipin: 'amlodipin',
  bisacodyl: 'bisakodil',
  bisakodil: 'bisakodil',
  cetirizine: 'setirizin',
  cetirizin: 'setirizin',
  setirizin: 'setirizin',
  captopril: 'kaptopril',
  kaptopril: 'kaptopril',
  chloramphenicol: 'kloramfenikol',
  kloramfenikol: 'kloramfenikol',
  clindamycin: 'klindamisin',
  klindamisin: 'klindamisin',
  cefadroxil: 'sefadroksil',
  sefadroksil: 'sefadroksil',
  cefixime: 'sefiksim',
  sefiksim: 'sefiksim',
  ceftriaxone: 'seftriakson',
  seftriakson: 'seftriakson',
  ciprofloxacin: 'siprofloksasin',
  siprofloksasin: 'siprofloksasin',
  erythromycin: 'eritromisin',
  eritromisin: 'eritromisin',
  gentamicin: 'gentamisin',
  gentamisin: 'gentamisin',
  nystatin: 'nistatin',
  nistatin: 'nistatin',
  oxytetracycline: 'oksitetrasiklin',
  oksitetrasiklin: 'oksitetrasiklin',
  rifampicin: 'rifampisin',
  rifampisin: 'rifampisin',
  chlorpheniramine: 'klorfeniramin',
  klorfeniramin: 'klorfeniramin',
  ctm: 'klorfeniramin',
  'folic acid': 'asam folat',
  'asam folat': 'asam folat',
  hydrochlorothiazide: 'hidroklorotiazid',
  hidroklorotiazid: 'hidroklorotiazid',
  methylprednisolone: 'metilprednisolon',
  metilprednisolon: 'metilprednisolon',
  theophylline: 'teofilin',
  teofilin: 'teofilin',
  tramadol: 'tramadol',
  'vitamin c': 'asam askorbat',
  'asam askorbat': 'asam askorbat',
};

const DEFAULT_RESEP_DURATION_DAYS = 3;
const QUANTITY_ROUNDING_STEP = 10;
const MAX_RESEP_QUANTITY = 1000;
const DEFAULT_RESEP_NOTE = 'Review klinis sebelum finalisasi resep.';
const MIN_STOCK_MATCH_SCORE = 45;
const STOCK_CANDIDATE_LIMIT = 5;

interface StockDrugItem {
  nama_obat: string;
  status?: string;
  stok_tersedia?: number;
}

interface StockDatabaseShape {
  stok_obat?: StockDrugItem[];
}

const STOCK_ITEMS: StockDrugItem[] = Array.isArray((stockDatabase as StockDatabaseShape).stok_obat)
  ? ((stockDatabase as StockDatabaseShape).stok_obat as StockDrugItem[])
  : [];

const AVAILABLE_STOCK_ITEMS: StockDrugItem[] = STOCK_ITEMS.filter((item) => {
  const status = normalizeText(item.status || 'tersedia');
  const stok = Number(item.stok_tersedia ?? 0);
  return status === 'tersedia' && stok > 0;
});

const LIQUID_FORM_KEYWORDS = [
  'sirup',
  'syrup',
  'suspensi',
  'suspension',
  'drop',
  'elixir',
  'solution',
  'ml',
];
const SOLID_FORM_KEYWORDS = ['tablet', 'tab', 'kaplet', 'kapsul', 'capsule', 'caplet'];
type MedicationFormPreference = 'solid' | 'liquid' | 'unknown';

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function foldMedicationOrthography(value: string): string {
  return value
    .replace(/\bph/g, 'f')
    .replace(/x/g, 'ks')
    .replace(/y/g, 'i')
    .replace(/\bc(?=[eiy])/g, 's')
    .replace(/\bc(?=[aouklnrt])/g, 'k')
    .replace(/\b([a-z]{4,})e\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMedicationLookup(value: string): string {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let rewritten = normalized;
  for (const [alias, canonical] of Object.entries(MEDICATION_NAME_SYNONYMS)) {
    rewritten = rewritten.replace(new RegExp(`\\b${alias}\\b`, 'g'), canonical);
  }

  return foldMedicationOrthography(rewritten.replace(/\bamlodipine\b/g, 'amlodipin'));
}

function getLookupTokens(value: string): string[] {
  const stopwords = new Set([
    'tablet',
    'kapsul',
    'kaplet',
    'sirup',
    'syrup',
    'mg',
    'ml',
    'asam',
    'hcl',
    'hydrochloride',
    'blud',
    'doen',
  ]);
  return normalizeMedicationLookup(value)
    .split(' ')
    .filter((token) => token.length > 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !/^\d+(mg|ml|mcg|g|gr|iu)$/i.test(token))
    .filter((token) => !stopwords.has(token));
}

function extractDoseValues(value: string, unit: 'mg' | 'ml'): number[] {
  const normalized = normalizeMedicationLookup(value);
  const pattern = unit === 'mg' ? /(\d+(?:\.\d+)?)\s*mg\b/g : /(\d+(?:\.\d+)?)\s*ml\b/g;
  const values: number[] = [];
  for (const match of normalized.matchAll(pattern)) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) values.push(parsed);
  }
  return values;
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function wantsLiquidForm(value: string): boolean {
  const normalized = normalizeMedicationLookup(value);
  if (hasAnyKeyword(normalized, LIQUID_FORM_KEYWORDS)) return true;
  return /\bmg\s*\/\s*\d+\s*ml\b/.test(normalized);
}

function wantsSolidForm(value: string): boolean {
  const normalized = normalizeMedicationLookup(value);
  if (hasAnyKeyword(normalized, SOLID_FORM_KEYWORDS)) return true;
  if (wantsLiquidForm(value)) return false;
  const mgValues = extractDoseValues(value, 'mg');
  const mlValues = extractDoseValues(value, 'ml');
  return mgValues.length > 0 && mlValues.length === 0;
}

function getMedicationFormPreference(value: string): MedicationFormPreference {
  if (wantsLiquidForm(value)) return 'liquid';
  if (wantsSolidForm(value)) return 'solid';
  return 'unknown';
}

function scoreDoseAlignment(input: string, candidate: string): number {
  const inputMg = extractDoseValues(input, 'mg');
  const candidateMg = extractDoseValues(candidate, 'mg');
  if (inputMg.length > 0 && candidateMg.length > 0) {
    const hasExact = inputMg.some((expected) =>
      candidateMg.some((actual) => Math.abs(actual - expected) < 0.5)
    );
    return hasExact ? 26 : -16;
  }

  const inputMl = extractDoseValues(input, 'ml');
  const candidateMl = extractDoseValues(candidate, 'ml');
  if (inputMl.length > 0 && candidateMl.length > 0) {
    const hasExact = inputMl.some((expected) =>
      candidateMl.some((actual) => Math.abs(actual - expected) < 0.5)
    );
    return hasExact ? 18 : -10;
  }

  return 0;
}

function scoreMedicationCandidate(input: string, candidate: string): number {
  const normalizedInput = normalizeMedicationLookup(input);
  const normalizedCandidate = normalizeMedicationLookup(candidate);
  if (!normalizedInput || !normalizedCandidate) return -999;

  let score = 0;

  if (normalizedCandidate === normalizedInput) score += 120;
  else if (
    normalizedCandidate.includes(normalizedInput) ||
    normalizedInput.includes(normalizedCandidate)
  )
    score += 80;

  const inputTokens = getLookupTokens(input);
  const candidateTokens = getLookupTokens(candidate);
  if (inputTokens.length > 0 && candidateTokens.length > 0) {
    const overlap = inputTokens.filter((token) => candidateTokens.includes(token)).length;
    score += (overlap / inputTokens.length) * 70;
    if (overlap === 0) score -= 35;
  }

  const inputForm = getMedicationFormPreference(input);
  const candidateForm = getMedicationFormPreference(candidate);
  if (inputForm === 'solid' && candidateForm === 'unknown') score -= 45;
  if (inputForm === 'solid' && candidateForm === 'liquid') score -= 80;
  if (inputForm === 'liquid' && candidateForm === 'solid') score -= 45;
  if (inputForm !== 'unknown' && inputForm === candidateForm) score += 45;

  const inputMg = extractDoseValues(input, 'mg');
  if (inputMg.some((dose) => dose >= 250) && candidateForm === 'liquid') {
    // Avoid syrup mis-picks for common adult tablet strengths.
    score -= 35;
  }
  const candidateMg = extractDoseValues(candidate, 'mg');
  if (inputMg.length > 0 && candidateMg.length === 0 && candidateForm === 'unknown') {
    score -= 25;
  }

  score += scoreDoseAlignment(input, candidate);

  return score;
}

function resolveMedicationCandidatesFromStock(
  rawName: string,
  limit = STOCK_CANDIDATE_LIMIT
): string[] {
  const input = rawName.trim();
  if (!input) return [];
  if (AVAILABLE_STOCK_ITEMS.length === 0) return [];

  const scoredCandidates: Array<{ name: string; score: number }> = [];
  for (const item of AVAILABLE_STOCK_ITEMS) {
    const candidate = item.nama_obat?.trim();
    if (!candidate) continue;
    const score = scoreMedicationCandidate(input, candidate);
    scoredCandidates.push({ name: candidate, score });
  }

  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score >= MIN_STOCK_MATCH_SCORE)
    .map((item) => item.name)
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .slice(0, limit);
}

function resolveMedicationNameFromStock(rawName: string): string {
  const candidates = resolveMedicationCandidatesFromStock(rawName, 1);
  if (candidates.length > 0) return candidates[0];

  // Safety-first: if confident stock match is unavailable, keep original name.
  return rawName;
}

function classifyRole(medicationName: string): TriadRole {
  const name = normalizeText(medicationName);
  if (VITAMIN_KEYWORDS.some((keyword) => name.includes(keyword))) return 'vitamin';
  if (ADJUVANT_KEYWORDS.some((keyword) => name.includes(keyword))) return 'adjuvant';
  return 'utama';
}

function mapAturanPakai(value: string): AturanPakai {
  const normalized = normalizeText(value);
  return ATURAN_PAKAI_MAP[normalized] || '2';
}

function estimateQuantity(dosis: string, durasi?: string): number {
  const doseMatch = dosis.match(/(\d+)\s*x\s*(\d+)?/i);
  const timesPerDay = doseMatch ? Math.max(1, Number(doseMatch[1])) : 2;
  const unitPerDose = doseMatch?.[2] ? Math.max(1, Number(doseMatch[2])) : 1;

  const durationMatch = (durasi || '').match(/(\d+)/i);
  const mappedDays = durationMatch
    ? Math.max(1, Number(durationMatch[1]))
    : DEFAULT_RESEP_DURATION_DAYS;
  const days = Math.min(DEFAULT_RESEP_DURATION_DAYS, mappedDays);

  const estimated = timesPerDay * unitPerDose * days;
  const rounded =
    Math.ceil(Math.max(1, estimated) / QUANTITY_ROUNDING_STEP) * QUANTITY_ROUNDING_STEP;
  return Math.min(MAX_RESEP_QUANTITY, Math.max(QUANTITY_ROUNDING_STEP, rounded));
}

function normalizeSignaValue(rawDosis: string | undefined): string {
  const text = (rawDosis || '').trim();
  if (!text) return '1x1';
  const compact = text.replace(/\s+/g, '').replace(/[xX×]/g, 'x');
  const match = compact.match(/(\d+)\s*x\s*(\d+)/i);
  if (match) {
    const left = Math.max(1, Number(match[1]));
    const right = Math.max(1, Number(match[2]));
    return `${left}x${right}`;
  }
  return compact.includes('x') ? compact : '1x1';
}

function resolveMedicationNote(rationale: string | undefined, aturanPakai: string): string {
  const normalized = (rationale || '').trim();
  if (normalized) return normalized;
  const signa = (aturanPakai || '').trim() || 'sesuai anjuran';
  return `Aturan minum ${signa}. ${DEFAULT_RESEP_NOTE}`;
}

function normalizeAllergies(allergies: string[]): AnamnesaFillPayload['alergi'] {
  const result: AnamnesaFillPayload['alergi'] = {
    obat: [],
    makanan: [],
    udara: [],
    lainnya: [],
  };

  for (const rawItem of allergies) {
    const item = rawItem.trim();
    if (!item || item.toLowerCase() === 'tidak ada') continue;

    if (item.toLowerCase() === 'obat') {
      result.obat.push('Alergi obat (dilaporkan)');
      continue;
    }
    if (item.toLowerCase() === 'makanan') {
      result.makanan.push('Alergi makanan (dilaporkan)');
      continue;
    }
    if (item.toLowerCase().includes('debu') || item.toLowerCase().includes('udara')) {
      result.udara.push(item);
      continue;
    }
    result.lainnya.push(item);
  }

  return result;
}

/**
 * mapPregnancyStatusToBoolean
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function mapPregnancyStatusToBoolean(
  patientGender: 'L' | 'P',
  pregnancyStatus?: boolean | null
): PregnancyMappingResult {
  if (patientGender === 'L') {
    return { is_pregnant: false };
  }
  if (typeof pregnancyStatus === 'boolean') {
    return { is_pregnant: pregnancyStatus };
  }
  return {
    is_pregnant: false,
    reasonCode: 'PREGNANCY_UNKNOWN_DEFAULT_FALSE',
  };
}

// ============================================================================
// ANAMNESA EXTENDED — compute additional sections from TTV state
// ============================================================================

type AvpuValue = 'A' | 'C' | 'V' | 'P' | 'U';
type KesadaranValue = 'COMPOS MENTIS' | 'SOMNOLEN' | 'SOPOR' | 'COMA';

const AVPU_GCS_MAP: Record<
  AvpuValue,
  {
    mata: '4' | '3' | '2' | '1';
    verbal: '5' | '4' | '3' | '2' | '1';
    motorik: '6' | '5' | '4' | '3' | '2' | '1';
  }
> = {
  A: { mata: '4', verbal: '5', motorik: '6' },
  C: { mata: '4', verbal: '4', motorik: '6' },
  V: { mata: '3', verbal: '3', motorik: '5' },
  P: { mata: '2', verbal: '2', motorik: '4' },
  U: { mata: '1', verbal: '1', motorik: '1' },
};

const AVPU_KESADARAN_MAP: Record<AvpuValue, KesadaranValue> = {
  A: 'COMPOS MENTIS',
  C: 'SOMNOLEN',
  V: 'SOMNOLEN',
  P: 'SOPOR',
  U: 'COMA',
};

type AnthropometricProfile = Pick<
  NonNullable<AnamnesaFillPayload['periksa_fisik']>,
  'tinggi' | 'berat' | 'lingkar_perut' | 'imt' | 'hasil_imt'
>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, digits = 1): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function randomBetween(min: number, max: number, digits = 1): number {
  return roundTo(min + Math.random() * (max - min), digits);
}

function getNormalBmiRange(patientAge?: number): [number, number] {
  if (patientAge !== undefined && patientAge >= 65) return [22, 26.9];
  if (patientAge !== undefined && patientAge >= 20) return [20, 22.8];
  if (patientAge !== undefined && patientAge >= 13) return [18.5, 22.5];
  if (patientAge !== undefined && patientAge >= 2) {
    const min = clamp(14.5 + (patientAge - 2) * 0.2, 14.5, 17.5);
    return [roundTo(min), roundTo(min + 3)];
  }
  return [20, 22.8];
}

function getHeightRange(patientGender: 'L' | 'P', patientAge?: number): [number, number] {
  if (patientAge !== undefined && patientAge >= 2 && patientAge < 13) {
    const center = 82 + patientAge * 5.8;
    return [roundTo(center - 5, 0), roundTo(center + 5, 0)];
  }
  if (patientAge !== undefined && patientAge >= 13 && patientAge < 20) {
    return patientGender === 'P' ? [148, 165] : [155, 175];
  }
  if (patientAge !== undefined && patientAge >= 65) {
    return patientGender === 'P' ? [145, 160] : [155, 170];
  }
  return patientGender === 'P' ? [150, 165] : [160, 175];
}

function getWaistRange(patientGender: 'L' | 'P', patientAge?: number): [number, number] {
  if (patientAge !== undefined && patientAge >= 2 && patientAge < 13) {
    const min = clamp(45 + patientAge * 2, 50, 72);
    return [roundTo(min, 0), roundTo(min + 8, 0)];
  }
  if (patientAge !== undefined && patientAge >= 13 && patientAge < 20) {
    return patientGender === 'P' ? [68, 80] : [75, 88];
  }
  if (patientAge !== undefined && patientAge >= 65) {
    return patientGender === 'P' ? [72, 84] : [80, 92];
  }
  return patientGender === 'P' ? [66, 78] : [74, 88];
}

function buildFallbackAnthropometrics(
  patientGender: 'L' | 'P',
  patientAge: number | undefined,
  obesityConfirmation?: boolean
): AnthropometricProfile {
  const [heightMin, heightMax] = getHeightRange(patientGender, patientAge);
  const [waistMin, waistMax] = getWaistRange(patientGender, patientAge);
  const [bmiMin, bmiMax] = obesityConfirmation ? [30.1, 32.5] : getNormalBmiRange(patientAge);
  const tinggi = randomBetween(heightMin, heightMax, 0);
  const imt = randomBetween(bmiMin, bmiMax);
  const tinggiMeter = tinggi / 100;
  const berat = roundTo(imt * tinggiMeter * tinggiMeter);

  return {
    tinggi,
    berat,
    lingkar_perut: randomBetween(waistMin, waistMax, 0),
    imt,
    hasil_imt: obesityConfirmation ? 'Obesitas I' : 'Normal',
  };
}

const MOBILISASI_KEYWORDS = [
  'tidak bisa jalan',
  'tidak dapat berjalan',
  'tidak mampu berjalan',
  'sulit berjalan',
  'sulit jalan',
  'tidak bisa berdiri',
  'lumpuh',
];

function hasMobilityLimitation(clinicalComplaintText: string): boolean {
  return hasAnyKeyword(clinicalComplaintText.toLowerCase(), MOBILISASI_KEYWORDS);
}

function maxAdlSeverity(a: '0' | '1' | '2', b: '0' | '1' | '2'): '0' | '1' | '2' {
  return Number(a) >= Number(b) ? a : b;
}

function buildPeriksaFisikExtended(
  avpu: AvpuValue,
  spo2: number,
  disabilityType: string | undefined,
  clinicalComplaintText: string,
  patientGender: 'L' | 'P',
  patientAge?: number,
  obesityConfirmation?: boolean
): AnamnesaFillPayload['periksa_fisik'] {
  const gcs = AVPU_GCS_MAP[avpu];
  const adl: '0' | '1' | '2' = disabilityType ? '1' : '0';
  // Mobilisasi can also be raised by mobility-limiting complaint text, independent of
  // the Disabilitas dropdown — the other four ADL fields stay disabilityType-only.
  const keywordMobilisasi: '0' | '1' | '2' = hasMobilityLimitation(clinicalComplaintText)
    ? '2'
    : '0';
  const mobilisasi = maxAdlSeverity(adl, keywordMobilisasi);
  const anthropometrics = buildFallbackAnthropometrics(
    patientGender,
    patientAge,
    obesityConfirmation
  );

  return {
    gcs_membuka_mata: gcs.mata,
    gcs_respon_verbal: gcs.verbal,
    gcs_respon_motorik: gcs.motorik,
    ...anthropometrics,
    cara_ukur: 'berdiri',
    triage: 'TIDAK GAWAT DARURAT',
    saturasi: spo2,
    mobilisasi,
    toileting: adl,
    makan_minum: adl,
    mandi: adl,
    berpakaian: adl,
    aktifitas_fisik: disabilityType
      ? `Keterbatasan fisik: ${disabilityType}`
      : 'Pasien dapat beraktivitas secara mandiri',
  };
}

type FiveAskepOptions = readonly [string, string, string, string, string];

const randomAskepOptions = {
  terapiObat: [
    'Obat diberikan sesuai advis dokter. Pasien dianjurkan mengikuti aturan pakai.',
    'Terapi obat dilanjutkan sesuai resep dokter dan dievaluasi saat kontrol.',
    'Pasien dianjurkan minum obat teratur sesuai instruksi yang telah diberikan.',
    'Obat digunakan sesuai petunjuk dokter. Bila ada keluhan, pasien diminta kontrol.',
    'Terapi farmakologis mengikuti rencana dokter dan respons pasien dipantau.',
  ],
  terapiNonObat: [
    'Pasien dianjurkan istirahat cukup, menjaga hidrasi, dan menghindari aktivitas berat.',
    'Jaga pola makan, cukup cairan, dan lakukan aktivitas ringan sesuai toleransi.',
    'Pasien disarankan menjaga kebersihan diri dan mengatur pola istirahat harian.',
    'Hindari faktor pencetus keluhan dan lakukan kontrol bila kondisi tidak membaik.',
    'Mobilisasi ringan dianjurkan sesuai kemampuan, disertai pemantauan keluhan.',
  ],
  bmhp: [
    'Kassa steril, plester, sarung tangan bersih, dan alkohol swab digunakan.',
    'BMHP standar digunakan sesuai tindakan, termasuk handscoon, kassa, dan plester.',
    'Sarung tangan, masker, kassa steril, dan cairan pembersih digunakan seperlunya.',
    'Kassa, kapas alkohol, plester, dan handscoon disiapkan sesuai prosedur.',
    'BMHP digunakan sesuai kebutuhan tindakan dan prinsip kebersihan tetap dijaga.',
  ],
  rencanaTindakan: [
    'Lanjutkan observasi kondisi umum pasien dan evaluasi respons terapi secara berkala.',
    'Pasien direncanakan kontrol ulang sesuai jadwal dan instruksi tenaga kesehatan.',
    'Pantau tanda vital, keluhan utama, dan laporkan bila terdapat perubahan kondisi.',
    'Rencana perawatan dilanjutkan sesuai perkembangan klinis dan instruksi dokter.',
    'Evaluasi berkala dilakukan untuk menilai respons pasien terhadap perawatan.',
  ],
  edukasi: [
    'Pasien diedukasi menjaga pola makan, istirahat cukup, dan minum obat teratur.',
    'Edukasi diberikan mengenai tanda bahaya dan kapan harus kembali ke fasilitas kesehatan.',
    'Pasien dianjurkan mengikuti jadwal kontrol dan melaporkan keluhan yang memberat.',
    'Keluarga diberi edukasi terkait perawatan, kebersihan, dan pemantauan kondisi pasien.',
    'Pasien memahami instruksi perawatan di rumah dan bersedia mengikuti anjuran.',
  ],
  deskripsiAskep: [
    'Asuhan keperawatan diberikan sesuai kondisi pasien dengan pemantauan berkala.',
    'Pasien tampak stabil dan kooperatif selama dilakukan pengkajian keperawatan.',
    'Askep difokuskan pada observasi keluhan, kenyamanan, edukasi, dan dokumentasi.',
    'Dilakukan pengkajian, edukasi, dan pemantauan kondisi umum pasien secara berkala.',
    'Perawatan berjalan baik, pasien kooperatif, dan tidak tampak tanda kegawatan.',
  ],
  observasi: [
    'Pantau tanda vital, kondisi umum, keluhan pasien, dan respons terhadap terapi.',
    'Observasi dilakukan berkala untuk menilai stabilitas dan perubahan kondisi pasien.',
    'Monitor keluhan utama, kesadaran, tanda vital, dan tanda perburukan klinis.',
    'Tidak tampak tanda kegawatan. Kondisi pasien tetap dipantau sesuai prosedur.',
    'Pantau nyeri, asupan cairan, tanda vital, dan keluhan tambahan bila muncul.',
  ],
  ket: [
    'Pasien kooperatif, edukasi telah diberikan, dan instruksi perawatan dipahami.',
    'Kondisi pasien stabil, tidak ada keluhan tambahan saat dilakukan evaluasi.',
    'Keluarga pasien memahami instruksi perawatan dan jadwal kontrol berikutnya.',
    'Pasien dianjurkan kembali bila keluhan memburuk atau muncul tanda bahaya.',
    'Dokumentasi telah dilakukan dan pasien memahami rencana tindak lanjut.',
  ],
  biopsikososial: [
    'Kondisi biologis stabil, emosi tampak tenang, dan pasien kooperatif.',
    'Pasien mampu berkomunikasi baik dan mendapat dukungan keluarga yang cukup.',
    'Respons emosional pasien wajar, kooperatif, dan tidak tampak distress berat.',
    'Pasien memahami edukasi, interaksi baik, dan dukungan sosial tampak adekuat.',
    'Pasien stabil, psikologis tenang, dan hubungan sosial pasien tampak baik.',
  ],
  tindakanKeperawatan: [
    'Mengukur tanda vital, mendokumentasikan hasil, dan memberikan edukasi pasien.',
    'Melakukan observasi kondisi umum, membantu kenyamanan, dan mencatat respons.',
    'Memberikan edukasi perawatan mandiri serta memantau keluhan pasien berkala.',
    'Melakukan pengkajian keperawatan dan koordinasi bila ada perubahan kondisi.',
    'Membantu kebutuhan dasar pasien, menjaga keamanan, dan melakukan dokumentasi.',
  ],
} satisfies Record<string, FiveAskepOptions>;

type AskepOptionKey = keyof typeof randomAskepOptions;

function pickRandomAskepOption(key: AskepOptionKey): string {
  const options = randomAskepOptions[key];
  const index = Math.min(options.length - 1, Math.floor(Math.random() * options.length));
  return options[index] ?? options[0];
}

function buildLainnyaFromMedications(): AnamnesaFillPayload['lainnya'] {
  return {
    terapi: pickRandomAskepOption('terapiObat'),
    terapi_non_obat: pickRandomAskepOption('terapiNonObat'),
    bmhp: pickRandomAskepOption('bmhp'),
    rencana_tindakan: pickRandomAskepOption('rencanaTindakan'),
    merokok: '0',
    konsumsi_alkohol: '0',
    kurang_sayur_buah: '0',
    edukasi: pickRandomAskepOption('edukasi'),
    askep: pickRandomAskepOption('deskripsiAskep'),
    observasi: pickRandomAskepOption('observasi'),
    keterangan: pickRandomAskepOption('ket'),
    biopsikososial: pickRandomAskepOption('biopsikososial'),
    tindakan_keperawatan: pickRandomAskepOption('tindakanKeperawatan'),
  };
}

// Pencetus/mekanisme nyeri — hanya diisi bila teks keluhan menyebut penyebab eksplisit.
const PENCETUS_KEYWORD_RULES: Array<{ keywords: string[]; value: string }> = [
  { keywords: ['jatuh'], value: 'Jatuh' },
  { keywords: ['kecelakaan', 'tabrakan', 'benturan'], value: 'Kecelakaan/benturan' },
  {
    keywords: ['teriris', 'tersayat', 'terkena benda tajam', 'kena pisau'],
    value: 'Terkena benda tajam',
  },
  {
    keywords: ['tersiram', 'terbakar', 'kena api', 'kena setrika'],
    value: 'Terkena panas/api',
  },
  { keywords: ['digigit', 'gigitan'], value: 'Gigitan' },
  {
    keywords: ['olahraga', 'aktivitas berat', 'angkat berat', 'mengangkat'],
    value: 'Aktivitas fisik berat',
  },
];

function findPencetus(keluhan: string): string | undefined {
  return PENCETUS_KEYWORD_RULES.find((rule) => hasAnyKeyword(keluhan, rule.keywords))?.value;
}

function findWaktu(keluhan: string): '0' | '1' | undefined {
  if (hasAnyKeyword(keluhan, ['hilang timbul', 'kadang', 'kambuh'])) return '0';
  if (
    hasAnyKeyword(keluhan, [
      'terus menerus',
      'terus-terusan',
      'konstan',
      'tidak berhenti',
      'sepanjang hari',
    ])
  )
    return '1';
  return undefined;
}

/** Derive nyeri detail fields from keluhan text */
function buildNyeriDetails(keluhan: string): {
  lokasi: string;
  kualitas?: string;
  pencetus?: string;
  waktu?: '0' | '1';
} {
  const k = keluhan.toLowerCase();
  let lokasi = 'Tidak spesifik';
  let kualitas: string | undefined;
  if (/kepala|pusing|migrain/.test(k)) lokasi = 'Kepala';
  if (/perut|abdomen|mulas|ulu hati/.test(k)) lokasi = 'Abdomen';
  if (/dada/.test(k)) lokasi = 'Dada';
  if (/gigi|gusi/.test(k)) lokasi = 'Gigi/Mulut';
  if (/kaki|betis|lutut|tungkai|paha|pergelangan kaki/.test(k)) lokasi = 'Kaki/Ekstremitas Bawah';
  if (/tangan|lengan|siku|pergelangan tangan|jari/.test(k)) lokasi = 'Tangan/Ekstremitas Atas';
  if (/punggung|pinggang/.test(k)) lokasi = 'Punggung/Pinggang';
  if (/leher/.test(k)) lokasi = 'Leher';

  if (/perut|abdomen|mulas|ulu hati|lambung|mual|muntah|diare/.test(k)) {
    kualitas = 'Melilit';
  } else if (/terbakar|panas/.test(k)) {
    kualitas = 'Terbakar';
  } else if (/tertusuk|tajam|menusuk/.test(k)) {
    kualitas = 'Tertusuk';
  } else if (/mencengkram|kram|kejang/.test(k)) {
    kualitas = 'Mencengkram';
  }

  const pencetus = findPencetus(k);
  const waktu = findWaktu(k);

  return {
    lokasi,
    ...(kualitas ? { kualitas } : {}),
    ...(pencetus ? { pencetus } : {}),
    ...(waktu ? { waktu } : {}),
  };
}

function calculateMeanArterialPressure(sbp?: number, dbp?: number): number | undefined {
  if (!sbp || !dbp || sbp <= 0 || dbp <= 0) return undefined;
  return Math.round((sbp + 2 * dbp) / 3);
}

const ANATOMY_PAYLOAD_RULES: Array<{ bodyPart: string; keywords: string[] }> = [
  {
    bodyPart: 'Kepala',
    keywords: ['sakit kepala', 'nyeri kepala', 'kepala berat', 'pusing', 'vertigo'],
  },
  {
    bodyPart: 'Mata',
    keywords: ['nyeri mata', 'sakit mata', 'mata merah', 'penglihatan', 'pandangan kabur'],
  },
  {
    bodyPart: 'Telinga',
    keywords: ['nyeri telinga', 'sakit telinga', 'telinga berdenging'],
  },
  {
    bodyPart: 'Leher',
    keywords: ['nyeri tenggorok', 'sakit tenggorok', 'tenggorokan', 'sulit menelan', 'leher'],
  },
  {
    bodyPart: 'Dada',
    keywords: ['nyeri dada', 'sakit dada', 'dada terasa', 'sesak', 'batuk', 'paru'],
  },
  {
    bodyPart: 'Perut',
    keywords: [
      'nyeri perut',
      'sakit perut',
      'perut melilit',
      'ulu hati',
      'mual',
      'muntah',
      'diare',
      'abdomen',
    ],
  },
  {
    bodyPart: 'Pinggang',
    keywords: ['nyeri pinggang', 'sakit pinggang', 'pinggang', 'punggung bawah', 'low back'],
  },
  {
    bodyPart: 'Punggung',
    keywords: ['nyeri punggung', 'sakit punggung', 'punggung'],
  },
  {
    bodyPart: 'Tangan',
    keywords: ['nyeri tangan', 'sakit tangan', 'lengan', 'pergelangan tangan', 'jari tangan'],
  },
  {
    bodyPart: 'Paha',
    keywords: ['nyeri paha', 'sakit paha', 'paha'],
  },
  {
    bodyPart: 'Lutut',
    keywords: ['nyeri lutut', 'sakit lutut', 'lutut'],
  },
  {
    bodyPart: 'Betis',
    keywords: ['nyeri betis', 'sakit betis', 'betis'],
  },
  {
    bodyPart: 'Kaki',
    keywords: ['nyeri kaki', 'sakit kaki', 'telapak kaki', 'pergelangan kaki', 'jari kaki', 'kaki'],
  },
];

function normalizeAnatomyPayloadText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAnatomyKeywordIndex(text: string, keywords: string[]): number {
  let bestIndex = -1;
  for (const keyword of keywords) {
    const index = text.indexOf(normalizeAnatomyPayloadText(keyword));
    if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }
  return bestIndex;
}

function buildAnatomiTubuhPayload(
  clinicalComplaintText: string
): AnamnesaFillPayload['anatomi_tubuh'] {
  const complaint = clinicalComplaintText.replace(/\s+/g, ' ').trim();
  const normalizedComplaint = normalizeAnatomyPayloadText(complaint);
  if (!normalizedComplaint) return undefined;

  const matched = ANATOMY_PAYLOAD_RULES.map((rule) => ({
    rule,
    index: findAnatomyKeywordIndex(normalizedComplaint, rule.keywords),
  }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index);

  if (matched.length === 0) return undefined;

  const seen = new Set<string>();
  return matched
    .filter((item) => {
      if (seen.has(item.rule.bodyPart)) return false;
      seen.add(item.rule.bodyPart);
      return true;
    })
    .map((item) => ({
      bagian_tubuh: item.rule.bodyPart,
      keterangan: complaint,
      confidence: 'high' as const,
      source: 'keluhan' as const,
    }));
}

// Symptom → organ system mapping for keadaan_fisik
const SYMPTOM_ORGAN_MAP: Array<{
  keywords: RegExp;
  organs: (keyof NonNullable<AnamnesaFillPayload['keadaan_fisik']>)[];
}> = [
  {
    keywords: /batuk|sesak|nafas|dada|paru|ronkhi|wheezing/,
    organs: ['dada_punggung', 'kardiovaskuler'],
  },
  { keywords: /pilek|hidung|ingus|bersin|sinus/, organs: ['hidung_sinus'] },
  { keywords: /tenggorok|telan|suara|tonsil|amandel|faring/, organs: ['mulut_bibir', 'leher'] },
  {
    keywords: /perut|mual|muntah|diare|nyeri perut|kembung|konstipasi|mulas|disentri/,
    organs: ['abdomen_perut'],
  },
  { keywords: /mata|penglihatan|kabur|merah|konjungtiva/, organs: ['mata'] },
  { keywords: /telinga|pendengaran|tuli|tinnitus/, organs: ['telinga'] },
  { keywords: /kepala|pusing|vertigo|migren|sakit kepala/, organs: ['kepala'] },
  { keywords: /kulit|gatal|ruam|bintik|eksim|dermatitis/, organs: ['kulit'] },
  { keywords: /nyeri dada|jantung|berdebar/, organs: ['kardiovaskuler'] },
  { keywords: /kaki|betis|lutut|pergelangan kaki|tungkai/, organs: ['ekstremitas_bawah'] },
  { keywords: /tangan|lengan|siku|pergelangan tangan|jari/, organs: ['ekstremitas_atas'] },
  { keywords: /leher|benjolan leher|tiroid/, organs: ['leher'] },
];

const ORGAN_NORMAL_FINDINGS: Record<
  keyof NonNullable<AnamnesaFillPayload['keadaan_fisik']>,
  NonNullable<AnamnesaFillPayload['keadaan_fisik']>[keyof NonNullable<
    AnamnesaFillPayload['keadaan_fisik']
  >]
> = {
  kepala: {
    inspeksi: 'Normocephal, tidak ada deformitas',
    palpasi: 'Tidak teraba massa, tidak ada nyeri tekan',
  },
  wajah: { inspeksi: 'Simetris, tidak pucat, tidak ikterik', palpasi: 'Tidak ada nyeri tekan' },
  mata: {
    inspeksi: 'Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+)',
  },
  telinga: {
    inspeksi: 'Tidak ada discharge, membran timpani intak',
    palpasi: 'Tidak ada nyeri tekan mastoid',
  },
  hidung_sinus: {
    inspeksi: 'Mukosa hidung tampak sedikit hiperemis, sekret minimal',
    palpasi_perkusi: 'Tidak ada nyeri tekan sinus paranasalis',
  },
  mulut_bibir: {
    inspeksi_luar: 'Bibir tidak pucat, tidak kering, tidak sianosis',
    inspeksi_dalam: 'Mukosa mulut lembab, faring sedikit hiperemis, tonsil T1/T1',
  },
  leher: {
    inspeksi: 'Tidak tampak pembesaran KGB, JVP tidak meningkat',
    auskultasi_karotis: 'Tidak terdengar bising karotis',
    palpasi_tiroid: 'Tidak teraba pembesaran tiroid',
    auskultasi_bising: 'Tidak ada bising pembuluh darah',
  },
  kulit: {
    inspeksi: 'Turgor kulit baik, tidak ada ruam, tidak ikterik',
    palpasi: 'Akral hangat, CRT < 2 detik',
  },
  kuku: { inspeksi: 'Tidak ada clubbing finger, tidak sianosis', palpasi: 'CRT < 2 detik' },
  dada_punggung: {
    inspeksi: 'Gerakan dada simetris, tidak ada retraksi',
    palpasi: 'Vocal fremitus simetris, tidak ada nyeri tekan',
    perkusi: 'Sonor di seluruh lapang paru',
    auskultasi: 'Suara napas vesikuler, tidak ada rhonki, tidak ada wheezing',
  },
  kardiovaskuler: {
    inspeksi: 'Iktus kordis tidak tampak',
    palpasi: 'Iktus kordis teraba di ICS 5 linea midklavikularis kiri',
    perkusi: 'Batas jantung dalam batas normal',
    auskultasi: 'S1 S2 reguler, tidak ada murmur, tidak ada gallop',
  },
  dada_aksila: {
    inspeksi_dada: 'Simetris, tidak ada massa',
    palpasi_dada: 'Tidak ada nyeri tekan, tidak ada massa',
    inspeksi_palpasi_aksila: 'Tidak teraba pembesaran KGB aksila',
  },
  abdomen_perut: {
    inspeksi: 'Perut datar, tidak tampak distensi, tidak ada massa yang menonjol',
    auskultasi: 'Bising usus normal (+) 5-10x/menit',
    perkusi_kuadran: 'Timpani di keempat kuadran',
    perkusi_hepar: 'Pekak hepar dalam batas normal',
    perkusi_limfa: 'Timpani, tidak ada splenomegali',
    perkusi_ginjal: 'Tidak ada nyeri ketuk ginjal kanan/kiri',
    palpasi_kuadran: 'Supel, tidak ada nyeri tekan, tidak teraba hepatomegali/splenomegali',
  },
  ekstremitas_atas: {
    inspeksi: 'Tidak ada deformitas, tidak ada edema, tidak ada sianosis',
    palpasi: 'Tidak ada nyeri tekan, kekuatan otot baik, tonus otot normal',
  },
  ekstremitas_bawah: {
    inspeksi: 'Tidak ada deformitas, tidak ada edema, tidak ada varises',
    palpasi: 'Tidak ada nyeri tekan, kekuatan otot baik, refleks fisiologis (+/+)',
  },
};

function buildKeadaanFisikFromKeluhan(
  keluhanUtama: string
): AnamnesaFillPayload['keadaan_fisik'] | undefined {
  const keluhan = keluhanUtama.toLowerCase();
  const activeOrgans = new Set<keyof NonNullable<AnamnesaFillPayload['keadaan_fisik']>>();

  for (const { keywords, organs } of SYMPTOM_ORGAN_MAP) {
    if (keywords.test(keluhan)) {
      organs.forEach((o) => activeOrgans.add(o));
    }
  }

  // Demam / lemas / infeksi → kepala + kulit always checked
  if (/demam|panas|meriang|lemas|lemah|tidak enak badan/.test(keluhan)) {
    activeOrgans.add('kepala');
    activeOrgans.add('kulit');
  }

  if (activeOrgans.size === 0) return undefined;

  const hasNyeriKeluhan = /nyeri|sakit|pegal|linu|ngilu/.test(keluhan);
  const NYERI_PALPASI = 'Pasien teraba tegang dengan nyeri dirasakan oleh pasien';

  const result: Partial<NonNullable<AnamnesaFillPayload['keadaan_fisik']>> = {};
  for (const organ of activeOrgans) {
    const base = { ...(ORGAN_NORMAL_FINDINGS[organ] as Record<string, string>) };
    if (hasNyeriKeluhan) {
      // Override palpasi field for musculoskeletal organs based on pain complaint
      if (organ === 'ekstremitas_bawah' || organ === 'ekstremitas_atas') {
        base['palpasi'] = NYERI_PALPASI;
      }
      if (organ === 'abdomen_perut') {
        base['palpasi_kuadran'] =
          'Terdapat nyeri tekan pada area keluhan, tidak teraba hepatomegali/splenomegali';
      }
      if (organ === 'kepala') {
        base['palpasi'] = 'Terdapat nyeri tekan pada area keluhan';
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result as any)[organ] = base;
  }
  return result as AnamnesaFillPayload['keadaan_fisik'];
}

function buildClinicalComplaintText(
  input: RMETransferMapperInput,
  keluhanUtama: string,
  keluhanTambahan: string
): string {
  const draft = input.anamnesaDraftPayload;
  return [
    keluhanUtama,
    keluhanTambahan,
    draft?.keluhan_utama,
    draft?.keluhan_tambahan,
    draft?.riwayat_penyakit?.sekarang,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
}

function buildAnamnesaPayload(input: RMETransferMapperInput): {
  payload: AnamnesaFillPayload;
  reasonCodes: RMETransferReasonCode[];
} {
  const reasonCodes: RMETransferReasonCode[] = [];
  const pregnancy = mapPregnancyStatusToBoolean(input.patientGender, input.pregnancyStatus);
  if (pregnancy.reasonCode) reasonCodes.push(pregnancy.reasonCode);

  const keluhanUtama = input.keluhanUtama.trim() || 'Keluhan belum diisi';
  const keluhanTambahan = input.keluhanTambahan?.trim() || keluhanUtama;
  const clinicalComplaintText = buildClinicalComplaintText(input, keluhanUtama, keluhanTambahan);
  const vital = input.vitalSigns;
  const avpu = input.avpu ?? 'A';
  const spo2 = input.spo2 ?? 0;
  const kesadaran = AVPU_KESADARAN_MAP[avpu];

  // lama_sakit: prefer pre-built draft (has parsed duration), fallback to default
  const lamaSakit = input.anamnesaDraftPayload?.lama_sakit ?? { thn: 0, bln: 0, hr: 1 };

  // assesmen_nyeri logic
  const nyeriKeywords = /nyeri|sakit|pegal|linu/i;
  const hasNyeriKeluhan = nyeriKeywords.test(clinicalComplaintText);
  const shouldFillNyeri = input.painScore !== undefined || hasNyeriKeluhan;

  const payload: AnamnesaFillPayload = {
    keluhan_utama: keluhanUtama,
    keluhan_tambahan: keluhanTambahan,
    lama_sakit: lamaSakit,
    is_pregnant: pregnancy.is_pregnant,
    alergi: normalizeAllergies(input.allergies || []),

    // riwayat_penyakit: from pre-built draft, always ensure RPK has a default
    riwayat_penyakit: {
      sekarang:
        input.anamnesaDraftPayload?.riwayat_penyakit?.sekarang ||
        input.keluhanTambahan?.trim() ||
        keluhanUtama,
      dahulu: input.anamnesaDraftPayload?.riwayat_penyakit?.dahulu || '',
      keluarga:
        input.anamnesaDraftPayload?.riwayat_penyakit?.keluarga ||
        'Tidak ada riwayat penyakit serupa dalam keluarga yang diketahui.',
    },

    // vital_signs with AVPU-derived kesadaran
    ...(vital
      ? {
          vital_signs: {
            tekanan_darah_sistolik: vital.sbp || 0,
            tekanan_darah_diastolik: vital.dbp || 0,
            nadi: vital.hr || 0,
            respirasi: vital.rr || 0,
            suhu: vital.temp || 0,
            gula_darah: vital.glucose,
            kesadaran,
            map: calculateMeanArterialPressure(vital.sbp, vital.dbp),
            detak_jantung: 'REGULAR',
          },
        }
      : {}),

    // periksa_fisik: GCS + SpO2 + ADL + IMT from AVPU + spo2 + disabilityType + obesityConfirmation
    periksa_fisik: buildPeriksaFisikExtended(
      avpu,
      spo2,
      input.disabilityType,
      clinicalComplaintText,
      input.patientGender,
      input.patientAge,
      input.obesityConfirmation ?? false
    ),

    // assesmen_nyeri: from pain_score, or inferred from keluhan
    // pencetus/kualitas/lokasi are conditional fields (appear after "Ya" radio click)
    ...(shouldFillNyeri
      ? {
          assesmen_nyeri: {
            merasakan_nyeri: '1',
            skala_nyeri: input.painScore ?? 4,
            ...buildNyeriDetails(clinicalComplaintText),
          },
        }
      : {
          assesmen_nyeri: {
            merasakan_nyeri: '0',
            skala_nyeri: 0,
          },
        }),

    // resiko_jatuh: based on consciousness
    resiko_jatuh: {
      cara_berjalan: avpu === 'A' ? '0' : '1',
      penopang: avpu === 'A' ? '0' : '1',
    },

    // status_psikososial: sensible clinical defaults
    status_psikososial: {
      alat_bantu_aktrifitas: input.disabilityType ? '1' : '0',
      kendala_komunikasi: '0',
      merawat_dirumah: '1',
      membutuhkan_bantuan: input.disabilityType ? '1' : '0',
      bahasa_digunakan: 'indonesia',
      tinggal_dengan: 'lainnya',
      sosial_ekonomi: 'cukup',
      gangguan_jiwa_dimasa_lalu: '0',
      status_ekonomi: 'cukup',
    },

    // lainnya: semua field termasuk askep, observasi, biopsikososial, tindakan keperawatan
    lainnya: buildLainnyaFromMedications(),

    // keadaan_fisik: symptom-based organ system activation
    keadaan_fisik: buildKeadaanFisikFromKeluhan(clinicalComplaintText),

    anatomi_tubuh: buildAnatomiTubuhPayload(clinicalComplaintText),

    // tenaga_medis — these are the default constants; when the signed-in Assist user resolves to
    // a doctor or nurse profession, entrypoints/background.ts (applyAssistStaffPayload) overwrites
    // dokter_nama/perawat_nama on the transfer payload before it is sent (DECISIONS 2026-09-27).
    tenaga_medis: {
      dokter_nama: DOKTER_NAMA,
      perawat_nama: PERAWAT_NAMA,
    },
  };

  return { payload, reasonCodes };
}

function buildDiagnosaPayload(
  diagnosis?: Partial<DiagnosaFillPayload> | null,
  trajectory?: TrajectoryAnalysis,
  hasVisitHistory?: boolean
): DiagnosaFillPayload | null {
  if (!diagnosis?.icd_x?.trim()) return null;

  const icdCode = diagnosis.icd_x.trim().toUpperCase();

  // Auto-detect chronic diseases from ICD code
  const chronicDisease = classifyChronicDisease(icdCode);
  const penyakitKronis = chronicDisease
    ? [chronicDisease.fullName]
    : diagnosis.penyakit_kronis || [];

  // Auto-map prognosis from trajectory if available
  const prognosa = trajectory
    ? mapTrajectoryToPrognosis(trajectory)
    : diagnosis.prognosa || 'Bonam (Baik)';

  // Auto-detect kasus based on visit history
  const kasus = hasVisitHistory ? 'LAMA' : diagnosis.kasus || 'BARU';

  return {
    icd_x: icdCode,
    nama: diagnosis.nama?.trim() || icdCode,
    jenis: diagnosis.jenis || 'PRIMER',
    kasus,
    prognosa,
    penyakit_kronis: penyakitKronis,
  };
}

function buildResepPayload(input: RMETransferMapperInput): {
  payload: ResepFillPayload | null;
  reasonCodes: RMETransferReasonCode[];
  triadMissingRoles: TriadRole[];
} {
  const reasonCodes: RMETransferReasonCode[] = [];
  const medications = input.medications || [];
  const safeMedications = medications.filter((item) => item.safety_check !== 'contraindicated');

  if (medications.length > 0 && safeMedications.length === 0) {
    reasonCodes.push('RESEP_EMPTY_AFTER_SAFETY');
  }
  if (safeMedications.length === 0) {
    reasonCodes.push('RESEP_PAYLOAD_EMPTY');
    return { payload: null, reasonCodes, triadMissingRoles: ['utama', 'adjuvant', 'vitamin'] };
  }

  const roles = {
    utama: 0,
    adjuvant: 0,
    vitamin: 0,
  };

  const mappedRows: ResepFillPayload['medications'] = safeMedications.slice(0, 6).map((med) => {
    const resolvedMedicationName = resolveMedicationNameFromStock(med.nama_obat);
    const role = classifyRole(resolvedMedicationName);
    roles[role] += 1;
    const estimatedQty = estimateQuantity(med.dosis, med.durasi);
    return {
      racikan: '0',
      jumlah_permintaan: estimatedQty,
      nama_obat: resolvedMedicationName,
      jumlah: estimatedQty,
      signa: normalizeSignaValue(med.dosis),
      aturan_pakai: mapAturanPakai(med.aturan_pakai),
      keterangan: resolveMedicationNote(med.rationale, med.aturan_pakai),
    };
  });

  const triadMissingRoles = (Object.keys(roles) as TriadRole[]).filter((key) => roles[key] === 0);
  if (triadMissingRoles.length > 0) {
    reasonCodes.push('RESEP_TRIAD_INCOMPLETE');
  }

  const allergySummary = normalizeAllergies(input.allergies || []);
  const allergyText = [...allergySummary.obat, ...allergySummary.makanan, ...allergySummary.udara]
    .filter(Boolean)
    .join(', ');
  return {
    payload: {
      static: {
        no_resep: '',
        alergi: allergyText,
      },
      ajax: {
        ruangan: '',
        dokter: DOKTER_NAMA,
        perawat: PERAWAT_NAMA,
      },
      medications: mappedRows,
      prioritas: '0',
    },
    reasonCodes,
    triadMissingRoles,
  };
}

/**
 * buildRMETransferPayload
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function buildRMETransferPayload(input: RMETransferMapperInput): {
  payload: RMETransferPayload;
  reasonCodes: RMETransferReasonCode[];
} {
  const reasonCodes = new Set<RMETransferReasonCode>();
  const anamnesa = buildAnamnesaPayload(input);
  anamnesa.reasonCodes.forEach((code) => reasonCodes.add(code));

  const diagnosa = buildDiagnosaPayload(input.diagnosis, input.trajectory, input.hasVisitHistory);
  if (!diagnosa) reasonCodes.add('DIAGNOSA_PAYLOAD_EMPTY');

  const resep = buildResepPayload(input);
  resep.reasonCodes.forEach((code) => reasonCodes.add(code));

  const payload: RMETransferPayload = {
    anamnesa: truncateDeepStrings(anamnesa.payload),
    diagnosa: diagnosa ? truncateDeepStrings(diagnosa) : diagnosa,
    resep: resep.payload ? truncateDeepStrings(resep.payload) : resep.payload,
    meta: {
      reasonCodes: Array.from(reasonCodes),
      triadComplete: resep.triadMissingRoles.length === 0,
      triadMissingRoles: resep.triadMissingRoles,
    },
  };

  return {
    payload,
    reasonCodes: Array.from(reasonCodes),
  };
}

export const __rmeMapperInternals = {
  resolveMedicationCandidatesFromStock,
  scoreMedicationCandidate,
  getMedicationFormPreference,
};
