import { diseaseNoteFor, type DiseaseNote } from './useDiseaseNotes';

export interface EducationItem {
  key: string;
  text: string;
}

/**
 * Patient education for the diagnoses the doctor chose on the Diagnosis page, verbatim from the
 * knowledge base's `untuk_pasien` points. Nothing is composed for a code without an entry, and a
 * point two diagnoses share is listed once. The follow-up has its own section (Tindak lanjut).
 */
export function buildEducationItems(codes: string[], notes: Map<string, DiseaseNote>): EducationItem[] {
  const texts = codes.flatMap((code) => diseaseNoteFor(notes, code)?.education ?? []);
  return Array.from(new Set(texts), (text) => ({ key: text, text }));
}
