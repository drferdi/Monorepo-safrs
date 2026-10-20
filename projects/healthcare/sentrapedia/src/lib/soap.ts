// Puskesmas flow (2026-10-21): the case guide under the composer and the S/O/A/P view. Deterministic: it reads labelled
// lines (structureNote) and the case strip, reports what is present, and never infers an assessment, code or treatment.
import type { ModeId } from "./drafts";
import { composerUsesAadi, invalidCaseField, type CaseFields } from "./aadi/composer";
import { insertTemplate, missingField } from "./clinical-templates";
import { structureNote, type NoteField } from "./note-structure";

export type GuideKey = "concern" | "age" | "sex" | "vitals" | "history" | "examination" | "assessment" | "plan";
export interface GuideItem { key: GuideKey; label: string; filled: boolean; skeleton: string }

// Each label is one structureNote or readCaseFields already reads, so what a chip inserts is what the drafts parse.
const labels: Record<GuideKey, string> = { concern: "Keluhan utama", age: "Usia", sex: "Jenis kelamin", vitals: "Tanda vital", history: "Anamnesis", examination: "Pemeriksaan fisik", assessment: "Asesmen", plan: "Rencana" };
const analysisItems: GuideKey[] = ["concern", "age", "sex", "vitals", "history", "examination"];
const vitalKeys = ["bp", "heartRate", "temperature", "respiratoryRate", "spo2"] as const;
const vitalLabels: Record<typeof vitalKeys[number], [string, string]> = { bp: ["TD", " mmHg"], heartRate: ["Nadi", "/mnt"], temperature: ["Suhu", " °C"], respiratoryRate: ["RR", "/mnt"], spo2: ["SpO₂", "%"] };
const readable = (fields: CaseFields, key: typeof vitalKeys[number] | "age") => !!fields[key].trim() && !invalidCaseField(key, fields[key]);

/** The items the guide checks for a mode: six for the five analysis modes, eight for "clinic", none elsewhere. */
export function guideItems(mode: ModeId): GuideKey[] {
  if (mode === "clinic") return [...analysisItems, "assessment", "plan"];
  return composerUsesAadi(mode, false) ? analysisItems : [];
}

/** Each item with its filled state, read from labelled text, the strip and the saved patient only. */
export function caseGuide(text: string, fields: CaseFields, hints: { patientAge?: string; patientSex?: "M" | "F" }, mode: ModeId): GuideItem[] {
  const note = structureNote(text);
  const filled: Record<GuideKey, boolean> = {
    // Unlabelled free text is the complaint, as createDraft treats it while nothing is labelled.
    concern: !!note.fields.concern || (!note.recognized && !!text.trim()),
    age: readable(fields, "age") || !!hints.patientAge,
    sex: fields.sex === "M" || fields.sex === "F" || !!hints.patientSex,
    vitals: vitalKeys.some((key) => readable(fields, key)),
    history: !!note.fields.history,
    examination: !!note.fields.examination,
    assessment: !!note.fields.assessment,
    plan: !!(note.fields.plan || note.fields.followup),
  };
  return guideItems(mode).map((key) => ({ key, label: labels[key], filled: filled[key], skeleton: `${labels[key]}: ` }));
}

// Gaffer, 2026-10-21: a case analysis needs these before it is sent, so the report is never built on an empty case.
// The free clinical question ("question") and the local SOAP note ("clinic") are not held back.
const minimumItems: GuideKey[] = ["concern", "age", "sex", "vitals"];
// "question" is held back too: it makes the same nine-part report.
export const minimumModes: ModeId[] = ["question", "ddx", "workup", "refer", "icd10"];

/** The labels of the minimum items still missing in a mode that needs them; empty elsewhere. */
export function missingMinimum(text: string, fields: CaseFields, hints: { patientAge?: string; patientSex?: "M" | "F" }, mode: ModeId): string[] {
  if (!minimumModes.includes(mode)) return [];
  return caseGuide(text, fields, hints, mode).filter((item) => minimumItems.includes(item.key) && !item.filled).map((item) => item.label);
}

/** The strip's readable vitals as one line ("TD 170/100 mmHg · Nadi 98/mnt"); "" when none. */
export function vitalsLine(fields: CaseFields): string {
  return vitalKeys.filter((key) => readable(fields, key)).map((key) => `${vitalLabels[key][0]} ${fields[key].trim()}${vitalLabels[key][1]}`).join(" · ");
}

