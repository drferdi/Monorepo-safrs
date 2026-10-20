// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";
import { MessageCard } from "../../src/components/message-card";
import { createDraft } from "../../src/lib/drafts";
import { readCaseFields } from "../../src/lib/aadi/composer";
import { storageKey, type Message, type ReviewStatus, type Workspace } from "../../src/lib/workspace";

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
const guide = () => within(screen.getByRole("group", { name: "Kelengkapan kasus" }));

describe("normal exam template in the composer", () => {
  it("names the template, offers Hamil for a P patient, and flags a typed value", async () => {
    render(<WorkspaceApp/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: pusing\nDemam 3 hari" } });
    expect(guide().getByText("Templat normal menunggu usia dan jenis kelamin")).toBeTruthy();
    expect(guide().queryByRole("button", { name: "Sisipkan Hamil" })).toBeNull();
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: pusing, perempuan 28 tahun, TD 150/100" } });
    expect(guide().getByText("Templat normal: Dewasa · P · 28 tahun")).toBeTruthy();
    expect(guide().getByText("TD 150/100 mmHg: ≥ 140/90 (PERHI 2021)")).toBeTruthy();
    // The template completes the exam, so it is not asked for; the two optional chips are not counted.
    expect(guide().getByText("Kelengkapan kasus: 5 dari 8")).toBeTruthy();
    expect(guide().queryByRole("button", { name: "Sisipkan Pemeriksaan fisik" })).toBeNull();
    fireEvent.click(guide().getByRole("button", { name: "Sisipkan Hamil" }));
    expect(textarea().value).toBe("Keluhan utama: pusing, perempuan 28 tahun, TD 150/100\n\nHamil: ");
    fireEvent.change(textarea(), { target: { value: `${textarea().value}32 minggu` } });
    expect(guide().getByText("Templat normal: Hamil 32 minggu · P · 28 tahun")).toBeTruthy();
    expect(guide().getByText("TD 150/100 mmHg: ≥ 140/90 pada kehamilan")).toBeTruthy();
    expect(guide().queryByRole("button", { name: "Sisipkan Hamil" })).toBeNull();
    expect(guide().getByText("Kelengkapan kasus: 5 dari 8")).toBeTruthy();
  });

  it("does not offer Hamil or Nifas for a girl under 10, and lists the typed exam lines in row O", async () => {
    render(<WorkspaceApp/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: demam, usia: 8 bulan, perempuan, RR 56\nParu: ronki (+/+)" } });
    expect(guide().getByText("Templat normal: Bayi · P · 8 bulan")).toBeTruthy();
    expect(guide().getByText("Napas 56 /menit: ≥ 50, napas cepat (MTBS)")).toBeTruthy();
    expect(guide().queryByRole("button", { name: "Sisipkan Hamil" })).toBeNull();
    fireEvent.click(guide().getByRole("button", { name: "Susunan SOAP" }));
    const region = within(screen.getByRole("region", { name: "Susunan SOAP" }));
    expect(region.getByText("Paru: ronki (+/+)", { selector: ".soap-entry" })).toBeTruthy();
    expect(region.getByText("Baris pemeriksaan lain dari templat normal Bayi · P · 8 bulan")).toBeTruthy();
  });

  it("makes a local SOAP draft whose exam is filled and marked, with the flag kept out of the record", async () => {
    render(<WorkspaceApp/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Dokumentasi" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: batuk 3 hari, laki-laki 40 tahun, TD 150/90\nParu: ronki (+/+)" } });
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    expect(await screen.findByText("Draf lokal", { selector: ".draft-badge" })).toBeTruthy();
    const draft = (JSON.parse(localStorage.getItem(storageKey)!) as Workspace).encounters[0].messages.find((message) => message.role === "assistant")!;
    expect(draft.content).toContain("Paru: ronki (+/+)\n");
    expect(draft.content).toContain("Tekanan darah: 150/90 mmHg\n");
    expect(draft.content).toContain("Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+) [otomatis normal]");
    expect(draft.content).not.toContain("PERHI");
    // The view names the template lines once, in the "Belum diisi" line style; the lines themselves read clean.
    expect(screen.getByText(/^Diisi templat normal:/, { selector: ".empty-sections" }).textContent).toMatch(/^Diisi templat normal: Keadaan umum, Kesadaran, Kepala, Mata, .*\. Tinjau sebelum Ditinjau\.$/);
    expect(screen.queryByRole("button", { name: "Lihat Paru di Pemeriksaan Fisik" })).toBeNull();
    expect(screen.getByText(/^Mata: Konjungtiva anemis/).textContent).not.toContain("otomatis");
  });
});

describe("the auto-normal marker on the draft card", () => {
  const content = createDraft({ mode: "clinic", prompt: "Keluhan utama: batuk, laki-laki 40 tahun", context: "", specialty: "Umum", model: "Standard", language: "Bahasa Indonesia", instructions: "", caseFields: readCaseFields("Keluhan utama: batuk, laki-laki 40 tahun") });
  const message = (reviewStatus: ReviewStatus): Message => ({ id: "m1", role: "assistant", mode: "clinic", content, originalContent: content, createdAt: "2026-10-21T05:00:00.000Z", reviewStatus, reviewItems: [{ id: "r1", label: "Tinjau", required: true, checked: true, target: "document" }] });
  async function card(status: ReviewStatus) {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<MessageCard message={message(status)} onEdit={vi.fn()} onToast={vi.fn()} onReuse={vi.fn()} onReview={vi.fn()} encounterId="e1" dispatch={vi.fn()}/>);
    return writeText;
  }

  it("names the template lines once while the draft is Draf, and copies the marker", async () => {
    const writeText = await card("draft");
    expect(screen.getByText(/^Mata: Konjungtiva anemis/).textContent).toBe("Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+)");
    expect(screen.getByRole("button", { name: "Lihat Mata di Pemeriksaan Fisik" })).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Salin$/ })); });
    expect(writeText.mock.calls[0][0]).toContain("[otomatis normal]");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salin Pemeriksaan fisik ke Pemeriksaan fisik P-Care" })); });
    expect(writeText.mock.calls[1][0]).toContain("[otomatis normal]");
  });

  it.each(["reviewed", "final"] as const)("hides it in the view, Salin and the P-Care copy once %s", async (status) => {
    const writeText = await card(status);
    expect(document.body.textContent).not.toContain("[otomatis normal]");
    expect(screen.queryByText(/^Diisi templat normal:/)).toBeNull();
    expect(screen.getByText(/^Mata: Konjungtiva anemis/).textContent).toBe("Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+)");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Salin$/ })); });
    expect(writeText.mock.calls[0][0]).not.toContain("[otomatis normal]");
    expect(writeText.mock.calls[0][0]).toContain("Mata: Konjungtiva anemis (-/-)");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salin Pemeriksaan fisik ke Pemeriksaan fisik P-Care" })); });
    expect(writeText.mock.calls[1][0]).not.toContain("[otomatis normal]");
  });

  it("keeps the marker in the stored text, so Edit shows it again", async () => {
    await card("final");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect((screen.getByLabelText("Edit draf Clinical") as HTMLTextAreaElement).value).toContain("[otomatis normal]");
  });
});
