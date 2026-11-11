/**
 * VitalScreeningProfile interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface VitalScreeningProfile {
  cohort:
    'infant' | 'toddler' | 'preschool' | 'school_age' | 'adolescent' | 'adult' | 'older_adult';
  label: string;
  isPediatric: boolean;
  isOlderAdult: boolean;
  hypotensionSbpFloor: number;
  bradycardiaThreshold: number;
  tachycardiaThreshold: number;
  bradypneaThreshold: number;
  tachypneaThreshold: number;
  severeHypertensionSbp: number;
  severeHypertensionDbp: number;
  bpScreeningDisclaimer?: string;
  geriatricSingleFeverThreshold?: number;
  geriatricRepeatFeverThreshold?: number;
  geriatricTemperatureNote?: string;
  geriatricOrthostaticNote?: string;
}

function clampAge(age: number): number {
  if (!Number.isFinite(age) || age < 0) return 0;
  return age;
}

function pediatricHypotensionFloor(age: number): number {
  if (age < 1) return 70;
  if (age <= 10) return 70 + Math.round(2 * age);
  return 90;
}

/**
 * getVitalScreeningProfile
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function getVitalScreeningProfile(age: number): VitalScreeningProfile {
  const normalizedAge = clampAge(age);
  const pediatricDisclaimer =
    'Skrining tekanan darah anak memakai ambang usia awal; interpretasi final tetap perlu tabel usia/jenis kelamin/tinggi badan.';

  if (normalizedAge < 1) {
    return {
      cohort: 'infant',
      label: 'Bayi (<1 tahun)',
      isPediatric: true,
      isOlderAdult: false,
      hypotensionSbpFloor: pediatricHypotensionFloor(normalizedAge),
      bradycardiaThreshold: 100,
      tachycardiaThreshold: 160,
      bradypneaThreshold: 24,
      tachypneaThreshold: 50,
      severeHypertensionSbp: 130,
      severeHypertensionDbp: 85,
      bpScreeningDisclaimer: pediatricDisclaimer,
    };
  }

  if (normalizedAge <= 3) {
    return {
      cohort: 'toddler',
      label: 'Anak 1-3 tahun',
      isPediatric: true,
      isOlderAdult: false,
      hypotensionSbpFloor: pediatricHypotensionFloor(normalizedAge),
      bradycardiaThreshold: 90,
      tachycardiaThreshold: 150,
      bradypneaThreshold: 20,
      tachypneaThreshold: 40,
      severeHypertensionSbp: 130,
      severeHypertensionDbp: 85,
      bpScreeningDisclaimer: pediatricDisclaimer,
    };
  }

  if (normalizedAge <= 5) {
    return {
      cohort: 'preschool',
      label: 'Anak 4-5 tahun',
      isPediatric: true,
      isOlderAdult: false,
      hypotensionSbpFloor: pediatricHypotensionFloor(normalizedAge),
      bradycardiaThreshold: 80,
      tachycardiaThreshold: 140,
      bradypneaThreshold: 16,
      tachypneaThreshold: 34,
      severeHypertensionSbp: 132,
      severeHypertensionDbp: 86,
      bpScreeningDisclaimer: pediatricDisclaimer,
    };
  }

  if (normalizedAge <= 12) {
    return {
      cohort: 'school_age',
      label: 'Anak 6-12 tahun',
      isPediatric: true,
      isOlderAdult: false,
      hypotensionSbpFloor: pediatricHypotensionFloor(normalizedAge),
      bradycardiaThreshold: 70,
      tachycardiaThreshold: 130,
      bradypneaThreshold: 14,
      tachypneaThreshold: 30,
      severeHypertensionSbp: 140,
      severeHypertensionDbp: 90,
      bpScreeningDisclaimer: pediatricDisclaimer,
    };
  }

  if (normalizedAge < 18) {
    return {
      cohort: 'adolescent',
      label: 'Remaja 13-17 tahun',
      isPediatric: true,
      isOlderAdult: false,
      hypotensionSbpFloor: 90,
      bradycardiaThreshold: 60,
      tachycardiaThreshold: 120,
      bradypneaThreshold: 12,
      tachypneaThreshold: 24,
      severeHypertensionSbp: 160,
      severeHypertensionDbp: 100,
      bpScreeningDisclaimer:
        'Remaja memakai ambang skrining awal; korelasikan dengan guideline hipertensi remaja dan pengukuran ulang yang benar.',
    };
  }

  if (normalizedAge < 65) {
    return {
      cohort: 'adult',
      label: 'Dewasa',
      isPediatric: false,
      isOlderAdult: false,
      hypotensionSbpFloor: 90,
      bradycardiaThreshold: 50,
      tachycardiaThreshold: 130,
      bradypneaThreshold: 10,
      tachypneaThreshold: 30,
      severeHypertensionSbp: 160,
      severeHypertensionDbp: 100,
    };
  }

  return {
    cohort: 'older_adult',
    label: 'Usia Tua (>=65 tahun)',
    isPediatric: false,
    isOlderAdult: true,
    hypotensionSbpFloor: 90,
    bradycardiaThreshold: 50,
    tachycardiaThreshold: 130,
    bradypneaThreshold: 10,
    tachypneaThreshold: 30,
    severeHypertensionSbp: 160,
    severeHypertensionDbp: 100,
    geriatricSingleFeverThreshold: 37.8,
    geriatricRepeatFeverThreshold: 37.2,
    geriatricTemperatureNote:
      'Suhu basal usia tua dapat lebih rendah; tidak adanya demam tidak menyingkirkan infeksi.',
    geriatricOrthostaticNote:
      'Pada usia tua, pertimbangkan cek hipotensi ortostatik bila ada pusing, jatuh, sinkop, atau kelemahan saat berdiri.',
  };
}

const clampToRange = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const midpointOf = (min: number, max: number): number => Math.round((min + max) / 2);

/**
 * estimateRestingHeartRate / estimateRestingRespiratoryRate
 *
 * @remarks
 * Shared cohort-baseline estimate used both to autofill plausible resting
 * vitals (lib/clinical/vital-autocomplete.ts) and to re-center adult-authored
 * symptom-inference ranges onto the patient's own age cohort
 * (lib/emergency-detector/ttv-inference.ts) — kept in one place so the two
 * consumers can never silently drift apart on what "resting" means per age.
 */

export function estimateRestingHeartRate(profile: VitalScreeningProfile): number {
  return clampToRange(
    midpointOf(profile.bradycardiaThreshold + 10, profile.tachycardiaThreshold - 14),
    profile.bradycardiaThreshold + 6,
    profile.tachycardiaThreshold - 6
  );
}

export function estimateRestingRespiratoryRate(profile: VitalScreeningProfile): number {
  return clampToRange(
    midpointOf(profile.bradypneaThreshold + 3, profile.tachypneaThreshold - 4),
    profile.bradypneaThreshold + 2,
    profile.tachypneaThreshold - 2
  );
}
