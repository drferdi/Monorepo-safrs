// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { WorkspaceApp } from "../../src/components/workspace";
import { DocumentPane } from "../../src/components/document-pane";
import { workspaceStorageKeys } from "../../src/lib/workspace-storage";
import { initialWorkspace, type Encounter, type Message } from "../../src/lib/workspace";
import { aadiMessage, pcareCopies } from "../../src/lib/aadi/presentation";
import { compactQuery, mobileQuery } from "../../src/lib/layout";
import { emptyCase, type AadiAnalysis } from "../../src/lib/aadi/contract";
import type { CaseState } from "../../src/lib/aadi/types";
import { THEORACLE_GROUNDING_CAPABILITY } from "../../src/lib/theoracle-grounding-types";
import { theOracleDiseases } from "../../src/lib/theoracle";

const { storageKey } = workspaceStorageKeys("user_test");
const g442 = theOracleDiseases.find(d => d.kode.trim().toUpperCase() === "G44.2")?.nama ?? "Tension-type headache";
const analysis = (data: CaseState): AadiAnalysis => ({
  traceId: "trace-pane", createdAt: "2026-10-21T05:00:00.000Z", case: data,
  grounding: {
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-21T05:00:00.000Z", reviewProvenance: "fixture" },
    queryDigest: "b".repeat(64),
    evidence: [{ evidenceId: "E1", text: "Nyeri kepala tipe tegang.", retrievalRank: 1, similarity: 0.8, source: { title: "nyeri-kepala.md", docSource: "pnpk", origin: "theoracle", textSha256: "c".repeat(64) } }],
  },
  result: { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "G44.2", label: "Tension-type headache", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta: { version: "test", model: "test", costUsd: 0 } },
});

// The viewport: wide by default; a phone matches both the mobile and the compact query. Reduced motion shows answers whole.
const viewport = (phone: boolean) => Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce") || (phone && (query === mobileQuery || query === compactQuery)), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });

let sent: CaseState[] = [];
beforeEach(() => {
  sent = [];
  localStorage.clear();
  viewport(false);
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); });
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    const body = JSON.parse(String(init.body)) as { case: CaseState };
    sent.push(body.case);
    return new Response(JSON.stringify(analysis(body.case)), { status: 200, headers: { "Content-Type": "application/json" } });
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const textarea = () => screen.getByLabelText("Pertanyaan atau catatan klinis") as HTMLTextAreaElement;
const at = "2026-10-21T05:00:00.000Z";
const doc = (id: string, content: string, mode: Message["mode"] = "clinic"): Message => ({ id, role: "assistant", mode, content, originalContent: content, createdAt: at, reviewStatus: "draft" });
const encounterWith = (messages: Message[]): Encounter => ({ id: "enc-pane", title: "Encounter pane", patientId: "demo-patient", messages, context: "", createdAt: at, updatedAt: at });
// The pane with the unsaved drafts the workspace keeps for it.
function Pane(props: Omit<Parameters<typeof DocumentPane>[0], "drafts" | "onDraft">) {
  const [drafts, setDrafts] = useState(() => new Map<string, string>());
  return <DocumentPane {...props} drafts={drafts} onDraft={(id, text) => setDrafts((map) => { const next = new Map(map); if (text === null) next.delete(id); else next.set(id, text); return next; })}/>;
}
async function seeded(messages: Message[], encounters: Encounter[] = []) {
  localStorage.setItem(storageKey, JSON.stringify({ ...initialWorkspace, encounters: [encounterWith(messages), ...encounters], activeEncounterId: "enc-pane" }));
  render(<WorkspaceApp principalId="user_test"/>);
  await act(async () => { await Promise.resolve(); });
}

