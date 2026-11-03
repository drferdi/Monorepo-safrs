// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { workspaceStorageKeys } from "../../src/lib/workspace-storage";
const { storageKey, unreadableKey } = workspaceStorageKeys("user_test");
void storageKey; void unreadableKey;
import { WorkspaceApp } from "../../src/components/workspace";
import { initialWorkspace, type Encounter } from "../../src/lib/workspace";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";
import type { AadiAnalysis } from "../../src/lib/aadi/contract";
import { headlineFor } from "../../src/lib/studio";

vi.mock("next/image", () => ({
  default: ({ src, alt, unoptimized, ...rest }: { src: unknown; alt?: string; unoptimized?: boolean; [key: string]: unknown }) => {
    void unoptimized;
    const srcStr = typeof src === "string" ? src : ((src as { src?: string })?.src ?? "");
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={srcStr} alt={alt ?? ""} {...rest} />;
  },
}));

const fixtureAnalysis: AadiAnalysis = {
  traceId: "trace-smoke-test-123",
  createdAt: "2026-10-18T10:00:00.000Z",
  case: {
    demographics: { ageYears: 35, sex: "M" },
    chiefComplaint: "Batuk dan demam tinggi sejak 3 hari",
    anamnesis: {},
    vitals: {},
    physicalExam: [],
    results: [],
    currentMedications: [],
    knownConditions: [],
    allergies: [],
    facilityCapabilities: [],
  },
  result: {
    contractVersion: "1",
    status: "ok",
    differential: {
      likely: [{ icd10: "J18.9", label: "Pneumonia", confidenceTier: "high" }],
      alternatives: [],
      cannotMiss: [],
    },
    evidence: [],
    missingInformation: [],
    nextBestActions: [],
    disposition: null,
    unfilled: [],
    meta: { version: "1.0", model: "gemini-3.1-flash-lite", costUsd: 0.01 },
    therapy: {
      forDiagnosis: { icd10: "J18.9", label: "Pneumonia" },
      regimen: [
        { drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" },
        { drug: "Azitromisin", dose: "1x1000mg", route: "PO", duration: "3 hari", note: "" },
      ],
      interactions: [],
      contraindications: [],
    },
  },
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: {
      name: "TheOracle",
      indexSha256: "a".repeat(64),
      embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 },
      retrievedAt: "2026-10-18T10:00:00.000Z",
      reviewProvenance: "fixture",
    },
    queryDigest: "b".repeat(64),
    evidence: [
      {
        evidenceId: "E1",
        text: "Pneumonia: amoksisilin 500 mg 3 kali sehari.",
        retrievalRank: 1,
        similarity: 0.85,
        source: { title: "pneumonia-guideline.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) },
      },
    ],
  },
  therapyGrounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: {
      name: "TheOracle",
      indexSha256: "a".repeat(64),
      embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 },
      retrievedAt: "2026-10-18T10:00:00.000Z",
      reviewProvenance: "fixture",
    },
    queryDigest: "b".repeat(64),
    evidence: [
      {
        evidenceId: "E1",
        text: "Pneumonia: amoksisilin 500 mg 3 kali sehari.",
        retrievalRank: 1,
        similarity: 0.85,
        source: { title: "pneumonia-guideline.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) },
      },
    ],
  },
  evidenceGate: {
    forDiagnosis: { icd10: "J18.9", label: "Pneumonia" },
    therapyRemoved: false,
    reason: "Terapi diverifikasi parsial.",
    drugs: [
      { drug: "Amoxicillin", dose: "3x500mg", status: "verified", evidenceIds: ["E1"] },
      { drug: "Azitromisin", dose: "1x1000mg", status: "doseRemoved", evidenceIds: [] },
    ],
  },
};

