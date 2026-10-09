import type { ModeId } from "./drafts";
import { structureNote, type NoteField } from "./note-structure";
import type { Encounter } from "./workspace";

export const intentGroups: { id: string; label: string; headline: string; description: string; modes: ModeId[] }[] = [
  { id: "ask", label: "Tanya", headline: "Kasus kompleks. Analisis lebih tajam.", description: "Telusuri bukti dan pertajam pemahaman klinis.", modes: ["question", "ddx", "workup", "refer"] },
  { id: "document", label: "Dokumentasi", headline: "Catatan rapi. Informasi lebih jelas.", description: "Susun informasi menjadi draf yang siap ditinjau.", modes: ["clinic", "hpi", "telephone", "chronic", "scribe"] },
  { id: "plan", label: "Rencana", headline: "Langkah terarah. Rencana lebih matang.", description: "Tata asesmen dan langkah tindak lanjut dalam satu tempat.", modes: ["ap", "tasks", "handoff"] },
  { id: "communicate", label: "Komunikasi", headline: "Pesan jelas. Pemahaman lebih baik.", description: "Siapkan informasi yang mudah dipahami dan ditinjau.", modes: ["avs", "education", "referral", "authorization"] },
];

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
