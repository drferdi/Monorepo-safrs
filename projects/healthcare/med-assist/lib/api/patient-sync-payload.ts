// Designed and constructed by Drferdi.

export interface PatientSyncStructuredSigns {
  respiratoryDistress?: {
    accessoryMuscleUse?: boolean;
    retractions?: boolean;
    unableToSpeakFullSentences?: boolean;
    cyanosis?: boolean;
    distressObserved?: boolean;
  };
  hmod?: {
    chest_pain?: boolean;
    pulmonary_edema?: boolean;
    neurological_deficit?: boolean;
    vision_changes?: boolean;
    severe_headache?: boolean;
    oliguria?: boolean;
    altered_mental_status?: boolean;
  };
  dkaHhs?: {
    kussmaul_breathing?: boolean;
    acetone_breath?: boolean;
    nausea_vomiting?: boolean;
    abdominal_pain?: boolean;
    altered_mental_status?: boolean;
    severe_dehydration?: boolean;
    extreme_hyperglycemia?: boolean;
    seizures?: boolean;
  };
  perfusionShock?: {
    dizziness?: boolean;
    presyncope?: boolean;
    syncope?: boolean;
    weakness?: boolean;
    clammySkin?: boolean;
    coldExtremities?: boolean;
    oliguria?: boolean;
    capillaryRefillSec?: number;
  };
}

/**
 * PatientSyncPayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface PatientSyncPayload {
  patient: {
    name: string;
    age: number;
    gender: 'L' | 'P';
    rm?: string;
    noBpjs?: string;
    isPregnant?: boolean;
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
  narrative: {
    keluhan_utama?: string;
    keluhan_tambahan?: string;
  };
  structuredSigns?: PatientSyncStructuredSigns;
  visitHistory?: Array<Record<string, unknown>>;
  medicalHistory?: string[];
}

type PatientSyncInferenceInput = Pick<PatientSyncPayload, 'patient' | 'vitals' | 'narrative'> & {
  medicalHistory?: string[];
};

type PatientSyncBuildInput = PatientSyncInferenceInput & {
  structuredSigns?: PatientSyncStructuredSigns;
  alertIds?: string[];
};

function normalizeText(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

/**
 * Keep only positive clinical signals (true) and numeric fields.
 * Objects that are entirely false are omitted so payloads do not ship empty flag structs.
 */
function compactBooleanSection<T extends Record<string, boolean | number | undefined>>(
  section: T
): T | undefined {
  const entries = Object.entries(section).filter(([, value]) => {
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value === true;
    return typeof value === 'number';
  });
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as T;
}

function mergeStructuredSection<T extends Record<string, boolean | number | undefined>>(
  base?: T,
  override?: T
): T | undefined {
  if (!base && !override) return undefined;
  return compactBooleanSection({
    ...(base ?? {}),
    ...(override ?? {}),
  } as T);
}

