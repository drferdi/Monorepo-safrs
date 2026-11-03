// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { workspaceStorageKeys } from "../../src/lib/workspace-storage";
const { storageKey, unreadableKey } = workspaceStorageKeys("user_test");
void storageKey; void unreadableKey;
import { WorkspaceApp } from "../../src/components/workspace";
import type { AadiAnalysis } from "../../src/lib/aadi/contract";
import type { CaseState } from "../../src/lib/aadi/types";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";

const analysis = (data: CaseState): AadiAnalysis => ({
  traceId: "trace-case-strip", createdAt: "2026-10-20T05:00:00.000Z", case: data,
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-20T05:00:00.000Z", reviewProvenance: "fixture" },
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

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

describe("analysis case strip", () => {
  it("fills from the typed text, keeps the doctor's own edit, and sends the values as structured data", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    const textarea = screen.getByLabelText("Pertanyaan atau catatan klinis");
    fireEvent.change(textarea, { target: { value: "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100" } });
    expect(field("Usia").value).toBe("45");
    expect(field("Jenis kelamin").value).toBe("M");
    expect(field("TD (mmHg)").value).toBe("170/100");
    expect(field("TD (mmHg)").closest(".case-field")?.hasAttribute("data-auto")).toBe(true);
    expect(field("Nadi").value).toBe("");

    fireEvent.change(field("TD (mmHg)"), { target: { value: "160/95" } });
    fireEvent.change(field("Nadi"), { target: { value: "98" } });
    fireEvent.change(textarea, { target: { value: "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 150/90, mual" } });
    expect(field("TD (mmHg)").value).toBe("160/95");
    expect(field("TD (mmHg)").closest(".case-field")?.hasAttribute("data-auto")).toBe(false);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    expect(sent).toHaveLength(1);
    expect(sent[0].demographics).toMatchObject({ ageYears: 45, sex: "M" });
    expect(sent[0].vitals).toEqual({ systolic: 160, diastolic: 95, heartRate: 98 });
    expect(sent[0].chiefComplaint).toContain("TD 150/90");

    // The answer is a case analysis whatever mode sent it, and the next case starts with an empty strip.
    expect(await screen.findByText("Analisis kasus", { selector: ".document-card strong" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Usia dan tanda vital" }));
    expect(field("TD (mmHg)").value).toBe("");
    expect(field("Nadi").value).toBe("");
    // The chat composer keeps the one chip row; the intent tabs and the mode picker are gone.
    expect(screen.getByRole("group", { name: "Mode" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Mode atau templat" })).toBeNull();

    // The working diagnosis copies from the pane's P-Care menu, and the chat carries no Lanjut row.
    fireEvent.click(screen.getByRole("button", { name: "Salin ke P-Care" }));
    expect(within(screen.getByRole("menu", { name: "Salin ke P-Care" })).getByRole("menuitem", { name: /^Salin G44\.2 — / })).toBeTruthy();
    expect(screen.queryByText("Lanjut:")).toBeNull();
    expect(sent).toHaveLength(1);
  });

  it("flags an unreadable value and shows a focused mode as a tag on the analysis", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    // ICD-10 is outside the chip shortlist: it comes from the / picker.
    fireEvent.change(screen.getByLabelText("Pertanyaan atau catatan klinis"), { target: { value: "/icd10" } });
    fireEvent.keyDown(screen.getByLabelText("Pertanyaan atau catatan klinis"), { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Pertanyaan atau catatan klinis"), { target: { value: "Laki-laki 45 tahun, nyeri kepala, N 88" } });
    // Values read from the text open the strip.
    expect(screen.getByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeTruthy();
    fireEvent.change(field("SpO₂"), { target: { value: "140" } });
    expect(field("SpO₂").getAttribute("aria-invalid")).toBe("true");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    // The readable pulse meets the minimum data; the unreadable SpO₂ is still not sent.
    expect(sent[0].vitals).toEqual({ heartRate: 88 });
    expect(await screen.findByText(/fokus: ICD-10/)).toBeTruthy();
  });

  it("shows no strip for a local document mode", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
    expect(screen.queryByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeNull();
  });
});
