import { describe, expect, it } from "vitest";
import { linesUpTo } from "../src/lib/typing";

// Smoother answer reveal (Gaffer, 2026-10-19: "lebih halus"): lines arrive at an even rhythm by count, not by
// character length, so a long line does not hold back the short ones after it and short lines do not arrive in bursts.
describe("linesUpTo", () => {
  const text = ["a", "b".repeat(40), "c", "d"].join("\n"); // 4 lines, 46 characters

  it("reveals whole lines in proportion to the share of characters typed", () => {
    expect(linesUpTo(text, 0)).toBe("");
    expect(linesUpTo(text, Math.ceil(text.length * 0.25))).toBe("a");
    expect(linesUpTo(text, Math.ceil(text.length * 0.5))).toBe(["a", "b".repeat(40)].join("\n"));
    expect(linesUpTo(text, Math.ceil(text.length * 0.75))).toBe(["a", "b".repeat(40), "c"].join("\n"));
  });
  it("shows the complete text once every character is typed", () => {
    expect(linesUpTo(text, text.length)).toBe(text);
    expect(linesUpTo(text, text.length + 5)).toBe(text);
  });
  it("never shows a partial line", () => {
    for (let count = 0; count <= text.length; count++) {
      const shown = linesUpTo(text, count);
      expect(shown === "" || text.startsWith(shown + "\n") || shown === text).toBe(true);
    }
  });
  it("keeps an empty text empty", () => {
    expect(linesUpTo("", 3)).toBe("");
  });
});
