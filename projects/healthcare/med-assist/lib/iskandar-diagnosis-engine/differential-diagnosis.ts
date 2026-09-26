// Designed and constructed by Drferdi.
import type { DiagnosisSuggestion } from '@/types/api';

/**
 * DifferentialVitals interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface DifferentialVitals {
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  temp: number;
  glucose: number;
}

/**
 * SupportingExamPlan interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface SupportingExamPlan {
  needLevel: 'required' | 'recommended' | 'optional';
  summary: string;
  tests: string[];
}

/**
 * DifferentialInsight interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-03-12
 */

export interface DifferentialInsight {
  matchedSymptoms: string[];
  vitalDrivers: string[];
  supportingExamPlan: SupportingExamPlan;
}

interface BuildDifferentialInsightInput {
  suggestion: DiagnosisSuggestion;
  keluhanUtama: string;
  keluhanTambahan?: string;
  vitals: DifferentialVitals;
}

const STOP_WORDS = new Set([
  'dan',
  'atau',
  'yang',
  'dengan',
  'pada',
  'untuk',
  'sejak',
  'sudah',
  'belum',
  'ada',
  'tidak',
  'di',
  'ke',
  'dari',
  'karena',
  'pasien',
]);

const COMPOUND_SIGNALS = [
  'nyeri dada',
  'sesak napas',
  'sulit napas',
  'batuk berdahak',
  'batuk kering',
  'sakit kepala',
  'nyeri perut',
  'bab cair',
  'kencing sering',
  'poliuria',
  'polidipsia',
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * extractComplaintSignals
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function extractComplaintSignals(
  keluhanUtama: string,
  keluhanTambahan = '',
  max = 8
): string[] {
  const text = normalizeText(`${keluhanUtama} ${keluhanTambahan}`);
  if (!text) return [];

  const compoundHits = COMPOUND_SIGNALS.filter((phrase) => text.includes(phrase));
  const tokens = text
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return uniq([...compoundHits, ...tokens]).slice(0, max);
}

/**
 * deriveVitalDrivers
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function deriveVitalDrivers(vitals: DifferentialVitals): string[] {
  const drivers: string[] = [];

  if (vitals.sbp >= 180 || vitals.dbp >= 120) {
    drivers.push(`TD ${vitals.sbp}/${vitals.dbp} mmHg pada zona krisis hipertensi.`);
  } else if (vitals.sbp >= 160 || vitals.dbp >= 100) {
    drivers.push(`TD ${vitals.sbp}/${vitals.dbp} mmHg menunjukkan hipertensi derajat tinggi.`);
  }

  if (vitals.hr > 120) drivers.push(`Nadi ${vitals.hr}/mnt menunjukkan takikardia bermakna.`);
  else if (vitals.hr > 100) drivers.push(`Nadi ${vitals.hr}/mnt cenderung meningkat.`);
  else if (vitals.hr > 0 && vitals.hr < 50)
    drivers.push(`Nadi ${vitals.hr}/mnt menunjukkan bradikardia.`);

  if (vitals.rr >= 24) drivers.push(`RR ${vitals.rr}/mnt menunjukkan takipnea.`);
  else if (vitals.rr > 0 && vitals.rr <= 10)
    drivers.push(`RR ${vitals.rr}/mnt menunjukkan hipoventilasi.`);

  if (vitals.temp >= 38.5)
    drivers.push(`Suhu ${vitals.temp.toFixed(1)}°C konsisten dengan demam tinggi.`);
  else if (vitals.temp > 0 && vitals.temp < 35.5) {
    drivers.push(`Suhu ${vitals.temp.toFixed(1)}°C mengarah ke hipotermia.`);
  }

  if (vitals.glucose >= 300)
    drivers.push(`GDS ${vitals.glucose} mg/dL pada zona risiko dekompensasi metabolik.`);
  else if (vitals.glucose > 0 && vitals.glucose < 70) {
    drivers.push(`GDS ${vitals.glucose} mg/dL pada zona hipoglikemia.`);
  }

  return drivers;
}

/**
 * matchSuggestionSignals
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function matchSuggestionSignals(
  suggestion: DiagnosisSuggestion,
  complaintSignals: string[]
): string[] {
  if (complaintSignals.length === 0) return [];

  const haystack = normalizeText(
    [
      suggestion.nama,
      suggestion.rationale || suggestion.reasoning || '',
      ...(suggestion.red_flags || []),
      ...(suggestion.recommended_actions || []),
    ].join(' ')
  );

  const matched = complaintSignals.filter((signal) => haystack.includes(signal));
  if (matched.length > 0) return matched.slice(0, 5);
  return [];
}

function upperIcdPrefix(icdX: string): string {
  const normalized = icdX.toUpperCase().trim();
  const match = normalized.match(/^[A-Z][0-9]{1,2}/);
  return match ? match[0] : normalized.slice(0, 3);
}

/**
 * deriveSupportingExamPlan
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function deriveSupportingExamPlan(
  suggestion: DiagnosisSuggestion,
  vitals: DifferentialVitals,
  matchedSymptoms: string[]
): SupportingExamPlan {
  const tests: string[] = [];
  const icdPrefix = upperIcdPrefix(suggestion.icd_x || '');
  const label = normalizeText(suggestion.nama);
  const hasRedFlag = (suggestion.red_flags?.length || 0) > 0;
  const hasCriticalVital =
    vitals.sbp >= 180 ||
    vitals.dbp >= 120 ||
    vitals.glucose >= 300 ||
    (vitals.glucose > 0 && vitals.glucose < 70) ||
    vitals.temp >= 38.5;

  const symptomBlob = matchedSymptoms.join(' ');
  const hasRespiratoryClue = /(batuk|sesak|napas|pneumonia)/.test(`${label} ${symptomBlob}`);
  const hasGastroClue = /(diare|mual|muntah|perut|gastro|dehidrasi)/.test(
    `${label} ${symptomBlob}`
  );
  const hasUrinaryClue = /(kencing|urin|baku|anyang|uti|sistitis)/.test(`${label} ${symptomBlob}`);

  if (/^I1[0-6]/.test(icdPrefix) || /(hipertensi|stroke|acs|angina|dada)/.test(label)) {
    tests.push('Ulang TD serial 2-3 kali + evaluasi MAP');
    tests.push('EKG 12 sadapan');
    tests.push('Urinalisis (proteinuria) dan kreatinin serum');
  }

  if (/^E1[0-6]/.test(icdPrefix) || /(diabetes|glukosa|hiperglik|hipoglik)/.test(label)) {
    tests.push('GDP/GD2PP atau GDS ulang terverifikasi');
    tests.push('HbA1c');
    if (vitals.glucose >= 250 || vitals.glucose < 70) tests.push('Keton urin/keton darah');
    if (vitals.glucose >= 300) tests.push('Elektrolit + fungsi ginjal');
  }

  if (/^J[0-9]/.test(icdPrefix) || hasRespiratoryClue) {
    tests.push('SpO2 dan auskultasi paru');
    tests.push('Hitung darah lengkap ± CRP bila demam');
    tests.push('Foto toraks bila gejala respirasi berat/persisten');
  }

  if (/^(A09|K|R10|R11)/.test(icdPrefix) || hasGastroClue) {
    tests.push('Status hidrasi klinis + elektrolit');
    tests.push('Pemeriksaan feses bila diare persisten/berdarah');
    tests.push('Uji fungsi ginjal bila muntah/diare berat');
  }

  if (/^(N3|N39)/.test(icdPrefix) || hasUrinaryClue) {
    tests.push('Urinalisis dipstick + sedimen');
    tests.push('Kultur urin bila kasus berulang/komplikasi');
  }

  if (tests.length === 0) {
    tests.push('Pemeriksaan fisik fokus + monitoring ulang 24 jam');
    tests.push('Pertimbangkan lab dasar sesuai evolusi gejala');
  }

  const uniqTests = uniq(tests);

  if (hasRedFlag || hasCriticalVital) {
    return {
      needLevel: 'required',
      summary: 'Pemeriksaan penunjang wajib segera untuk menyingkirkan kondisi akut.',
      tests: uniqTests,
    };
  }

  if (
    uniqTests.some(
      (test) => test.includes('EKG') || test.includes('HbA1c') || test.includes('Foto toraks')
    )
  ) {
    return {
      needLevel: 'recommended',
      summary: 'Pemeriksaan penunjang disarankan untuk konfirmasi diferensial utama.',
      tests: uniqTests,
    };
  }

  return {
    needLevel: 'optional',
    summary: 'Pemeriksaan penunjang selektif; utamakan monitoring klinis serial.',
    tests: uniqTests,
  };
}

/**
 * buildDifferentialInsight
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function buildDifferentialInsight(
  input: BuildDifferentialInsightInput
): DifferentialInsight {
  const complaintSignals = extractComplaintSignals(input.keluhanUtama, input.keluhanTambahan);
  const matchedSymptoms = matchSuggestionSignals(input.suggestion, complaintSignals);
  const vitalDrivers = deriveVitalDrivers(input.vitals);
  const supportingExamPlan = deriveSupportingExamPlan(
    input.suggestion,
    input.vitals,
    matchedSymptoms
  );

  return {
    matchedSymptoms,
    vitalDrivers,
    supportingExamPlan,
  };
}
