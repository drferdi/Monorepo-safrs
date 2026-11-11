import { canOverrideField, type FieldMeta } from '@/lib/clinical/aassist-v2/field-priority';
import { type AutosenPreset } from '@/lib/clinical/autosen-types';
import {
  estimateRestingHeartRate,
  estimateRestingRespiratoryRate,
  getVitalScreeningProfile,
  type VitalScreeningProfile,
} from '@/lib/clinical/vital-screening-thresholds';
import { GLUCOSE_THRESHOLDS } from '@/lib/emergency-detector/glucose-classifier';

/**
 * VitalAutofillValues interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface VitalAutofillValues {
  sbp: string;
  dbp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  glucose: string;
}

/**
 * VitalAutofillResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface VitalAutofillResult {
  vitals: VitalAutofillValues;
  physiologyLabel: string;
  reasoning: string[];
}

interface NumericVitals {
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  temp: number;
  spo2: number;
  glucose: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const formatInt = (value: number): string => Math.round(value).toString();

const formatTemp = (value: number): string => value.toFixed(1);

type VitalAutofillFieldKey = keyof VitalAutofillValues;

const INDEPENDENT_AUTOFILL_FIELD_KEYS: readonly VitalAutofillFieldKey[] = [
  'hr',
  'rr',
  'temp',
  'spo2',
  'glucose',
];

function isManualBloodPressureMeta(meta: FieldMeta | undefined): boolean {
  if (!meta?.value) return false;
  return meta.locked || meta.source === 'RME-manual' || meta.source === 'ASIST-manual';
}

function hasIncompleteAutocompleteBloodPressurePair(
  meta: Partial<Record<VitalAutofillFieldKey, FieldMeta>>
): boolean {
  const sbpMeta = meta.sbp;
  const dbpMeta = meta.dbp;
  const hasAutocompleteSbp = sbpMeta?.source === 'ASIST-autocomplete' && Boolean(sbpMeta.value);
  const hasAutocompleteDbp = dbpMeta?.source === 'ASIST-autocomplete' && Boolean(dbpMeta.value);
  return hasAutocompleteSbp !== hasAutocompleteDbp;
}

export function filterVitalAutofillByFieldPriority(
  generatedVitals: VitalAutofillValues,
  fieldMeta: Partial<Record<VitalAutofillFieldKey, FieldMeta>>
): Partial<VitalAutofillValues> {
  const filteredVitals: Partial<VitalAutofillValues> = {};
  const generatedHasBloodPressure = Boolean(generatedVitals.sbp && generatedVitals.dbp);
  const shouldRepairIncompleteAutocompleteBp =
    hasIncompleteAutocompleteBloodPressurePair(fieldMeta);
  const shouldFillBloodPressure =
    generatedHasBloodPressure &&
    !isManualBloodPressureMeta(fieldMeta.sbp) &&
    !isManualBloodPressureMeta(fieldMeta.dbp) &&
    (shouldRepairIncompleteAutocompleteBp ||
      (canOverrideField(fieldMeta.sbp, 'ASIST-autocomplete') &&
        canOverrideField(fieldMeta.dbp, 'ASIST-autocomplete')));

  if (shouldFillBloodPressure) {
    filteredVitals.sbp = generatedVitals.sbp;
    filteredVitals.dbp = generatedVitals.dbp;
  }

  for (const field of INDEPENDENT_AUTOFILL_FIELD_KEYS) {
    if (canOverrideField(fieldMeta[field], 'ASIST-autocomplete')) {
      filteredVitals[field] = generatedVitals[field];
    }
  }

  return filteredVitals;
}

function buildBaselineVitals(profile: VitalScreeningProfile): NumericVitals {
  const sbp = profile.isPediatric
    ? profile.hypotensionSbpFloor + 12
    : profile.isOlderAdult
      ? 124
      : 118;
  const dbp = profile.isPediatric
    ? Math.max(52, Math.round(sbp * 0.62))
    : profile.isOlderAdult
      ? 74
      : 76;
  const hr = estimateRestingHeartRate(profile);
  const rr = estimateRestingRespiratoryRate(profile);

  return {
    sbp,
    dbp,
    hr,
    rr,
    temp: profile.isOlderAdult ? 37.1 : 36.8,
    spo2: 98,
    glucose: 95,
  };
}

function applyPresetVitals(
  preset: AutosenPreset,
  profile: VitalScreeningProfile,
  baseline: NumericVitals
): { vitals: NumericVitals; reasoning: string[] } {
  switch (preset) {
    case 'hypertension':
      return {
        vitals: {
          ...baseline,
          sbp: profile.severeHypertensionSbp,
          dbp: profile.severeHypertensionDbp,
          hr: Math.min(profile.tachycardiaThreshold - 6, baseline.hr + 10),
          spo2: 97,
          glucose: Math.max(baseline.glucose, 110),
        },
        reasoning: [
          `Tekanan darah diisi pada ambang hipertensi berat untuk ${profile.label}.`,
          'Nadi dipertahankan sedikit naik tanpa menghapus konteks hemodinamik utama.',
          'Semua gate alert lain tetap dihitung ulang dari nilai yang baru terisi.',
        ],
      };

    case 'hyperglycemia':
      return {
        vitals: {
          ...baseline,
          hr: Math.min(profile.tachycardiaThreshold - 6, baseline.hr + 14),
          rr: Math.min(profile.tachypneaThreshold - 2, baseline.rr + 4),
          spo2: 97,
          glucose: Math.max(GLUCOSE_THRESHOLDS.DIABETES.GDS + 120, 320),
        },
        reasoning: [
          'Glukosa diisi di atas ambang hiperglikemia berat agar gate glukosa aktif.',
          'Nadi dan RR dinaikkan ringan untuk meniru stres metabolik tanpa memaksa syok.',
          'Tekanan darah dan suhu dipertahankan dekat baseline fisiologis pasien.',
        ],
      };

    case 'hypoglycemia':
      return {
        vitals: {
          ...baseline,
          sbp: Math.max(profile.hypotensionSbpFloor + 4, baseline.sbp - 6),
          dbp: Math.max(profile.isPediatric ? 48 : 58, baseline.dbp - 4),
          hr: Math.min(profile.tachycardiaThreshold - 6, baseline.hr + 12),
          glucose: Math.max(40, GLUCOSE_THRESHOLDS.HYPOGLYCEMIA - 12),
        },
        reasoning: [
          'Glukosa diisi di bawah 70 mg/dL agar algoritme hipoglikemia aktif penuh.',
          'Tekanan darah dibuat low-normal dan nadi sedikit naik untuk mencerminkan kompensasi awal.',
          'Nilai lain tetap dijaga realistis terhadap cohort usia pasien.',
        ],
      };

    case 'hypotension': {
      const sbp = Math.max(60, profile.hypotensionSbpFloor - 15);
      const dbp = Math.max(40, Math.round(sbp * 0.58));
      const reasoning = [
        `Tekanan darah diisi di bawah ambang hipotensi (floor ${profile.hypotensionSbpFloor} mmHg) untuk ${profile.label} agar gate hemodinamik aktif.`,
        'Nadi dinaikkan ringan untuk meniru kompensasi awal tanpa memaksa syok.',
      ];
      if (profile.isOlderAdult && profile.geriatricOrthostaticNote) {
        reasoning.push(profile.geriatricOrthostaticNote);
      }
      return {
        vitals: {
          ...baseline,
          sbp,
          dbp,
          hr: Math.min(profile.tachycardiaThreshold - 6, baseline.hr + 14),
        },
        reasoning,
      };
    }

    case 'glucose_tolerance':
      return {
        vitals: {
          ...baseline,
          glucose: clamp(GLUCOSE_THRESHOLDS.PREDIABETES.TTGO_2H.min + 20, 140, 199),
        },
        reasoning: [
          'Glukosa diisi pada rentang toleransi glukosa terganggu, bukan krisis.',
          'Vital sign lain dipertahankan mendekati baseline agar preset ini tidak memunculkan alert palsu.',
        ],
      };

    case 'adl':
    default:
      return {
        vitals: baseline,
        reasoning: [
          'Preset ADL memakai baseline fisiologis usia karena fokusnya adalah konteks fungsi, bukan sindrom hemodinamik tertentu.',
          'Semua field tetap terisi otomatis agar form lengkap dan masih bisa disesuaikan manual.',
        ],
      };
  }
}

/**
 * buildVitalAutofill
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function buildVitalAutofill(
  preset: AutosenPreset,
  patientAge: number,
  _seed?: number
): VitalAutofillResult {
  // All presets route through the age/cohort-aware profile — a patient's vitals must
  // reflect their actual physiology (pediatric/adult/geriatric), never a flat adult range.
  const profile = getVitalScreeningProfile(patientAge || 0);
  const baseline = buildBaselineVitals(profile);
  const { vitals, reasoning } = applyPresetVitals(preset, profile, baseline);

  return {
    physiologyLabel: profile.label,
    reasoning,
    vitals: {
      sbp: formatInt(vitals.sbp),
      dbp: formatInt(vitals.dbp),
      hr: formatInt(vitals.hr),
      rr: formatInt(vitals.rr),
      temp: formatTemp(vitals.temp),
      spo2: formatInt(vitals.spo2),
      glucose: formatInt(vitals.glucose),
    },
  };
}
