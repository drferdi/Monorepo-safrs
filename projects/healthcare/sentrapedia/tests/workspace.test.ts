import { describe, expect, it } from "vitest";
import { initialWorkspace, workspaceReducer, restoreWorkspace } from "../src/lib/workspace";
import { createDraft, modes } from "../src/lib/drafts";

describe("workspace relationships", () => {
  it("creates a patient and associates a new encounter with that patient", () => {
    const state = workspaceReducer(initialWorkspace, { type: "patient.add", patient: { id: "p-new", name: "Fictional person", age: "42", sex: "Female", notes: "Context" } });
    const next = workspaceReducer(state, { type: "encounter.add", encounter: { id: "e-new", patientId: "p-new", title: "Visit", createdAt: "2026-10-08T12:00:00Z", messages: [], context: "" } });
    expect(next.activeEncounterId).toBe("e-new");
    expect(next.encounters.find((item) => item.id === "e-new")?.patientId).toBe("p-new");
  });
  it("removes dependent encounters and list membership when deleting a patient", () => {
    const next = workspaceReducer({ ...initialWorkspace, lists: [{ id: "l1", name: "Rounds", patientIds: ["demo-patient"] }] }, { type: "patient.delete", id: "demo-patient" });
    expect(next.patients).toHaveLength(0);
    expect(next.encounters).toHaveLength(0);
    expect(next.lists[0].patientIds).toEqual([]);
    expect(next.activeEncounterId).toBeNull();
  });
  it("only edits the selected message in the selected encounter", () => {
    const state = workspaceReducer(initialWorkspace, { type: "message.add", encounterId: "demo-encounter", messages: [{ id: "m1", role: "assistant", content: "Original", mode: "clinic", createdAt: "2026-10-08" }] });
    const next = workspaceReducer(state, { type: "message.edit", encounterId: "demo-encounter", messageId: "m1", content: "Reviewed" });
    expect(next.encounters[0].messages[0].content).toBe("Reviewed");
    expect(next.encounters[1].messages).toHaveLength(0);
  });
});

describe("local drafts", () => {
  it.each(modes)("builds $label with supplied facts and explicit provenance", (mode) => {
    const result = createDraft({ mode: mode.id, prompt: "Fictional visit: symptom duration three days.", context: "Allergies not supplied.", specialty: "Primary Care", model: "Standard", language: "English", patient: undefined, instructions: "Use concise sentences." });
    expect(result).toContain("symptom duration three days");
    expect(result).toContain("Allergies not supplied");
    expect(result).toContain("Local draft");
    expect(result).not.toContain("amoxicillin");
    expect(result).not.toContain("https://");
  });
  it("rejects blank submissions rather than inventing patient information", () => {
    expect(() => createDraft({ mode: "ddx", prompt: "  ", context: "", specialty: "Primary Care", model: "Standard", language: "English", instructions: "" })).toThrow("Tambahkan pertanyaan atau konteks Clinical terlebih dahulu.");
  });
  it("respects language and detailed model preferences", () => {
    const result = createDraft({ mode: "hpi", prompt: "Keluhan contoh", context: "", specialty: "Internal Medicine", model: "Extended", language: "Bahasa Indonesia", instructions: "Ringkas" });
    expect(result).toContain("Belum tersedia");
    expect(result).toContain("Internal Medicine");
    expect(result).toContain("Ringkas");
    expect(result).toContain("Review checklist");
  });
  it("keeps writing preferences in the saved output language", () => {
    const result = createDraft({ mode: "clinic", prompt: "Fictional example", context: "", specialty: "Primary Care", model: "Standard", language: "English", instructions: "Use concise sentences." });
    expect(result).toContain("## Writing preferences\nUse concise sentences.");
  });
  it("places supplied assessment and plan into their own sections without inventing findings", () => {
    const result = createDraft({ mode: "clinic", prompt: "HPI: Three-day fictional symptom.\nExamination: Findings supplied by clinician.\nAssessment: Working diagnosis supplied.\nPlan: Arrange the agreed follow-up.", context: "", specialty: "Primary Care", model: "Standard", language: "English", instructions: "" });
    expect(result).toContain("## History of present illness\nThree-day fictional symptom.");
    expect(result).toContain("## Assessment\nWorking diagnosis supplied.");
    expect(result).toContain("## Plan\nArrange the agreed follow-up.");
    expect(result).toContain("## Chief concern\nNot provided");
  });
  it("separates speaker statements and explicit clinical labels in a scribe transcript", () => {
    const result = createDraft({ mode: "scribe", prompt: "Patient: My fictional symptom began yesterday.\nClinician: Examination: Stated examination finding.\nClinician: Assessment: Stated assessment.\nClinician: Plan: Follow-up as discussed.", context: "", specialty: "Primary Care", model: "Standard", language: "English", instructions: "" });
    expect(result).toContain("## History of present illness\nMy fictional symptom began yesterday.");
    expect(result).toContain("## Examination findings stated\nStated examination finding.");
    expect(result).toContain("## Clinician assessment stated\nStated assessment.");
    expect(result).toContain("## Agreed plan and follow-up\nFollow-up as discussed.");
    expect(result).toContain("## Visit transcript (verbatim)");
  });
  it("preserves English medical headings and unfamiliar Indonesian free text", () => {
    const result = createDraft({ mode: "clinic", prompt: "Keluhan: Keluhan contoh.\nAsesmen: Asesmen yang diberikan.\nRencana: Kontrol sesuai pembahasan.\nInformasi lain yang tidak berlabel.", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(result).toContain("## Chief concern\nKeluhan contoh.");
    expect(result).toContain("## Assessment\nAsesmen yang diberikan.");
    expect(result).toContain("## Plan\nKontrol sesuai pembahasan.");
    expect(result).toContain("Informasi lain yang tidak berlabel.");
  });
});

describe("storage validation", () => {
  it("defaults new workspaces to Indonesian without changing saved language choices", () => {
    expect(initialWorkspace.settings.language).toBe("Bahasa Indonesia");
    const saved = { ...initialWorkspace, settings: { ...initialWorkspace.settings, language: "English" } };
    expect(restoreWorkspace(JSON.stringify(saved)).settings.language).toBe("English");
  });
  it("recovers from malformed JSON and rejects malformed nested records", () => {
    expect(restoreWorkspace("{broken")).toEqual(initialWorkspace);
    expect(restoreWorkspace(JSON.stringify({ ...initialWorkspace, encounters: [{ id: "x", messages: null }] }))).toEqual(initialWorkspace);
    expect(restoreWorkspace(JSON.stringify({ ...initialWorkspace, settings: { model: "unknown" } }))).toEqual(initialWorkspace);
  });
  it("round-trips a complete workspace", () => {
    expect(restoreWorkspace(JSON.stringify(initialWorkspace))).toEqual(initialWorkspace);
  });
});
