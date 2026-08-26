/**
 * Peran editorial. Publikasi sejarah memakai prinsip empat mata: seorang editor
 * tidak boleh menyetujui bukti historisnya sendiri (Technical Bible bagian 30).
 */
export const EDITORIAL_ROLES = [
  "admin",
  "publisher",
  "historical_reviewer",
  "editor",
  "researcher",
  "asset_curator",
] as const;

export type EditorialRole = (typeof EDITORIAL_ROLES)[number];

/** Hanya peran ini yang boleh memindahkan klaim ke status terbit. */
export const PUBLISHING_ROLES = [
  "admin",
  "publisher",
] as const satisfies readonly EditorialRole[];

/** Hanya peran ini yang boleh menyetujui bukti historis. */
export const HISTORICAL_APPROVAL_ROLES = [
  "admin",
  "historical_reviewer",
] as const satisfies readonly EditorialRole[];