describe("the document pane", () => {
  it("opens the pane with the first document and keeps the chat for question answers only", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: batuk 3 hari, laki-laki 40 tahun, TD 150/90" } });
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    const tabs = within(await screen.findByRole("tablist", { name: "Dokumen encounter" })).getAllByRole("tab");
    expect(tabs.map(t => t.textContent)).toEqual(expect.arrayContaining([expect.stringMatching(/^Ringkasan encounter/), expect.stringMatching(/Catatan Klinis/)]));
    expect(tabs.find(t => /Catatan Klinis/.test(t.textContent ?? ""))!.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector(".workspace-body")!.getAttribute("data-split")).toBe("true");
    // The chat carries a card that opens the document, not the document itself.
    const chat = within(screen.getByLabelText("Percakapan Encounter"));
    expect(chat.getByRole("button", { name: /Catatan Klinis/i })).toBeTruthy();
    expect(chat.queryByRole("combobox", { name: "Status dokumen" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Status dokumen" })).toBeTruthy();
    // The overview tab shows Ringkasan encounter; the collapse control closes the pane.
    fireEvent.click(tabs[0]);
    expect(screen.getByRole("region", { name: "Daftar tugas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tutup panel dokumen" }));
    expect(screen.queryByRole("tablist", { name: "Dokumen encounter" })).toBeNull();
    expect(document.querySelector(".workspace-body")!.hasAttribute("data-split")).toBe(false);
    // The card in the chat reopens the pane on its document.
    fireEvent.click(chat.getByRole("button", { name: /Catatan Klinis/i }));
    expect(screen.getByRole("tab", { name: /Catatan Klinis/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Dokumen encounter/ }));
    expect(screen.queryByRole("tablist", { name: "Dokumen encounter" })).toBeNull();
  });

  it("copies a P-Care field of an analysis from the pane tools and warns on a candidate code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    const complaint = "Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100";
    fireEvent.change(textarea(), { target: { value: complaint } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(await screen.findByRole("button", { name: "Salin ke P-Care" }));
    const menu = within(screen.getByRole("menu", { name: "Salin ke P-Care" }));
    await act(async () => { fireEvent.click(menu.getByRole("menuitem", { name: `Salin G44.2 — ${g442} ke Diagnosa P-Care (kandidat, belum terkonfirmasi)` })); });
    expect(writeText).toHaveBeenLastCalledWith("G44.2");
    expect(screen.getByText("Kode kandidat G44.2 disalin. Konfirmasi diagnosis sebelum dientri.", { selector: ".toast span" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salin ke P-Care" }));
    await act(async () => { fireEvent.click(screen.getByRole("menuitem", { name: "Salin Keluhan ke Keluhan P-Care" })); });
    expect(writeText).toHaveBeenLastCalledWith(complaint);
    expect(sent).toHaveLength(1);
  });

  it("does not open the pane for an encounter holding only question answers, and Ekspor still carries them", async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return "blob:pane"; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await seeded([{ id: "q1", role: "user", mode: "question", content: "Apa itu ISPA?", createdAt: at }, { id: "q2", role: "assistant", mode: "question", content: "Jawaban tentang ISPA.", createdAt: at }]);
    expect(screen.getByText("Jawaban tentang ISPA.")).toBeTruthy();
    expect(screen.queryByRole("tablist", { name: "Dokumen encounter" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Dokumen encounter/ })).toBeNull();
    expect(document.querySelector(".workspace-body")!.hasAttribute("data-split")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Ekspor/ }));
    expect(await blobs[0].text()).toContain("Jawaban tentang ISPA.");
  });

  it("on a 375 px viewport the sheet opens from the header button, traps focus, closes on Escape and returns focus", async () => {
    viewport(true);
    await seeded([doc("d1", "# Catatan Klinis\n\n## 1. Keluhan Utama\n\nBatuk.")]);
    expect(screen.queryByRole("tablist", { name: "Dokumen encounter" })).toBeNull();
    const button = screen.getByRole("button", { name: /^Dokumen encounter/ });
    expect(button.getAttribute("aria-label")).toBe("Dokumen encounter, 1 dokumen");
    button.focus();
    fireEvent.click(button);
    const sheet = screen.getByRole("dialog");
    expect(sheet.classList.contains("document-sheet")).toBe(true);
    // showModal makes the rest of the page inert: focus stays in the sheet.
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(within(sheet).getByRole("tablist", { name: "Dokumen encounter" })).toBeTruthy();
    await act(async () => { fireEvent(sheet, new Event("cancel", { cancelable: true })); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Dokumen encounter/ }));
  });

  it("Lainnya +n appears from the third document and selects a tab", async () => {
    await seeded([doc("d1", "# Dokumen satu\n\nIsi satu."), doc("d2", "# Dokumen dua\n\nIsi dua.", "referral"), doc("d3", "# Dokumen tiga\n\nIsi tiga.", "education")]);
    const tablist = within(screen.getByRole("tablist", { name: "Dokumen encounter" }));
    // The newest document is open; two document tabs show, the rest sit in the menu.
    expect(tablist.getAllByRole("tab").map(t => t.querySelector("span")?.textContent)).toEqual(["Ringkasan encounter", "Catatan Klinis (SOAP)", "Edukasi Pasien"]);
    expect(tablist.getAllByRole("tab")[2].getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Lainnya +1" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Dokumen lainnya" })).getByRole("menuitem", { name: /Surat Rujukan/ }));
    expect(screen.queryByRole("menu", { name: "Dokumen lainnya" })).toBeNull();
    expect(screen.getByRole("tab", { name: /Surat Rujukan/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Dokumen dua" })).toBeTruthy();
    expect(screen.getByText("Isi dua.")).toBeTruthy();
  });

  it("editing with the toolbar wraps the selection and Simpan dispatches message.edit", () => {
    const dispatch = vi.fn();
    const message = doc("d1", "# Catatan\n\nabc def");
    render(<Pane encounter={encounterWith([message])} activeId="d1" onActive={vi.fn()} overview={null} tools={{ onCopy: vi.fn(), onDownload: vi.fn(), onPrint: vi.fn(), pcare: (m) => pcareCopies(m, m.content) }} onClose={vi.fn()} dispatch={dispatch} onToast={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const box = screen.getByLabelText("Isi dokumen") as HTMLTextAreaElement;
    box.setSelectionRange(15, 18);
    fireEvent.click(within(screen.getByRole("toolbar", { name: "Format teks" })).getByRole("button", { name: "Tebal" }));
    expect(box.value).toBe("# Catatan\n\nabc **def**");
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "message.edit", encounterId: "enc-pane", messageId: "d1", content: "# Catatan\n\nabc **def**" });
    expect(screen.queryByLabelText("Isi dokumen")).toBeNull();
  });

  it("keeps an unsaved edit across a tab switch and a collapse", async () => {
    await seeded([doc("d1", "# Dokumen satu\n\nIsi satu."), doc("d2", "# Dokumen dua\n\nIsi dua.", "referral")]);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Isi dokumen"), { target: { value: "Teks yang belum disimpan" } });
    fireEvent.click(screen.getByRole("tab", { name: /Catatan Klinis/ }));
    expect(screen.queryByLabelText("Isi dokumen")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Surat Rujukan/ }));
    expect((screen.getByLabelText("Isi dokumen") as HTMLTextAreaElement).value).toBe("Teks yang belum disimpan");
    fireEvent.click(screen.getByRole("button", { name: "Tutup panel dokumen" }));
    fireEvent.click(screen.getByRole("button", { name: /^Dokumen encounter/ }));
    expect((screen.getByLabelText("Isi dokumen") as HTMLTextAreaElement).value).toBe("Teks yang belum disimpan");
    // Batal drops the draft.
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    fireEvent.click(screen.getByRole("tab", { name: /Catatan Klinis/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Surat Rujukan/ }));
    expect(screen.queryByLabelText("Isi dokumen")).toBeNull();
  });

  it("a document arriving while the open one is edited gets its tab but not the pane", async () => {
    await seeded([doc("d1", "# Dokumen satu\n\nIsi satu.", "referral")]);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Isi dokumen"), { target: { value: "Sedang diedit" } });
    fireEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
    fireEvent.change(textarea(), { target: { value: "Keluhan utama: batuk 3 hari, laki-laki 40 tahun, TD 150/90" } });
    await act(async () => { fireEvent.keyDown(textarea(), { key: "Enter" }); });
    expect(await screen.findByRole("tab", { name: /Catatan Klinis/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Surat Rujukan/ }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText("Isi dokumen") as HTMLTextAreaElement).value).toBe("Sedang diedit");
  });

  it("Escape closes the Lainnya menu inside the sheet, keeps the sheet open and returns focus to the trigger", async () => {
    viewport(true);
    await seeded([doc("d1", "# Dokumen satu\n\nIsi satu."), doc("d2", "# Dokumen dua\n\nIsi dua.", "referral"), doc("d3", "# Dokumen tiga\n\nIsi tiga.", "education")]);
    fireEvent.click(screen.getByRole("button", { name: /^Dokumen encounter/ }));
    const trigger = screen.getByRole("button", { name: "Lainnya +1" });
    fireEvent.click(trigger);
    const item = within(screen.getByRole("menu", { name: "Dokumen lainnya" })).getByRole("menuitem");
    expect(document.activeElement).toBe(item);
    fireEvent.keyDown(item, { key: "ArrowDown" });
    expect(document.activeElement).toBe(item);
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => { item.dispatchEvent(escape); });
    expect(escape.defaultPrevented).toBe(true);
    expect(screen.queryByRole("menu", { name: "Dokumen lainnya" })).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement).toBe(trigger);
  });

  it("remembers each encounter's open document across a switch to another encounter", async () => {
    const other: Encounter = { ...encounterWith([doc("b1", "# Lain\n\nIsi lain.", "education")]), id: "enc-other", title: "Encounter lain" };
    await seeded([doc("d1", "# Dokumen satu\n\nIsi satu."), doc("d2", "# Dokumen dua\n\nIsi dua.", "referral")], [other]);
    fireEvent.click(screen.getByRole("tab", { name: /Catatan Klinis/ }));
    fireEvent.click(screen.getByTitle("Encounter lain").closest("button")!);
    expect(screen.getByRole("tab", { name: /Edukasi Pasien/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByTitle("Encounter pane").closest("button")!);
    expect(screen.getByRole("tab", { name: /Catatan Klinis/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("Buat in Ringkasan encounter keeps what the doctor was typing in the composer", async () => {
    const base = analysis({ ...emptyCase(), chiefComplaint: "Batuk" });
    await seeded([aadiMessage({ ...base, result: { ...base.result, nextBestActions: [{ kind: "exam", item: "Foto toraks", reason: "" }] } })]);
    fireEvent.click(screen.getByRole("tab", { name: /^Ringkasan encounter/ }));
    fireEvent.change(textarea(), { target: { value: "Pertanyaan yang sedang diketik" } });
    fireEvent.click(within(screen.getByRole("region", { name: "Daftar tugas" })).getByRole("button", { name: "Buat" }));
    expect(await screen.findByRole("tab", { name: /Daftar Tugas/i })).toBeTruthy();
    expect(textarea().value).toBe("Pertanyaan yang sedang diketik");
  });
});
