export type PatientGender = 'L' | 'P';
export type PatientAgeBand = 'infant' | 'child' | 'adolescent_or_adult' | 'geriatric';

export interface PatientContextProfileInput {
  age: number;
  gender: PatientGender;
}

export interface PatientContextProfile {
  age: number;
  gender: PatientGender;
  ageBand: PatientAgeBand;
  isInfant: boolean;
  isChild: boolean;
  isGeriatric: boolean;
  isReproductiveFemale: boolean;
  usesFlaccPainScale: boolean;
}

const REDUCED_CONSCIOUSNESS_PHRASES = [
  'tidak sadar',
  'pingsan',
  'koma',
  'kejang',
  'letargi',
] as const;

const PREGNANCY_VERIFICATION_PHRASES = ['nyeri perut bawah', 'telat haid', 'mual muntah'] as const;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function includesAnyPhrase(value: string, phrases: readonly string[]): boolean {
  const normalized = normalizeText(value);
  return phrases.some((phrase) => normalized.includes(phrase));
}

export function buildPatientContextProfile({
  age,
  gender,
}: PatientContextProfileInput): PatientContextProfile {
  const normalizedAge = Number.isFinite(age) && age > 0 ? age : 0;
  const isInfant = normalizedAge < 1;
  const isChild = normalizedAge >= 1 && normalizedAge <= 12;
  const isGeriatric = normalizedAge > 65;
  const isReproductiveFemale = gender === 'P' && normalizedAge >= 15 && normalizedAge <= 45;
  const ageBand: PatientAgeBand = isInfant
    ? 'infant'
    : isChild
      ? 'child'
      : isGeriatric
        ? 'geriatric'
        : 'adolescent_or_adult';

  return {
    age: normalizedAge,
    gender,
    ageBand,
    isInfant,
    isChild,
    isGeriatric,
    isReproductiveFemale,
    usesFlaccPainScale: normalizedAge < 3,
  };
}

export function hasReducedConsciousnessSignal(symptomText: string): boolean {
  return includesAnyPhrase(symptomText, REDUCED_CONSCIOUSNESS_PHRASES);
}

export function needsPregnancyVerification(
  profile: PatientContextProfile,
  symptomText: string,
  pregnancyStatus: boolean | null | undefined
): boolean {
  if (!profile.isReproductiveFemale || pregnancyStatus !== null) return false;
  return includesAnyPhrase(symptomText, PREGNANCY_VERIFICATION_PHRASES);
}