/** S/O/A/P rows from the typed text and the strip; an empty row carries `missingField`. Never infers A or P. */
export function soapView(text: string, fields: CaseFields): { key: "S" | "O" | "A" | "P"; label: string; text: string }[] {
  const note = structureNote(text);
  const join = (values: (string | undefined)[]) => values.filter(Boolean).join("\n") || missingField;
  const of = (keys: NoteField[]) => keys.map((key) => note.fields[key]);
  return [
    { key: "S", label: "S — Subjektif", text: join([note.recognized ? note.fields.concern : text.trim(), ...of(["history", "associated", "background", "medications", "allergies"])]) },
    { key: "O", label: "O — Objektif", text: join([vitalsLine(fields), ...of(["examination", "investigations"])]) },
    { key: "A", label: "A — Asesmen", text: join(of(["assessment", "differential"])) },
    { key: "P", label: "P — Rencana", text: join(of(["plan", "followup"])) },
  ];
}

// The checklist before an analysis (Gaffer, 2026-10-21, "Ada / Tidak ada"). The typed text is its only state: one line
// "Tanda bahaya: ada …; tidak ada …" and one "<aspect> — " line per asked question under "Anamnesis:", so what is ticked
// is what is sent, and an unchosen red flag stays unassessed rather than negative.
export type FlagValue = "ada" | "tidak";
const flagLine = /^Tanda bahaya\s*:(.*)$/im;
const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The red flags the text marks, keyed by their lower-cased text. */
export function readFlags(text: string): Map<string, FlagValue> {
  const marked = new Map<string, FlagValue>();
  for (const part of (flagLine.exec(text)?.[1] ?? "").split(";")) {
    const match = /^\s*(ada|tidak ada)\s+(.+?)\s*$/i.exec(part);
    if (match) marked.set(match[2].toLowerCase(), match[1].toLowerCase() === "ada" ? "ada" : "tidak");
  }
  return marked;
}

/** The text with one red flag set (null: unassessed again), the line kept in the checklist's order. */
export function setFlag(text: string, flags: string[], flag: string, value: FlagValue | null): string {
  const marked = readFlags(text);
  if (value) marked.set(lowerFirst(flag).toLowerCase(), value); else marked.delete(lowerFirst(flag).toLowerCase());
  const parts = flags.flatMap((item) => { const state = marked.get(item.toLowerCase()); return state ? [`${state === "ada" ? "ada" : "tidak ada"} ${lowerFirst(item)}`] : []; });
  const line = parts.length ? `Tanda bahaya: ${parts.join("; ")}` : "";
  if (flagLine.test(text)) return text.replace(flagLine, line).replace(/\n{3,}/g, "\n\n").trimEnd();
  return line ? insertSection(text, line) : text;
}

/** The aspects whose question line is in the text. */
export function askedQuestions(text: string, aspects: string[]): Set<string> {
  return new Set(aspects.filter((aspect) => new RegExp(`^${escape(aspect)} — `, "m").test(text)));
}

/** The text with an aspect's question line added at the end of the Anamnesis block (or removed), and where to type. */
export function toggleQuestion(text: string, aspect: string): { text: string; caret?: number } {
  const own = new RegExp(`^${escape(aspect)} — .*(?:\\r?\\n|$)`, "m");
  if (own.test(text)) return { text: text.replace(own, "").trimEnd() };
  const line = `${aspect} — `;
  const lines = text.split("\n");
  const start = lines.findIndex((value) => /^\s*Anamnesis\s*:/i.test(value));
  if (start < 0) { const next = insertSection(text, `Anamnesis:\n${line}`); return { text: next, caret: next.length }; }
  let end = start;
  while (end + 1 < lines.length && lines[end + 1].trim()) end++;
  lines.splice(end + 1, 0, line);
  return { text: lines.join("\n"), caret: lines.slice(0, end + 2).join("\n").length };
}

/** What an insert chip puts in the composer: the skeleton after the text, with unlabelled text first given the complaint
 *  label, because structureNote reads unlabelled text as the complaint only while nothing is labelled. */
export function insertSection(prompt: string, skeleton: string): string {
  const base = prompt.trim() && !structureNote(prompt).recognized ? `Keluhan utama: ${prompt.trimStart()}` : prompt;
  return insertTemplate(base, skeleton);
}
