import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactMaxWidthPx, compactQuery, mobileMaxWidthPx, mobileQuery } from "../src/lib/layout";

// globals.css cannot import TypeScript, so this test keeps its media queries equal to the JS constants.
const css = readFileSync("src/app/globals.css", "utf8");

describe("layout constants shared by JS and CSS", () => {
  it("uses the JS breakpoints in the stylesheet's media queries", () => {
    expect(mobileQuery).toBe(`(max-width: ${mobileMaxWidthPx}px)`);
    expect(compactQuery).toBe(`(max-width: ${compactMaxWidthPx}px)`);
    expect(css).toContain(`@media ${mobileQuery}`);
    expect(css).toContain(`@media ${compactQuery}`);
    expect(css).toContain(`(min-width: ${mobileMaxWidthPx + 1}px)`);
    expect(css).toContain(`(min-width: ${compactMaxWidthPx + 1}px)`);
  });
});
