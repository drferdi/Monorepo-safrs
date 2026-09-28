/**
 * One builder for the diagnosis request the side panel sends, used by the Trajectory stage
 * (prefetch) and the diagnosis page (getSuggestions) so both produce the same payload and hash.
 *
 * @module lib/diagnosis-engine/request-context
 */
import type { DiagnosisRequestContext } from '@/types/api';

export interface DiagnosisContextSource {
  keluhanUtama: string;
  keluhanTambahan: string;
  patientAge: number;
  patientGender: 'L' | 'P';
  vitals: { sbp?: number; dbp?: number; hr?: number; rr?: number; temp?: number };
  recurrent: Array<{ icd: string; name: string }>;
}

const positive = (value: number | undefined) => (value && value > 0 ? value : undefined);

export function buildDiagnosisRequestContext(source: DiagnosisContextSource): DiagnosisRequestContext {
  const vital_signs: DiagnosisRequestContext['vital_signs'] = {};
  const systolic = positive(source.vitals.sbp);
  const diastolic = positive(source.vitals.dbp);
  const heart_rate = positive(source.vitals.hr);
  const respiratory_rate = positive(source.vitals.rr);
  const temperature = positive(source.vitals.temp);
  if (systolic) vital_signs.systolic = systolic;
  if (diastolic) vital_signs.diastolic = diastolic;
  if (heart_rate) vital_signs.heart_rate = heart_rate;
  if (respiratory_rate) vital_signs.respiratory_rate = respiratory_rate;
  if (temperature) vital_signs.temperature = temperature;
  return {
    keluhan_utama: source.keluhanUtama.trim(),
    keluhan_tambahan: source.keluhanTambahan.trim(),
    patient_age: source.patientAge > 0 ? source.patientAge : 0,
    patient_gender: source.patientGender === 'P' ? 'F' : 'M',
    vital_signs,
    recurrent_diagnoses: source.recurrent.map((item) => ({ icd: item.icd, name: item.name })),
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** FNV-1a 32-bit over the canonical JSON: stable, synchronous, no crypto dependency. */
export function hashDiagnosisContext(context: DiagnosisRequestContext): string {
  const text = canonical(context);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
