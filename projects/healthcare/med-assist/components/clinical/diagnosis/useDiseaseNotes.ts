import { useEffect, useState } from 'react';

/**
 * Short disease notes for the diagnosis cards, from the bundled knowledge base
 * (`public/data/penyakit.json`), keyed by ICD-10 without the dot: `definisi` (the explanation
 * under a card's title) and `komplikasi` (what a MUST NOT MISS card risks when it is missed).
 * Read here rather than through `getPenyakitByIcd`, which carries neither field; the knowledge
 * base itself is not changed. Loaded once per panel and shared by every card.
 */
const KB_URL = '/data/penyakit.json';

export type DiseaseNote = { definition: string; complications: string[] };

type KbFile = { penyakit?: Array<{ icd10?: unknown; definisi?: unknown; komplikasi?: unknown }> };

const normalize = (code: string): string => code.trim().toUpperCase().replace(/\./g, '');

let cache: Promise<Map<string, DiseaseNote>> | null = null;

async function loadNotes(): Promise<Map<string, DiseaseNote>> {
  const response = await fetch(KB_URL);
  if (!response.ok) throw new Error(`penyakit.json ${response.status}`);
  const data = (await response.json()) as KbFile;
  const notes = new Map<string, DiseaseNote>();
  for (const entry of data.penyakit ?? []) {
    if (typeof entry.icd10 !== 'string') continue;
    const definition = typeof entry.definisi === 'string' ? entry.definisi.trim() : '';
    const complications = Array.isArray(entry.komplikasi)
      ? entry.komplikasi.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [];
    if (definition || complications.length > 0) notes.set(normalize(entry.icd10), { definition, complications });
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
