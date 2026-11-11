import type { ModeId } from "../drafts";
import { newId, type Message, type Patient } from "../workspace";
import type { ReviewItem } from "../workflow";
import { emptyCase, type AadiAnalysis } from "./contract";
import { aadiMessage } from "./presentation";

export function composerUsesAadi(mode: ModeId, personalTemplate: boolean): boolean {
  return !personalTemplate && (["question", "ddx", "workup", "refer", "icd10"] as ModeId[]).includes(mode);
}

// The composer's case strip (Gaffer, 2026-10-20: "Setuju semua"): age, sex and vitals as typed, so they reach the case's
// structured fields instead of staying inside the complaint text.
export const caseFieldKeys = ["age", "sex", "bp", "heartRate", "temperature", "respiratoryRate", "spo2"] as const;
export type CaseFieldKey = typeof caseFieldKeys[number];
export type CaseFields = Record<CaseFieldKey, string>;
export const emptyCaseFields = (): CaseFields => ({ age: "", sex: "", bp: "", heartRate: "", temperature: "", respiratoryRate: "", spo2: "" });

const number = (value: string) => /^\d{1,3}(?:[.,]\d{1,2})?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
const within = (value: number, low: number, high: number) => value >= low && value <= high ? value : undefined;
// Each field's plausible range; a value outside it is not sent and the field shows as invalid.
const vitalOf = {
  heartRate: (v: string) => within(number(v), 20, 250),
  temperature: (v: string) => within(number(v), 30, 45),
  respiratoryRate: (v: string) => within(number(v), 4, 80),
  spo2: (v: string) => within(number(v), 50, 100),
};
function bloodPressure(value: string): { systolic: number; diastolic: number } | undefined {
  const match = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(value.trim());
  const systolic = match ? within(Number(match[1]), 40, 300) : undefined, diastolic = match ? within(Number(match[2]), 20, 200) : undefined;
  return systolic !== undefined && diastolic !== undefined && diastolic < systolic ? { systolic, diastolic } : undefined;
}
const ageOf = (value: string) => /^\d{1,3}$/.test(value.trim()) ? within(Number(value), 0, 130) : undefined;

/** True when a filled field cannot be read; an empty field is never invalid. */
export function invalidCaseField(key: CaseFieldKey, value: string): boolean {
  if (!value.trim() || key === "sex") return false;
  return (key === "age" ? ageOf(value) : key === "bp" ? bloodPressure(value) : vitalOf[key](value)) === undefined;
}

// Gaffer, 2026-10-20 (A2, "Ya, tampil dulu"): values read from the typed text fill the strip, where the doctor sees and
// can change them before sending. Only explicit labels count ("45 tahun", "laki-laki", "TD 170/100", "N 98", "S 38,5",
// "RR 22", "SpO2 95%"); anything unlabelled or out of range is left for the doctor.
export function readCaseFields(text: string): Partial<CaseFields> {
  const found: Partial<CaseFields> = {};
  // "sejak 2 tahun" or "3 tahun lalu" is a duration, not an age.
  const age = /\busia\s*:?\s*(\d{1,3})\b/i.exec(text)?.[1] ?? /(?<!\b(?:sejak|selama|sudah|lebih|kurang|hampir)\s+)\b(\d{1,3})\s*(?:tahun|thn|th|yo)\b(?!\s+(?:lalu|yang lalu|terakhir))/i.exec(text)?.[1];
  if (age !== undefined && ageOf(age) !== undefined) found.age = age;
  if (/\b(?:laki-laki|laki laki|lelaki|pria)\b/i.test(text)) found.sex = "M";
  else if (/\b(?:perempuan|wanita)\b/i.test(text)) found.sex = "F";
  const bp = /\b(?:TD|tekanan darah|tensi|BP)\s*[:=]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i.exec(text)?.[1].replace(/\s+/g, "");
  if (bp && bloodPressure(bp)) found.bp = bp;
  // A number followed by a time unit is a duration ("sesak napas 5 hari"), never a vital sign.
  const notDuration = String.raw`(?![\d/]|[.,]\d|\s*(?:hari|jam|minggu|bulan|tahun|thn))`;
  const vitals: [Exclude<CaseFieldKey, "age" | "sex" | "bp">, string][] = [
    ["heartRate", String.raw`(?:\b(?:nadi|HR|frekuensi nadi)|\bN)\s*[:=]?\s*(\d{2,3})`],
    ["temperature", String.raw`(?:\b(?:suhu|temp)|\b[ST])\s*[:=]?\s*(\d{2}(?:[.,]\d)?)`],
    ["respiratoryRate", String.raw`\b(?:RR|frekuensi napas|respirasi)\s*[:=]?\s*(\d{1,2})`],
    ["spo2", String.raw`\b(?:SpO2|SpO₂|saturasi|sat)\s*[:=]?\s*(\d{2,3})`],
  ];
  for (const [key, pattern] of vitals) { const value = new RegExp(pattern + notDuration, "i").exec(text)?.[1]; if (value && vitalOf[key](value) !== undefined) found[key] = value; }
  return found;
}

export function composerCase(prompt: string, context: string, patient?: Pick<Patient, "age" | "sex" | "notes"> & Partial<Pick<Patient, "name" | "id">>, fields?: CaseFields) {
  const data = emptyCase();
  data.chiefComplaint = prompt.trim();
  const age = patient?.age.trim() ?? "";
  if (/^\d{1,3}(?:\.\d+)?$/.test(age) && Number(age) <= 130) data.demographics.ageYears = Number(age);
  const sex = patient?.sex.trim().toLowerCase();
  data.demographics.sex = sex === "male" || sex === "m" ? "M" : sex === "female" || sex === "f" ? "F" : "unknown";
  const history = [context.trim() && `Konteks Encounter\n${context}`, patient?.notes.trim() && `Catatan kasus\n${patient.notes}`].filter(Boolean).join("\n\n");
  if (history) data.anamnesis.freeText = history;
  // A value in the strip wins over the saved patient; an unreadable one is not sent.
  if (fields) {
    const typedAge = ageOf(fields.age);
    if (typedAge !== undefined) data.demographics.ageYears = typedAge;
    if (fields.sex === "M" || fields.sex === "F") data.demographics.sex = fields.sex;
    const bp = bloodPressure(fields.bp);
    if (bp) Object.assign(data.vitals, bp);
    for (const key of ["heartRate", "temperature", "respiratoryRate", "spo2"] as const) { const value = vitalOf[key](fields[key]); if (value !== undefined) data.vitals[key] = value; }
  }
  return data;
}

// The saved patient's age and sex, shown in the strip's empty fields as the values that will be sent.
export function patientHints(patient?: Pick<Patient, "age" | "sex">): { patientAge?: string; patientSex?: "M" | "F" } {
  const { demographics } = composerCase("-", "", patient && { ...patient, notes: "" });
  return { patientAge: demographics.ageYears === null ? undefined : String(demographics.ageYears), patientSex: demographics.sex === "unknown" ? undefined : demographics.sex };
}

export function composerAadiMessages(analysis: AadiAnalysis, prompt: string, mode: ModeId, reviewDefaults?: ReviewItem[]): Message[] {
  return [{ id: newId(), role: "user", content: prompt.trim(), mode, createdAt: analysis.createdAt }, aadiMessage(analysis, reviewDefaults, mode)];
}
