export const ROW_STATE = {
  taught: { glyph: "●", word: "Sudah diajarkan" },
  untaught: { glyph: "○", word: "Belum diajarkan" },
} as const satisfies Record<string, { glyph: string; word: string }>;

export type RowStateKey = keyof typeof ROW_STATE;

export interface CoverageCpRow {
  learning_outcome_code: string;
  element_name?: string;
  taught_count: number;
  last_taught_at?: string | null;
}

export interface CoverageTotals {
  cp_total: number;
  cp_taught: number;
}

export function isCpTaught(cp: { taught_count: number }): boolean {
  return cp.taught_count > 0;
}

export function rowStateFor(cp: { taught_count: number }): RowStateKey {
  return isCpTaught(cp) ? "taught" : "untaught";
}

export function taughtCountSuffix(taughtCount: number): string {
  return taughtCount > 0 ? ` (${taughtCount}×)` : "";
}

/** Format tanggal arsip: day numeric + month short + year numeric (id-ID). */
export function formatTaughtAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function coverageProgressPct(totals: CoverageTotals): number {
  if (!totals.cp_total) return 0;
  return Math.round((100 * totals.cp_taught) / totals.cp_total);
}

export function isCoverageComplete(totals: CoverageTotals): boolean {
  return totals.cp_total > 0 && totals.cp_taught === totals.cp_total;
}

export function isCoveragePartial(totals: CoverageTotals): boolean {
  return totals.cp_taught > 0 && !isCoverageComplete(totals);
}
