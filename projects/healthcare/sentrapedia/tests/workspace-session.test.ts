import { describe, expect, it } from "vitest";
import { freshAnswer, freshAnswerMs, markRevealed } from "../src/lib/fresh-answer";
import { localDraftMessages, restoreFromStorage, shortcutFor } from "../src/lib/workspace-session";
import { initialWorkspace, storageKey, unreadableKey, type Message, type Patient, type Settings } from "../src/lib/workspace";
import type { PersonalTemplate } from "../src/lib/workflow";

const key = (key: string, mods: { ctrl?: boolean; meta?: boolean } = {}) => ({ key, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta });

describe("workspace keyboard shortcuts", () => {
  it("maps Ctrl or Cmd with J, / and K to the command palette, search and a new encounter", () => {
    expect(shortcutFor(key("j", { ctrl: true }), false)).toBe("commands");
    expect(shortcutFor(key("J", { meta: true }), false)).toBe("commands");
    expect(shortcutFor(key("/", { ctrl: true }), false)).toBe("search");
    expect(shortcutFor(key("k", { meta: true }), false)).toBe("new");
  });
  it("ignores plain keys, and every shortcut while a dialog or the mobile navigation is open", () => {
    expect(shortcutFor(key("j"), false)).toBeNull();
    expect(shortcutFor(key("x", { ctrl: true }), false)).toBeNull();
    expect(shortcutFor(key("j", { ctrl: true }), true)).toBeNull();
  });
});

describe("restoring the workspace from browser storage", () => {
  const storage = (items: Record<string, string>, failWrites = false) => ({ items, getItem: (k: string) => items[k] ?? null, setItem: (k: string, v: string) => { if (failWrites) throw new Error("QuotaExceededError"); items[k] = v; } });
  it("returns a valid saved workspace with no notice", () => {
    const saved = JSON.stringify(initialWorkspace);
    expect(restoreFromStorage(storage({ [storageKey]: saved }))).toMatchObject({ unreadable: null, notice: null });
  });
  it("keeps unreadable saved text under its own key, offers it for download and says so", () => {
    const items: Record<string, string> = { [storageKey]: "{broken" };
    const restored = restoreFromStorage(storage(items));
    expect(restored.workspace).toEqual(initialWorkspace);
    expect(restored.unreadable).toBe("{broken");
    expect(items[unreadableKey]).toBe("{broken");
    expect(restored.notice).toContain("tidak dapat dibaca");
  });
  it("still offers unreadable text from memory when the backup copy does not fit", () => {
    expect(restoreFromStorage(storage({ [storageKey]: "{broken" }, true)).unreadable).toBe("{broken");
  });
  it("keeps offering an earlier unreadable copy after a valid save", () => {
    expect(restoreFromStorage(storage({ [storageKey]: JSON.stringify(initialWorkspace), [unreadableKey]: "{old" })).unreadable).toBe("{old");
  });
});

describe("a local draft", () => {
  const settings: Settings = { specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "Ringkas" };
  const patient: Patient = { id: "p", name: "Pasien Fiktif", age: "30", sex: "F", notes: "Catatan fiktif" };
  it("pairs the user's text with a draft whose source names input, context, patient and format", () => {
    const [user, draft] = localDraftMessages({ text: "  Batuk fiktif  ", content: "Draf", mode: "clinic", context: "Konteks fiktif", patient, settings });
    expect(user).toMatchObject({ role: "user", content: "Batuk fiktif", mode: "clinic" });
    expect(draft).toMatchObject({ role: "assistant", content: "Draf", originalContent: "Draf", reviewStatus: "draft", mode: "clinic" });
    expect(draft.sourceText?.split("\n\n").map(part => part.split("\n")[0])).toEqual(["Input", "Konteks Encounter", "Pasien", "Preferensi format"]);
  });
  it("snapshots a personal template so later edits to the template do not change the draft", () => {
    const template: PersonalTemplate = { id: "t", name: "Templat", mode: "clinic", sections: ["S", "O"], instructions: "" };
    const [, draft] = localDraftMessages({ text: "x", content: "Draf", mode: "clinic", context: "", settings, personal: template });
    template.sections.push("A");
    expect(draft.templateSnapshot?.sections).toEqual(["S", "O"]);
    expect(draft.sourceText).toContain("Templat saat dibuat");
  });
});

describe("the fresh-answer rule", () => {
  const message = (id: string, ageMs: number): Message => ({ id, role: "assistant", content: "", mode: "ddx", createdAt: new Date(Date.now() - ageMs).toISOString() });
  it("treats an answer as fresh for 20 seconds, once", () => {
    expect(freshAnswerMs).toBe(20000);
    expect(freshAnswer(message("a", 1000))).toBe(true);
    expect(freshAnswer(message("b", freshAnswerMs + 1000))).toBe(false);
    markRevealed("a");
    expect(freshAnswer(message("a", 1000))).toBe(false);
  });
});
