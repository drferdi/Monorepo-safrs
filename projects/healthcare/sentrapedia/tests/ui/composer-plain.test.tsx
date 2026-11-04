// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";
import type { AadiAnalysis } from "../../src/lib/aadi/contract";
import type { CaseState } from "../../src/lib/aadi/types";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";

const analysis = (data: CaseState): AadiAnalysis => ({
  traceId: "trace-composer-plain", createdAt: "2026-11-04T05:00:00.000Z", case: data,
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-11-04T05:00:00.000Z", reviewProvenance: "fixture" },
    queryDigest: "b".repeat(64),
    evidence: [{ evidenceId: "E1", text: "Nyeri kepala tipe tegang.", retrievalRank: 1, similarity: 0.8, source: { title: "nyeri-kepala.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) } }],
  },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "G44.2", label: "Tension-type headache", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0 } },
});

let sent: CaseState[] = [];

beforeEach(() => {
  sent = [];
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    const body = JSON.parse(String(init.body)) as { case: CaseState };
    sent.push(body.case);
    return new Response(JSON.stringify(analysis(body.case)), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const box = () => screen.getByLabelText("Pertanyaan atau catatan klinis");
// Glass's composer is one text box: no field strip, no guide, no checklist under it (Gaffer, 2026-11-04).
const expectPlainComposer = () => {
  expect(screen.queryByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Usia dan tanda vital" })).toBeNull();
  expect(screen.queryByText(/Kelengkapan kasus/)).toBeNull();
  expect(screen.queryByText("Tanda bahaya")).toBeNull();
  expect(screen.queryByText("Pertanyaan penting")).toBeNull();
  expect(screen.queryByRole("button", { name: /Susunan SOAP/ })).toBeNull();
};

describe("the plain composer", () => {
  it("reads age, sex and vitals from the text alone and sends them as structured data", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    expectPlainComposer();
    fireEvent.change(box(), { target: { value: "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100, N 98" } });
    expectPlainComposer();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    expect(sent).toHaveLength(1);
    expect(sent[0].demographics).toMatchObject({ ageYears: 45, sex: "M" });
    expect(sent[0].vitals).toEqual({ systolic: 170, diastolic: 100, heartRate: 98 });
    expect(await screen.findByText("Analisis kasus", { selector: ".document-card strong" })).toBeTruthy();
    expectPlainComposer();
    expect(screen.getByRole("group", { name: "Mode" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salin ke P-Care" }));
    expect(within(screen.getByRole("menu", { name: "Salin ke P-Care" })).getByRole("menuitem", { name: /^Salin G44\.2 — / })).toBeTruthy();
  });

  it("names the missing minimum data under the box and sends nothing", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(box(), { target: { value: "Nyeri kepala hebat sejak 2 jam" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    expect(screen.getByRole("alert").textContent).toMatch(/Lengkapi data minimal: Usia, Jenis kelamin, Tanda vital/);
    expect(sent).toHaveLength(0);
    expectPlainComposer();
  });

  it("puts the focused section first for a mode from the / picker", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.change(box(), { target: { value: "/icd10" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.change(box(), { target: { value: "Laki-laki 45 tahun, nyeri kepala, N 88" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    expect(sent[0].vitals).toEqual({ heartRate: 88 });
    expect((await screen.findAllByRole("heading", { level: 3 }))[0].textContent).toBe("Kode ICD-10");
  });
});
