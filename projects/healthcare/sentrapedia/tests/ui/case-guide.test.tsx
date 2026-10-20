// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";
import type { AadiAnalysis } from "../../src/lib/aadi/contract";
import type { CaseState } from "../../src/lib/aadi/types";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";

const analysis = (data: CaseState): AadiAnalysis => ({
  traceId: "trace-case-guide", createdAt: "2026-10-21T05:00:00.000Z", case: data,
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-21T05:00:00.000Z", reviewProvenance: "fixture" },
    queryDigest: "b".repeat(64),
    evidence: [{ evidenceId: "E1", text: "Nyeri kepala tipe tegang.", retrievalRank: 1, similarity: 0.8, source: { title: "nyeri-kepala.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) } }],
  },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "G44.2", label: "Tension-type headache", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0 } },
});

let sent: CaseState[] = [];

beforeEach(() => {
  sent = [];
  localStorage.clear();
  // Reduced motion: the answer appears whole, so the test needs no timers.
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  // The analysis request never leaves the test: the fake server records the case and answers with a fixture.
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    const body = JSON.parse(String(init.body)) as { case: CaseState };
    sent.push(body.case);
    return new Response(JSON.stringify(analysis(body.case)), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const complaint = "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100";
const textarea = () => screen.getByLabelText("Pertanyaan atau catatan klinis") as HTMLTextAreaElement;
const guide = () => screen.queryByRole("group", { name: "Kelengkapan kasus" });
const item = (label: string) => within(guide()!).getByText(label).closest(".case-guide-item");
async function start() {
  render(<WorkspaceApp/>);
  await act(async () => { await Promise.resolve(); });
}

describe("case guide under the composer", () => {
  it("stays hidden until something is typed and outside the analysis and SOAP modes", async () => {
    await start();
    expect(guide()).toBeNull();
    fireEvent.change(textarea(), { target: { value: "demam 3 hari" } });
    expect(guide()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    expect(guide()).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Komunikasi" }));
    expect(guide()).toBeNull();
    expect(textarea().value).toBe("demam 3 hari");
  });

  it("shows missing items as chips, counts the strip's values and the saved patient as filled", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: complaint } });
    expect(within(guide()!).getByText("Kelengkapan kasus: 4 dari 6")).toBeTruthy();
    expect(within(guide()!).getAllByRole("img", { name: "terisi" })).toHaveLength(4);
    for (const label of ["Keluhan utama", "Usia", "Jenis kelamin", "Tanda vital"]) expect(item(label)?.hasAttribute("data-filled")).toBe(true);
    expect(screen.getByRole("button", { name: "Sisipkan Anamnesis" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sisipkan Pemeriksaan fisik" })).toBeTruthy();
  });

  it("inserts the section skeleton after the typed text, labelling the complaint once, and keeps what is typed", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: complaint } });
    fireEvent.click(screen.getByRole("button", { name: "Sisipkan Pemeriksaan fisik" }));
    expect(textarea().value).toBe(`Keluhan utama: ${complaint}\n\nPemeriksaan fisik: `);
    expect(item("Keluhan utama")?.hasAttribute("data-filled")).toBe(true);
    fireEvent.change(textarea(), { target: { value: `${textarea().value}ronki basah halus` } });
    expect(within(guide()!).getByText("Kelengkapan kasus: 5 dari 6")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sisipkan Pemeriksaan fisik" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sisipkan Anamnesis" }));
    expect(textarea().value).toBe(`Keluhan utama: ${complaint}\n\nPemeriksaan fisik: ronki basah halus\n\nAnamnesis: `);
  });

  it("keeps the case strip's own behaviour", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: complaint } });
    fireEvent.click(screen.getByRole("button", { name: "Sisipkan Anamnesis" }));
    const strip = screen.getByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" });
    const bp = within(strip).getByLabelText("TD (mmHg)") as HTMLInputElement;
    expect(bp.value).toBe("170/100");
    expect(bp.closest(".case-field")?.hasAttribute("data-auto")).toBe(true);
    expect(screen.getAllByRole("button", { name: "Analisis kasus" })).toHaveLength(1);
  });
});
