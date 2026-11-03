// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceApp } from "../../src/components/workspace";

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  Element.prototype.scrollIntoView = vi.fn();
  // Readiness answers at once; the analysis request itself never answers, so the workspace stays busy.
  global.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return new Response(JSON.stringify({ configured: true, modelReady: true, groundingReady: true, ready: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Promise<Response>(() => undefined);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("a mode picked while an analysis is running", () => {
  it("neither cancels the analysis nor drops the pending question (the / picker, like the chips)", async () => {
    render(<WorkspaceApp principalId="user_test"/>);
    await act(async () => { await Promise.resolve(); });
    const textarea = screen.getByLabelText("Pertanyaan atau catatan klinis");
    fireEvent.change(textarea, { target: { value: "Laki-laki 45 tahun, nyeri kepala, N 88" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Analisis kasus" })); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("button", { name: "Batalkan analisis" })).toBeTruthy();
    expect(screen.getByText("Laki-laki 45 tahun, nyeri kepala, N 88")).toBeTruthy();

    // The home composer is replaced by the chat composer once the question is pending: query it again.
    const chatBox = screen.getByLabelText("Pertanyaan atau catatan klinis");
    expect(chatBox).not.toBe(textarea);
    fireEvent.change(chatBox, { target: { value: "/clinic" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(chatBox, { key: "Enter" });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("button", { name: "Batalkan analisis" })).toBeTruthy();
    expect(screen.getByText("Laki-laki 45 tahun, nyeri kepala, N 88")).toBeTruthy();
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toHaveLength(1);
  });
});
