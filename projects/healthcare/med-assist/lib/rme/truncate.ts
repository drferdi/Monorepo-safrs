const RME_TEXT_LIMIT = 255;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

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

export const RME_TRUNCATION_LIMIT = RME_TEXT_LIMIT;
