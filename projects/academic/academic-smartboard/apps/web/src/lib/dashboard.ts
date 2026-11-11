import type { Role } from "./nav.ts";

export const ROLE_VIEW = {
  owner: {
    seq: "OWN",
    eyebrow: "Operasional Workflow Network",
    kpis: ["sessions", "missing", "verify", "payroll"],
    analytics: ["teaching", "finance", "tutor", "student"],
  },
  admin_akademik: {
    seq: "AKA",
    eyebrow: "Operasi Akademik",
    kpis: ["sessions", "attendance", "missing", "verify"],
    analytics: ["teaching", "tutor", "student"],
  },
  tentor: {
    seq: "TTR",
    eyebrow: "Meja Tentor",
    kpis: ["sessions", "attendance", "missing", "payroll"],
    analytics: ["teaching", "finance", "tutor", "student"],
  },
  finance: {
    seq: "FIN",
    eyebrow: "Kendali Keuangan",
    kpis: ["payroll", "verified", "sessions"],
    analytics: ["finance"],
  },
  murid_ortu: {
    seq: "ORT",
    eyebrow: "Ringkasan Keluarga",
    kpis: ["sessions", "attendance", "missing"],
    analytics: ["student"],
  },
  content_manager: {
    seq: "KNT",
    eyebrow: "Konten Akademik",
    kpis: ["sessions", "missing"],
    analytics: ["tutor", "student"],
  },
} as const satisfies Record<
  Role,
  {
    seq: string;
    eyebrow: string;
    kpis: readonly string[];
    analytics: readonly string[];
  }
>;

export const ANALYTICS_ORDER = [
  "teaching",
  "tutor",
  "finance",
  "student",
] as const;

export const DONE_STATUSES = new Set([
  "menunggu_evaluasi",
  "menunggu_verifikasi",
  "terverifikasi",
]);

export const STARTED_STATUSES = new Set([
  "berlangsung",
  "menunggu_evaluasi",
  "menunggu_verifikasi",
  "terverifikasi",
]);

const HONORIFICS = new Set([
  "dr",
  "drg",
  "prof",
  "ir",
  "h",
  "hj",
  "ust",
  "ustadz",
  "ustadzah",
]);

/** Port arsip: jangan sapa "dr" saja bila ada honorific. */
export function greetingName(fullName: string | undefined | null): string {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const [first, second] = parts;
  if (!first) return "Anda";
  const head = first.replace(/\.$/, "");
  if (HONORIFICS.has(head.toLowerCase()) && second) {
    return `${head}. ${second}`;
  }
  return first;
}

export interface DashboardStats {
  sessions_today?: number;
  sessions_ongoing?: number;
  sessions_done_today?: number;
  missing_evaluations?: number;
  pending_verify?: number;
  students_present?: number;
  students_absent?: number;
  est_payroll_month?: number;
  verified_sessions_month?: number;
  attendance_sessions_today?: number;
  honor_entries_today?: number;
  period?: string;
}

export interface DashboardActionProblem {
  key: string;
  label: string;
  to: string;
  status: "critical" | "warning" | "neutral";
  word: string;
}

export function buildDashboardProblems(input: {
  role: Role;
  stats: DashboardStats | null;
  attGaps: number;
  canSeeAttGaps: boolean;
  isOwner: boolean;
  isParent: boolean;
  regularityTidakRutin: number;
}): DashboardActionProblem[] {
  const { role, stats, attGaps, canSeeAttGaps, isOwner, isParent } = input;
  if (!stats) return [];
  const items: DashboardActionProblem[] = [];

  if (canSeeAttGaps && attGaps > 0) {
    items.push({
      key: "attendance-gaps",
      label: `${attGaps} sesi belum memiliki absensi lengkap`,
      to: "/sesi",
      status: "critical",
      word: "Absensi",
    });
  }
  if (
    ["owner", "admin_akademik", "tentor"].includes(role) &&
    (stats.missing_evaluations ?? 0) > 0
  ) {
    items.push({
      key: "missing-evaluations",
      label: `${stats.missing_evaluations} sesi menunggu evaluasi`,
      to: "/sesi?status=menunggu_evaluasi",
      status: "warning",
      word: "Evaluasi",
    });
  }
  if (
    ["owner", "admin_akademik"].includes(role) &&
    (stats.pending_verify ?? 0) > 0
  ) {
    items.push({
      key: "pending-verification",
      label: `${stats.pending_verify} sesi siap diverifikasi`,
      to: "/sesi?status=menunggu_verifikasi",
      status: "neutral",
      word: "Verifikasi",
    });
  }
  if (
    ["owner", "admin_akademik", "tentor"].includes(role) &&
    (stats.students_absent ?? 0) > 0
  ) {
    items.push({
      key: "attendance-exceptions",
      label: `${stats.students_absent} ketidakhadiran atau izin tercatat hari ini`,
      to: "/sesi?date=today",
      status: "warning",
      word: "Kehadiran",
    });
  }
  if (isParent && (stats.missing_evaluations ?? 0) > 0) {
    items.push({
      key: "parent-evaluations",
      label: `${stats.missing_evaluations} evaluasi sesi anak belum tersedia`,
      to: "/evaluasi",
      status: "neutral",
      word: "Perkembangan",
    });
  }
  if (isOwner && input.regularityTidakRutin > 0) {
    items.push({
      key: "regularity",
      label: `${input.regularityTidakRutin} murid perlu perhatian`,
      to: "/akademik/perkembangan",
      status: "warning",
      word: "Kehadiran rutin",
    });
  }
  return items;
}

export function formatMetric(
  value: number | null | undefined,
  format: "int" | "rupiah" = "int",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return format === "rupiah" ? "Rp0" : "—";
  }
  if (format === "rupiah") {
    return `Rp${Number(value).toLocaleString("id-ID")}`;
  }
  return String(Math.round(Number(value)));
}
