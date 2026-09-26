// Designed and constructed by Drferdi.
/**
 * Normalization helpers for DAS (Data Ascension System) extraction output.
 */

export const cleanText = (value: string | null | undefined): string =>
  (value || '').replace(/\s+/g, ' ').trim();

/**
 * toInt
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const toInt = (value: string | null | undefined): number => {
  if (!value) return 0;
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * toFloat
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const toFloat = (value: string | null | undefined): number => {
  if (!value) return 0;
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
