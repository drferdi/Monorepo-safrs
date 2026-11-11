// Designed and constructed by Drferdi.
/**
 * Recommendation Formatter — parses the free-text ScreeningAlert.recommendations
 * arrays (a mix of plain sentences, "━━━ SECTION ━━━" dividers, blank spacer
 * lines, and indented sub-notes) into a structured shape that matches the
 * existing (previously unused) .emg-entry__recs CSS system.
 *
 * @module lib/emergency-detector/recommendation-formatter
 */

export type FormattedRecommendationLine =
  | { kind: 'section'; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'item'; text: string; index: number };

const SECTION_MARKER = /^━+/;
const SECTION_DECORATION = /^━+\s*|\s*━+$/g;
const INDENTED_NOTE = /^\s{2,}/;
const LEADING_ORDINAL = /^\d+\.\s*/;

/**
 * Formats a ScreeningAlert.recommendations array for rendering. Numbered
 * item indices restart after every section divider.
 */
export function formatRecommendationLines(
  recommendations: string[]
): FormattedRecommendationLine[] {
  const lines: FormattedRecommendationLine[] = [];
  let itemIndex = 0;

  for (const raw of recommendations) {
    if (raw.trim() === '') continue;

    if (SECTION_MARKER.test(raw.trim())) {
      lines.push({ kind: 'section', text: raw.trim().replace(SECTION_DECORATION, '') });
      itemIndex = 0;
      continue;
    }

    if (INDENTED_NOTE.test(raw)) {
      lines.push({ kind: 'note', text: raw.trim() });
      continue;
    }

    itemIndex += 1;
    lines.push({ kind: 'item', text: raw.replace(LEADING_ORDINAL, '').trim(), index: itemIndex });
  }

  return lines;
}
