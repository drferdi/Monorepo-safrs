import { describe, expect, it } from "vitest";
import { getNationalSubjects } from "./curriculumStructure.ts";

describe("getNationalSubjects", () => {
  it("mengambil mapel dari phases array dan sort id", () => {
    const structure = {
      phases: [
        {
          phase: "B",
          subjects: [
            { subject: "IPA" },
            { subject: "Matematika" },
            { subject: "Bahasa Indonesia" },
          ],
        },
      ],
    };
    expect(getNationalSubjects(structure, "B")).toEqual([
      "Bahasa Indonesia",
      "IPA",
      "Matematika",
    ]);
  });

  it("mengembalikan [] bila fase/structure absen", () => {
    expect(getNationalSubjects(null, "A")).toEqual([]);
    expect(getNationalSubjects({ phases: [] }, null)).toEqual([]);
    expect(
      getNationalSubjects(
        { phases: [{ phase: "A", subjects: [{ subject: "X" }] }] },
        "Z",
      ),
    ).toEqual([]);
  });

  it("mendukung bentuk phases record mapel string[]", () => {
    expect(
      getNationalSubjects({ phases: { C: ["Seni", "Matematika"] } }, "C"),
    ).toEqual(["Matematika", "Seni"]);
  });
});
