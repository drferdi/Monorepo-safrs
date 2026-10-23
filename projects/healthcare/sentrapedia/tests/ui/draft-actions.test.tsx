// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { workspaceStorageKeys } from "../../src/lib/workspace-storage";
const { storageKey, unreadableKey } = workspaceStorageKeys("user_test");
void storageKey; void unreadableKey;
import { WorkspaceApp } from "../../src/components/workspace";
import { missingField } from "../../src/lib/clinical-templates";
import { hasAadiSource } from "../../src/lib/aadi/presentation";
import { type Workspace } from "../../src/lib/workspace";
import type { AadiAnalysis } from "../../src/lib/aadi/contract";
import type { CaseState } from "../../src/lib/aadi/types";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";
import { theOracleDiseases } from "../../src/lib/theoracle";

// Oracle's name when the catalog has G44.2 exactly (the public sample catalog may not).
const g442 = theOracleDiseases.find(d => d.kode.trim().toUpperCase() === "G44.2")?.nama ?? "Tension-type headache";

const analysis = (data: CaseState): AadiAnalysis => ({
  traceId: "trace-draft-actions", createdAt: "2026-10-21T05:00:00.000Z", case: data,
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-21T05:00:00.000Z", reviewProvenance: "fixture" },
    queryDigest: "b".repeat(64),
    evidence: [{ evidenceId: "E1", text: "Nyeri kepala tipe tegang.", retrievalRank: 1, similarity: 0.8, source: { title: "nyeri-kepala.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) } }],
  },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "G44.2", label: "Tension-type headache", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0 } },
});

let sent: CaseState[] = [];
let failAnalysis = false;
const failure = "Layanan analisis sedang tidak tersedia.";

beforeEach(() => {
  sent = [];
  failAnalysis = false;
  localStorage.clear();
  // Reduced motion: the answer appears whole, so the test needs no timers.
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  // The analysis request never leaves the test: the fake server records the case, then fails or answers with a fixture.
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    const body = JSON.parse(String(init.body)) as { case: CaseState };
    sent.push(body.case);
    if (failAnalysis) return new Response(JSON.stringify({ error: { code: "UPSTREAM_UNAVAILABLE", message: failure } }), { status: 502, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(analysis(body.case)), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const complaint = "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100";
const textarea = () => screen.getByLabelText("Pertanyaan atau catatan klinis") as HTMLTextAreaElement;
async function failedAnalysis() {
  failAnalysis = true;
  render(<WorkspaceApp principalId="user_test"/>);
  await act(async () => { await Promise.resolve(); });
  fireEvent.change(textarea(), { target: { value: complaint } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
  await act(async () => { await Promise.resolve(); });
  return screen.findByRole("alert");
}
const savedDraft = () => (JSON.parse(localStorage.getItem(storageKey)!) as Workspace).encounters[0].messages.find((message) => message.role === "assistant")!;

describe("local draft when the analysis fails", () => {
  it("offers a local SOAP draft next to Coba lagi, keeps the typed text, and sends nothing more", async () => {
    const alert = await failedAnalysis();
    expect(alert.textContent).toContain(failure);
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeTruthy();
    expect(textarea().value).toBe(complaint);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Susun draf SOAP lokal" })); });
    expect(await screen.findByText("Draf lokal", { selector: ".draft-badge" })).toBeTruthy();
    expect(screen.getByText("Catatan Klinis (SOAP)", { selector: ".message-header strong" })).toBeTruthy();
    expect(screen.queryByText(failure)).toBeNull();
    expect(textarea().value).toBe("");
    expect(screen.queryByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeNull();
    expect(sent).toHaveLength(1);
    expect(screen.getByText(/^Draf SOAP lokal disusun tanpa analisis AADI\./, { selector: ".toast span" })).toBeTruthy();
  });

  it("records the failure in the draft's source and never a diagnosis", async () => {
    await failedAnalysis();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Susun draf SOAP lokal" })); });
    const draft = savedDraft();
    expect(draft.mode).toBe("clinic");
    expect(draft.sourceText).toContain(`Analisis AADI tidak tersedia\n${failure}`);
    expect(draft.content).toContain("- Assessment / Diagnosis\n");
    expect(draft.content).toContain("\n**Pasien:** Laki-laki, 45 tahun\n");
    expect(draft.content).not.toMatch(/\b[A-Z]\d{2}(\.\d)?\b/);
    expect(hasAadiSource(draft)).toBe(false);
  });

  it("withdraws both offers once the text is cleared", async () => {
    await failedAnalysis();
    fireEvent.change(textarea(), { target: { value: "" } });
    expect(screen.queryByRole("button", { name: "Coba lagi" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Susun draf SOAP lokal" })).toBeNull();
  });
});

describe("next steps and P-Care copies", () => {
  it("routes a next step into the composer in its mode, prefilled, and says what Enter will do", async () => {
    await failedAnalysis();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Susun draf SOAP lokal" })); });
    // The quick actions under the composer carry a near-identical "Pemeriksaan Penunjang".
    fireEvent.click(within(screen.getByRole("group", { name: "Langkah berikutnya" })).getByRole("button", { name: "Pemeriksaan penunjang" }));
    expect(screen.getByRole("combobox", { name: "Mode atau templat" }).textContent).toContain("Pemeriksaan Penunjang");
    expect(textarea().value).toBe(complaint);
    expect(screen.getByText("Mode Pemeriksaan Penunjang siap dengan teks kasus. Tekan Enter untuk menjalankan analisis AADI.", { selector: ".toast span" })).toBeTruthy();
    expect(sent).toHaveLength(1);
  });

  it("copies a P-Care field and warns on a candidate code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(textarea(), { target: { value: complaint } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    const row = within(await screen.findByRole("group", { name: "Salin ke P-Care" }));
    await act(async () => { fireEvent.click(row.getByRole("button", { name: `Salin G44.2 — ${g442} ke Diagnosa P-Care (kandidat, belum terkonfirmasi)` })); });
    expect(writeText).toHaveBeenLastCalledWith("G44.2");
    expect(screen.getByText("Kode kandidat G44.2 disalin. Konfirmasi diagnosis sebelum dientri.", { selector: ".toast span" })).toBeTruthy();
    await act(async () => { fireEvent.click(row.getByRole("button", { name: "Salin Keluhan ke Keluhan P-Care" })); });
    expect(writeText).toHaveBeenLastCalledWith(complaint);
    expect(sent).toHaveLength(1);
  });
});
