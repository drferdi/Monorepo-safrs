import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
import { NORMAL_RANGES } from '@/lib/iskandar-diagnosis-engine/trajectory-analyzer';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

/** What the side panel adds beyond the Diagnosis page's own props (set in main.tsx). */
export interface VisitSummaryContext {
  facilityName: string;
  triage: { zone: TriageZone; headline: string | null };
  spo2: number | null;
  visitHistory: VisitRecord[];
}

type Vitals = VisitRecord['vitals'];

export interface VisitSummaryInput {
  rm: string;
  age: number;
  gender: 'L' | 'P';
  keluhanUtama: string;
  keluhanTambahan: string;
  allergies: string[];
  pregnant: boolean | null;
  vitals: Vitals;
  /** Chosen diagnoses, the primary first. */
  diagnoses: Array<{ icd: string; name: string }>;
  /** The medications going to the resep, the dose already in Chief's notation ("1x10mg"). */
  medications: Array<{ name: string; dose: string; use: string; duration: string }>;
  alerts: Array<{ severity: string; title: string; message: string }>;
  context: VisitSummaryContext | undefined;
  printedAt: Date;
}

export interface TrendRow {
  label: string;
  /** One line per measure (Tensi draws sistolik and diastolik); null where a visit lacks it. */
  lines: Array<{ values: Array<number | null>; range: { min: number; max: number } }>;
  last: string;
}

export interface VisitSummaryModel {
  head: { rm: string; age: string; sex: string; facility: string; printedAt: string; date: string };
  complaint: { main: string; extra: string };
  vitals: Array<{ label: string; value: string }>;
  triage: { zone: TriageZone; headline: string | null } | null;
  allergies: string;
  pregnancy: string | null;
  diagnoses: Array<{ icd: string; name: string; role: 'PRIMER' | 'SEKUNDER' }>;
  medications: VisitSummaryInput['medications'];
  alerts: Array<{ title: string; message: string; urgent: boolean }>;
  /** Null with fewer than two visits. */
  trend: { dates: string[]; rows: TrendRow[] } | null;
}

const MAX_TREND_VISITS = 8;

const pad = (n: number): string => String(n).padStart(2, '0');
const present = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;
const shown = (n: number | null | undefined, unit: string): string =>
  present(n) ? `${String(n).replace('.', ',')} ${unit}` : '-';
const pressure = (vitals: Vitals): string =>
  present(vitals.sbp) && present(vitals.dbp) ? `${vitals.sbp}/${vitals.dbp} mmHg` : '-';

export function buildVisitSummaryModel(input: VisitSummaryInput): VisitSummaryModel {
  const { vitals, context, printedAt } = input;
  const day = `${pad(printedAt.getDate())}-${pad(printedAt.getMonth() + 1)}-${printedAt.getFullYear()}`;
  const seenAlerts = new Set<string>();
  return {
    head: {
      rm: input.rm,
      age: `${input.age} th`,
      sex: input.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      facility: context?.facilityName ?? '',
      printedAt: `${day} ${pad(printedAt.getHours())}:${pad(printedAt.getMinutes())}`,
      date: `${printedAt.getFullYear()}-${pad(printedAt.getMonth() + 1)}-${pad(printedAt.getDate())}`,
    },
    complaint: { main: input.keluhanUtama, extra: input.keluhanTambahan },
    vitals: [
      { label: 'TD', value: pressure(vitals) },
      { label: 'Nadi', value: shown(vitals.hr, 'x/mnt') },
      { label: 'Napas', value: shown(vitals.rr, 'x/mnt') },
      { label: 'Suhu', value: shown(vitals.temp, '°C') },
      { label: 'SpO2', value: shown(context?.spo2, '%') },
      { label: 'GDS', value: shown(vitals.glucose, 'mg/dL') },
    ],
    triage: context && context.triage.zone !== 'standby' ? context.triage : null,
    allergies: input.allergies.length > 0 ? input.allergies.join(', ') : 'Tidak ada alergi tercatat',
    pregnancy:
      input.gender === 'L'
        ? null
        : input.pregnant === null
          ? 'Belum dikonfirmasi'
          : input.pregnant
            ? 'Hamil'
            : 'Tidak hamil',
    diagnoses: input.diagnoses.map(
      (diagnosis, index): VisitSummaryModel['diagnoses'][number] => ({
        ...diagnosis,
        role: index === 0 ? 'PRIMER' : 'SEKUNDER',
      })
    ),
    medications: input.medications,
    alerts: input.alerts
      .filter((alert) => {
        const key = `${alert.title}|${alert.message}`;
        if (seenAlerts.has(key)) return false;
        seenAlerts.add(key);
        return true;
      })
      .map((alert) => ({
        title: alert.title,
        message: alert.message,
        urgent: alert.severity === 'emergency' || alert.severity === 'high',
      })),
    trend: buildTrend(context?.visitHistory ?? [], vitals, printedAt),
  };
}

function buildTrend(history: VisitRecord[], current: Vitals, printedAt: Date): VisitSummaryModel['trend'] {
  const visits = history
    .filter((visit) => !Number.isNaN(Date.parse(visit.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((visit) => ({ at: new Date(visit.timestamp), vitals: visit.vitals }))
    .concat({ at: printedAt, vitals: current })
    .slice(-MAX_TREND_VISITS);
  if (visits.length < 2) return null;

  const series = (key: keyof Vitals): Array<number | null> =>
    visits.map((visit) => (present(visit.vitals[key]) ? visit.vitals[key] : null));
  const line = (key: keyof typeof NORMAL_RANGES): TrendRow['lines'][number] => ({
    values: series(key),
    range: { min: NORMAL_RANGES[key].min, max: NORMAL_RANGES[key].max },
  });

  return {
    dates: visits.map((visit) => `${pad(visit.at.getDate())}-${pad(visit.at.getMonth() + 1)}`),
    rows: [
      { label: 'Tensi', lines: [line('sbp'), line('dbp')], last: pressure(current) },
      { label: 'Nadi', lines: [line('hr')], last: shown(current.hr, 'x/mnt') },
      { label: 'Napas', lines: [line('rr')], last: shown(current.rr, 'x/mnt') },
      { label: 'Suhu', lines: [line('temp')], last: shown(current.temp, '°C') },
    ],
  };
}
