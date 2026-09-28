import type { DiagnosisPageViewModel } from './diagnosisViewModel';

export type DiagnosisConfidenceTier = 'high' | 'moderate' | 'low' | 'unknown';

export function isDiagnosisChosen(viewModel: DiagnosisPageViewModel): boolean {
  return viewModel.therapy.selectedDiagnosisCount > 0;
}

export function compactText(value: string | undefined, fallback = '-'): string {
  const cleaned = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

export function percentLabel(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `${Math.round(value)}%`;
}

export function formatClinicalText(value: string): string {
  return value
    .replace(/Confirmed: Not Pregnant/g, 'Tidak hamil terkonfirmasi')
    .replace(/Confirmed: Pregnant/g, 'Hamil terkonfirmasi')
    .replace(/Pending review/g, 'Belum ditinjau')
    .replace(/Insufficient data/g, 'Data belum cukup')
    .replace(/High confidence/g, 'Keyakinan tinggi')
    .replace(/Moderate confidence/g, 'Keyakinan sedang')
    .replace(/Low confidence/g, 'Keyakinan rendah')
    .replace(/Correlate with examination/g, '')
    .replace(/Criteria Reference/g, 'Kriteria rujukan')
    .replace(/Data insufficient/g, 'Data belum cukup')
    .trim();
}

export function formatConfidenceLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    high: 'Tinggi',
    moderate: 'Sedang',
    low: 'Rendah',
    'insufficient data': 'Data belum cukup',
    'pending review': 'Belum ditinjau',
    'manual review': 'Review manual',
    'very high confidence': 'Sangat tinggi',
    'high confidence': 'Tinggi',
    'moderate confidence': 'Sedang',
    'low confidence': 'Rendah',
  };

  return labels[normalized] || formatClinicalText(value);
}

export function formatSafetyLabel(value: string): string {
  const labels: Record<string, string> = {
    safe: 'Aman direview',
    caution: 'Perlu kehati-hatian',
    warning: 'Perlu kehati-hatian',
    unsafe: 'Tidak aman',
  };

  return labels[value.trim().toLowerCase()] || formatClinicalText(value);
}

export function formatSourceLabel(value: string): string {
  const labels: Record<string, string> = {
    PROPOSAL: 'Rekomendasi sistem',
    MANUAL: 'Input dokter',
    suggested: 'Rekomendasi sistem',
    manual: 'Input dokter',
  };

  if (/manual/i.test(value)) return 'Input dokter';
  if (/workflow|differential/i.test(value)) return 'Rekomendasi sistem';

  return labels[value] || formatClinicalText(value);
}

export function formatTransferState(state: string): string {
  const labels: Record<string, string> = {
    idle: 'Menunggu',
    running: 'Berjalan',
    partial: 'Sebagian',
    success: 'Berhasil',
    failed: 'Gagal',
    error: 'Gagal',
    skipped: 'Dilewati',
    ready: 'Siap',
    pending: 'Menunggu',
    cancelled: 'Dibatalkan',
  };

  return labels[state] || formatClinicalText(state);
}

export function resolveConfidenceTier(label: string): DiagnosisConfidenceTier {
  const normalized = label.trim().toLowerCase();
  if (/^very high|^high|^tinggi|^sangat tinggi/.test(normalized)) return 'high';
  if (/^moderate|^sedang/.test(normalized)) return 'moderate';
  if (/^low|^rendah/.test(normalized)) return 'low';
  return 'unknown';
}

export function cleanClinicalSummary(value: string): string {
  return formatClinicalText(value).replace(/\s+/g, ' ').trim();
}

export function shortenClinicalSignal(value: string): string {
  const [firstSentence = value] = value.split(/[.;]/);
  return firstSentence.length > 48
    ? `${firstSentence.slice(0, 45).trim()}...`
    : firstSentence.trim();
}

const MAX_CLINICAL_SIGNAL_ITEMS = 10;

