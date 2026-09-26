export const RME_TEXT_LIMIT = 250;
export const RME_WORD_LIMIT = 220;

/** @deprecated Prefer RME_TEXT_LIMIT — kept for existing imports. */
export const RME_TRUNCATION_LIMIT = RME_TEXT_LIMIT;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Cap RME free-text by word count (SSOT for keluhan / RPS fields).
 * Default matches ePuskesmas host guidance (~225 words) with a defensive margin.
 */
export function capRMEWords(
  value: string | null | undefined,
  maxWords: number = RME_WORD_LIMIT
): string {
  if (!value) return '';

  const normalized = normalizeText(String(value));
  if (!normalized) return '';
  if (maxWords <= 0) return '';

  const words = normalized.split(' ');
  if (words.length <= maxWords) return normalized;
  return words.slice(0, maxWords).join(' ').trim();
}

/**
 * Cap RME free-text by character count at a word boundary when possible.
 * Default 250 chars stays under common ePuskesmas maxlength/validators (~250–255).
 */
export function truncateRMEText(
  value: string | null | undefined,
  maxLength: number = RME_TEXT_LIMIT
): string {
  if (!value) return '';

  const normalized = normalizeText(String(value));
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  if (maxLength <= 0) return '';

  const candidate = normalized.slice(0, maxLength);
  const lastSpace = candidate.lastIndexOf(' ');

  if (lastSpace >= Math.max(0, maxLength - 32)) {
    return candidate.slice(0, lastSpace).trimEnd();
  }

  return candidate.trimEnd();
}

/**
 * Combined word + char sanitize for anamnesa keluhan/RPS fields.
 * Apply sentence-case separately when the host field requires it (keluhan_utama).
 */
export function sanitizeRMEAnamnesaText(value: string | null | undefined): string {
  return truncateRMEText(capRMEWords(value));
}

function truncateDeepStringsInternal<T>(value: T, maxLength: number): T {
  if (typeof value === 'string') {
    return truncateRMEText(value, maxLength) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => truncateDeepStringsInternal(item, maxLength)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, nestedValue]) => [
      key,
      truncateDeepStringsInternal(nestedValue, maxLength),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function truncateDeepStrings<T>(value: T, maxLength: number = RME_TEXT_LIMIT): T {
  return truncateDeepStringsInternal(value, maxLength);
}
