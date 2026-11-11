import { describe, expect, it } from "vitest";
import {
  buildCellIndex,
  cellMeterFill,
  computeViewStats,
  coveragePct,
  filterByStageFilter,
  stateFor,
} from "./curriculumAlignment.ts";

const GRID = {
  grades: [
    { grade_id: "g4", name: "SD Kelas 4", stage: "SD", order: 4, phase: "B" },
    {
      grade_id: "g10",
      name: "SMA Kelas 10",
      stage: "SMA",
      order: 10,
      phase: "E",
    },
  ],
  subjects: [
    { subject_id: "mtk", name: "Matematika", stage: "SD" },
    { subject_id: "fis", name: "Fisika", stage: "SMA" },
  ],
  cells: [
    {
      subject_id: "mtk",
      grade_id: "g4",
      phase: "B",
      cp_count: 1,
      element_count: 5,
    },
    {
      subject_id: "fis",
      grade_id: "g10",
      phase: "E",
      cp_count: 0,
      element_count: 0,
    },
  ],
  totals: {
    national_subjects: 208,
    national_cp: 377,
    cells: 2,
    cells_with_guidance: 1,
  },
};

describe("stateFor", () => {
  it("gap bila cell kosong atau cp_count 0", () => {
    expect(stateFor(null)).toBe("gap");
    expect(stateFor(undefined)).toBe("gap");
    expect(
      stateFor({
        subject_id: "x",
        grade_id: "y",
        cp_count: 0,
        element_count: 3,
      }),
    ).toBe("gap");
  });

  it("rich vs thin berdasarkan element_count", () => {
    expect(
      stateFor({
        subject_id: "x",
        grade_id: "y",
        cp_count: 1,
        element_count: 5,
      }),
    ).toBe("rich");
    expect(
      stateFor({
        subject_id: "x",
        grade_id: "y",
        cp_count: 2,
        element_count: 0,
      }),
    ).toBe("thin");
  });
});

describe("cellMeterFill / coveragePct", () => {
  it("meter fill rich/thin/gap", () => {
    expect(cellMeterFill("rich")).toBe(100);
    expect(cellMeterFill("thin")).toBe(45);
    expect(cellMeterFill("gap")).toBe(0);
  });

  it("coveragePct global dari totals", () => {
    expect(coveragePct(GRID.totals)).toBe(50);
    expect(coveragePct({ cells: 0, cells_with_guidance: 0 })).toBe(0);
    expect(coveragePct(null)).toBe(0);
  });
});

describe("computeViewStats", () => {
  it("menghitung gap dan withGuidance seperti arsip", () => {
    const index = buildCellIndex(GRID.cells);
    const stats = computeViewStats(GRID.subjects, GRID.grades, index);
    expect(stats.cells).toBe(2);
    expect(stats.withGuidance).toBe(1);
    expect(stats.gaps).toBe(1);
    expect(stats.thin).toBe(0);
    expect(stats.pct).toBe(50);
    expect(stats.gapList).toHaveLength(1);
    expect(stats.gapList[0]?.subject.subject_id).toBe("fis");
  });

  it("filter stage membatasi subjek/jenjang", () => {
    const sdSubjects = filterByStageFilter(GRID.subjects, "SD");
    const sdGrades = filterByStageFilter(GRID.grades, "SD");
    expect(sdSubjects).toHaveLength(1);
    expect(sdGrades).toHaveLength(1);
    const stats = computeViewStats(
      sdSubjects,
      sdGrades,
      buildCellIndex(GRID.cells),
    );
    expect(stats.cells).toBe(1);
    expect(stats.gaps).toBe(0);
    expect(stats.pct).toBe(100);
  });
});