/**
 * mergeStructuredSigns
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function mergeStructuredSigns(
  base?: PatientSyncStructuredSigns,
  override?: PatientSyncStructuredSigns
): PatientSyncStructuredSigns | undefined {
  const structuredSigns: PatientSyncStructuredSigns = {};

  const respiratoryDistress = mergeStructuredSection(
    base?.respiratoryDistress,
    override?.respiratoryDistress
  );
  const hmod = mergeStructuredSection(base?.hmod, override?.hmod);
  const dkaHhs = mergeStructuredSection(base?.dkaHhs, override?.dkaHhs);
  const perfusionShock = mergeStructuredSection(base?.perfusionShock, override?.perfusionShock);

  if (respiratoryDistress) structuredSigns.respiratoryDistress = respiratoryDistress;
  if (hmod) structuredSigns.hmod = hmod;
  if (dkaHhs) structuredSigns.dkaHhs = dkaHhs;
  if (perfusionShock) structuredSigns.perfusionShock = perfusionShock;

  return Object.keys(structuredSigns).length > 0 ? structuredSigns : undefined;
}

/**
 * applyAlertDerivedStructuredSigns
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function applyAlertDerivedStructuredSigns(
  base: PatientSyncStructuredSigns | undefined,
  alertIds: string[] | undefined
): PatientSyncStructuredSigns | undefined {
  if (!alertIds || alertIds.length === 0) return base;

  const alertSet = new Set(alertIds);
  const alertDerived: PatientSyncStructuredSigns = {};

  if (
    alertSet.has('gate6-critical-tachypnea') ||
    alertSet.has('gate6-tachypnea-high') ||
    alertSet.has('gate6-tachypnea-warning')
  ) {
    alertDerived.respiratoryDistress = {
      distressObserved: true,
    };
  }

  if (alertSet.has('gate3-hyperglycemia-crisis')) {
    alertDerived.dkaHhs = {
      extreme_hyperglycemia: true,
    };
  }

  return mergeStructuredSigns(base, alertDerived);
}

/**
 * inferStructuredSignsFromPatientSyncInput
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function inferStructuredSignsFromPatientSyncInput(
  input: PatientSyncInferenceInput
): PatientSyncStructuredSigns | undefined {
  const text = normalizeText(
    input.narrative.keluhan_utama,
    input.narrative.keluhan_tambahan,
    ...(input.medicalHistory ?? [])
  );

  const rr = input.vitals.rr;
  const glucose = input.vitals.glucose;

  const alteredMentalStatus = hasAnyKeyword(text, [
    'penurunan kesadaran',
    'altered mental',
    'kesadaran menurun',
    'bingung',
    'somnolen',
    'delirium',
    'tidak responsif',
    'gelisah berat',
  ]);

  const oliguria = hasAnyKeyword(text, [
    'oliguria',
    'kencing sedikit',
    'bak sedikit',
    'urin sedikit',
  ]);

  const respiratoryDistress = compactBooleanSection({
    accessoryMuscleUse: hasAnyKeyword(text, [
      'otot bantu napas',
      'penggunaan otot bantu napas',
      'cuping hidung',
      'napas cuping hidung',
    ]),
    retractions: hasAnyKeyword(text, ['retraksi', 'tarikan dinding dada', 'indrawing']),
    unableToSpeakFullSentences: hasAnyKeyword(text, [
      'tidak bisa bicara kalimat panjang',
      'bicara terputus',
      'hanya sepatah kata',
      'tidak mampu bicara penuh',
    ]),
    cyanosis: hasAnyKeyword(text, ['sianosis', 'bibir kebiruan', 'bibir biru', 'akral sianosis']),
    distressObserved:
      hasAnyKeyword(text, ['sesak berat', 'distress respirasi', 'sulit bernapas']) ||
      (typeof rr === 'number' && rr >= 30),
  });

  const hmod = compactBooleanSection({
    chest_pain: hasAnyKeyword(text, ['nyeri dada', 'chest pain', 'dada terasa tertekan']),
    pulmonary_edema: hasAnyKeyword(text, [
      'edema paru',
      'pulmonary edema',
      'ronki basah',
      'orthopnea',
      'sesak saat berbaring',
    ]),
    neurological_deficit: hasAnyKeyword(text, [
      'defisit neurologis',
      'hemiparesis',
      'kelemahan separuh tubuh',
      'bicara pelo',
      'mulut mencong',
      'baal separuh tubuh',
    ]),
    vision_changes: hasAnyKeyword(text, [
      'pandangan kabur',
      'penglihatan kabur',
      'vision changes',
      'penglihatan gelap',
    ]),
    severe_headache: hasAnyKeyword(text, [
      'sakit kepala hebat',
      'nyeri kepala hebat',
      'severe headache',
    ]),
    oliguria,
    altered_mental_status: alteredMentalStatus,
  });

  const dkaHhs = compactBooleanSection({
    kussmaul_breathing: hasAnyKeyword(text, [
      'kussmaul',
      'napas kussmaul',
      'napas cepat dalam',
      'napas dalam cepat',
    ]),
    acetone_breath: hasAnyKeyword(text, [
      'bau aseton',
      'bau buah',
      'fruity breath',
      'acetone breath',
    ]),
    nausea_vomiting: hasAnyKeyword(text, ['mual', 'muntah', 'nausea', 'vomiting']),
    abdominal_pain: hasAnyKeyword(text, ['nyeri perut', 'sakit perut', 'abdominal pain']),
    altered_mental_status: alteredMentalStatus,
    severe_dehydration: hasAnyKeyword(text, [
      'dehidrasi berat',
      'sangat haus',
      'haus berat',
      'mulut sangat kering',
      'turgor menurun',
    ]),
    extreme_hyperglycemia:
      (typeof glucose === 'number' && glucose >= 300) ||
      hasAnyKeyword(text, ['gula darah sangat tinggi', 'hiperglikemia berat']),
    seizures: hasAnyKeyword(text, ['kejang', 'seizure', 'convulsion']),
  });

  const perfusionShock = compactBooleanSection({
    dizziness: hasAnyKeyword(text, ['pusing', 'kepala ringan', 'dizziness']),
    presyncope: hasAnyKeyword(text, [
      'hampir pingsan',
      'mau pingsan',
      'pandangan gelap',
      'presyncope',
    ]),
    syncope: hasAnyKeyword(text, ['pingsan', 'syncope', 'loss of consciousness']),
    weakness: hasAnyKeyword(text, ['lemas', 'sangat lemah', 'weakness']),
    clammySkin: hasAnyKeyword(text, ['keringat dingin', 'clammy', 'kulit lembap dingin']),
    coldExtremities: hasAnyKeyword(text, [
      'akral dingin',
      'ekstremitas dingin',
      'tangan kaki dingin',
    ]),
    oliguria,
    capillaryRefillSec: undefined,
  });

  const structuredSigns: PatientSyncStructuredSigns = {};
  if (respiratoryDistress) structuredSigns.respiratoryDistress = respiratoryDistress;
  if (hmod) structuredSigns.hmod = hmod;
  if (dkaHhs) structuredSigns.dkaHhs = dkaHhs;
  if (perfusionShock) structuredSigns.perfusionShock = perfusionShock;

  return Object.keys(structuredSigns).length > 0 ? structuredSigns : undefined;
}

/**
 * buildPatientSyncPayload
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildPatientSyncPayload(input: PatientSyncBuildInput): PatientSyncPayload {
  const inferredStructuredSigns = inferStructuredSignsFromPatientSyncInput(input);
  const alertAwareStructuredSigns = applyAlertDerivedStructuredSigns(
    inferredStructuredSigns,
    input.alertIds
  );
  const structuredSigns = mergeStructuredSigns(alertAwareStructuredSigns, input.structuredSigns);

  const { alertIds: _alertIds, ...payloadInput } = input;
  return {
    ...payloadInput,
    ...(structuredSigns ? { structuredSigns } : {}),
  };
}
