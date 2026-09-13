/** Indonesian labels & format helpers — port verbatim dari arsip smartboard. */

export const ROLE_LABEL = {
  owner: "Owner / Kepala",
  admin_akademik: "Admin Akademik",
  tentor: "Pengajar",
  finance: "Finance",
  murid_ortu: "Murid / Orang Tua",
  content_manager: "Content Manager",
} as const;

export const FORMAT_LABEL = {
  privat: "Privat",
  semi_privat: "Semi-Privat",
  reguler: "Reguler",
} as const;

export const MODE_LABEL = {
  di_tempat: "Di Tempat Bimbel",
  kunjung: "Kunjung Rumah",
  online: "Online",
} as const;

export const SESSION_STATUS_LABEL = {
  terjadwal: "Terjadwal",
  berlangsung: "Berlangsung",
  menunggu_evaluasi: "Menunggu Evaluasi",
  menunggu_verifikasi: "Menunggu Verifikasi",
  terverifikasi: "Terverifikasi",
  masuk_payroll: "Masuk Payroll",
  dibatalkan: "Dibatalkan",
  selesai: "Selesai",
  dijadwalkan_ulang: "Dijadwalkan Ulang",
} as const;

/** Arsip memakai class badge-*; dipetakan ke tone token untuk StatusBadge. */
export type StatusBadgeTone =
  | "info"
  | "warning"
  | "success"
  | "critical"
  | "neutral";

export const STATUS_BADGE: Record<string, StatusBadgeTone> = {
  terjadwal: "info",
  berlangsung: "info",
  menunggu_evaluasi: "warning",
  menunggu_verifikasi: "warning",
  terverifikasi: "success",
  masuk_payroll: "success",
  selesai: "success",
  dibatalkan: "critical",
  dijadwalkan_ulang: "neutral",
  hadir: "success",
  terlambat: "warning",
  izin: "neutral",
  sakit: "neutral",
  tidak_hadir: "critical",
  digantikan: "info",
};

export const ATTEND_LABEL = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin: "Izin",
  sakit: "Sakit",
  tidak_hadir: "Tidak Hadir",
  digantikan: "Digantikan",
  dibatalkan: "Dibatalkan",
} as const;

export const COMPETENCE_LABEL = {
  belum_memahami: "Belum Memahami",
  mulai_memahami: "Mulai Memahami",
  cukup_memahami: "Cukup Memahami",
  menguasai: "Menguasai",
} as const;

export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "Rp0";
  return `Rp${Number(n).toLocaleString("id-ID")}`;
}

/**
 * Format tanggal seperti arsip (`toLocaleDateString('id-ID')`).
 * dayjs locale `id` memakai "Agt"; arsip memakai "Agu" — pertahankan arsip.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}
