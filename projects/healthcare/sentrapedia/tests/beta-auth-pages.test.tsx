import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/page";
import type { AccessResult } from "../src/lib/auth/policy";

const state = vi.hoisted(() => ({ access: { status: "signed-out" } as AccessResult }));
vi.mock("next/navigation", () => ({ redirect: (destination: string) => { throw new Error(`redirect:${destination}`); }, useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("../src/lib/auth/server", () => ({ getBetaAccess: () => ({ resolve: async () => state.access }), getAuthConfig: () => ({ mode: "unavailable" }) }));
beforeEach(() => { state.access = { status: "signed-out" }; });

describe("workspace server page", () => {
  it("redirects a signed-out visitor before constructing the workspace", async () => {
    await expect(Home()).rejects.toThrow("redirect:/sign-in");
  });
  it("passes a verified user directly to the workspace without onboarding", async () => {
    state.access = { status: "allowed", userId: "user_new" };
    const page = await Home();
    expect(page.props.userId).toBe("user_new");
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