describe("workspace UI smoke tests", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    Element.prototype.scrollIntoView = vi.fn();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });

    global.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
      if (url.includes("/api/aadi") && method === "GET") {
        return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/aadi") && method === "POST") {
        return new Response(JSON.stringify(fixtureAnalysis), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("submits an analysis case, applies therapy dose gate, and restores encounter on remount", async () => {
    const seedEncounter: Encounter = {
      id: "enc-smoke-1",
      title: "Encounter Uji Smoke",
      patientId: "demo-patient",
      messages: [],
      context: "Batuk pilek 3 hari",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const seed = {
      ...initialWorkspace,
      encounters: [seedEncounter],
      activeEncounterId: "enc-smoke-1",
    };
    localStorage.setItem(storageKey, JSON.stringify(seed));

    const { unmount } = render(<WorkspaceApp principalId="user_test"/>);

    // Flush initial workspace restoration from localStorage
    await act(async () => {
      await Promise.resolve();
    });

    const textarea = screen.getByLabelText("Pertanyaan atau catatan klinis");
    // Age, sex and a vital sign meet the minimum data an analysis needs.
    fireEvent.change(textarea, { target: { value: "Laki-laki 35 tahun, batuk dan demam tinggi sejak 3 hari, S 38,5" } });

    // Confirm fictional-data prompt if present
    const fictionalCheckbox = screen.queryByRole("checkbox", { name: /fiktif/i });
    if (fictionalCheckbox && !(fictionalCheckbox as HTMLInputElement).checked) {
      fireEvent.click(fictionalCheckbox);
    }

    // Submit via the form / send button
    const submitBtn = screen.getByRole("button", { name: /Analisis kasus/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Resolve fetch promise
    await act(async () => {
      await Promise.resolve();
    });

    // Advance fake timers to complete the line-by-line reveal animation
    await act(async () => {
      vi.advanceTimersByTime(12000);
    });

    // The answer is the analysis in Glass's shape in the document pane: the diagnosis tiers, next steps, the therapy
    // through the dose gate, and the guideline passages as numbered cards.
    expect(screen.getAllByText(/Pneumonia/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amoxicillin/i).length).toBeGreaterThan(0);
    const pane = within(screen.getByRole("tabpanel"));
    expect(screen.getByRole("tab", { name: /Analisis kasus/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("navigation", { name: "Bagian analisis kasus" })).toBeNull();
    expect(pane.getAllByRole("heading", { level: 3 }).map(h => h.textContent)).toEqual(["Pembahasan kasus", "Kemungkinan utama", "Alternatif", "Jangan terlewat", "Langkah diagnostik berikutnya", "Rencana tata laksana", "Edukasi dan tindak lanjut", "Kutipan pedoman"]);
    // The unsupported dose (1x1000mg) is not shown; its line is marked by the gate and carries the dose check.
    expect(screen.queryByText(/1x1000mg/i)).toBeNull();
    const gated = [...document.querySelectorAll<HTMLElement>(".analysis-regimen li[data-gate]")];
    expect(gated.length).toBeGreaterThan(0);
    expect(gated.some(li => li.dataset.gate !== "verified" && li.textContent?.includes("Cek dosis obat"))).toBe(true);
    expect(pane.getByRole("region", { name: "Kutipan pedoman" })).toBeTruthy();
    expect(pane.getByText(/Laki-laki 35 tahun, batuk dan demam tinggi sejak 3 hari, S 38,5/)).toBeTruthy();
    // One draft marker only: the Status field; no "Draf analisis" badge or subtitle.
    expect(screen.queryByText(/Draf analisis/)).toBeNull();
    expect(screen.queryByText(/\| --- \|/)).toBeNull();

    // Unmount and remount to verify persistence & restoration
    unmount();

    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });

    // Assert that encounter and draft are restored: the chat summary, and the pane on the same tab.
    expect(screen.getAllByText(/Pneumonia/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1x1000mg/i)).toBeNull();
    expect(document.querySelectorAll(".doctor-summary p")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /Analisis kasus/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows 'tidak dapat dibaca' notice for corrupt saved workspace and preserves raw text in backup", async () => {
    const corruptData = "{ corrupt invalid json content";
    localStorage.setItem(storageKey, corruptData);

    render(<WorkspaceApp principalId="user_test"/>);

    await act(async () => {
      await Promise.resolve();
    });

    // Assert that notice is displayed
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("tidak dapat dibaca");

    // Assert that raw text is kept under unreadableKey backup
    expect(localStorage.getItem(unreadableKey)).toBe(corruptData);
  });
  it("toggles focus mode button aria-pressed and label between Aktifkan and Keluar", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });

    const activateBtn = screen.getByRole("button", { name: "Aktifkan Focus Mode" });
    expect(activateBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(activateBtn);

    const exitBtn = screen.getByRole("button", { name: "Keluar Focus Mode" });
    expect(exitBtn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(exitBtn);

    const restoredBtn = screen.getByRole("button", { name: "Aktifkan Focus Mode" });
    expect(restoredBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("opens the command palette dialog from header button and removes it on close", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });

    const openCommandsBtn = screen.getByRole("button", { name: "Buka pusat perintah" });
    fireEvent.click(openCommandsBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Pusat perintah" })).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: "Tutup dialog" });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens command palette on Ctrl+J and ignores Ctrl+J while dialog is open", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("dialog")).toBeNull();

    // Ctrl+J opens the command palette
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Pusat perintah" })).toBeDefined();

    // While another dialog is open, Ctrl+J does not switch to the command palette
    fireEvent.click(screen.getByRole("button", { name: "Tutup dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Buat Pasien" }));
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });

    expect(screen.getAllByRole("dialog").length).toBe(1);
    expect(screen.queryByRole("heading", { name: "Pusat perintah" })).toBeNull();
  });

  it("links Pengaturan Agent to the /agent page from the sidebar and the account menu, with no settings dialog", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByLabelText("Pertanyaan atau catatan klinis")).toBeDefined();
    expect(screen.getByRole("link", { name: "Pengaturan Agent" }).getAttribute("href")).toBe("/agent");
    fireEvent.click(screen.getByRole("button", { name: /Sentrapedia/ }));
    expect(screen.getByRole("menuitem", { name: "Pengaturan Agent" }).getAttribute("href")).toBe("/agent");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a status toast when an action calls notify", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => {
      await Promise.resolve();
    });

    // Open create patient dialog through the UI
    const createPatientBtn = screen.getByRole("button", { name: "Buat Pasien" });
    fireEvent.click(createPatientBtn);

    const dialog = screen.getByRole("dialog");
    expect(screen.getByRole("heading", { name: "Buat Pasien" })).toBeDefined();

    // Fill in patient name
    const nameInput = screen.getByLabelText(/Nama Pasien/i);
    fireEvent.change(nameInput, { target: { value: "Pasien Uji Coba" } });

    // Submit patient form
    const submitBtn = within(dialog).getByRole("button", { name: "Buat Pasien" });
    fireEvent.click(submitBtn);

    // Assert that role="status" toast appears with notify text
    expect(screen.queryByRole("dialog")).toBeNull();
    const statusElements = screen.getAllByRole("status");
    const toast = statusElements.find((el) => el.textContent?.includes("Pasien dibuat. Encounter pertama siap digunakan."));
    expect(toast).toBeDefined();
    expect(toast?.getAttribute("role")).toBe("status");
  });

  it("the home shows a rotating headline, the Layanan primer pill, the composer and the chip row, with no tabs", async () => {
    render(<WorkspaceApp principalId="local-development"/>);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(headlineFor(0));
    expect(screen.getByText("Layanan primer")).toBeDefined();
    expect(screen.getByRole("group", { name: "Mode" })).toBeDefined();
    expect(screen.queryByRole("group", { name: "Tujuan kerja" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tentang workspace ini" })).toBeNull();
  });

  it("counts a visit per tab session and rotates the headline on the next one", async () => {
    render(<WorkspaceApp principalId="local-development"/>);
    await act(async () => { await Promise.resolve(); });
    expect(sessionStorage.getItem("sentrapedia-visit")).toBe("1");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(headlineFor(0));
    cleanup();
    render(<WorkspaceApp principalId="local-development"/>);
    await act(async () => { await Promise.resolve(); });
    expect(sessionStorage.getItem("sentrapedia-visit")).toBe("2");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(headlineFor(1));
  });
});
