import { describe, expect, it } from "vitest";
import { getTeamHeadLabel, isPendingApproval } from "./teams.ts";

describe("getTeamHeadLabel", () => {
  it("mengembalikan em dash bila tidak ada kepala TIM", () => {
    expect(getTeamHeadLabel({ head_student_id: null }, {})).toBe("—");
    expect(getTeamHeadLabel({}, {})).toBe("—");
  });

  it("mengembalikan nama murid bila ditemukan di peta", () => {
    const team = { head_student_id: "stu-1" };
    const map = { "stu-1": { name: "Budi Santoso" } };
    expect(getTeamHeadLabel(team, map)).toBe("Budi Santoso");
  });

  it("mengembalikan fallback bila murid tidak ditemukan", () => {
    const team = { head_student_id: "missing-id-abcdefghij" };
    expect(getTeamHeadLabel(team, {})).toBe(
      "Murid tidak ditemukan · missing-id-a",
    );
  });
});

describe("isPendingApproval", () => {
  it("true untuk HTTP 202", () => {
    expect(isPendingApproval({ status: 202 })).toBe(true);
  });

  it("true bila data.status pending", () => {
    expect(
      isPendingApproval({ status: 200, data: { status: "pending" } }),
    ).toBe(true);
  });

  it("false untuk respons sukses biasa", () => {
    expect(isPendingApproval({ status: 200, data: { status: "ok" } })).toBe(
      false,
    );
    expect(isPendingApproval(undefined)).toBe(false);
  });
});
