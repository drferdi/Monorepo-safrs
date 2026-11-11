import { describe, expect, it } from "vitest";
import {
  displayValue,
  isLicensedCp,
  isUnreviewedCp,
  pageRange,
} from "./curriculumReading";

describe("pageRange", () => {
  it("menggabungkan start–end, atau satu sisi, atau kosong", () => {
    expect(pageRange({ source_page_start: "10", source_page_end: "12" })).toBe(
      "10–12",
    );
    expect(pageRange({ source_page_start: "10", source_page_end: "10" })).toBe(
      "10",
    );
    expect(pageRange({ source_page_start: "10" })).toBe("10");
    expect(pageRange({})).toBe("");
  });
});

describe("displayValue / license / verification", () => {
  it("displayValue memakai placeholder arsip", () => {
    expect(displayValue("")).toBe("Belum terisi");
    expect(displayValue("Dokumen A")).toBe("Dokumen A");
  });

  it("isLicensedCp jika field learning_outcome_text ada", () => {
    expect(isLicensedCp({ learning_outcome_text: "teks" })).toBe(true);
    expect(isLicensedCp({ learning_outcome_code: "CP.1" })).toBe(false);
  });

  it("isUnreviewedCp kecuali status verified_*", () => {
    expect(isUnreviewedCp("extracted_machine")).toBe(true);
    expect(isUnreviewedCp("verified_current")).toBe(false);
    expect(isUnreviewedCp("verified_supplementary")).toBe(false);
  });
});
