const EMPTY_LABELS = new Set(['', '-', '--', 'null', 'undefined', 'tidak ada', 'n/a']);

function cleanValue(raw: string | null | undefined): string {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

export function normalizeCategoryLabel(
  raw: string | null | undefined,
  fallback = 'Tidak Diketahui'
): string {
  const value = cleanValue(raw);
  if (!value) return fallback;
  if (EMPTY_LABELS.has(value.toLowerCase())) return fallback;
  return value;
}

export function normalizeVisitKind(raw: string): 'Baru' | 'Lama' | 'Unknown' {
  const value = cleanValue(raw).toLowerCase();
  if (value.includes('baru')) return 'Baru';
  if (value.includes('lama') || value.includes('kontrol')) return 'Lama';
  return 'Unknown';
}

export function normalizeServiceStatus(
  raw: string
): 'Menunggu' | 'Diproses' | 'Diperiksa' | 'Selesai' | 'Tertunda' | 'Batal' | 'Lainnya' {
  const value = cleanValue(raw).toLowerCase();
  if (!value) return 'Lainnya';
  if (value.includes('menunggu')) return 'Menunggu';
  if (value.includes('diproses') || value.includes('proses')) return 'Diproses';
  if (value.includes('diperiksa') || value.includes('periksa')) return 'Diperiksa';
  if (value.includes('selesai') || value.includes('final')) return 'Selesai';
  if (value.includes('tertunda') || value.includes('pending')) return 'Tertunda';
  if (value.includes('batal') || value.includes('cancel')) return 'Batal';
  return 'Lainnya';
}

export function normalizeBpjsStatus(raw: string): 'Aktif' | 'Nonaktif' | 'Perlu Cek' {
  const value = cleanValue(raw).toLowerCase();
  if (value.includes('aktif') && !value.includes('non')) return 'Aktif';
  if (value.includes('nonaktif') || value.includes('tidak aktif')) return 'Nonaktif';
  if (!value) return 'Perlu Cek';
  return 'Perlu Cek';
}

export function isMeaningfulSpecialCase(raw: string): boolean {
  const value = cleanValue(raw).toLowerCase();
  return value.length > 0 && !EMPTY_LABELS.has(value);
}

export function isFinalServiceStatus(raw: string): boolean {
  return normalizeServiceStatus(raw) === 'Selesai';
}
