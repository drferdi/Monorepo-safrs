import { diseaseNoteFor, type DiseaseNote } from './useDiseaseNotes';

export interface EducationItem {
  key: string;
  text: string;
}

/**
 * Patient education for the diagnoses the doctor chose on the Diagnosis page, verbatim from the
 * knowledge base: each diagnosis's `untuk_pasien` points, then its follow-up as "Kontrol: …".
 * Nothing is composed for a code without an entry, and a point two diagnoses share is listed once.
 */
export function buildEducationItems(codes: string[], notes: Map<string, DiseaseNote>): EducationItem[] {
  const texts: string[] = [];
  for (const code of codes) {
    const note = diseaseNoteFor(notes, code);
    if (!note) continue;
    texts.push(...(note.education ?? []));
    if (note.followUp) texts.push(`Kontrol: ${note.followUp}`);
  }
  return Array.from(new Set(texts), (text) => ({ key: text, text }));
}
