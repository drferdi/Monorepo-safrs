/**
 * Patient OCR / RME extract reliability — fail-closed gate for triage.
 *
 * Incomplete scrapes historically returned age:0 (default), which the vital
 * screening profile treats as infant. Pairing that with adult RME vitals
 * falsely lights triage (e.g. bradycardia/bradypnea for Bayi).
 */

export interface PatientExtractIdentity {
  name?: string | null;
  rm?: string | null;
  age?: number | null;
  /** True only when an Umur/Usia field was actually parsed from the page. */
  ageParsed?: boolean | null;
}

export const PATIENT_EXTRACT_FAILURE_MESSAGE =
  'OCR gagal: data pasien tidak lengkap di halaman RME. Triage ditahan sampai identitas + usia terverifikasi.';

/**
 * Reliable extract requires identity (name + RM) and a usable age signal.
 * - Prefer `ageParsed === true` (Umur/Usia field found), including real infants at age 0.
 * - Legacy payloads without `ageParsed` are accepted only when age > 0.
 */
export function isReliablePatientExtract(patient: PatientExtractIdentity | null | undefined): boolean {
  if (!patient) return false;

  const name = typeof patient.name === 'string' ? patient.name.trim() : '';
  const rm = typeof patient.rm === 'string' ? patient.rm.trim() : '';
  const age = patient.age;
  const ageIsNumber = typeof age === 'number' && Number.isFinite(age) && age >= 0;
  const ageOk = patient.ageParsed === true || (ageIsNumber && (age as number) > 0);

  return Boolean(name.length > 2 && rm.length > 0 && ageOk && ageIsNumber);
}
