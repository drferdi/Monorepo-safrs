import type { StatusBadgeTone } from "./labels.ts";
import type { Role } from "./nav.ts";

export const PAYROLL_STATUS_LABEL = {
  draft: "Draft",
  menunggu_verifikasi: "Menunggu Verifikasi",
  terverifikasi: "Terverifikasi",
  disetujui: "Disetujui",
  dibayar: "Dibayar",
  dikoreksi: "Dikoreksi",
  dikunci: "Terkunci",
} as const satisfies Record<string, string>;

export const PAYROLL_STATUS_TONE = {
  draft: "neutral",
  menunggu_verifikasi: "warning",
  terverifikasi: "info",
  disetujui: "info",
  dibayar: "success",
  dikoreksi: "warning",
  dikunci: "critical",
} as const satisfies Record<string, StatusBadgeTone>;

export const METHOD_LABEL = {
  transfer_bank: "Transfer Bank",
  tunai: "Tunai",
  e_wallet: "E-Wallet",
  cek: "Cek",
} as const satisfies Record<string, string>;

export type PaymentMethod = keyof typeof METHOD_LABEL;

export const OT_STATUS_LABEL = {
  draft: "Draft",
  diajukan: "Diajukan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibayar: "Dibayar",
} as const satisfies Record<string, string>;

export const OT_STATUS_TONE = {
  draft: "neutral",
  diajukan: "warning",
  disetujui: "success",
  ditolak: "critical",
  dibayar: "info",
} as const satisfies Record<string, StatusBadgeTone>;

export const OT_TYPE_LABEL = {
  mengajar_pengganti: "Mengajar Pengganti",
  administrasi: "Administrasi",
  rapat: "Rapat",
  menyiapkan_materi: "Menyiapkan Materi",
  lainnya: "Lainnya",
} as const satisfies Record<string, string>;

export function sumEarningsSummary(
  rows: Array<{ total?: number; sessions?: number }>,
): { totalPayroll: number; totalSessions: number; tutorCount: number } {
  return {
    totalPayroll: rows.reduce((a, b) => a + (b.total || 0), 0),
    totalSessions: rows.reduce((a, b) => a + (b.sessions || 0), 0),
    tutorCount: rows.length,
  };
}

export function earningRowStatus(row: {
  paid?: boolean;
  verified?: boolean;
}): { label: string; tone: StatusBadgeTone } {
  if (row.paid) return { label: "Dibayar", tone: "success" };
  if (row.verified) return { label: "Terverifikasi", tone: "info" };
  return { label: "Draft", tone: "neutral" };
}

export function buildSlipUrl(
  apiBase: string,
  periodId: string,
  tutorId: string,
): string {
  const base = apiBase.replace(/\/$/, "");
  return `${base}/payroll/periods/${periodId}/slip/${tutorId}`;
}

export function sumPaymentTotal(
  payments: Array<{ amount?: number }>,
): number {
  return payments.reduce((a, b) => a + (b.amount || 0), 0);
}

export interface PaymentFormInput {
  period_id: string;
  tutor_id: string;
  amount: number;
  method: string;
  bank_name?: string;
  account_last4?: string;
  transfer_ref?: string;
  reference?: string;
}

export function validatePaymentForm(form: PaymentFormInput): string | null {
  if (!form.period_id || !form.tutor_id || !form.amount) {
    return "Lengkapi periode, pengajar, jumlah";
  }
  if (form.method === "transfer_bank") {
    if (!(form.bank_name || "").trim()) return "Nama bank wajib";
    if (!/^\d{4}$/.test(form.account_last4 || "")) {
      return "4 digit terakhir rekening wajib";
    }
    if ((form.transfer_ref || form.reference || "").trim().length < 3) {
      return "No. referensi transfer wajib";
    }
  }
  return null;
}

export function canApproveOvertime(role: Role | string | undefined): boolean {
  return role === "owner" || role === "finance";
}

export function payrollStatusTone(status: string | undefined): StatusBadgeTone {
  if (!status) return "neutral";
  return (
    (PAYROLL_STATUS_TONE as Record<string, StatusBadgeTone>)[status] ?? "neutral"
  );
}

export function payrollStatusLabel(status: string | undefined): string {
  if (!status) return "—";
  return (
    (PAYROLL_STATUS_LABEL as Record<string, string>)[status] ?? status
  );
}
