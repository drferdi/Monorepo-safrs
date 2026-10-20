// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";
import { missingField } from "../../src/lib/clinical-templates";
import { storageKey, type Workspace } from "../../src/lib/workspace";
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

describe("guided SOAP view", () => {
  const soapToggle = () => screen.getByRole("button", { name: /susunan SOAP/i });
  const row = (label: string) => within(screen.getByRole("region", { name: "Susunan SOAP" })).getByText(label).nextElementSibling?.textContent;

  it("opens behind a toggle and shows S/O/A/P from the typed text with the placeholder in empty rows", async () => {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: demam 3 hari\nTanda vital: TD 120/80, N 88" } });
    expect(soapToggle().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: "Susunan SOAP" })).toBeNull();
    fireEvent.click(soapToggle());
    expect(soapToggle().getAttribute("aria-expanded")).toBe("true");
    expect(soapToggle().textContent).toBe("Sembunyikan susunan SOAP");
    expect(row("S — Subjektif")).toBe("demam 3 hari");
    expect(row("O — Objektif")).toBe("TD 120/80 mmHg · Nadi 88/mnt\nTD 120/80, N 88");
    expect(row("A — Asesmen")).toBe(missingField);
    expect(row("P — Rencana")).toBe(missingField);
    expect(screen.queryByRole("button", { name: "Gunakan mode Catatan Klinis (SOAP)" })).toBeNull();
    fireEvent.click(soapToggle());
    expect(screen.queryByRole("region", { name: "Susunan SOAP" })).toBeNull();
  });

  it("switches to the SOAP mode and Enter makes the local draft without any analysis call", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: demam 3 hari" } });
    fireEvent.click(soapToggle());
    fireEvent.click(screen.getByRole("button", { name: "Gunakan mode Catatan Klinis (SOAP)" }));
    expect(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }).getAttribute("aria-pressed")).toBe("true");
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    expect(await screen.findByText("Draf lokal", { selector: ".draft-badge" })).toBeTruthy();
    expect(screen.getByText("Catatan Klinis (SOAP)", { selector: ".message-header strong" })).toBeTruthy();
    expect(sent).toEqual([]);
    const saved = JSON.parse(localStorage.getItem(storageKey)!) as Workspace;
    const draft = saved.encounters[0].messages.find((message) => message.role === "assistant")!;
    expect(draft.content).toContain("## Keluhan Utama\ndemam 3 hari");
    expect(draft.content).toContain(`## Assessment\n${missingField}.`);
    expect(draft.content).not.toMatch(/\b[A-Z]\d{2}(\.\d)?\b/);
  });

  it("never shows a diagnosis, code or drug in the SOAP rows for free text", async () => {
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    const narrative = "Perempuan 30 tahun batuk berdahak 5 hari, demam, sesak bila berjalan";
    fireEvent.change(textarea(), { target: { value: narrative } });
    fireEvent.click(soapToggle());
    expect(row("S — Subjektif")).toBe(narrative);
    expect(row("A — Asesmen")).toBe(missingField);
    expect(row("P — Rencana")).toBe(missingField);
  });
});

describe("the checklist and minimum data before a case analysis", () => {
  const region = (name: string) => screen.queryByRole("region", { name });
  const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;
  const fever = "Demam tinggi dengan tanda sepsis, atau perburukan yang cepat";
  const shock = "Tanda syok atau tanda vital yang tidak stabil";

  it("asks at once in the default mode, names the missing minimum, and holds the analysis back until it is typed", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: "nyeri kepala" } });
    expect(within(guide()!).getByText("Data minimal sebelum analisis: Usia, Jenis kelamin, Tanda vital")).toBeTruthy();
    // The general red flags, the headache ones, and the report's headache questions.
    const list = within(region("Sebelum analisis: nyeri kepala")!);
    expect(list.getByText(shock)).toBeTruthy();
    expect(list.getByText("Nyeri mendadak yang mencapai intensitas maksimal dalam 1–5 menit (thunderclap headache)")).toBeTruthy();
    expect(list.getByText("Kapan mulai? Mendadak atau bertahap? Berapa lama hingga nyeri maksimal?", { exact: false })).toBeTruthy();
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    expect(sent).toHaveLength(0);
    expect(screen.getByRole("alert").textContent).toBe("Analisis belum dijalankan. Lengkapi data minimal: Usia, Jenis kelamin, Tanda vital.");
    fireEvent.change(textarea(), { target: { value: complaint } });
    expect(within(guide()!).getByText("Data minimal lengkap")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    await act(async () => { await Promise.resolve(); });
    expect(sent).toHaveLength(1);
  });

  it("writes Ada and Tidak ada into one line, leaves the rest unassessed, and sends that line", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: "demam 3 hari" } });
    fireEvent.click(box(`${fever}: ada`));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari\n\nTanda bahaya: ada demam tinggi dengan tanda sepsis, atau perburukan yang cepat");
    fireEvent.click(box(`${shock}: tidak ada`));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari\n\nTanda bahaya: tidak ada tanda syok atau tanda vital yang tidak stabil; ada demam tinggi dengan tanda sepsis, atau perburukan yang cepat");
    expect(box(`${fever}: ada`).checked).toBe(true);
    expect(box(`${fever}: tidak ada`).checked).toBe(false);
    expect(box("Penurunan kesadaran, kejang, atau defisit neurologis baru: ada").checked).toBe(false);
    // Choosing the other answer replaces it; choosing it again makes it unassessed.
    fireEvent.click(box(`${fever}: tidak ada`));
    expect(textarea().value).toContain("tidak ada demam tinggi");
    fireEvent.click(box(`${fever}: tidak ada`));
    fireEvent.click(box(`${shock}: tidak ada`));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari");
  });

  it("adds a ticked question under Anamnesis for the answer, and removes it when unticked", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: "demam 3 hari" } });
    fireEvent.click(box("Onset — Kapan mulai? Mendadak atau bertahap?"));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari\n\nAnamnesis:\nOnset — ");
    fireEvent.change(textarea(), { target: { value: `${textarea().value}mendadak, 3 hari lalu` } });
    fireEvent.click(box("Gejala penyerta — Demam, gejala sistemik, dan keluhan organ terkait"));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari\n\nAnamnesis:\nOnset — mendadak, 3 hari lalu\nGejala penyerta — ");
    expect(box("Onset — Kapan mulai? Mendadak atau bertahap?").checked).toBe(true);
    expect(item("Anamnesis")?.hasAttribute("data-filled")).toBe(true);
    fireEvent.click(box("Gejala penyerta — Demam, gejala sistemik, dan keluhan organ terkait"));
    expect(textarea().value).toBe("Keluhan utama: demam 3 hari\n\nAnamnesis:\nOnset — mendadak, 3 hari lalu");
  });

  it("hides the checklist behind a toggle and shows none outside the analysis and SOAP modes", async () => {
    await start();
    fireEvent.change(textarea(), { target: { value: "demam 3 hari" } });
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan daftar" }));
    expect(region("Sebelum analisis: keluhan")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tanda bahaya dan pertanyaan" }));
    expect(region("Sebelum analisis: keluhan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Komunikasi" }));
    expect(region("Sebelum analisis: keluhan")).toBeNull();
  });
});
