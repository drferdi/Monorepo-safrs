import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/page";
import Onboarding from "../src/app/onboarding/page";
import type { AccessResult } from "../src/lib/auth/policy";

const state = vi.hoisted(() => ({ access: { status: "signed-out" } as AccessResult, asked: [] as unknown[] }));
vi.mock("next/navigation", () => ({ redirect: (destination: string) => { throw new Error(`redirect:${destination}`); }, useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("../src/lib/auth/server", () => ({ getBetaAccess: () => ({ resolve: async (requireConsent?: boolean) => { state.asked.push(requireConsent); return state.access; } }), getAuthConfig: () => ({ mode: "unavailable" }) }));
beforeEach(() => { state.access = { status: "signed-out" }; state.asked = []; });

describe("workspace server page", () => {
  it("redirects a signed-out visitor before constructing the workspace", async () => {
    await expect(Home()).rejects.toThrow("redirect:/sign-in");
  });
  it("passes a verified, consenting user to the workspace and asks with the consent gate on", async () => {
    state.access = { status: "allowed", userId: "user_new" };
    const page = await Home();
    expect(page.props.userId).toBe("user_new");
    expect(state.asked).toEqual([undefined]);
  });
  it("sends a user without the current acknowledgement to onboarding, never to the workspace", async () => {
    state.access = { status: "consent-required" };
    await expect(Home()).rejects.toThrow("redirect:/onboarding");
  });
  it("shows an access-denied page for a disabled identity, without workspace records", async () => {
    state.access = { status: "disabled" };
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Akses belum diizinkan");
    expect(html).not.toContain("app-shell");
  });
  it("shows a recoverable unavailable state rather than an anonymous workspace", async () => {
    state.access = { status: "unavailable" };
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("Layanan akses belum tersedia");
    expect(html).not.toContain("app-shell");
  });
  it("passes the admitted principal and a fresh render key to the client boundary", async () => {
    state.access = { status: "allowed", userId: "user_a" };
    const first = await Home(); const second = await Home();
    expect(first.props.userId).toBe("user_a");
    expect(first.key).not.toBeNull();
    expect(first.key).not.toBe(second.key);
  });
});

describe("onboarding server page", () => {
  it("shows the acknowledgement only to a signed-in user who still owes it", async () => {
    state.access = { status: "consent-required" };
    const html = renderToStaticMarkup(await Onboarding());
    expect(html).toContain("Sebelum membuka workspace");
    expect(html).toContain("Setuju dan buka workspace");
    expect(html).not.toContain("app-shell");
  });
  it("sends a visitor to sign-in and a consenting user to the workspace", async () => {
    await expect(Onboarding()).rejects.toThrow("redirect:/sign-in");
    state.access = { status: "allowed", userId: "user_a" };
    await expect(Onboarding()).rejects.toThrow("redirect:/");
  });
  it("shows the denial for a disabled or unavailable identity instead of the form", async () => {
    state.access = { status: "disabled" };
    expect(renderToStaticMarkup(await Onboarding())).toContain("Akses belum diizinkan");
    state.access = { status: "unavailable" };
    expect(renderToStaticMarkup(await Onboarding())).toContain("Layanan akses belum tersedia");
  });
});
