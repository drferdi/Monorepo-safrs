import { DOKTER_NAMA, type TenagaMedisNames } from '@/lib/clinical/tenaga-medis';
import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';
import type { DDISeverity } from '@/types/api';

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
  medications: Array<{
    name: string;
    dose: string;
    use: string;
    duration: string;
    /** A chronic medication continued from earlier visits, not one new this visit. */
    continued: boolean;
    /** The patient's allergies the medication's name contains. */
    allergies: string[];
  }>;
  /** The local DDInter check: the pairs whose two drugs are both in this resep, by printed name. */
  drugSafety: {
    state: 'checking' | 'done' | 'unavailable';
    pairs: Array<{ a: string; b: string; severity: DDISeverity; advice: string }>;
  };
  alerts: Array<{ severity: string; title: string; message: string }>;
  /** The education points the doctor ticked, verbatim. */
  education: string[];
  /** Tindak lanjut interval ("3 hari"), or '' for none. */
  followUp: string;
  /** Red flags of the chosen diagnoses ("Segera kembali bila"). */
  safetyNet: string[];
  /** The RME's names for the signed-in user (`resolveTenagaMedisNames`); the DPJP is its doctor. */
  staff: TenagaMedisNames;
  context: VisitSummaryContext | undefined;
  printedAt: Date;
}

/** One row of Tren Tanda Vital: a value per earlier visit (oldest first), today's, the direction. */
export interface TrendRow {
  label: string;
  values: string[];
  today: string;
  /** The latest earlier visit against today; null when either value is missing. */
  direction: 'up' | 'down' | 'flat' | null;
  /** The figures for the sparkline, the earlier visits then today; null for a row without a trend. */
  series: Array<number | null> | null;
}

export interface VisitSummaryModel {
  head: { rm: string; age: string; sex: 'L' | 'P'; day: string; time: string; printedAt: string; date: string };
  complaint: { main: string; extra: string };
  vitals: Array<{ label: string; value: string; unit: string }>;
  triage: { zone: TriageZone; headline: string | null } | null;
  allergies: string;
  pregnancy: string | null;
  diagnoses: Array<{ icd: string; name: string; role: 'PRIMER' | 'SEKUNDER' }>;
  medications: Array<{
    name: string;
    dose: string;
    use: string;
    duration: string;
    status: 'Lanjutan' | 'Baru';
    /** The INTERAKSI cell: partners with their severity, a matched allergy, or '-'. */
    safety: string;
    /** A serious interaction or an allergy: the cell prints red. */
    alert: boolean;
  }>;
  /** The line under the medication table, and one note per serious pair. */
  drugSafety: { summary: string; notes: string[] };
  alerts: Array<{ title: string; message: string; urgent: boolean }>;
  education: string[];
  followUp: string;
  safetyNet: string[];
  signers: { dpjp: string; verifier: string };
  /** The earlier visits' dates (dd-mm-yy, oldest first), then the rows. */
  trend: { visits: string[]; rows: TrendRow[] };
}

/** Who verifies dr. Ferdi's own visits (Chief, 2026-10-04), in turn. */
export const FERDI_VERIFIERS = ['dr. Dibya Arfianda, Sp.OG', 'dr. Boyong Baskoro, Sp.OG'] as const;

const pad = (n: number): string => String(n).padStart(2, '0');
const present = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;
const figure = (n: number | null | undefined): string => (present(n) ? String(n).replace('.', ',') : '-');
const pressure = (vitals: Vitals): string =>
  present(vitals.sbp) && present(vitals.dbp) ? `${vitals.sbp}/${vitals.dbp}` : '-';

/**
 * Chief, 2026-10-04: the verifier is always dr. Ferdi; when he is the DPJP, one of the two Sp.OG,
 * chosen by the visit (RM and day), so they take turns and a second download prints the same one.
 */
function verifierFor(dpjp: string, visitKey: string): string {
  if (dpjp !== DOKTER_NAMA && !/ferdi iskandar/i.test(dpjp)) return DOKTER_NAMA;
  const sum = Array.from(visitKey).reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0);
  return FERDI_VERIFIERS[sum % FERDI_VERIFIERS.length];
}

