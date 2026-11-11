import { useEffect, useState } from 'react';

/**
 * Short disease notes for the diagnosis cards, from the bundled knowledge base
 * (`public/data/penyakit.json`), keyed by ICD-10 without the dot: `definisi` (the explanation
 * under a card's title), `komplikasi` (what a MUST NOT MISS card risks when it is missed),
 * `pemeriksaan_fisik` (what to look for at the bedside) and `kriteria_rujukan` (when to refer),
 * the last two for the card's Catatan; and, where the entry has an advanced guideline, the
 * patient education (`kie_edukasi.untuk_pasien`) and follow-up (`tindak_lanjut.kontrol`) for the
 * Terapi page. Read here rather than through `getPenyakitByIcd`, which
 * carries none of these fields; the knowledge base itself is not changed. Loaded once per panel
 * and shared by every card.
 */
const KB_URL = '/data/penyakit.json';

export type DiseaseNote = {
  definition: string;
  complications: string[];
  exam: string[];
  referral: string;
  /** Only on entries with an advanced guideline (21 of 159). */
  education?: string[];
  followUp?: string;
  /** `red_flags`, for the Tatalaksana safety net; only when the entry lists any. */
  redFlags?: string[];
};

type KbFile = {
  penyakit?: Array<{
    icd10?: unknown;
    definisi?: unknown;
    komplikasi?: unknown;
    pemeriksaan_fisik?: unknown;
    kriteria_rujukan?: unknown;
    red_flags?: unknown;
    advanced_guideline?: {
      kie_edukasi?: { untuk_pasien?: unknown };
      tindak_lanjut?: { kontrol?: unknown };
    };
  }>;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
const text = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

const normalize = (code: string): string => code.trim().toUpperCase().replace(/\./g, '');

let cache: Promise<Map<string, DiseaseNote>> | null = null;

async function loadNotes(): Promise<Map<string, DiseaseNote>> {
  const response = await fetch(KB_URL);
  if (!response.ok) throw new Error(`penyakit.json ${response.status}`);
  const data = (await response.json()) as KbFile;
  const notes = new Map<string, DiseaseNote>();
  for (const entry of data.penyakit ?? []) {
    if (typeof entry.icd10 !== 'string') continue;
    const note: DiseaseNote = {
      definition: typeof entry.definisi === 'string' ? entry.definisi.trim() : '',
      complications: strings(entry.komplikasi),
      exam: strings(entry.pemeriksaan_fisik),
      referral: text(entry.kriteria_rujukan),
    };
    const education = strings(entry.advanced_guideline?.kie_edukasi?.untuk_pasien);
    const followUp = text(entry.advanced_guideline?.tindak_lanjut?.kontrol);
    if (education.length > 0) note.education = education;
    if (followUp) note.followUp = followUp;
    const redFlags = strings(entry.red_flags);
    if (redFlags.length > 0) note.redFlags = redFlags;
    if (note.definition || note.complications.length > 0 || note.exam.length > 0 || note.referral) {
      notes.set(normalize(entry.icd10), note);
    }
  }
  return notes;
}

/** Test-only: forget the loaded knowledge base. */
export function resetDiseaseNotesCache(): void {
  cache = null;
}

/** Exact code first, then the 3-character ICD root, as the knowledge-base lookup does. */
export function diseaseNoteFor(notes: Map<string, DiseaseNote>, code: string): DiseaseNote | null {
  const target = normalize(code);
  if (!target) return null;
  const exact = notes.get(target);
  if (exact) return exact;
  const root = target.slice(0, 3);
  for (const [key, note] of notes) {
    if (key.startsWith(root)) return note;
  }
  return null;
}

export function useDiseaseNotes(): Map<string, DiseaseNote> {
  const [notes, setNotes] = useState<Map<string, DiseaseNote>>(() => new Map());

  useEffect(() => {
    let active = true;
    cache ??= loadNotes();
    cache.then(
      (loaded) => {
        if (active) setNotes(loaded);
      },
      () => {
        // A failed read leaves the cards without notes; the next mount tries again.
        cache = null;
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return notes;
}
