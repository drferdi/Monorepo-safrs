// Designed and constructed by Drferdi.
const LEADING_TITLE = /^(dr|drg|ns|bd|apt|prof|ir|hj|h)\.?\s+/;

/** Lower-case practitioner name without leading titles, degrees after a comma, or punctuation. */
export function normalizeStaffName(value: string): string {
  let name = value.toLowerCase().split(',')[0] ?? '';
  name = name.replace(/[^a-z\s.]/g, ' ').replace(/\s+/g, ' ').trim();
  while (LEADING_TITLE.test(name)) name = name.replace(LEADING_TITLE, '');
  return name.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

const LEADING_TITLE_ANY_CASE = /^(dr|drg|ns|bd|apt|prof|ir|hj|h)\.?\s+/i;

/** Text typed into the ePuskesmas staff search: the core name, case kept. */
export function staffSearchTerm(value: string): string {
  let term = (value.split(',')[0] ?? '').replace(/\s+/g, ' ').trim();
  while (LEADING_TITLE_ANY_CASE.test(term)) term = term.replace(LEADING_TITLE_ANY_CASE, '');
  return term;
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Index of the single menu item that names this practitioner, or -1. An item matches when it
 * contains the whole name, or when the name (with trailing degrees) contains the whole item of at
 * least two words. Zero or several matches return -1 so no wrong clinician is selected.
 */
export function pickExactStaffMatch(itemTexts: string[], name: string): number {
  const target = normalizeStaffName(name);
  if (!target) return -1;
  const matches = itemTexts
    .map((text, index) => ({ index, item: normalizeStaffName(text.replace(/\s[-–(].*$/, '')) }))
    .filter(({ item }) =>
      item.length > 0 &&
      (containsWords(item, target) || (item.split(' ').length >= 2 && containsWords(target, item)))
    );
  return matches.length === 1 ? matches[0].index : -1;
}
