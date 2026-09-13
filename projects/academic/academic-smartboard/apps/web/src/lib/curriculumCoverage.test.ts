import { describe, expect, it } from "vitest";
import {
  coverageProgressPct,
  formatTaughtAt,
  isCoverageComplete,
  isCoveragePartial,
  isCpTaught,
  rowStateFor,
  taughtCountSuffix,
} from "./curriculumCoverage.ts";

describe("coverage row helpers", () => {
  it("taught vs untaught", () => {
    expect(isCpTaught({ taught_count: 0 })).toBe(false);
    expect(isCpTaught({ taught_count: 2 })).toBe(true);
    expect(rowStateFor({ taught_count: 0 })).toBe("untaught");
    expect(rowStateFor({ taught_count: 1 })).toBe("taught");
    expect(taughtCountSuffix(0)).toBe("");
    expect(taughtCountSuffix(3)).toBe(" (3×)");
  });

  it("progress flags", () => {
    expect(coverageProgressPct({ cp_total: 0, cp_taught: 0 })).toBe(0);
    expect(coverageProgressPct({ cp_total: 4, cp_taught: 1 })).toBe(25);
    expect(isCoverageComplete({ cp_total: 2, cp_taught: 2 })).toBe(true);
    expect(isCoveragePartial({ cp_total: 2, cp_taught: 1 })).toBe(true);
    expect(isCoveragePartial({ cp_total: 2, cp_taught: 0 })).toBe(false);
  });

  it("formatTaughtAt mengembalikan null untuk input kosong/invalid", () => {
    expect(formatTaughtAt(null)).toBeNull();
    expect(formatTaughtAt("")).toBeNull();
    expect(formatTaughtAt("bukan-tanggal")).toBeNull();
    const formatted = formatTaughtAt("2026-03-15T00:00:00Z");
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/15/);
  });
});
