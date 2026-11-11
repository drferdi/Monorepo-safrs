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

const DEGREE_TOKEN_MAX_LETTERS = 4;

/**
 * True when the shorter of the two word lists is a whole-word prefix of the longer one (at least
 * two words long) and every word the longer one adds beyond that prefix is short enough to be a
 * degree abbreviation (e.g. "s", "kep", "amd", "sp", "pd", "mkn") rather than another person's
 * name.
 */
function isDegreeLikeSuffixMatch(itemWords: string[], targetWords: string[]): boolean {
  const [shorter, longer] =
    itemWords.length <= targetWords.length ? [itemWords, targetWords] : [targetWords, itemWords];
  if (shorter.length < 2) return false;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] !== longer[i]) return false;
  }
  return longer.slice(shorter.length).every((token) => token.length <= DEGREE_TOKEN_MAX_LETTERS);
}

/**
 * Index of the single menu item that names this practitioner, or -1. An item matches the name
 * when, after stripping menu suffixes (" - ...", " (...)") and normalising both, they are equal,
 * or one is a whole-word prefix of the other (the shorter side must be at least two words) and
 * every extra trailing word on the longer side is at most 4 letters — a degree abbreviation such
 * as "s kep", "amd", "sp pd", "mkn" — rather than a different person's given or family name. Zero
 * or several matches return -1 so no wrong clinician is selected.
 */
export function pickExactStaffMatch(itemTexts: string[], name: string): number {
  const target = normalizeStaffName(name);
  if (!target) return -1;
  const targetWords = target.split(' ');
  const matches = itemTexts
    .map((text, index) => ({ index, item: normalizeStaffName(text.replace(/\s[-–(].*$/, '')) }))
    .filter(
      ({ item }) =>
        item.length > 0 &&
        (item === target || isDegreeLikeSuffixMatch(item.split(' '), targetWords))
    );
  return matches.length === 1 ? matches[0].index : -1;
}
