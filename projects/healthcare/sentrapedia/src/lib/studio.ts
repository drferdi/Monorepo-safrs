import { missingField, missingFieldEnglish } from "./clinical-templates";
import { modes, type ModeId } from "./drafts";
import { structureNote, type NoteField } from "./note-structure";
import type { Encounter } from "./workspace";

// Four needs of a doctor, kept as the groups their headlines rotate through; `modes` holds each group's templates.
// Telaah Bukti waits for a real evidence search.
export const intentGroups: { id: string; label: string; headline: string; modes: ModeId[] }[] = [
  { id: "ask", label: "Analisis", headline: "Analisis kasus klinis.", modes: ["question", "ddx", "workup", "icd10", "refer"] },
  { id: "document", label: "Dokumentasi", headline: "Susun dokumentasi klinis.", modes: ["clinic", "hpi", "chronic", "handoff", "scribe"] },
  { id: "plan", label: "Rencana", headline: "Rencanakan asesmen dan tindak lanjut.", modes: ["ap", "tasks", "referral", "monitoring"] },
  { id: "communicate", label: "Komunikasi", headline: "Siapkan komunikasi untuk pasien dan sejawat.", modes: ["education", "avs", "telephone", "authorization"] },
];

// The chips under the composer: eight modes, one ddx (the spec's "Analisis kasus" and "Diagnosis Banding" share it).
export const chipShortlist: ModeId[] = ["question", "ddx", "clinic", "ap", "refer", "education", "hpi", "avs"];
// A chip reads "Perbarui" once the encounter already holds an assistant document of that mode.
export function chipLabel(mode: ModeId, encounter?: Pick<Encounter, "messages">): string {
  const label = modes.find((item) => item.id === mode)!.label;
  return encounter?.messages.some((message) => message.role === "assistant" && message.mode === mode) ? `Perbarui ${label}` : label;
}
// A mode chip puts the mode's opening sentence in front of the composer text and never drops what is written: an empty
// box gets the opening alone, text that already starts with some mode's opening swaps it, any other text follows it.
export function withOpening(prompt: string, mode: ModeId): string {
  const opening = `${modes.find((item) => item.id === mode)!.opening}\n`;
  if (!prompt.trim()) return opening;
  const current = modes.map((item) => item.opening).filter((text) => prompt.startsWith(text)).sort((a, b) => b.length - a.length)[0];
  return opening + (current ? prompt.slice(current.length).replace(/^\r?\n/, "") : prompt);
}
// The headline rotates through the intent groups, one per visit.
export function headlineFor(visit: number): string {
  const headlines = intentGroups.map((group) => group.headline);
  const n = headlines.length;
  return headlines[((visit % n) + n) % n];
}

// The composer hint is the mode's own.
export function composerPlaceholder(mode: ModeId): string {
  return modes.find((item) => item.id === mode)!.placeholder;
}

export interface DocumentSection { title: string; start: number; end: number; body: string }
export function documentSections(content: string): DocumentSection[] {
  const headings = [...content.matchAll(/^## (.+)\r?\n/gm)];
  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length;
    let end = headings[index + 1]?.index ?? content.length;
    const divider = /^---\r?$/m.exec(content.slice(start, end));
    if (divider) end = start + divider.index;
    return { title: heading[1].trim(), start, end, body: content.slice(start, end) };
  });
}
// The title line above the first section, without a local draft's provenance and patient lines (shown only in copies and downloads).
export function documentTitle(content: string): string {
  const first = content.indexOf("## ");
  return (first < 0 ? content : content.slice(0, first)).split(/\r?\n/).find((line) => line.startsWith("# ")) ?? "";
}
// A local draft's supporting sections, folded in a smaller face (Chief: "cukup drop down dan text lebih kecil").
const supporting = ["Teks sumber (verbatim)", "Source text (verbatim)", "Konteks tambahan", "Additional context"];
export function supportingSection(title: string): boolean {
  return supporting.includes(title);
}
export function replaceSection(content: string, section: DocumentSection, body: string): string {
  return content.slice(0, section.start) + body + content.slice(section.end);
}
export function encounterTimeline(encounters: Encounter[], current: Encounter | undefined): Encounter[] {
  if (!current) return [];
  return encounters.filter((item) => current.patientId ? item.patientId === current.patientId : item.id === current.id)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}
/** A section still holding only the draft placeholder (createDraft writes it when the input has no matching label). */
export function emptySection(body: string): boolean {
  return [missingField, missingFieldEnglish].includes(body.trim().replace(/\.$/, ""));
}

export function workspaceDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal belum tersedia" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date) + " WIB";
}
// A download's file name: product, date in Jakarta, and the first words of what it is about ("encounter.md" told nothing).
export function downloadName(topic: string, at: string | Date = new Date()): string {
  const date = new Date(at);
  const day = Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date);
  const words = topic.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const slug = words.length > 40 ? words.slice(0, 41).replace(/-[^-]*$/, "") : words;
  return ["sentrapedia", day, slug].filter(Boolean).join("-") + ".md";
}
export function contextFacts(context: string, notes: string) {
  const sources = [{ source: "Konteks Encounter", fields: structureNote(context).fields }, { source: "Catatan Pasien", fields: structureNote(notes).fields }];
  const fields: { key: NoteField; label: string }[] = [{ key: "concern", label: "Keluhan utama" }, { key: "history", label: "Anamnesis" }, { key: "background", label: "Riwayat" }, { key: "medications", label: "Obat" }, { key: "allergies", label: "Alergi" }];
  return fields.map((field) => ({ ...field, values: sources.flatMap(({ source, fields: data }) => data[field.key] ? [{ source, text: data[field.key]! }] : []) }));
}
