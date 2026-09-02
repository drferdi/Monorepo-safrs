import path from "node:path";
import { describe, expect, it } from "vitest";
import { isAllowedDesktopPath, normalizeDesktopWorkspacePath } from "./desktop-sandbox-paths.js";

describe("desktop sandbox path rules", () => {
  it("compares Windows roots case-insensitively without accepting siblings or other drives", () => {
    const roots = ["C:\\Users\\Owner\\sentrabot\\bot"];

    expect(
      isAllowedDesktopPath("c:\\users\\owner\\sentrabot\\BOT\\notes.txt", roots, path.win32),
    ).toBe(true);
    expect(
      isAllowedDesktopPath("C:\\Users\\Owner\\sentrabot\\bot-other\\notes.txt", roots, path.win32),
    ).toBe(false);
    expect(isAllowedDesktopPath("D:\\notes.txt", roots, path.win32)).toBe(false);
  });

  it("handles explicitly allowed UNC roots without accepting sibling shares", () => {
    const roots = ["\\\\server\\share\\sentrabot\\bot"];

    expect(
      isAllowedDesktopPath("\\\\SERVER\\share\\sentrabot\\BOT\\notes.txt", roots, path.win32),
    ).toBe(true);
    expect(
      isAllowedDesktopPath("\\\\server\\share-other\\sentrabot\\bot\\notes.txt", roots, path.win32),
    ).toBe(false);
  });

  it.each([
    "C:\\outside.txt",
    "C:outside.txt",
    "\\\\server\\share\\outside.txt",
    "\\\\?\\C:\\outside.txt",
    "notes.txt:secret",
    "NUL.txt",
    "COM1.log",
    "trailing-dot.",
    "trailing-space ",
  ])("rejects ambiguous or special Windows path %s", (requested) => {
    expect(() => normalizeDesktopWorkspacePath(requested, "win32")).toThrow(/escapes/i);
  });

  it("keeps ordinary portable paths and the virtual root syntax", () => {
    expect(normalizeDesktopWorkspacePath("/notes/result.txt", "win32")).toBe("notes/result.txt");
    expect(normalizeDesktopWorkspacePath("notes/result.txt", "linux")).toBe("notes/result.txt");
  });
});
