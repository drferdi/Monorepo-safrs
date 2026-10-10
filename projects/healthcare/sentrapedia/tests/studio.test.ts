import { describe, expect, it } from "vitest";
import { intentGroups, documentSections, documentTitle, supportingSection, replaceSection, encounterTimeline, contextFacts, composerPlaceholder } from "../src/lib/studio";
import { defaultReviewItems } from "../src/lib/workflow";
import { createDraft, modeIds, modes } from "../src/lib/drafts";
import { clinicalTemplates, insertTemplate, modeCategories, templateText } from "../src/lib/clinical-templates";
import { initialWorkspace, restoreWorkspace, workspaceReducer, type Message, type Workspace } from "../src/lib/workspace";

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
      ["Analisis", ["Pertanyaan Klinis (PICO)", "Diagnosis Banding (DDx)", "Pemeriksaan Penunjang", "Pengodean Diagnosis (ICD-10)"]],
      ["Dokumentasi", ["Catatan Klinis (SOAP)", "Anamnesis (HPI)", "Catatan Penyakit Kronis", "Serah Terima Klinis (SBAR)"]],
      ["Rencana", ["Asesmen dan Rencana (A&P)", "Daftar Tugas Klinis", "Surat Rujukan", "Pemantauan Klinis"]],
      ["Komunikasi", ["Edukasi Pasien", "Ringkasan Kunjungan", "Catatan Konsultasi Telepon"]],
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

describe("two-column document", () => {
  it("ends a local draft on its last section, without a closing disclaimer (Chief: HAPUS)", () => {
    const draft = createDraft({ mode: "clinic", prompt: "Keluhan: batuk sintetis 3 hari\nPemeriksaan: paru bersih", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(draft.endsWith("## Teks sumber (verbatim)\nKeluhan: batuk sintetis 3 hari\nPemeriksaan: paru bersih")).toBe(true);
    const english = createDraft({ mode: "clinic", prompt: "Fictional visit", context: "Context supplied.", specialty: "Primary Care", model: "Standard", language: "English", instructions: "" });
    expect(english.endsWith("## Additional context\nContext supplied.")).toBe(true);
  });
  it("folds the source text and additional context, and only those", () => {
    const draft = createDraft({ mode: "clinic", prompt: "Keluhan: batuk sintetis 3 hari", context: "Konteks fiktif.", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "Ringkas" });
    expect(documentSections(draft).filter((section) => supportingSection(section.title)).map((section) => section.title)).toEqual(["Teks sumber (verbatim)", "Konteks tambahan"]);
    const english = createDraft({ mode: "clinic", prompt: "Chief concern: fictional cough", context: "Context supplied.", specialty: "Primary Care", model: "Standard", language: "English", instructions: "" });
    expect(documentSections(english).filter((section) => supportingSection(section.title)).map((section) => section.title)).toEqual(["Source text (verbatim)", "Additional context"]);
  });
  it("shows a local draft's title without the draft and patient line above the first section", () => {
    const draft = createDraft({ mode: "clinic", prompt: "Keluhan: batuk sintetis 3 hari", context: "", specialty: "Primary Care", model: "Standard", language: "Bahasa Indonesia", instructions: "" });
    expect(draft).toContain("Draf lokal · Primary Care · Standard");
    expect(documentTitle(draft)).toBe("# Catatan Klinis");
    expect(documentTitle("Tanpa judul\n\n## Satu\nisi")).toBe("");
  });
});

describe("clinical template pack", () => {
  const label = (id: string) => modes.find((mode) => mode.id === id)!.label;
  it("lists the 18 modes once each in Chief's final order and six categories", () => {
    expect(modeCategories.map((category) => [category.label, category.modes.map(label)])).toEqual([
      ["Dokumentasi klinis", ["Anamnesis (HPI)", "Catatan Klinis (SOAP)", "Diagnosis Banding (DDx)", "Asesmen dan Rencana (A&P)", "Catatan Scribe"]],
      ["Diagnosis dan evaluasi", ["Pemeriksaan Penunjang", "Pengodean Diagnosis (ICD-10)", "Catatan Penyakit Kronis", "Pemantauan Klinis"]],
      ["Komunikasi dan tindak lanjut", ["Ringkasan Kunjungan", "Edukasi Pasien", "Catatan Konsultasi Telepon", "Daftar Tugas Klinis"]],
      ["Koordinasi pelayanan", ["Surat Rujukan", "Telaah Rujukan", "Serah Terima Klinis (SBAR)"]],
      ["Evidence-based practice", ["Pertanyaan Klinis (PICO)"]],
      ["Administrasi klinis", ["Persetujuan Penjaminan (Prior Authorization)"]],
    ]);
    expect(modes.map((mode) => mode.id)).toEqual(clinicalTemplates.map((template) => template.mode));
    expect([...modeIds].sort()).toEqual(clinicalTemplates.map((template) => template.mode).sort());
  });
  it("writes a template as the pack does, every field marked for the clinician", () => {
    expect(templateText(clinicalTemplates[0])).toBe(`ANAMNESIS TERSTRUKTUR — HPI KOMPREHENSIF
DRAF — VERIFIKASI KLINISI DIPERLUKAN

IDENTITAS DOKUMENTASI
- Tanggal dan waktu anamnesis: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Sumber informasi dan reliabilitas anamnesis: Belum tersedia — lengkapi dan verifikasi oleh klinisi

KELUHAN DAN KRONOLOGI
- Keluhan utama (kata-kata pasien): Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Awitan, durasi, dan perjalanan keluhan: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Lokasi, penjalaran, karakter, dan intensitas: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Frekuensi, pola, serta faktor pencetus/peringan: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Gejala penyerta dan gejala yang disangkal (pertinent negatives): Belum tersedia — lengkapi dan verifikasi oleh klinisi

KONTEKS RELEVAN
- Riwayat penyakit dan tindakan terdahulu: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Obat yang digunakan dan riwayat alergi: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Riwayat keluarga, sosial, dan faktor risiko yang relevan: Belum tersedia — lengkapi dan verifikasi oleh klinisi

KLARIFIKASI
- Pertanyaan lanjutan yang belum terjawab: Belum tersedia — lengkapi dan verifikasi oleh klinisi
- Ringkasan kronologis berdasarkan keterangan yang tersedia: Belum tersedia — lengkapi dan verifikasi oleh klinisi`);
    expect(new Set(clinicalTemplates.map((template) => template.name)).size).toBe(18);
    expect(clinicalTemplates.every((template) => template.sections.length > 0 && template.rule)).toBe(true);
  });
  it("adds the structure after what is already typed and never replaces it", () => {
    expect(insertTemplate("Keluhan: batuk sintetis 3 hari\n", "STRUKTUR")).toBe("Keluhan: batuk sintetis 3 hari\n\nSTRUKTUR");
    expect(insertTemplate("  ", "STRUKTUR")).toBe("STRUKTUR");
  });
});
