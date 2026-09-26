import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const VISIT_SUMMARY_MONTHS_ID = [
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
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseVisitDate = (timestamp?: string): Date | null => {
  if (!timestamp) {
    return null;
  }

  const isoMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const legacyMatch = timestamp.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (legacyMatch) {
    return new Date(Number(legacyMatch[3]), Number(legacyMatch[2]) - 1, Number(legacyMatch[1]));
  }

  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const getVisitTimestampMs = (timestamp?: string): number => {
  const parsed = parseVisitDate(timestamp);
  return parsed ? parsed.getTime() : Number.NEGATIVE_INFINITY;
};

export const formatVisitSummaryDate = (timestamp?: string): string => {
  if (!timestamp) {
    return '';
  }

  const isoMatch = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const day = isoMatch[3];
    const month = VISIT_SUMMARY_MONTHS_ID[Number(isoMatch[2]) - 1];
    return month ? `${day} ${month} ${isoMatch[1]}` : timestamp;
  }

  const legacyMatch = timestamp.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (legacyMatch) {
    const month = VISIT_SUMMARY_MONTHS_ID[Number(legacyMatch[2]) - 1];
    return month ? `${legacyMatch[1]} ${month} ${legacyMatch[3]}` : timestamp;
  }

  const parsed = parseVisitDate(timestamp);
  if (!parsed) {
    return timestamp;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const formatVisitRelativeDay = (timestamp?: string, now: Date = new Date()): string => {
  if (!timestamp) {
    return '';
  }

  const parsed = parseVisitDate(timestamp);
  if (!parsed) {
    return timestamp;
  }

  const visitDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((currentDay - visitDay) / MS_PER_DAY);

  if (diffDays <= 0) {
    return 'Hari ini';
  }

  if (diffDays === 1) {
    return '1 hari lalu';
  }

  return `${diffDays} hari lalu`;
};

export const getLatestVisitRecord = (visits?: VisitRecord[]): VisitRecord | null => {
  if (!visits?.length) {
    return null;
  }

  return [...visits].sort((left, right) => {
    return getVisitTimestampMs(right.timestamp) - getVisitTimestampMs(left.timestamp);
  })[0];
};

export const normalizeVisitTherapySummary = (value?: string | null): string => {
  const normalized = value?.replace(/\s+/g, ' ').trim() || '';
  if (!normalized) {
    return '';
  }

  const compact = normalized.toLowerCase().replace(/[^a-z]/g, '');
  const looksLikeDoctorAdvicePlaceholder =
    compact.includes('sesuaiadvisdokter') ||
    compact.includes('sesuaiadvdokter') ||
    compact.includes('advisdokter') ||
    (compact.endsWith('dokter') && compact.includes('advi')) ||
    (compact.endsWith('dokter') && compact.includes('euai'));

  return looksLikeDoctorAdvicePlaceholder ? '' : normalized;
};
