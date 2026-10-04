import { DOKTER_NAMA, type TenagaMedisNames } from '@/lib/clinical/tenaga-medis';
import type { TriageZone } from '@/lib/emergency-detector/triage-verdict';
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

/** One vital of the latest earlier visit beside today's, as the template's Tren Tanda Vital row. */
export interface TrendRow {
  label: string;
  before: string;
  today: string;
  /** Null when either value is missing. */
  direction: 'up' | 'down' | 'flat' | null;
}

export interface VisitSummaryModel {
  head: { rm: string; age: string; sex: 'L' | 'P'; day: string; time: string; printedAt: string; date: string };
  complaint: { main: string; extra: string };
  vitals: Array<{ label: string; value: string; unit: string }>;
  triage: { zone: TriageZone; headline: string | null } | null;
  allergies: string;
  pregnancy: string | null;
  diagnoses: Array<{ icd: string; name: string; role: 'PRIMER' | 'SEKUNDER' }>;
  medications: VisitSummaryInput['medications'];
  alerts: Array<{ title: string; message: string; urgent: boolean }>;
  education: string[];
  followUp: string;
  safetyNet: string[];
  signers: { dpjp: string; verifier: string };
  trend: TrendRow[];
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
    education: input.education,
    followUp: input.followUp ? `Kontrol ${input.followUp}` : '',
    safetyNet: input.safetyNet,
    signers: { dpjp: input.staff.dokter_nama, verifier: verifierFor(input.staff.dokter_nama, `${input.rm}|${date}`) },
    // Only this patient's visits: a late or failed history scan must not print another RM's vitals.
    trend: buildTrend(
      (context?.visitHistory ?? []).filter((visit) => visit.patient_id === input.rm),
      vitals,
      printedAt
    ),
  };
}

function buildTrend(history: VisitRecord[], current: Vitals, printedAt: Date): TrendRow[] {
  const before = history
    .filter((visit) => {
      const at = Date.parse(visit.timestamp);
      return !Number.isNaN(at) && at < printedAt.getTime();
    })
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0]?.vitals;
  const row = (label: string, key: keyof Vitals): TrendRow => {
    const was = before?.[key];
    const now = current[key];
    return {
      label,
      before: figure(was),
      today: figure(now),
      direction: present(was) && present(now) ? (now > was ? 'up' : now < was ? 'down' : 'flat') : null,
    };
  };
  return [
    row('Sistolik', 'sbp'),
    row('Diastolik', 'dbp'),
    row('Nadi', 'hr'),
    row('Napas', 'rr'),
    row('Suhu', 'temp'),
  ];
}
