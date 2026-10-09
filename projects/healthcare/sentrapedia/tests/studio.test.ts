import { describe, expect, it } from "vitest";
import { intentGroups, documentSections, replaceSection, encounterTimeline, contextFacts, composerPlaceholder } from "../lib/studio";
import { defaultReviewItems } from "../lib/workflow";
import { createDraft, modeIds, modes } from "../lib/drafts";
import { initialWorkspace, restoreWorkspace, workspaceReducer, type Message, type Workspace } from "../lib/workspace";

const message: Message = { id: "doc", role: "assistant", content: "# Note\n\n## History\nOriginal\n\n## Plan\nKeep\n---\nFooter", mode: "clinic", createdAt: "2026-10-09T01:00:00Z" };
const state: Workspace = { ...initialWorkspace, encounters: [{ ...initialWorkspace.encounters[0], messages: [message] }] };

describe("document provenance and review", () => {
  it("requires review before final and resets changed content to draft while retaining the baseline", () => {
    const action = { type: "message.review", encounterId: "demo-encounter", messageId: "doc", status: "final" } as const;
    expect(workspaceReducer(state, action).encounters[0].messages[0].reviewStatus).not.toBe("final");
    const ready = { ...state, encounters: [{ ...state.encounters[0], messages: [{ ...message, reviewItems: defaultReviewItems.map((item) => ({ ...item, checked: true })) }] }] };
    const reviewed = workspaceReducer(ready, { ...action, status: "reviewed" });
    const final = workspaceReducer(reviewed, action);
    expect(final.encounters[0].messages[0].reviewStatus).toBe("final");
    expect(workspaceReducer(final, { type: "message.edit", encounterId: "demo-encounter", messageId: "doc", content: message.content }).encounters[0].messages[0].reviewStatus).toBe("final");
    const changed = workspaceReducer(final, { type: "message.edit", encounterId: "demo-encounter", messageId: "doc", content: "Changed" }).encounters[0].messages[0];
    expect(changed.reviewStatus).toBe("draft");
    expect(changed.originalContent).toBe(message.content);
  });
  it("preserves legacy documents and discards malformed optional metadata only", () => {
    expect(restoreWorkspace(JSON.stringify(state))).toEqual(state);
    const malformed = { ...state, encounters: [{ ...state.encounters[0], messages: [{ ...message, sourceText: 42, reviewStatus: "approved", originalContent: null }] }] };
    expect(restoreWorkspace(JSON.stringify(malformed)).encounters[0].messages[0]).toEqual(message);
  });
});

