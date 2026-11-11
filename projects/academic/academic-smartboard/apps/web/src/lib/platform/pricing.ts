// Shared pricing vocabulary for the Platform Admin Console.

export const ALL_QUOTAS = [
  "max_students",
  "max_tutors",
  "max_admins",
  "max_sessions_month",
] as const;

export const ALL_FEATURES = [
  "ai_eval_draft",
  "curriculum_alignment",
  "payroll",
  "reports_export",
  "communication_center",
  "priority_support",
] as const;

export type QuotaKey = (typeof ALL_QUOTAS)[number];
export type FeatureKey = (typeof ALL_FEATURES)[number];

export const QUOTA_LABEL: Record<string, string> = {
  max_students: "Maks. Murid",
  max_tutors: "Maks. Tutor",
  max_admins: "Maks. Admin",
  max_sessions_month: "Maks. Sesi/bln",
};

export const FEATURE_LABEL: Record<string, string> = {
  ai_eval_draft: "Draf Evaluasi AI",
  curriculum_alignment: "Keselarasan Kurikulum",
  payroll: "Payroll",
  reports_export: "Ekspor Laporan",
  communication_center: "Pusat Komunikasi",
  priority_support: "Dukungan Prioritas",
};

export const INTERVAL_LABEL: Record<string, string> = {
  monthly: "/bulan",
  yearly: "/tahun",
  one_time: "sekali",
};

export function fmtRupiah(
  amount: number | null | undefined,
  currency = "IDR",
): string {
  const n = Number(amount || 0);
  if (currency !== "IDR") return `${currency} ${n.toLocaleString("id-ID")}`;
  if (n === 0) return "Gratis";
  return `Rp${n.toLocaleString("id-ID")}`;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  create_tenant: "Buat institusi",
  assign_plan: "Tugaskan paket",
  create_plan: "Buat paket",
  update_plan: "Ubah paket",
  update_tenant: "Ubah institusi",
  invite_owner: "Undang owner",
};

export function auditLabel(action: string | null | undefined): string {
  if (!action) return "—";
  if (AUDIT_ACTION_LABEL[action]) return AUDIT_ACTION_LABEL[action];
  if (action.startsWith("tenant_status:")) {
    const pair = action.split(":")[1] ?? "";
    return `Ubah status (${pair})`;
  }
  return action;
}
