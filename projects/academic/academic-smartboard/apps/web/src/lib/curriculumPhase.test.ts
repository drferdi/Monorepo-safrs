import { describe, expect, it } from "vitest";
import { PHASES, phaseForGrade } from "./curriculumPhase";

describe("PHASES", () => {
  it("daftar fase Kurikulum Nasional 2026", () => {
    expect(PHASES).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
});

describe("phaseForGrade", () => {
  it("memetakan SD ke fase A/B/C", () => {
    expect(phaseForGrade("SD", 1)).toBe("A");
    expect(phaseForGrade("SD", 2)).toBe("A");
    expect(phaseForGrade("SD", 3)).toBe("B");
    expect(phaseForGrade("SD", 4)).toBe("B");
    expect(phaseForGrade("SD", 5)).toBe("C");
    expect(phaseForGrade("SD", 6)).toBe("C");
  });

  it("memetakan SMP ke fase D", () => {
    expect(phaseForGrade("SMP", 7)).toBe("D");
    expect(phaseForGrade("SMP", 9)).toBe("D");
  });

  it("memetakan SMA ke fase E/F", () => {
    expect(phaseForGrade("SMA", 10)).toBe("E");
    expect(phaseForGrade("SMA", 11)).toBe("F");
    expect(phaseForGrade("SMA", 12)).toBe("F");
  });

  it("mengembalikan null untuk input tidak valid", () => {
    expect(phaseForGrade("", 1)).toBeNull();
    expect(phaseForGrade("SD", Number.NaN)).toBeNull();
    expect(phaseForGrade("TK", 1)).toBeNull();
    expect(phaseForGrade(null, 1)).toBeNull();
    expect(phaseForGrade("SD", undefined)).toBeNull();
  });
});
