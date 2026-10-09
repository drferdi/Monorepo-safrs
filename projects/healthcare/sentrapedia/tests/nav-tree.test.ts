import { describe, expect, it } from "vitest";
import { activeNavItem, focusStep, locate, restoreNavMemory, type NavShape } from "../lib/nav-tree";

const recentIds = ["e1", "e2"];
const shape: NavShape = [
  { id: "patients", itemIds: ["all-patients", "lists"] },
  { id: "encounters", itemIds: ["e1", "e2", "all-encounters"] },
  { id: "tools", itemIds: ["knowledge", "queue", "templates", "scribe"] },
];

describe("sidebar navigation tree logic", () => {
  it("finds the group and row of the current item", () => {
    expect(locate(shape, "templates")).toEqual({ section: "tools", index: 2 });
    expect(locate(shape, "e2")).toEqual({ section: "encounters", index: 1 });
    expect(locate(shape, "account")).toBeNull();
    expect(locate(shape, null)).toBeNull();
  });
  it("restores the groups left open, dropping any that no longer exist", () => {
    expect(restoreNavMemory(JSON.stringify({ open: ["tools", "patients"] }), shape, ["encounters"])).toEqual(["patients", "tools"]);
    expect(restoreNavMemory(JSON.stringify({ open: [] }), shape, ["encounters"])).toEqual([]);
    expect(restoreNavMemory(JSON.stringify({ open: ["gone", "tools", 3, "tools"] }), shape, ["encounters"])).toEqual(["tools"]);
    for (const raw of [null, "", "{broken", "[]", "42", JSON.stringify({ open: "tools" })]) expect(restoreNavMemory(raw, shape, ["encounters"])).toEqual(["encounters"]);
  });
  it("lights one item: an open tool first, then the page, then the encounter (or the full list when it is not recent), else Beranda", () => {
    expect(activeNavItem({ dialog: "knowledge", view: { page: "encounters" }, activeEncounterId: "e1", recentIds })).toBe("knowledge");
    expect(activeNavItem({ dialog: "patient", view: { page: "encounters" }, activeEncounterId: "e1", recentIds })).toBe("all-encounters");
    expect(activeNavItem({ dialog: null, view: { page: "patient", id: "p1" }, activeEncounterId: "e1", recentIds })).toBe("all-patients");
    expect(activeNavItem({ dialog: null, view: { page: "patients" }, activeEncounterId: null, recentIds })).toBe("all-patients");
    expect(activeNavItem({ dialog: null, view: { page: "lists" }, activeEncounterId: null, recentIds })).toBe("lists");
    expect(activeNavItem({ dialog: null, view: { page: "workspace" }, activeEncounterId: "e2", recentIds })).toBe("e2");
    expect(activeNavItem({ dialog: null, view: { page: "workspace" }, activeEncounterId: "old", recentIds })).toBe("all-encounters");
    expect(activeNavItem({ dialog: null, view: { page: "workspace" }, activeEncounterId: null, recentIds })).toBe("home");
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
