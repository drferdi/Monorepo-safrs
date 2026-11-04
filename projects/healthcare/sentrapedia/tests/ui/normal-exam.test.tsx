// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { workspaceStorageKeys } from "../../src/lib/workspace-storage";
const { storageKey, unreadableKey } = workspaceStorageKeys("user_test");
void storageKey; void unreadableKey;
import { WorkspaceApp } from "../../src/components/workspace";
import { createDraft } from "../../src/lib/drafts";
import { readCaseFields } from "../../src/lib/aadi/composer";
import { initialWorkspace, type Message, type ReviewStatus, type Workspace } from "../../src/lib/workspace";

// Fictional case. Nothing in this file reaches a server: the only fetch is the readiness check, answered locally.
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") throw new Error("no analysis call expected");
    return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const textarea = () => screen.getByLabelText("Pertanyaan atau catatan klinis") as HTMLTextAreaElement;

describe("normal exam template in the composer", () => {
  // The guide's template line, flags and the SOAP region are gone with the plain composer (Gaffer, 2026-11-04); the lib is tested in tests/normal-exam.test.ts.
  it("makes a local SOAP draft whose exam is filled and marked, with the flag kept out of the record", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: batuk 3 hari, laki-laki 40 tahun, TD 150/90\nParu: ronki (+/+)" } });
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    expect(await screen.findByText("Draf Catatan Klinis (SOAP) disusun.")).toBeTruthy();
    const draft = (JSON.parse(localStorage.getItem(storageKey)!) as Workspace).encounters[0].messages.find((message) => message.role === "assistant")!;
    expect(draft.content).toContain("| **Paru** | Ronki (+/+). |\n");
    expect(draft.content).toContain("| **Tekanan darah** | 150/90 mmHg |\n");
    expect(draft.content).toContain("## 1. Keluhan Utama\n\nBatuk sejak 3 hari.\n");
    expect(draft.content).toContain("| **Mata** | Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+). [otomatis normal] |");
    expect(draft.content).not.toContain("PERHI");
    // The note names the template rows itself (Kelengkapan Dokumentasi), so the view adds no line of its own; the cells read clean.
    expect(screen.getByText(/^Keadaan umum, kesadaran, kepala, mata, .*, dan kulit\.$/)).toBeTruthy();
    expect(screen.queryByText(/^Diisi templat normal:/)).toBeNull();
    expect(screen.getByText(/^Konjungtiva anemis/).textContent).not.toContain("otomatis");
  });
});

describe("the auto-normal marker on the pane document", () => {
  const content = createDraft({ mode: "clinic", prompt: "Keluhan utama: batuk, laki-laki 40 tahun", context: "", specialty: "Umum", model: "Standard", language: "Bahasa Indonesia", instructions: "", caseFields: readCaseFields("Keluhan utama: batuk, laki-laki 40 tahun") });
  const message = (reviewStatus: ReviewStatus): Message => ({ id: "m1", role: "assistant", mode: "clinic", content, originalContent: content, createdAt: "2026-10-21T05:00:00.000Z", reviewStatus, reviewItems: [{ id: "r1", label: "Tinjau", required: true, checked: true, target: "document" }] });
  async function card(status: ReviewStatus) {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    localStorage.setItem(storageKey, JSON.stringify({ ...initialWorkspace, encounters: [{ id: "e1", title: "Batuk", patientId: "demo-patient", messages: [message(status)], context: "", createdAt: message(status).createdAt }], activeEncounterId: "e1" }));
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    return writeText;
  }

  it("names the template lines once while the draft is Draf, and copies the marker", async () => {
    const writeText = await card("draft");
    expect(screen.getByText(/^Konjungtiva anemis/).textContent).toBe("Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+).");
    expect(screen.getByText(/^Catatan: Temuan yang berasal dari templat normal/)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Salin$/ })); });
    expect(writeText.mock.calls[0][0]).toContain("[otomatis normal]");
    fireEvent.click(screen.getByRole("button", { name: "Salin ke P-Care" }));
    await act(async () => { fireEvent.click(screen.getByRole("menuitem", { name: "Salin Pemeriksaan fisik ke Pemeriksaan fisik P-Care" })); });
    expect(writeText.mock.calls[1][0]).toContain("[otomatis normal]");
  });

  it.each(["reviewed", "final"] as const)("hides it in the view, Salin and the P-Care copy once %s", async (status) => {
    const writeText = await card(status);
    expect(document.body.textContent).not.toContain("[otomatis normal]");
    expect(screen.queryByText(/^Diisi templat normal:/)).toBeNull();
    expect(screen.getByText(/^Konjungtiva anemis/).textContent).toBe("Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+).");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Salin$/ })); });
    expect(writeText.mock.calls[0][0]).not.toContain("[otomatis normal]");
    expect(writeText.mock.calls[0][0]).toContain("| **Mata** | Konjungtiva anemis (-/-)");
    fireEvent.click(screen.getByRole("button", { name: "Salin ke P-Care" }));
    await act(async () => { fireEvent.click(screen.getByRole("menuitem", { name: "Salin Pemeriksaan fisik ke Pemeriksaan fisik P-Care" })); });
    expect(writeText.mock.calls[1][0]).not.toContain("[otomatis normal]");
  });

  it("keeps the marker in the stored text, so Edit shows it again", async () => {
    await card("final");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect((screen.getByLabelText("Isi dokumen") as HTMLTextAreaElement).value).toContain("[otomatis normal]");
  });
});
