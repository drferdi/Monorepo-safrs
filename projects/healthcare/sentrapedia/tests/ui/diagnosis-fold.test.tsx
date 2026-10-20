// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, within } from "@testing-library/react";
import { DiagnosisDocument } from "../../src/components/diagnosis-document";
import { DocumentContent } from "../../src/components/document-studio";
import { diagnosisReferenceMarker, theOracleCitations } from "../../src/lib/aadi/presentation";
import { THEORACLE_GROUNDING_CAPABILITY, type TheOracleGroundingBundle } from "../../src/lib/theoracle-grounding-types";

const grounding: TheOracleGroundingBundle = { version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "Gaffer stated session-level review provenance." }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "E1", text: "Pneumonia diterapi dengan amoksisilin.", retrievalRank: 1, similarity: 0.7, source: { title: "PNPK Pneumonia.md", docSource: "Kemenkes uji", origin: "oracle-ii-knowledge-base", textSha256: "c".repeat(64) } }] };
const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [{ drug: "Amoksisilin", dose: "3x500mg", status: "verified", evidenceIds: ["E1"] }] };
// The report's shape: part 9 last, its fold after the marker, the passages and dose check appended to it.
const report = `# Laporan\n\n## 1. Ringkasan kasus\n\nTeks satu.\n\n## 9. Referensi dan status verifikasi\n\nTeks sembilan.\n\n${diagnosisReferenceMarker}\n\nJejak analisis` + theOracleCitations(grounding, undefined, gate);
const show = (content: string) => render(<DiagnosisDocument content={content} selected={0} onSelect={() => undefined} onEdit={() => undefined} renderContent={(text, edit) => <DocumentContent content={text} onEdit={edit} clinical/>} typing/>);

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("guideline passages inside part 9's fold", () => {
  it("lists only the report parts, types only the text before the fold, and opens the fold with both sub-parts", async () => {
    const { container } = show(report);
    expect(within(container.querySelector("nav")!).getAllByRole("button").map(button => button.textContent)).toEqual(["1. Ringkasan kasus", "9. Referensi dan status verifikasi"]);
    expect(container.querySelector(".diagnosis-provenance")).toBeNull();
    // About 30 typed characters take under 100 ms; typing the passages too would take over a second.
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(container.querySelector(".diagnosis-document")!.getAttribute("aria-busy")).toBe("false");
    const fold = container.querySelector<HTMLElement>("details.diagnosis-provenance")!;
    expect(within(fold).getByRole("heading", { name: "Kutipan pedoman" })).toBeTruthy();
    expect(within(fold).getByRole("heading", { name: "Cek dosis obat" })).toBeTruthy();
    expect(fold.querySelector(".oracle-reference summary")!.textContent).toBe("PNPK Pneumonia");
    expect(fold.textContent).toContain("Amoksisilin: dosis terverifikasi (PNPK Pneumonia)");
    expect(fold.textContent).not.toMatch(/kemiripan|\[E1\]/);
  });
  it("still shows an edited older answer's passage part as compact titles, without typing it", async () => {
    const { container } = show("# Laporan\n\n## 1. Ringkasan kasus\n\nTeks satu.\n\n## Referensi TheOracle\n\nReferensi yang dipilih sebelum analisis:\n\n- PNPK Pneumonia.md [E1] · kemiripan 0.7\n  Pneumonia diterapi dengan amoksisilin.");
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(container.querySelector(".diagnosis-document")!.getAttribute("aria-busy")).toBe("false");
    expect(container.querySelector(".oracle-reference summary")!.textContent).toBe("PNPK Pneumonia");
  });
});
