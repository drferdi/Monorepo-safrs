import { modes, type ModeId } from "./drafts";
import { structureNote, type NoteField } from "./note-structure";
import type { Encounter } from "./workspace";

// Four needs of a doctor. `quick` are the contextual quick actions under the composer; `modes` also holds the
// category's other templates, which stay reachable from the Mode picker. Telaah Bukti waits for a real evidence search.
export const intentGroups: { id: string; label: string; headline: string; description: string; placeholder: string; modes: ModeId[]; quick: ModeId[] }[] = [
  { id: "ask", label: "Analisis", headline: "01 — Analisis Klinis. Keputusan Lebih Tepat.", description: "Telaah kasus kompleks berdasarkan bukti medis.", placeholder: "Diskusikan kasus yang sedang Anda tangani.", modes: ["question", "ddx", "workup", "refer"], quick: ["question", "ddx", "workup"] },
  { id: "document", label: "Dokumentasi", headline: "02 — Dokumentasi Rapi. Informasi Terstruktur.", description: "Susun catatan klinis yang jelas dan siap ditinjau.", placeholder: "Tuliskan anamnesis, pemeriksaan, dan temuan untuk disusun menjadi catatan.", modes: ["clinic", "hpi", "chronic", "handoff", "scribe"], quick: ["clinic", "hpi", "chronic", "handoff"] },
  { id: "plan", label: "Rencana", headline: "03 — Asesmen Jelas. Tindak Lanjut Terarah.", description: "Organisasikan masalah klinis dan rencana penanganan.", placeholder: "Tuliskan asesmen dan rencana tata laksana yang ingin Anda susun.", modes: ["ap", "tasks", "referral", "monitoring"], quick: ["ap", "tasks", "referral", "monitoring"] },
  { id: "communicate", label: "Komunikasi", headline: "04 — Komunikasi Jelas. Pasien Lebih Paham.", description: "Siapkan informasi medis yang ringkas dan mudah dipahami.", placeholder: "Tuliskan informasi yang ingin disampaikan kepada pasien atau sejawat.", modes: ["education", "avs", "telephone", "authorization"], quick: ["education", "avs", "telephone"] },
];

// A tab's own hint shows on its default mode; the other chips keep their specific hint.
export function composerPlaceholder(mode: ModeId): string {
  const group = intentGroups.find((item) => item.modes[0] === mode);
  return group ? group.placeholder : modes.find((item) => item.id === mode)!.placeholder;
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
export function replaceSection(content: string, section: DocumentSection, body: string): string {
  return content.slice(0, section.start) + body + content.slice(section.end);
}
export function encounterTimeline(encounters: Encounter[], current: Encounter | undefined): Encounter[] {
  if (!current) return [];
  return encounters.filter((item) => current.patientId ? item.patientId === current.patientId : item.id === current.id)
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}
export function workspaceDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal belum tersedia" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date) + " WIB";
}
export function contextFacts(context: string, notes: string) {
  const sources = [{ source: "Konteks Encounter", fields: structureNote(context).fields }, { source: "Catatan Patient", fields: structureNote(notes).fields }];
  const fields: { key: NoteField; label: string }[] = [{ key: "concern", label: "Keluhan utama" }, { key: "history", label: "Anamnesis" }, { key: "background", label: "Riwayat" }, { key: "medications", label: "Obat" }, { key: "allergies", label: "Alergi" }];
  return fields.map((field) => ({ ...field, values: sources.flatMap(({ source, fields: data }) => data[field.key] ? [{ source, text: data[field.key]! }] : []) }));
}
