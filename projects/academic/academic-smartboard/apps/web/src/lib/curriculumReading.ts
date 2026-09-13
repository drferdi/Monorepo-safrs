const EMPTY = "Belum terisi";

export function pageRange(cp: {
  source_page_start?: string;
  source_page_end?: string;
}): string {
  const start = (cp.source_page_start || "").trim();
  const end = (cp.source_page_end || "").trim();
  if (start && end) return start === end ? start : `${start}–${end}`;
  return start || end || "";
}

export function displayValue(value: string | null | undefined): string {
  const filled = (value || "").trim();
  return filled || EMPTY;
}

const VERIFIED = new Set(["verified_current", "verified_supplementary"]);

export function isUnreviewedCp(verificationStatus: string | undefined): boolean {
  return !VERIFIED.has(verificationStatus ?? "");
}

export function isLicensedCp(cp: object): boolean {
  return "learning_outcome_text" in cp;
}
