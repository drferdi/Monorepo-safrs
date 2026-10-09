import { describe, expect, it } from "vitest";
import { branchPath, litPath, rowMiddle, spring, treePath, SUBMENU_ROW } from "../lib/submenu-motion";

describe("sidebar submenu motion", () => {
  it("uses the reference spring: starts at rest, barely overshoots and settles at the target", () => {
    expect(spring.at(0)).toBe(0);
    expect(spring.at(spring.duration)).toBeCloseTo(1, 3);
    const peak = Math.max(...Array.from({ length: 200 }, (_, i) => spring.at((i / 199) * spring.duration)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.01);
    expect(spring.duration).toBeGreaterThan(0.35);
    expect(spring.duration).toBeLessThan(0.8);
  });
  it("draws the grey tree to every row and the lit branch to the active row", () => {
    expect(rowMiddle(2)).toBe(2 * SUBMENU_ROW + SUBMENU_ROW / 2);
    const tree = treePath(3);
    for (const i of [0, 1, 2]) expect(tree).toContain(branchPath(rowMiddle(i)));
    expect(treePath(0)).toBe("");
    for (const i of [0, 1]) expect(treePath(2, 46)).toContain(branchPath(rowMiddle(i, 46)));
    expect(rowMiddle(1, 46)).toBe(69);
    expect(litPath(rowMiddle(1))).toMatch(/^M\d+ 0 V/);
    expect(litPath(rowMiddle(1))).toContain(branchPath(rowMiddle(1)).slice(branchPath(rowMiddle(1)).indexOf("Q")));
  });
});