const CLINICAL_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'HT', pattern: /\b(ht|hipertensi|darah tinggi|tensi tinggi)\b/i },
  { label: 'DM', pattern: /\b(dm|diabetes|kencing manis|gula darah)\b/i },
  { label: 'Pusing', pattern: /\bpusing\b|nyeri kepala|sakit kepala/i },
  { label: 'Demam', pattern: /\bdemam\b|febris|panas badan/i },
  { label: 'Batuk', pattern: /\bbatuk\b/i },
  { label: 'Sesak', pattern: /\bsesak\b|napas berat|nafas berat/i },
  { label: 'Nyeri dada', pattern: /nyeri dada|dada sakit/i },
  { label: 'Nyeri kaki', pattern: /nyeri\s*kaki|kaki nyeri|sakit kaki/i },
  { label: 'Nyeri perut', pattern: /nyeri perut|sakit perut/i },
  { label: 'Mual', pattern: /\bmual\b/i },
  { label: 'Muntah', pattern: /\bmuntah\b/i },
  { label: 'Diare', pattern: /\bdiare\b|mencret/i },
  { label: 'Lemas', pattern: /\blemas\b/i },
  { label: 'Nafsu makan turun', pattern: /nafsu makan (menurun|turun|berkurang)/i },
];

export function buildClinicalSignals({
  complaintSummary,
  secondaryComplaint,
  allergySummary,
  chronicDiagnosisSummary,
}: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}): string[] {
  const sourceText =
    `${complaintSummary} ${secondaryComplaint || ''} ${chronicDiagnosisSummary}`.trim();
  const signals: string[] = [];

  for (const item of CLINICAL_SIGNAL_PATTERNS) {
    if (item.pattern.test(sourceText)) {
      signals.push(item.label);
    }
  }

  const cleanedAllergy = cleanClinicalSummary(allergySummary);
  if (cleanedAllergy && !/tidak ada alergi/i.test(cleanedAllergy)) {
    signals.push(`Alergi: ${cleanedAllergy}`);
  }

  const cleanedChronicDiagnosis = cleanClinicalSummary(chronicDiagnosisSummary);
  if (cleanedChronicDiagnosis) {
    for (const diagnosis of cleanedChronicDiagnosis.split(',')) {
      const signal = shortenClinicalSignal(formatClinicalText(diagnosis));
      if (signal) signals.push(signal);
    }
  }

  if (signals.length === 0 && sourceText) {
    signals.push(shortenClinicalSignal(formatClinicalText(sourceText)));
  }

  return dedupeSignals(signals).slice(0, MAX_CLINICAL_SIGNAL_ITEMS);
}

const SHORT_MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const day = date.getUTCDate();
  const month = SHORT_MONTHS_ID[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export function dedupeSignals(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

export function isGenericDiagnosisUiText(value: string): boolean {
  return (
    value.length > 96 ||
    /^(gejala khas belum menonjol|dukungan tanda vital belum dominan|correlate with examination)$/i.test(
      value
    ) ||
    /^(pemeriksaan penunjang wajib segera|evaluasi lebih lanjut terhadap|pertimbangkan konsultasi dengan spesialis|kriteria rujukan)/i.test(
      value
    )
  );
}

export function isChronicRiskContextOnly(value: string): boolean {
  return /^riwayat penyakit kronis\b/i.test(value);
}

export function isInsufficientDiagnosisLabel(value: string): boolean {
  return /\bR69\b|data klinis belum cukup|data diagnosis belum lengkap/i.test(value);
}

export function getVisibleErrorMessage(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return '';

  if (
    /Diagnosis lokal digunakan|Bridge|Dashboard|Crew|Automation Token|fallback|canonical/i.test(
      cleaned
    )
  ) {
    return '';
  }

  return formatClinicalText(cleaned);
}

export function getVisibleSafetyItems(redFlags: string[], doNotMissItems: string[]): string[] {
  return dedupeSignals(
    [...redFlags, ...doNotMissItems]
      .map(cleanClinicalSummary)
      .map((item) => item.replace(/^Do not miss:\s*/i, '').trim())
      .filter((item) => item && !isGenericDiagnosisUiText(item) && !isChronicRiskContextOnly(item))
  );
}

const REFERRAL_ITEM_START = /^(\s+\S|\s*\d+[.)]\s|\s*[-•·]\s)/;

export function splitReferralGuidance(text: string): string[] {
  const items: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const cleaned = line.replace(/^\s*(\d+[.)]|[-•·])\s*/, '').trim();
    if (index === 0 || REFERRAL_ITEM_START.test(line) || items.length === 0) {
      items.push(cleaned);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${cleaned}`;
    }
  });
  return items;
}
