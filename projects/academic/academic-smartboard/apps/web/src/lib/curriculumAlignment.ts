export const CELL_STATE = {
  rich: { glyph: "▣", word: "Panduan lengkap", short: "Lengkap" },
  thin: { glyph: "▤", word: "Panduan tipis", short: "Tipis" },
  gap: { glyph: "○", word: "Tanpa panduan", short: "Kosong" },
} as const satisfies Record<
  string,
  { glyph: string; word: string; short: string }
>;

export type CellStateKey = keyof typeof CELL_STATE;

export const STAGES = [
  { id: "all", label: "Semua jenjang" },
  { id: "SD", label: "SD" },
  { id: "SMP", label: "SMP" },
  { id: "SMA", label: "SMA" },
] as const satisfies ReadonlyArray<{ id: string; label: string }>;

export type StageFilterId = (typeof STAGES)[number]["id"];

export interface AlignmentCell {
  subject_id: string;
  grade_id: string;
  phase?: string;
  cp_count: number;
  element_count: number;
}

export interface AlignmentGrade {
  grade_id: string;
  name: string;
  stage: string;
  order?: number;
  phase?: string;
}

export interface AlignmentSubject {
  subject_id: string;
  name: string;
  stage: string;
}

export interface AlignmentTotals {
  national_subjects?: number;
  national_cp?: number;
  national_elements?: number;
  bimbel_subjects?: number;
  bimbel_grades?: number;
  cells: number;
  cells_with_guidance: number;
}

export function stateFor(cell: AlignmentCell | null | undefined): CellStateKey {
  if (!cell || cell.cp_count === 0) return "gap";
  return cell.element_count > 0 ? "rich" : "thin";
}

export function cellMeterFill(state: CellStateKey): number {
  if (state === "rich") return 100;
  if (state === "thin") return 45;
  return 0;
}

export function coveragePct(
  totals: AlignmentTotals | null | undefined,
): number {
  if (!totals?.cells) return 0;
  return Math.round((100 * (totals.cells_with_guidance || 0)) / totals.cells);
}

export function buildCellIndex(
  cells: AlignmentCell[] | undefined,
): Record<string, AlignmentCell> {
  const map: Record<string, AlignmentCell> = {};
  for (const c of cells ?? []) {
    map[`${c.subject_id}|${c.grade_id}`] = c;
  }
  return map;
}

export function filterByStageFilter<T extends { stage: string }>(
  items: T[],
  stageFilter: StageFilterId | string,
): T[] {
  if (stageFilter === "all") return items;
  return items.filter((item) => item.stage === stageFilter);
}

export interface AlignmentGapItem {
  subject: AlignmentSubject;
  grade: AlignmentGrade;
  cell: AlignmentCell;
}

export interface AlignmentViewStats {
  cells: number;
  withGuidance: number;
  gaps: number;
  thin: number;
  pct: number;
  gapList: AlignmentGapItem[];
}

export function computeViewStats(
  subjects: AlignmentSubject[],
  grades: AlignmentGrade[],
  cellIndex: Record<string, AlignmentCell>,
): AlignmentViewStats {
  let cells = 0;
  let withGuidance = 0;
  let gaps = 0;
  let thin = 0;
  const gapList: AlignmentGapItem[] = [];

  for (const s of subjects) {
    for (const g of grades) {
      if (s.stage !== g.stage) continue;
      const cell = cellIndex[`${s.subject_id}|${g.grade_id}`];
      if (!cell) continue;
      cells += 1;
      const st = stateFor(cell);
      if (st === "gap") {
        gaps += 1;
        gapList.push({ subject: s, grade: g, cell });
      } else if (st === "thin") {
        thin += 1;
        withGuidance += 1;
      } else {
        withGuidance += 1;
      }
    }
  }

  return {
    cells,
    withGuidance,
    gaps,
    thin,
    pct: cells ? Math.round((100 * withGuidance) / cells) : 0,
    gapList: gapList.slice(0, 5),
  };
}
