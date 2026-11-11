import { describe, expect, it } from "vitest";
import { filledText, objectLike, record, text } from "../src/lib/guards";

describe("shared shape checks", () => {
  it("record accepts plain objects only; objectLike also accepts arrays", () => {
    for (const value of [{}, { a: 1 }]) { expect(record(value)).toBe(true); expect(objectLike(value)).toBe(true); }
    expect(record([])).toBe(false);
    expect(objectLike([])).toBe(true);
    for (const value of [null, undefined, 0, "", "x", true]) { expect(record(value)).toBe(false); expect(objectLike(value)).toBe(false); }
  });
  it("text allows blank strings up to max; filledText also needs a non-blank character", () => {
    expect(text("", 3)).toBe(true);
    expect(text("  ", 3)).toBe(true);
    expect(text("abc", 3)).toBe(true);
    expect(text("abcd", 3)).toBe(false);
    expect(text(1, 3)).toBe(false);
    expect(filledText("", 3)).toBe(false);
    expect(filledText("  ", 3)).toBe(false);
    expect(filledText(" a ", 3)).toBe(true);
    expect(filledText("abcd", 3)).toBe(false);
    expect(filledText(null, 3)).toBe(false);
  });
});
