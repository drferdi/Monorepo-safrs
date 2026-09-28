import { useEffect, useState } from 'react';

/**
 * Short disease explanations for the diagnosis cards: the `definisi` field of the bundled
 * knowledge base (`public/data/penyakit.json`), keyed by ICD-10 without the dot. Read here
 * rather than through `getPenyakitByIcd`, which does not carry `definisi`; the knowledge base
 * itself is not changed. Loaded once per panel and shared by every card.
 */
const KB_URL = '/data/penyakit.json';

type KbFile = { penyakit?: Array<{ icd10?: unknown; definisi?: unknown }> };

const normalize = (code: string): string => code.trim().toUpperCase().replace(/\./g, '');

let cache: Promise<Map<string, string>> | null = null;

async function loadDefinitions(): Promise<Map<string, string>> {
  const response = await fetch(KB_URL);
  if (!response.ok) throw new Error(`penyakit.json ${response.status}`);
  const data = (await response.json()) as KbFile;
  const definitions = new Map<string, string>();
  for (const entry of data.penyakit ?? []) {
    if (typeof entry.icd10 !== 'string' || typeof entry.definisi !== 'string') continue;
    const text = entry.definisi.trim();
    if (text) definitions.set(normalize(entry.icd10), text);
  }
  return definitions;
}

/** Test-only: forget the loaded knowledge base. */
export function resetDiseaseDefinitionsCache(): void {
  cache = null;
}

/** Exact code first, then the 3-character ICD root, as the knowledge-base lookup does. */
export function definitionFor(definitions: Map<string, string>, code: string): string | null {
  const target = normalize(code);
  if (!target) return null;
  const exact = definitions.get(target);
  if (exact) return exact;
  const root = target.slice(0, 3);
  for (const [key, text] of definitions) {
    if (key.startsWith(root)) return text;
  }
  return null;
}

export function useDiseaseDefinitions(): Map<string, string> {
  const [definitions, setDefinitions] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let active = true;
    cache ??= loadDefinitions();
    cache.then(
      (loaded) => {
        if (active) setDefinitions(loaded);
      },
      () => {
        // A failed read leaves the cards without an explanation; the next mount tries again.
        cache = null;
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return definitions;
}
