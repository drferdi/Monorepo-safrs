import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactMaxWidthPx, compactQuery, mobileMaxWidthPx, mobileQuery } from "../src/lib/layout";
import { unfoldMs } from "../src/lib/typing";

// globals.css cannot import TypeScript, so these tests keep its media queries and durations equal to the JS constants.
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

  it("unfolds a typed section and the submenu in the time the typing reveal waits", () => {
    const durations = [
      /\[data-unfolding="true"\] \.diagnosis-section-body \{[^}]*section-unfold (\d+)ms/,
      /\[data-typing="true"\] \.diagnosis-section-body::before \{[^}]*branch-reveal (\d+)ms/,
      /\.submenu-body \{[^}]*grid-template-rows (\d+)ms/,
    ].map(pattern => Number(css.match(pattern)?.[1]));
    expect(durations).toEqual([unfoldMs, unfoldMs, unfoldMs]);
  });
});
