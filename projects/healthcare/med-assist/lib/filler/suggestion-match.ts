const compact = (value: string): string => value.toLowerCase().replace(/\s+/g, '');

/**
 * Index of the menu item that is exactly the value (case and spaces ignored), or -1. Used where
 * a near item is a different entry, e.g. the ePuskesmas signa "3X1/2" for "3x1".
 */
export function pickExactSuggestion(itemTexts: string[], value: string): number {
  const target = compact(value);
  return target ? itemTexts.findIndex((text) => compact(text) === target) : -1;
}

/**
 * The search for a medication's leading words answered with no item: the ePuskesmas catalogue,
 * which lists what is in stock, does not offer it today (Chief, 2026-10-02: "stok obat bisa
 * kosong sewaktu waktu").
 */
export const CATALOG_EMPTY_ERROR = 'Obat tidak ada di daftar stok ePuskesmas';

const catalogueName = (value: string): string =>
  value
    .replace(/^\s*\d+\s*-\s*/, '')
    .replace(/\(\s*\d+\s*\)\s*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The leading words of a medication name, up to two and up to the first one with punctuation
 * other than "-": the ePuskesmas "Nama Obat" search matches by substring, so "Klorfeniramin
 * Maleat" finds "Klorfeniramin Maleat ( CTM ) tablet 4 mg" where "(CTM)" finds nothing.
 */
export function medicationSearchTerm(name: string): string {
  const words: string[] = [];
  for (const word of name.trim().split(/\s+/)) {
    if (!/^[\p{L}\p{N}-]+$/u.test(word) || words.length === 2) break;
    words.push(word);
  }
  return words.join(' ') || name.trim();
}

/**
 * Index of the "Nama Obat" item ("<kode> - <nama> (<stok>)") whose catalogue name is the
 * medication, case, spacing and punctuation ignored, or -1. Never a near item: another strength
 * or form is another medication.
 */
export function pickMedicationSuggestion(itemTexts: string[], name: string): number {
  const target = catalogueName(name);
  return target ? itemTexts.findIndex((text) => catalogueName(text) === target) : -1;
}
