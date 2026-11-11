export const JOURNAL_STATUS_LABEL = {
  terbuka: "Terbuka",
  ditindaklanjuti: "Ditindaklanjuti",
  selesai: "Selesai",
} as const satisfies Record<string, string>;

export type JournalStatus = keyof typeof JOURNAL_STATUS_LABEL;

export function journalStatusLabel(status: string | undefined): string {
  if (!status) return "";
  return JOURNAL_STATUS_LABEL[status as JournalStatus] ?? status;
}

export function isJournalAuthorRole(role: string | undefined): boolean {
  return role === "owner" || role === "admin_akademik" || role === "tentor";
}

export function isJournalParentRole(role: string | undefined): boolean {
  return role === "murid_ortu";
}
