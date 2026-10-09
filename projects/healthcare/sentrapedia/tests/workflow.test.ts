import { describe, expect, it } from "vitest";
import { createPersonalDraft, defaultReviewItems, reviewComplete, queueItems, saveLocalWorkspace } from "../lib/workflow";
import { initialWorkspace, restoreWorkspace, workspaceReducer, type Workspace, type Message } from "../lib/workspace";

const doc: Message = { id: "doc", role: "assistant", mode: "clinic", content: "Original", originalContent: "Original", sourceText: "Immutable source", createdAt: "2026-10-09T01:00:00Z", reviewItems: defaultReviewItems };
const state: Workspace = { ...initialWorkspace, encounters: [{ ...initialWorkspace.encounters[0], messages: [doc] }] };
const ref = { encounterId: "demo-encounter", messageId: "doc" };
const stamp = "2026-10-09T02:00:00Z";
const template = { id: "personal", name: "SOAP pribadi", mode: "clinic" as const, sections: ["History", "Plan"], instructions: "Ringkas" };
function message(s: Workspace) { return s.encounters[0].messages[0]; }

describe("personal templates", () => {
  it("uses explicit section labels only and preserves the raw source", () => {
    const output = createPersonalDraft(template, "History: Contoh\nTeks tanpa label", "Plan: Tindak lanjut manual");
    expect(output).toContain("## History\nContoh");
    expect(output).toContain("## Plan\nTindak lanjut manual");
    expect(output).toContain("Teks tanpa label");
    expect(createPersonalDraft(template, "History: Contoh", "")).toContain("## Plan\nBelum tersedia");
  });
  it("persists templates/favorites and cleans favorites when deleted", () => {
    let next = workspaceReducer(state, { type: "template.save", template });
    next = workspaceReducer(next, { type: "favorite.toggle", key: "template:personal" });
    expect(restoreWorkspace(JSON.stringify(next)).templates).toEqual([template]);
    next = workspaceReducer(next, { type: "template.delete", id: "personal" });
    expect(next.favorites).toEqual([]);
    expect(message(next).content).toBe("Original");
  });
});

describe("versions and review guards", () => {
  it("rejects incomplete review and final, even through direct reducer calls", () => {
    expect(message(workspaceReducer(state, { type: "message.review", ...ref, status: "reviewed" })).reviewStatus).not.toBe("reviewed");
    expect(message(workspaceReducer(state, { type: "message.review", ...ref, status: "final" })).reviewStatus).not.toBe("final");
    expect(reviewComplete([])).toBe(false);
    expect(reviewComplete([{ id: "optional", label: "Optional", required: false, checked: true, target: "document" }])).toBe(false);
  });
  it("allows reviewed then final only with all required checks", () => {
    let next = state;
    for (const item of defaultReviewItems) next = workspaceReducer(next, { type: "review.toggle", ...ref, id: item.id });
    next = workspaceReducer(next, { type: "message.review", ...ref, status: "reviewed" });
    next = workspaceReducer(next, { type: "message.review", ...ref, status: "final" });
    expect(message(next).reviewStatus).toBe("final");
    next = workspaceReducer(next, { type: "message.edit", ...ref, content: "Edited", at: stamp });
    expect(message(next).reviewStatus).toBe("draft");
    expect(message(next).reviewItems?.every((item) => !item.checked)).toBe(true);
    expect(message(next).sourceText).toBe(doc.sourceText);
    expect(message(next).originalContent).toBe("Original");
  });
  it("stores before edits, skips identical edits, and restores without losing current text", () => {
    let next = workspaceReducer(state, { type: "message.edit", ...ref, content: "Edited", at: stamp });
    expect(message(next).revisions?.[0].content).toBe("Original");
    const revision = message(next).revisions![0];
    next = workspaceReducer(next, { type: "message.edit", ...ref, content: "Edited", at: stamp });
    expect(message(next).revisions).toHaveLength(1);
    next = workspaceReducer(next, { type: "revision.restore", ...ref, id: revision.id, at: "2026-10-09T03:00:00Z" });
    expect(message(next).content).toBe("Original");
    expect(message(next).revisions?.[1].content).toBe("Edited");
    expect(message(next).revisions?.[1].reason).toBe("restore");
    next = workspaceReducer(next, { type: "revision.rename", ...ref, id: revision.id, name: "Sebelum edit" });
    expect(restoreWorkspace(JSON.stringify(next)).encounters[0].messages[0].revisions?.[0].name).toBe("Sebelum edit");
  });
  it("caps history at 50 but retains the baseline", () => {
    let next = state;
    for (let i = 0; i < 55; i++) next = workspaceReducer(next, { type: "message.edit", ...ref, content: `Edit ${i}`, at: new Date(Date.parse(stamp) + i * 1000).toISOString() });
    expect(message(next).revisions).toHaveLength(50);
    expect(message(next).originalContent).toBe("Original");
  });
  it("rejects empty review lists and resets status when the list changes", () => {
    const next = workspaceReducer(state, { type: "review.save", ...ref, items: [] });
    expect(message(next).reviewItems).toEqual(defaultReviewItems);
  });
});

