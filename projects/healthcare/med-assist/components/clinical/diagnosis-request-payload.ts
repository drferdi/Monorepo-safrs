// Designed and constructed by Drferdi.
import type { DiagnosisRequestContext } from '@/types/api';

interface DifferentialVitalsInput {
  sbp: number;
  dbp: number;
  hr: number;
  rr: number;
  temp: number;
  glucose?: number;
}

interface BuildDiagnosisRequestPayloadInput {
  keluhanUtama: string;
  keluhanTambahan?: string;
  patientAge: number;
  patientGender: 'L' | 'P';
  pregnancyStatus?: boolean | null;
  allergies: string[];
  chronicDiseases: string[];
  vitals: DifferentialVitalsInput;
}

type DiagnosisVitalSigns = NonNullable<DiagnosisRequestContext['vital_signs']>;

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || cleaned.toLowerCase() === 'tidak ada') continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }

  return output;
}

function toOptionalVital(value: number): number | undefined {
  return value > 0 ? value : undefined;
}

function buildVitalSigns(vitals: DifferentialVitalsInput): DiagnosisVitalSigns | undefined {
  const supportedVitals: DiagnosisVitalSigns = {
    systolic: toOptionalVital(vitals.sbp),
    diastolic: toOptionalVital(vitals.dbp),
    heart_rate: toOptionalVital(vitals.hr),
    respiratory_rate: toOptionalVital(vitals.rr),
    temperature: toOptionalVital(vitals.temp),
  };

  return Object.values(supportedVitals).some((value) => value !== undefined)
    ? supportedVitals
    : undefined;
}

export function buildDiagnosisRequestPayload(
  input: BuildDiagnosisRequestPayloadInput
): DiagnosisRequestContext {
  const vitalSigns = buildVitalSigns(input.vitals);

  return {
    keluhan_utama: input.keluhanUtama,
    keluhan_tambahan: input.keluhanTambahan || '',
    // Unknown age stays 0 (neutral) — never invent adult default 30 (H7).
    patient_age: input.patientAge > 0 ? input.patientAge : 0,
    patient_gender: input.patientGender === 'P' ? 'F' : 'M',
    ...(vitalSigns ? { vital_signs: vitalSigns } : {}),
    allergies: uniqueStrings(input.allergies),
    chronic_diseases: uniqueStrings(input.chronicDiseases),
  };
}
