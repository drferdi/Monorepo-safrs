// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { AnalysisDocument } from "../../src/components/analysis-document";
import { aadiMessage } from "../../src/lib/aadi/presentation";
import { emptyCase, type AadiAnalysis, type AadiResult } from "../../src/lib/aadi/contract";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";

afterEach(cleanup);
const result: AadiResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Nama keluaran uji", confidenceTier: "low" }], alternatives: [], cannotMiss: [{ icd10: "C92.0", label: "Kondisi di luar TheOracle", confidenceTier: "unknown" }] }, evidence: [{ icd10: "J00", supporting: ["Alasan dari layanan"], opposing: [] }], missingInformation: [], nextBestActions: [{ kind: "test", item: "Darah rutin", reason: "Konfirmasi" }], disposition: null, unfilled: [], meta: { version: "t", model: "t", costUsd: 0 }, therapy: { forDiagnosis: { icd10: "J00", label: "Nama keluaran uji" }, regimen: [{ drug: "Parasetamol", dose: "3x500mg", route: "PO", duration: "3 hari", note: "" }, { drug: "Amoksisilin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: [] } };
const passage = (id: string, text: string, rank: number) => ({ evidenceId: id, text, retrievalRank: rank, similarity: 0.71, source: { title: "PNPK uji.md", docSource: "Kemenkes knowledge base", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } });
const bundle = (ids: [string, string][]) => ({ version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle" as const, indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-10T12:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: ids.map(([id, text], index) => passage(id, text, index + 1)) });
const analysis: AadiAnalysis = { case: { ...emptyCase(), chiefComplaint: "Demam fiktif" }, result, traceId: "t", createdAt: "2026-10-09T00:00:00Z", grounding: bundle([["P002-001", "Common cold"]]), therapyGrounding: bundle([["P001-001", "Nama keluaran uji: parasetamol 500 mg tiga kali sehari"], ["P001-002", "Nama keluaran uji: amoksisilin bila indikasi"]]) };

describe("AnalysisDocument", () => {
  it("renders the sections in Glass's order with the gated therapy and the citations", () => {
    render(<AnalysisDocument message={aadiMessage(analysis)} citePrefix="c"/>);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Pembahasan kasus", "Kemungkinan utama", "Alternatif", "Jangan terlewat", "Langkah diagnostik berikutnya", "Rencana tata laksana", "Edukasi dan tindak lanjut", "Kutipan pedoman"]);
    const likely = screen.getByRole("region", { name: "Kemungkinan utama" });
    expect(within(likely).getByText("Nama keluaran uji").tagName).toBe("STRONG");
    expect(within(likely).getByText(/J00/)).toBeTruthy();
    expect(within(likely).getByText("Alasan dari layanan")).toBeTruthy();
    const therapy = screen.getByRole("region", { name: "Rencana tata laksana" });
    const lines = within(therapy).getAllByRole("listitem").filter((li) => li.hasAttribute("data-gate"));
    expect(lines.map((li) => li.getAttribute("data-gate"))).toEqual(["verified", "doseRemoved"]);
    expect(within(lines[1]).getByText("Cek dosis obat")).toBeTruthy();
    expect(within(lines[0]).queryByText("Cek dosis obat")).toBeNull();
    expect(screen.getByRole("region", { name: "Kutipan pedoman" })).toBeTruthy();
    expect(document.getElementById("c-1")).toBeTruthy();
  });
  it("puts the focus section first for a workup answer", () => {
    render(<AnalysisDocument message={aadiMessage(analysis, undefined, "workup")} citePrefix="c"/>);
    expect(screen.getAllByRole("heading", { level: 3 })[0].textContent).toBe("Pemeriksaan penunjang");
    expect(screen.getByText("Darah rutin")).toBeTruthy();
  });
});