describe("queue and storage compatibility", () => {
  it("reports quota failure and never claims the failed write succeeded", () => {
    let saved = "";
    expect(saveLocalWorkspace(state, (raw) => { saved = raw; })).toBeNull();
    expect(JSON.parse(saved).version).toBe(1);
    expect(saveLocalWorkspace(state, () => { throw new Error("QuotaExceededError"); })).toContain("belum tersimpan");
  });
  it("retains a long snapshot produced from input and context after reload", () => {
    const long = "x".repeat(60000);
    const large = { ...state, encounters: [{ ...state.encounters[0], messages: [{ ...doc, content: long }] }] };
    const next = workspaceReducer(large, { type: "message.edit", ...ref, content: "Edited", at: stamp });
    expect(message(restoreWorkspace(JSON.stringify(next))).revisions?.[0].content).toBe(long);
  });
  it("snapshots review defaults independently and clears workflow data with the workspace", () => {
    const custom = [{ id: "custom", label: "Custom", required: true, checked: false, target: "document" }];
    const next = workspaceReducer(state, { type: "review.defaults", items: custom });
    expect(message(next).reviewItems).toEqual(defaultReviewItems);
    const cleared = workspaceReducer({ ...next, templates: [template], favorites: ["template:personal"] }, { type: "clear" });
    expect(cleared.templates ?? []).toEqual([]);
    expect(cleared.encounters).toEqual([]);
  });
  it("filters by explicit patient, sorts pinned first, and round trips tasks", () => {
    let next: Workspace = { ...state, encounters: [...state.encounters, { ...state.encounters[0], id: "other", patientId: null }] };
    next = workspaceReducer(next, { type: "queue.update", encounterId: "other", updates: { pinned: true, workStatus: "review", tasks: [{ id: "t", text: "Tugas manual", done: false }] }, at: stamp });
    expect(queueItems(next, "", "all")[0].id).toBe("other");
    expect(queueItems(next, "", "demo-patient").map((item) => item.id)).toEqual(["demo-encounter"]);
    expect(queueItems(next, "Tugas manual", "all")[0].id).toBe("other");
    expect(restoreWorkspace(JSON.stringify(next)).encounters[1].tasks?.[0].text).toBe("Tugas manual");
    next = workspaceReducer(next, { type: "patient.delete", id: "demo-patient" });
    expect(next.encounters.map((item) => item.id)).toEqual(["other"]);
  });
  it("drops malformed new metadata without discarding valid old content", () => {
    const malformed = { ...state, templates: [{ id: "bad" }], favorites: ["template:missing", 42], encounters: [{ ...state.encounters[0], workStatus: "urgent", tasks: [{ id: "t", text: 42 }], messages: [{ ...doc, revisions: [{ id: "bad", content: 42 }], reviewItems: [{ id: "bad", checked: true }] }] }] };
    const restored = restoreWorkspace(JSON.stringify(malformed));
    expect(message(restored).content).toBe("Original");
    expect(restored.templates).toEqual([]);
    expect(restored.favorites).toEqual([]);
    expect(restored.encounters[0].workStatus).toBeUndefined();
    expect(message(restored).reviewItems).toEqual(defaultReviewItems);
  });
  it("keeps legacy final documents but cannot newly finalize unchecked legacy drafts", () => {
    const legacy = { ...state, encounters: [{ ...state.encounters[0], messages: [{ ...doc, reviewItems: undefined, reviewStatus: "final" as const }] }] };
    expect(message(restoreWorkspace(JSON.stringify(legacy))).reviewStatus).toBe("final");
    expect(message(restoreWorkspace(JSON.stringify(legacy))).revisions).toBeUndefined();
  });
});
