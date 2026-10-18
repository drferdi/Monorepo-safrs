// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";
import { initialWorkspace, storageKey, unreadableKey, type Encounter } from "../../src/lib/workspace";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";
import type { MiraAnalysis } from "../../src/lib/mira/contract";

vi.mock("next/image", () => ({
  default: ({ src, alt, unoptimized, ...rest }: { src: unknown; alt?: string; unoptimized?: boolean; [key: string]: unknown }) => {
    void unoptimized;
    const srcStr = typeof src === "string" ? src : ((src as { src?: string })?.src ?? "");
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={srcStr} alt={alt ?? ""} {...rest} />;
  },
}));

const fixtureAnalysis: MiraAnalysis = {
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
      if (url.includes("/api/mira") && method === "GET") {
        return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/mira") && method === "POST") {
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

    const { unmount } = render(<WorkspaceApp />);

    // Flush initial workspace restoration from localStorage
    await act(async () => {
      await Promise.resolve();
    });

    const textarea = screen.getByLabelText("Pertanyaan atau catatan klinis");
    fireEvent.change(textarea, { target: { value: "Batuk dan demam tinggi sejak 3 hari" } });

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

    // Assert that the draft appears and diagnosis is shown
    expect(screen.getAllByText(/Pneumonia/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amoxicillin/i).length).toBeGreaterThan(0);

    // Assert that the unsupported dose (1x1000mg) is NOT shown
    expect(screen.queryByText(/1x1000mg/i)).toBeNull();

    // Assert that unverified dose wording or status appears
    expect(screen.getAllByText(/dosis: cek pedoman|dosis tidak ditemukan di TheOracle/i).length).toBeGreaterThan(0);

    // Unmount and remount to verify persistence & restoration
    unmount();

    render(<WorkspaceApp />);
    await act(async () => {
      await Promise.resolve();
    });

    // Assert that encounter and draft are restored
    expect(screen.getAllByText(/Pneumonia/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1x1000mg/i)).toBeNull();
  });

  it("shows 'tidak dapat dibaca' notice for corrupt saved workspace and preserves raw text in backup", async () => {
    const corruptData = "{ corrupt invalid json content";
    localStorage.setItem(storageKey, corruptData);

    render(<WorkspaceApp />);

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
    render(<WorkspaceApp />);
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
    render(<WorkspaceApp />);
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
    render(<WorkspaceApp />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByRole("dialog")).toBeNull();

    // Ctrl+J opens the command palette
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Pusat perintah" })).toBeDefined();

    // While dialog is open, pressing Ctrl+J again does nothing new
    fireEvent.keyDown(window, { key: "j", ctrlKey: true });

    expect(screen.getAllByRole("dialog").length).toBe(1);
    expect(screen.getByRole("heading", { name: "Pusat perintah" })).toBeDefined();
  });

  it("completes a dialog round trip for Settings and keeps the composer intact", async () => {
    render(<WorkspaceApp />);
    await act(async () => {
      await Promise.resolve();
    });

    // Composer textarea is present initially
    expect(screen.getByLabelText("Pertanyaan atau catatan klinis")).toBeDefined();

    // Open settings dialog through the UI
    const settingsBtn = screen.getByRole("button", { name: "Pengaturan Agent" });
    fireEvent.click(settingsBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Sesuaikan workspace" })).toBeDefined();

    // Close the dialog
    const closeBtn = screen.getByRole("button", { name: "Tutup dialog" });
    fireEvent.click(closeBtn);

    // Assert dialog is gone and composer is still there
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Pertanyaan atau catatan klinis")).toBeDefined();
  });

  it("shows a status toast when an action calls notify", async () => {
    render(<WorkspaceApp />);
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
});
