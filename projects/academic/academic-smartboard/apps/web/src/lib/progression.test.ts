import { describe, expect, it } from "vitest";
import { averageMetric, filterSessionsForEval } from "./progression";

describe("filterSessionsForEval", () => {
  it("hanya status evaluasi relevan", () => {
    const rows = [
      { session_id: "1", status: "menunggu_evaluasi" },
      { session_id: "2", status: "terjadwal" },
      { session_id: "3", status: "berlangsung" },
      { session_id: "4", status: "selesai" },
    ];
    expect(filterSessionsForEval(rows).map((r) => r.session_id)).toEqual([
      "1",
      "3",
    ]);
  });
});

describe("averageMetric", () => {
  it("rata-rata aman untuk array kosong", () => {
    expect(averageMetric([])).toBe(0);
    expect(averageMetric([4, 5, 3])).toBe(4);
  });
});
