import { describe, expect, it } from "vitest";
import { focusStep } from "../src/lib/nav-tree";

describe("keyboard movement through rows", () => {
  it("moves one row at a time and jumps to either end", () => {
    expect(focusStep(5, 1, "ArrowDown")).toBe(2);
    expect(focusStep(5, 4, "ArrowDown")).toBe(4);
    expect(focusStep(5, 0, "ArrowUp")).toBe(0);
    expect(focusStep(5, 3, "Home")).toBe(0);
    expect(focusStep(5, 1, "End")).toBe(4);
    expect(focusStep(5, 2, "Enter")).toBeNull();
    expect(focusStep(0, 0, "ArrowDown")).toBeNull();
  });
});
