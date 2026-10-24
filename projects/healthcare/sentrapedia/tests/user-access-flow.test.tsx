import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createBetaAccess } from "../src/lib/auth/access";
import { resolveAuthConfig } from "../src/lib/auth/config";
import SignUpPage from "../src/app/sign-up/[[...sign-up]]/page";
import SignInPage from "../src/app/sign-in/[[...sign-in]]/page";
import Apply from "../src/app/apply/page";
import Onboarding from "../src/app/onboarding/page";

vi.mock("../src/lib/auth/server", () => ({ getAuthConfig: () => ({ mode: "clerk" }), getBetaAccess: () => ({ resolve: async () => ({ status: "allowed", userId: "user_new" }) }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@clerk/nextjs", () => ({
  Waitlist: () => <div data-waitlist/>,
  SignUp: (props: Record<string, string>) => <div data-sign-up={props.path} data-destination={props.forceRedirectUrl}/>,
  SignIn: (props: Record<string, string>) => <div data-sign-in={props.path} data-register={props.signUpUrl}/>,
}));

const config = resolveAuthConfig({ NODE_ENV: "test", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("auth.example.test$").toString("base64")}`, CLERK_SECRET_KEY: "sk_test_fixture_not_a_real_key" });
function access(metadata: Record<string, unknown> = {}, emailVerified = true, session: string | null = "user_new") {
  const writeConsent = vi.fn();
  return { writeConsent, auth: createBetaAccess({ config, session: async () => session, user: async id => ({ id, emailVerified, privateMetadata: metadata }), writeConsent }) };
}

describe("self-service user access", () => {
  it("admits a verified signed-in user without invitation or extra consent metadata", async () => {
    const { auth, writeConsent } = access();
    expect(await auth.resolve()).toEqual({ status: "allowed", userId: "user_new" });
    expect(writeConsent).not.toHaveBeenCalled();
  });
  it("retains suspension, verified email and session checks without granting an admin role", async () => {
    expect(await access({ sentrapediaBetaAccess: { disabled: true } }).auth.resolve()).toEqual({ status: "disabled" });
    expect(await access({}, false).auth.resolve()).toEqual({ status: "disabled" });
    expect(await access({}, true, null).auth.resolve()).toEqual({ status: "signed-out" });
    expect(await access({ publicMetadata: { role: "admin" } }).auth.resolve()).toEqual({ status: "allowed", userId: "user_new" });
  });
  it("renders registration without invitation instructions and sends completed signup to the workspace", () => {
    const html = renderToStaticMarkup(SignUpPage());
    expect(html).toContain("Daftar akun");
    expect(html).toContain('data-destination="/"');
    expect(html).not.toMatch(/Terima undangan|Ajukan akses|melalui undangan|mengajukan akses/);
  });
  it("links sign-in directly to registration", () => {
    const html = renderToStaticMarkup(SignInPage());
    expect(html).toContain('data-register="/sign-up"');
    expect(html).not.toContain("sudah diundang");
  });
  it("keeps old apply and onboarding links usable without another admission step", async () => {
    await expect(async () => Apply()).rejects.toThrow("redirect:/sign-up");
    await expect(async () => Onboarding()).rejects.toThrow("redirect:/");
  });
});
