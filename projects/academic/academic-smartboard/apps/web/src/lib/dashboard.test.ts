import { describe, expect, it } from "vitest";
import {
  buildDashboardProblems,
  formatMetric,
  greetingName,
} from "./dashboard.ts";

describe("greetingName", () => {
  it("keeps honorific with next word", () => {
    expect(greetingName("dr Ferdi Iskandar")).toBe("dr. Ferdi");
  });

  it("uses first name without honorific", () => {
    expect(greetingName("Novia Anggraini")).toBe("Novia");
  });

  it("falls back when empty", () => {
    expect(greetingName("")).toBe("Anda");
    expect(greetingName(null)).toBe("Anda");
  });
});

describe("buildDashboardProblems", () => {
  it("orders critical attendance gaps first for staff", () => {
    const problems = buildDashboardProblems({
      role: "owner",
      stats: {
        missing_evaluations: 2,
        pending_verify: 1,
        students_absent: 0,
      },
      attGaps: 3,
      canSeeAttGaps: true,
      isOwner: true,
      isParent: false,
      regularityTidakRutin: 1,
    });
    expect(problems[0]?.key).toBe("attendance-gaps");
    expect(problems.some((p) => p.key === "regularity")).toBe(true);
  });

  it("parent only sees parent evaluation items from shared stats", () => {
    const problems = buildDashboardProblems({
      role: "murid_ortu",
      stats: { missing_evaluations: 2, pending_verify: 5 },
      attGaps: 0,
      canSeeAttGaps: false,
      isOwner: false,
      isParent: true,
      regularityTidakRutin: 0,
    });
    expect(problems.map((p) => p.key)).toEqual(["parent-evaluations"]);
  });
});

describe("formatMetric", () => {
  it("formats int and rupiah", () => {
    expect(formatMetric(12)).toBe("12");
    expect(formatMetric(1500, "rupiah")).toBe("Rp1.500");
    expect(formatMetric(null)).toBe("—");
  });
});
