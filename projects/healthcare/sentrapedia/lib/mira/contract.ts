import requestSchema from "./request.schema.json";
import responseSchema from "./response.schema.json";
import { validateJson } from "./validate-json";
import type { CaseState, EngineResult } from "./types";

export interface MiraTherapy { forDiagnosis: { icd10: string; label: string }; regimen: { drug: string; dose: string; route: string; duration: string; note: string }[]; interactions: string[]; contraindications: string[] }
export type MiraResult = Omit<EngineResult, "meta"> & { contractVersion: "1"; meta: { version: string; model: string | null; costUsd: number | null }; therapy?: MiraTherapy };
export interface MiraAnalysis { case: CaseState; result: MiraResult; traceId: string; createdAt: string }
export function validCase(value: unknown): value is CaseState {
  if (validateJson({ contractVersion: "1", traceId: "validation", case: value }, requestSchema).length) return false;
  const data = value as CaseState;
  return !!data.chiefComplaint.trim() && (data.demographics.ageYears === null || data.demographics.ageYears <= 130) && data.results.every(item => item.name.trim() && String(item.value).trim()) && JSON.stringify(data).length <= 24000;
}
export function validResult(value: unknown): value is MiraResult { return validateJson(value, responseSchema).length === 0; }
export function containsIdentity(text: string): boolean {
  return /\b\d{13,16}\b|(?:\+62|\b0[28])\d[\d\s-]{7,14}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:nama|nik|bpjs|no\.?\s*rm|rm|alamat|tanggal\s*lahir|no\.?\s*hp)\s*[:=#]\s*\S|\b(?:Tn|Ny|Sdr|Sdri|Bpk|Ibu)\.\s*[A-Z][a-z]/i.test(text);
}
export function emptyCase(): CaseState { return { demographics: { ageYears: null, sex: "unknown" }, chiefComplaint: "", anamnesis: {}, vitals: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [], allergies: [], facilityCapabilities: [] }; }