export function buildVisitSummaryModel(input: VisitSummaryInput): VisitSummaryModel {
  const { vitals, context, printedAt } = input;
  const day = `${pad(printedAt.getDate())}-${pad(printedAt.getMonth() + 1)}-${printedAt.getFullYear()}`;
  const time = `${pad(printedAt.getHours())}:${pad(printedAt.getMinutes())}`;
  const date = `${printedAt.getFullYear()}-${pad(printedAt.getMonth() + 1)}-${pad(printedAt.getDate())}`;
  const seenAlerts = new Set<string>();
  return {
    head: {
      rm: input.rm,
      age: `${input.age} tahun`,
      sex: input.gender,
      day,
      time,
      printedAt: `${day} ${time}`,
      date,
    },
    complaint: { main: input.keluhanUtama, extra: input.keluhanTambahan },
    vitals: [
      { label: 'TD', value: pressure(vitals), unit: 'mmHg' },
      { label: 'NADI', value: figure(vitals.hr), unit: 'x/menit' },
      { label: 'NAPAS', value: figure(vitals.rr), unit: 'x/menit' },
      { label: 'SUHU', value: figure(vitals.temp), unit: '°C' },
      { label: 'SpO2', value: figure(context?.spo2), unit: '%' },
      { label: 'GDS', value: figure(vitals.glucose), unit: 'mg/dL' },
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
    medications: input.medications.map((medication) => {
      const pairs = input.drugSafety.state === 'done' ? input.drugSafety.pairs : [];
      const partners = pairs.flatMap((pair) =>
        pair.a === medication.name
          ? [{ with: pair.b, severity: pair.severity }]
          : pair.b === medication.name
            ? [{ with: pair.a, severity: pair.severity }]
            : []
      );
      const cell = [
        ...partners.map((partner) => `${partner.with} (${SEVERITY[partner.severity]})`),
        ...medication.allergies.map((allergy) => `Alergi: ${allergy}`),
      ];
      return {
        name: medication.name,
        dose: medication.dose,
        use: medication.use,
        duration: medication.duration,
        status: medication.continued ? 'Lanjutan' : 'Baru',
        safety:
          cell.length > 0
            ? cell.join(', ')
            : input.drugSafety.state === 'done'
              ? '-'
              : 'belum dicek',
        alert:
          medication.allergies.length > 0 ||
          partners.some((partner) => SERIOUS.has(partner.severity)),
      };
    }),
    drugSafety: drugSafetyLine(input),
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
    education: input.education,
    followUp: input.followUp ? `Kontrol ${input.followUp}` : '',
    safetyNet: input.safetyNet,
    signers: { dpjp: input.staff.dokter_nama, verifier: verifierFor(input.staff.dokter_nama, `${input.rm}|${date}`) },
    // Only this patient's visits: a late or failed history scan must not print another RM's vitals.
    trend: buildTrend(
      (context?.visitHistory ?? []).filter((visit) => visit.patient_id === input.rm),
      vitals,
      input.diagnoses[0]?.icd ?? '-',
      printedAt
    ),
  };
}

const SEVERITY: Record<DDISeverity, string> = {
  contraindicated: 'kontraindikasi',
  major: 'mayor',
  moderate: 'moderat',
  minor: 'minor',
};
const SERIOUS = new Set<DDISeverity>(['contraindicated', 'major']);

/** What the check said about this resep; a '-' cell means "checked, nothing" only beside this line. */
function drugSafetyLine({
  medications,
  drugSafety,
}: VisitSummaryInput): VisitSummaryModel['drugSafety'] {
  if (medications.length === 0) return { summary: '', notes: [] };
  if (drugSafety.state === 'checking')
    return { summary: 'Cek interaksi (DDInter) belum selesai saat dicetak.', notes: [] };
  if (drugSafety.state === 'unavailable')
    return { summary: 'Cek interaksi (DDInter) tidak dapat dilakukan.', notes: [] };
  const { pairs } = drugSafety;
  if (pairs.length === 0)
    return {
      summary: 'Cek interaksi (DDInter): tidak ada interaksi antar obat resep ini.',
      notes: [],
    };
  const serious = pairs.filter((pair) => SERIOUS.has(pair.severity));
  return {
    summary: `Cek interaksi (DDInter): ${pairs.length} interaksi antar obat resep ini${serious.length > 0 ? `, ${serious.length} serius` : ''}.`,
    notes: serious.map(
      (pair) =>
        `${pair.a} + ${pair.b} (${SEVERITY[pair.severity]})${pair.advice ? `: ${pair.advice}` : ''}`
    ),
  };
}

/** How many earlier visits Tren Tanda Vital sets beside today's. */
const TREND_VISITS = 4;

function buildTrend(
  history: VisitRecord[],
  current: Vitals,
  todayIcd: string,
  printedAt: Date
): VisitSummaryModel['trend'] {
  const startOfDay = new Date(
    printedAt.getFullYear(),
    printedAt.getMonth(),
    printedAt.getDate()
  ).getTime();
  // A visit dated the day of printing is this visit's own record, once ePuskesmas has saved it.
  const earlier = history
    .map((visit) => ({ visit, at: Date.parse(visit.timestamp) }))
    .filter(({ at }) => !Number.isNaN(at) && at < startOfDay)
    .sort((a, b) => a.at - b.at)
    .slice(-TREND_VISITS);
  const visits = earlier.map(({ at }) => {
    const date = new Date(at);
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(date.getFullYear()).slice(-2)}`;
  });
  const row = (label: string, key: keyof Vitals): TrendRow => {
    const was = earlier.at(-1)?.visit.vitals[key];
    const now = current[key];
    return {
      label,
      values: earlier.map(({ visit }) => figure(visit.vitals[key])),
      today: figure(now),
      direction: present(was) && present(now) ? (now > was ? 'up' : now < was ? 'down' : 'flat') : null,
      series:
        earlier.length > 0
          ? [...earlier.map(({ visit }) => visit.vitals[key]), now].map((n) =>
              present(n) ? n : null
            )
          : [],
    };
  };
  return {
    visits,
    rows: [
      {
        label: 'Diagnosis',
        values: earlier.map(({ visit }) => visit.diagnosa?.icd_x || '-'),
        today: todayIcd,
        direction: null,
        series: null,
      },
      row('Sistolik', 'sbp'),
      row('Diastolik', 'dbp'),
      row('Nadi', 'hr'),
      row('Napas', 'rr'),
      row('Suhu', 'temp'),
      row('GDS', 'glucose'),
    ],
  };
}