describe("workspace presentation helpers", () => {
  it("replaces a section without altering another section, headings, or footer", () => {
    const sections = documentSections(message.content);
    const history = sections.find((section) => section.title === "History")!;
    expect(replaceSection(message.content, history, "Updated\n\n")).toBe(message.content.replace("Original\n\n", "Updated\n\n"));
    expect(sections.find((section) => section.title === "Plan")?.body).toBe("Keep\n");
  });
  it("covers every mode once in four intent groups", () => {
    const ids = intentGroups.flatMap((group) => group.modes);
    expect([...ids].sort()).toEqual([...modeIds].sort());
    expect(new Set(ids).size).toBe(modeIds.length);
  });
  it("offers each category's quick actions from its own modes, as Chief's table names them", () => {
    const label = (id: string) => modes.find((mode) => mode.id === id)!.label;
    expect(intentGroups.map((group) => [group.label, group.quick.map(label)])).toEqual([
      ["Analisis", ["Pertanyaan Klinis", "Diagnosis Banding", "Pemeriksaan Penunjang"]],
      ["Dokumentasi", ["Catatan SOAP", "Anamnesis (HPI)", "Catatan Kronis", "Handoff (SBAR)"]],
      ["Rencana", ["Asesmen & Rencana", "Daftar Tugas", "Surat Rujukan", "Monitoring"]],
      ["Komunikasi", ["Edukasi Pasien", "Ringkasan Kunjungan", "Catatan Telepon"]],
    ]);
    for (const group of intentGroups) { expect(group.quick.every((id) => group.modes.includes(id))).toBe(true); expect(group.quick[0]).toBe(group.modes[0]); }
  });
  it("drafts a monitoring plan from the supplied findings", () => {
    const draft = createDraft({ mode: "monitoring", prompt: "Keluhan: sesak napas sintetis\nRencana: cek saturasi tiap 4 jam", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(draft).toContain("## Masalah yang dipantau\nsesak napas sintetis");
    expect(draft).toContain("## Frekuensi dan cara pemantauan\ncek saturasi tiap 4 jam");
    expect(draft).toContain("## Kriteria eskalasi\nBelum tersedia");
  });
  it("filters timeline by patient and keeps unlinked encounters separate", () => {
    const encounters = [...state.encounters, { ...state.encounters[0], id: "other", patientId: "other" }, { ...state.encounters[0], id: "unlinked", patientId: null }];
    expect(encounterTimeline(encounters, encounters[0]).map((item) => item.id)).toEqual(["demo-encounter"]);
    expect(encounterTimeline(encounters, encounters[2]).map((item) => item.id)).toEqual(["unlinked"]);
    expect(encounterTimeline(encounters, undefined)).toEqual([]);
  });
  it("keeps source labels separate and does not infer absent allergies", () => {
    const facts = contextFacts("Keluhan: Contoh fiktif", "Obat: Obat contoh");
    expect(facts.find((fact) => fact.key === "allergies")?.values).toEqual([]);
    expect(facts.find((fact) => fact.key === "concern")?.values).toEqual([{ source: "Konteks Encounter", text: "Contoh fiktif" }]);
  });
});

describe("slash picker order", () => {
  it("keeps the local Referral Letter as the first match for /ref and /refer", () => {
    for (const query of ["ref", "refer"]) expect(modes.filter((item) => `${item.id} ${item.label}`.toLowerCase().includes(query))[0].id).toBe("referral");
  });
});

describe("Indonesian wording", () => {
  it("says rujukan, never referral, on screen and in Indonesian drafts", () => {
    for (const mode of modes) expect([mode.label, mode.title, mode.description, mode.placeholder].join(" ")).not.toMatch(/referral/i);
    for (const mode of ["referral", "refer"] as const) expect(createDraft({ mode, prompt: "Keluhan sintetis", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" })).not.toMatch(/referral/i);
  });
});

describe("Indonesian patient wording", () => {
  it("says Pasien, never Patient, in mode texts and Indonesian drafts", () => {
    for (const mode of modes) expect([mode.label, mode.title, mode.description, mode.placeholder].join(" ")).not.toMatch(/\bpatient\b/i);
    for (const mode of modeIds) {
      const draft = createDraft({ mode, prompt: "Keluhan: sintetis", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
      expect(draft).not.toMatch(/\bpatient\b/i);
      expect(draft).toContain("Pasien belum dipilih");
    }
  });
});

describe("saved seed patient", () => {
  it("renames the untouched demo patient from an older build to Pasien and leaves every other patient as it is", () => {
    const old = { ...initialWorkspace, patients: [{ ...initialWorkspace.patients[0], name: "Patient", notes: "Patient demonstrasi fiktif. Ganti dengan informasi fiktif saja." }, { id: "own", name: "Patient", age: "", sex: "Female", notes: "Patient demonstrasi fiktif. Ganti dengan informasi fiktif saja." }, { ...initialWorkspace.patients[0], id: "demo-edited", name: "Bu Ani" }] };
    const [demo, own, edited] = restoreWorkspace(JSON.stringify(old)).patients;
    expect(demo).toEqual(initialWorkspace.patients[0]);
    expect(own).toEqual(old.patients[1]);
    expect(edited.name).toBe("Bu Ani");
  });
});

describe("composer hint per intent tab", () => {
  it("shows the tab's own hint on its default mode and the chip's hint on the others", () => {
    expect(composerPlaceholder("question")).toBe("Diskusikan kasus yang sedang Anda tangani.");
    for (const group of intentGroups) expect(composerPlaceholder(group.modes[0])).toBe(group.placeholder);
    expect(new Set(intentGroups.map((group) => group.placeholder)).size).toBe(intentGroups.length);
    expect(composerPlaceholder("refer")).toBe(modes.find((mode) => mode.id === "refer")!.placeholder);
  });
});
