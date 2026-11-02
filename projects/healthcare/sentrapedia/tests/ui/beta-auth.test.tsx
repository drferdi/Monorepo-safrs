// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { ConsentForm } from "../../src/components/auth/consent-form";
import { PasskeyNudge } from "../../src/components/auth/passkey-nudge";
import { SessionBoundary, idleLimitMs } from "../../src/components/auth/session-boundary";

const external = vi.hoisted(() => ({ auth: { isLoaded: true, userId: "user_a" as string | null }, replace: vi.fn(), refresh: vi.fn(), signOut: vi.fn(), createPasskey: vi.fn(), user: null as null | { id: string; passkeys: unknown[]; createPasskey: () => Promise<unknown> } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: external.replace, refresh: external.refresh }) }));
vi.mock("@clerk/nextjs", async (original) => ({ ...await original<object>(), useAuth: () => external.auth, useClerk: () => ({ signOut: external.signOut }), useUser: () => ({ isLoaded: true, user: external.user }), UserButton: () => <span data-testid="user-button"/> }));
beforeEach(() => { external.auth = { isLoaded: true, userId: "user_a" }; external.replace.mockReset(); external.refresh.mockReset(); external.signOut.mockReset(); external.createPasskey.mockReset(); external.user = { id: "user_a", passkeys: [], createPasskey: external.createPasskey }; localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

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
    expect(JSON.parse(options.body as string)).toEqual({ version: "sentrapedia-beta-v2", accepted: true });
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
  it("offers Clerk's account page beside the explicit sign-out", () => {
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    expect(screen.getByTestId("user-button")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keluar" })).toBeTruthy();
  });
});

describe("idle lock", () => {
  it("signs out and locks after the idle limit with no activity, and says why", async () => {
    vi.useFakeTimers();
    external.signOut.mockResolvedValue(undefined);
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    await act(async () => { await vi.advanceTimersByTimeAsync(idleLimitMs - 60_000); });
    expect(external.signOut).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(external.signOut).toHaveBeenCalledWith({ redirectUrl: "/sign-in" });
    expect(screen.queryByText("Draf privat A")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("30 menit tanpa aktivitas");
  });
  it("counts any pointer, key, wheel or touch as activity and restarts the clock", async () => {
    vi.useFakeTimers();
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    for (const name of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      await act(async () => { await vi.advanceTimersByTimeAsync(idleLimitMs - 60_000); });
      fireEvent(window, new Event(name));
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(idleLimitMs - 60_000); });
    expect(external.signOut).not.toHaveBeenCalled();
    expect(screen.getByText("Draf privat A")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(external.signOut).toHaveBeenCalledTimes(1);
  });
  it("runs no idle clock while the workspace is not rendered", async () => {
    vi.useFakeTimers();
    external.auth = { isLoaded: true, userId: null };
    render(<SessionBoundary userId="user_a"><p>Draf privat A</p></SessionBoundary>);
    await act(async () => { await vi.advanceTimersByTimeAsync(idleLimitMs * 2); });
    expect(external.signOut).not.toHaveBeenCalled();
  });
});

describe("passkey nudge", () => {
  it("asks a doctor without a passkey to add one, and enrols through Clerk on this device", async () => {
    external.createPasskey.mockResolvedValue({ id: "pk_1" });
    render(<PasskeyNudge/>);
    fireEvent.click(await screen.findByRole("button", { name: "Daftarkan passkey" }));
    await waitFor(() => expect(external.createPasskey).toHaveBeenCalledTimes(1));
    expect((await screen.findByRole("status")).textContent).toContain("Passkey tersimpan");
  });
  it("says so when the device or the instance refuses, without leaking the provider's message", async () => {
    external.createPasskey.mockRejectedValue(new Error("passkeys_not_enabled: private detail"));
    render(<PasskeyNudge/>);
    fireEvent.click(await screen.findByRole("button", { name: "Daftarkan passkey" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("belum bisa didaftarkan");
    expect(alert.textContent).not.toContain("private detail");
    expect(screen.getByRole("button", { name: "Daftarkan passkey" })).toBeTruthy();
  });
  it("stays silent for a doctor who has a passkey or who said later in this browser", async () => {
    external.user = { id: "user_a", passkeys: [{ id: "pk_1" }], createPasskey: external.createPasskey };
    const withPasskey = render(<PasskeyNudge/>);
    await act(async () => undefined);
    expect(withPasskey.container.textContent).toBe("");
    withPasskey.unmount();
    external.user = { id: "user_a", passkeys: [], createPasskey: external.createPasskey };
    render(<PasskeyNudge/>);
    fireEvent.click(await screen.findByRole("button", { name: "Nanti saja" }));
    expect(screen.queryByRole("button", { name: "Daftarkan passkey" })).toBeNull();
    expect(localStorage.getItem("sentrapedia-passkey-nudge:user_a")).toBe("1");
    cleanup();
    render(<PasskeyNudge/>);
    await act(async () => undefined);
    expect(screen.queryByRole("button", { name: "Daftarkan passkey" })).toBeNull();
  });
});
