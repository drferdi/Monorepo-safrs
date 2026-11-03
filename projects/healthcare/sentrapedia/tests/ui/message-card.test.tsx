// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MessageCard } from "../../src/components/message-card";
import { emptyCase, type AadiResult } from "../../src/lib/aadi/contract";
import { aadiMessage } from "../../src/lib/aadi/presentation";
import type { ModeId } from "../../src/lib/drafts";
import type { Message } from "../../src/lib/workspace";

afterEach(cleanup);

const a = (mode: ModeId, content: string): Message => ({ id: `m-${mode}`, role: "assistant", mode, content, createdAt: "2026-10-21T05:00:00.000Z" });
const user: Message = { id: "u1", role: "user", mode: "question", content: "Batuk 3 hari", createdAt: "2026-10-21T04:59:00.000Z" };
const handlers = () => ({ onEdit: vi.fn(), onToast: vi.fn(), onReuse: vi.fn(), onOpenDocument: vi.fn() });
const result: AadiResult = { contractVersion: "1", status: "ok", differential: { likely: [{ icd10: "J00", label: "Diagnosis sintetis", confidenceTier: "low" }], alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [{ kind: "exam", item: "Foto toraks", reason: "" }], disposition: null, unfilled: [], meta: { version: "test", model: "mock", costUsd: null } };

describe("MessageCard", () => {
  it("a question answer is prose with copy, print and download, and no Lanjut or P-Care rows", () => {
    render(<MessageCard message={a("question", "Jawaban.")} {...handlers()}/>);
    expect(screen.getByText("Jawaban.")).toBeTruthy();
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Salin", "Cetak", "Unduh"]);
    expect(screen.queryByText(/Lanjut:/)).toBeNull();
    expect(screen.queryByText(/P-Care/)).toBeNull();
    expect(document.querySelector(".message-header")).toBeNull();
  });

  it("copies, prints and downloads a question answer", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const h = handlers();
    render(<MessageCard message={a("question", "Jawaban.")} {...h}/>);
    fireEvent.click(screen.getByRole("button", { name: "Salin" }));
    await vi.waitFor(() => expect(h.onToast).toHaveBeenCalledWith("Jawaban disalin."));
    expect(writeText).toHaveBeenCalledWith("Jawaban.");
    fireEvent.click(screen.getByRole("button", { name: "Cetak" }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it("a document answer is one line plus a card that opens the pane", () => {
    const h = handlers();
    const message = a("clinic", "# Catatan Klinis\n\n## S\nx");
    render(<MessageCard message={message} {...h}/>);
    expect(screen.getByText("Draf Catatan Klinis (SOAP) disusun.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salin" })).toBeNull();
    const card = screen.getByRole("button", { name: /Catatan Klinis/ });
    expect(card.className).toContain("document-card");
    fireEvent.click(card);
    expect(h.onOpenDocument).toHaveBeenCalledWith(message.id);
  });

  it("an AADI answer is titled Analisis kasus, with no header, badge or focus tag", () => {
    const h = handlers();
    const message = { ...aadiMessage({ case: { ...emptyCase(), chiefComplaint: "Batuk" }, result, traceId: "t", createdAt: "2026-10-21T05:00:00.000Z" }), mode: "workup" as const };
    render(<MessageCard message={message} {...h}/>);
    fireEvent.click(screen.getByRole("button", { name: /Analisis kasus/ }));
    expect(h.onOpenDocument).toHaveBeenCalledWith(message.id);
    expect(document.querySelector(".message-header, .draft-badge, .focus-tag")).toBeNull();
  });

  it("a doctor turn keeps the reuse control", () => {
    const h = handlers();
    render(<MessageCard message={user} {...h}/>);
    fireEvent.click(screen.getByRole("button", { name: "Gunakan kembali prompt" }));
    expect(h.onReuse).toHaveBeenCalledWith("Batuk 3 hari");
  });
});
