import { describe, expect, it } from "vitest";
import { focusStep, locate, restoreNavMemory, type NavShape } from "../lib/nav-tree";

const shape: NavShape = [
  { id: "start", itemIds: ["new", "patient", "list"] },
  { id: "tools", itemIds: ["queue", "templates", "knowledge", "scribe"] },
  { id: "system", itemIds: ["commands", "search", "settings"] },
];

describe("sidebar navigation tree logic", () => {
  it("finds the group and row of the dialog that is open", () => {
    expect(locate(shape, "settings")).toEqual({ section: "system", index: 2 });
    expect(locate(shape, "knowledge")).toEqual({ section: "tools", index: 2 });
    expect(locate(shape, "account")).toBeNull();
    expect(locate(shape, null)).toBeNull();
  });
  it("restores the remembered group and rows, dropping anything that no longer fits", () => {
    expect(restoreNavMemory(JSON.stringify({ open: "tools", used: { tools: 3, system: 1 } }), shape, "start")).toEqual({ open: "tools", used: { tools: 3, system: 1 } });
    expect(restoreNavMemory(JSON.stringify({ open: "gone", used: { tools: 9, start: -1, system: 1.5, other: 0, system2: "x" } }), shape, "start")).toEqual({ open: "start", used: {} });
    for (const raw of [null, "", "{broken", "[]", "42", JSON.stringify({ open: 3 })]) expect(restoreNavMemory(raw, shape, "start")).toEqual({ open: "start", used: {} });
  });
  it("moves keyboard focus one row at a time and jumps to either end", () => {
    expect(focusStep(5, 1, "ArrowDown")).toBe(2);
    expect(focusStep(5, 4, "ArrowDown")).toBe(4);
    expect(focusStep(5, 0, "ArrowUp")).toBe(0);
    expect(focusStep(5, 3, "Home")).toBe(0);
    expect(focusStep(5, 1, "End")).toBe(4);
    expect(focusStep(5, 2, "Enter")).toBeNull();
    expect(focusStep(0, 0, "ArrowDown")).toBeNull();
  });
});
