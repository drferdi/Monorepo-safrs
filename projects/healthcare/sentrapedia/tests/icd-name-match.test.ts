import { describe, expect, it } from "vitest";
import { icdNameMatch } from "../scripts/icd-name-match.mjs";

const names = new Map([["A37", "Whooping cough"], ["A37.9", "Whooping cough, unspecified"], ["J18", "Pneumonia, organism unspecified"], ["J18.9", "Pneumonia, unspecified"], ["B86", "Scabies"], ["P21", "Birth asphyxia"], ["P21.0", "Severe birth asphyxia"]]);

describe("eval ICD name match", () => {
  it("matches when a meaningful label word is in the official name of the code or its category", () => {
    expect(icdNameMatch("J18.9", "Community-acquired pneumonia", names)).toBe(true);
    expect(icdNameMatch("B86", "Scabies", names)).toBe(true);
    expect(icdNameMatch("P21.0", "Birth asphyxia", names)).toBe(true);
  });
  it("does not match on generic words alone, a wrong disease, or a code outside the list", () => {
    expect(icdNameMatch("J18.9", "Acute disease, unspecified", names)).toBe(false);
    expect(icdNameMatch("B86", "Pneumonia", names)).toBe(false);
    expect(icdNameMatch("Z99.99", "Pneumonia", names)).toBe(false);
  });
  it("is a lower bound: a synonym of the official name does not match", () => {
    expect(icdNameMatch("A37.9", "Pertussis, unspecified", names)).toBe(false);
  });
});
