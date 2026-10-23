// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { ConsentForm } from "../../src/components/auth/consent-form";
import { SessionBoundary } from "../../src/components/auth/session-boundary";

const external = vi.hoisted(() => ({ auth: { isLoaded: true, userId: "user_a" as string | null }, replace: vi.fn(), refresh: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: external.replace, refresh: external.refresh }) }));
vi.mock("@clerk/nextjs", async (original) => ({ ...await original<object>(), useAuth: () => external.auth, useClerk: () => ({ signOut: external.signOut }) }));
beforeEach(() => { external.auth = { isLoaded: true, userId: "user_a" }; external.replace.mockReset(); external.refresh.mockReset(); external.signOut.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("beta acknowledgement", () => {
  it("does not send unchecked acceptance, even when native form validation is bypassed", () => {
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    render(<ConsentForm/>);
    const check = screen.getByRole("checkbox") as HTMLInputElement;
    expect(check.checked).toBe(false);
    fireEvent.submit(check.closest("form")!);
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Setuju dan buka workspace" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("link", { name: "Ketentuan beta" }).getAttribute("href")).toBe("https://sentrapedia.vercel.app/ketentuan/");
  });
  it("submits only explicit policy acceptance and navigates to the fixed workspace destination", async () => {
    const send = vi.fn(async () => Response.json({ status: "ok" })); vi.stubGlobal("fetch", send);
    render(<ConsentForm/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Setuju dan buka workspace" }));
    await waitFor(() => expect(external.replace).toHaveBeenCalledWith("/"));
    const [url, options] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/onboarding/consent");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({ version: "sentrapedia-beta-v1", accepted: true, syntheticOnly: true });
    expect(external.replace).toHaveBeenCalledTimes(1);
  });
  it("shows pending and generic failure states, keeping the acknowledgement available for retry", async () => {
    let finish: (response: Response) => void = () => undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    render(<ConsentForm/>);
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Setuju dan buka workspace" }));
    expect(screen.getByRole("status").textContent).toContain("Menyimpan");
    await act(async () => finish(Response.json({ error: { message: "private provider details" } }, { status: 503 })));
    expect(screen.getByRole("alert").textContent).toContain("Coba kembali");
    expect(screen.getByRole("alert").textContent).not.toContain("private provider details");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Setuju dan buka workspace" }).hasAttribute("disabled")).toBe(false);
    expect(external.replace).not.toHaveBeenCalled();
  });
  it("offers sign-in after a session expires during consent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: 401 })));
    render(<ConsentForm/>);
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Setuju dan buka workspace" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("link", { name: "Masuk kembali" }).getAttribute("href")).toBe("/sign-in");
    expect(external.replace).not.toHaveBeenCalled();
  });
});

describe("session-owned workspace rendering", () => {
  it("never mounts workspace records before the expected user is loaded", () => {
    external.auth = { isLoaded: false, userId: null };
    const view = render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    expect(screen.queryByText("Draf privat A")).toBeNull();
    external.auth = { isLoaded: true, userId: "user_b" };
    view.rerender(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    expect(screen.queryByText("Draf privat A")).toBeNull();
  });
  it("unmounts records and their outstanding work on sign-out or account switch", () => {
    const aborted = new AbortController();
    function Draft() { useEffect(() => () => aborted.abort(), []); return <p>Draf privat A</p>; }
    const view = render(<SessionBoundary userId="user_a"><Draft/></SessionBoundary>);
    expect(screen.getByText("Draf privat A")).toBeTruthy();
    external.auth = { isLoaded: true, userId: null };
    view.rerender(<SessionBoundary userId="user_a"><Draft/></SessionBoundary>);
    expect(screen.queryByText("Draf privat A")).toBeNull();
    expect(aborted.signal.aborted).toBe(true);
  });
  it("hides cached records on pagehide and requires a server refresh on pageshow", () => {
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    fireEvent(window, new Event("pagehide"));
    expect(screen.queryByText("Draf privat A")).toBeNull();
    fireEvent(window, new Event("pageshow"));
    expect(external.refresh).toHaveBeenCalled();
    expect(screen.queryByText("Draf privat A")).toBeNull();
  });
  it("locks the workspace before requesting sign-out, including a failed request", async () => {
    external.signOut.mockRejectedValue(new Error("offline"));
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
    await waitFor(() => expect(external.signOut).toHaveBeenCalled());
    expect(screen.queryByText("Draf privat A")).toBeNull();
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
