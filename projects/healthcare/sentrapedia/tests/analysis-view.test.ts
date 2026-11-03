import { describe, expect, it } from "vitest";
import { analysisView } from "../src/lib/aadi/analysis-view";
import { aadiMessage, educationLines } from "../src/lib/aadi/presentation";
import { emptyCase, type AadiAnalysis, type AadiResult } from "../src/lib/aadi/contract";
import { THEORACLE_GROUNDING_CAPABILITY } from "../src/lib/theoracle-grounding-types";

const caseData = { ...emptyCase(), demographics: { ageYears: 30, sex: "M" as const }, chiefComplaint: "Keluhan fiktif untuk uji", anamnesis: { freeText: "Contoh sintetis" }, vitals: { temperature: 38.5 }, physicalExam: ["Faring hiperemis"], currentMedications: ["Parasetamol"] };
const result: AadiResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Nama keluaran uji", confidenceTier: "low", status: "supported" }], alternatives: [{ icd10: "J02.9", label: "Faringitis", confidenceTier: "low" }], cannotMiss: [{ icd10: "C92.0", label: "Kondisi di luar TheOracle", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan dari layanan"], opposing: ["Data belum lengkap"] }], missingInformation: ["Pemfis belum tersedia"], nextBestActions: [{ kind: "exam", item: "Lengkapi pemfis", reason: "Data kurang" }, { kind: "test", item: "Darah rutin", reason: "Konfirmasi", indication: "Demam" }], disposition: { decision: "treat", urgency: "routine" }, unfilled: [], reasoningNote: "Catatan uji", meta: { version: "test-only", model: "mock", costUsd: 0 }, therapy: { forDiagnosis: { icd10: "J00", label: "Nama keluaran uji" }, regimen: [{ drug: "Parasetamol", dose: "3x500mg", route: "PO", duration: "3 hari", note: "" }, { drug: "Amoksisilin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }], interactions: ["Tidak ada"], contraindications: ["Alergi"] } };
const passage = (id: string, text: string, rank: number) => ({ evidenceId: id, text, retrievalRank: rank, similarity: 0.71, source: { title: "PNPK uji.md", docSource: "Kemenkes knowledge base", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } });
const bundle = (ids: [string, string][]) => ({ version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle" as const, indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-10T12:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: ids.map(([id, text], index) => passage(id, text, index + 1)) });
// Parasetamol has a dose passage; Amoksisilin is named without one, so its dose is removed by the gate.
const therapyGrounding = bundle([["P001-001", "Nama keluaran uji: parasetamol 500 mg tiga kali sehari untuk demam"], ["P001-002", "Nama keluaran uji: amoksisilin diberikan bila ada indikasi bakteri"]]);
const analysisFixture: AadiAnalysis = { case: caseData, result, traceId: "synthetic-trace", createdAt: "2026-10-09T00:00:00Z", grounding: bundle([["P002-001", "Common cold ditangani simtomatik"]]), therapyGrounding };

describe("analysisView", () => {
  it("builds three tiers, next steps and gated therapy from a stored answer", () => {
    const view = analysisView(aadiMessage(analysisFixture))!;
    expect(view).not.toBeNull();
    expect(view.tiers.map((t) => t.title)).toEqual(["Kemungkinan utama", "Alternatif", "Jangan terlewat"]);
    expect(view.tiers[0].items[0]).toMatchObject({ icd10: "J00", label: "Nama keluaran uji", status: "Didukung data", supporting: ["Alasan dari layanan"], opposing: ["Data belum lengkap"] });
    expect(view.tiers[1].items[0].status).toBe("Alternatif");
    expect(view.tiers[2].items[0].status).toBe("Perlu disaring segera");
    expect(view.nextSteps).toEqual([{ kind: "exam", item: "Lengkapi pemfis", reason: "Data kurang" }, { kind: "test", item: "Darah rutin", reason: "Konfirmasi", indication: "Demam" }]);
    expect(view.therapy?.forDiagnosis).toBe("Nama keluaran uji (J00)");
    expect(view.therapy?.lines.map((l) => l.status)).toEqual(["verified", "doseRemoved"]);
    expect(view.therapy?.lines[0].text).toMatch(/^Parasetamol/);
    expect(view.therapy?.disposition).toBe("Tangani di FKTP · rutin");
    expect(view.discussion.facts.some((f) => f.includes("Keluhan fiktif untuk uji"))).toBe(true);
    expect(view.discussion.missing).toEqual(["Pemfis belum tersedia"]);
    expect(view.discussion.note).toBe("Catatan uji");
    expect(view.education).toEqual(educationLines(result, caseData));
    expect(view.education.length).toBeGreaterThan(2);
    expect(view.citations.map((c) => c.id)).toEqual(["P002-001", "P001-001", "P001-002"]);
    expect(view.focus).toBeUndefined();
  });
  it("puts the focus section first for workup, icd10 and refer", () => {
    for (const mode of ["workup", "icd10", "refer"] as const) expect(analysisView(aadiMessage(analysisFixture, undefined, mode))?.focus).toBe(mode);
    expect(analysisView(aadiMessage(analysisFixture, undefined, "question"))?.focus).toBeUndefined();
  });
  it("returns null for a local draft, a legacy nine-part answer, and an edited AADI answer", () => {
    expect(analysisView({ sourceText: undefined, content: "# x", mode: "clinic" })).toBeNull();
    const legacy = { sourceText: JSON.stringify({ kind: "AADI", traceId: "t" }), content: "# LAPORAN", mode: "ddx" as const };
    expect(analysisView(legacy)).toBeNull();
    const edited = { ...aadiMessage(analysisFixture), content: "# diedit" };
    expect(analysisView(edited)).toBeNull();
  });
  it("shows why therapy is withheld when the gate removed it", () => {
    const view = analysisView(aadiMessage({ ...analysisFixture, therapyGrounding: undefined, grounding: bundle([["P009-001", "Tidak menyebut obat apa pun"]]) }))!;
    expect(view.therapy?.lines).toEqual([]);
    expect(view.therapy?.removed).toMatch(/.+/);
  });
});

describe("analysisView therapy lines follow the gate report", () => {
  it("keeps a drug whose dose the gate removed on the list, without its dose, and marks a legacy answer unverified", () => {
    const stored = aadiMessage({ ...analysisFixture, therapyGrounding: bundle([["P001-001", "Nama keluaran uji: parasetamol 500 mg tiga kali sehari"]]), evidenceGate: { forDiagnosis: { icd10: "J00", label: "Nama keluaran uji" }, therapyRemoved: false, reason: "", drugs: [{ drug: "Parasetamol", dose: "3x500mg", status: "verified", evidenceIds: ["P001-001"] }, { drug: "Amoksisilin", dose: "3x500mg", status: "doseRemoved", evidenceIds: [] }] } });
    const lines = analysisView(stored)!.therapy!.lines;
    expect(lines.map((l) => l.status)).toEqual(["verified", "doseRemoved"]);
    expect(lines[1].text).toMatch(/^Amoksisilin/);
    expect(lines[1].text).not.toMatch(/500/);
  });
});
