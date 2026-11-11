import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, harden, nonce, securityHeaders } from "../src/lib/auth/headers";
import { clerkProviderOptions } from "../src/lib/auth/clerk-ui";

const directive = (policy: string, name: string) => policy.split("; ").find(part => part.startsWith(`${name} `))?.slice(name.length + 1);

describe("content security policy", () => {
  it("trusts scripts by nonce and strict-dynamic only, never by inline or any https source", () => {
    const policy = contentSecurityPolicy("abc123", { frontendApi: "clerk.beta.example.test" });
    expect(directive(policy, "script-src")).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("upgrade-insecure-requests");
  });
  it("forbids framing, plugins, foreign form targets and foreign base URLs", () => {
    const policy = contentSecurityPolicy("n", {});
    expect(directive(policy, "frame-ancestors")).toBe("'none'");
    expect(directive(policy, "object-src")).toBe("'none'");
    expect(directive(policy, "form-action")).toBe("'self'");
    expect(directive(policy, "base-uri")).toBe("'self'");
  });
  it("names the Clerk Frontend API host from the key as the only foreign connect target", () => {
    const policy = contentSecurityPolicy("n", { frontendApi: "clerk.beta.example.test" });
    expect(directive(policy, "connect-src")).toBe("'self' https://clerk.beta.example.test https://*.protect.clerk.com");
    expect(directive(contentSecurityPolicy("n", {}), "connect-src")).toBe("'self' https://*.protect.clerk.com");
    expect(policy).not.toContain("telemetry");
  });
  it("relaxes only eval and websockets in development, and only there", () => {
    const policy = contentSecurityPolicy("n", { development: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toContain("ws: wss:");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
  it("makes a fresh unguessable nonce every time", () => {
    const first = nonce(); const second = nonce();
    expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(first).not.toBe(second);
  });
  it("hardens any response with the static headers and the policy", () => {
    const response = harden(Response.json({ ok: true }), "default-src 'self'");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'self'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(response.headers.get("permissions-policy")).toContain("microphone=(self)");
    expect(Object.keys(securityHeaders)).toContain("Referrer-Policy");
  });
});

describe("clerk widgets", () => {
  it("speak Indonesian and send no telemetry", () => {
    expect(clerkProviderOptions.localization.locale).toBe("id-ID");
    expect(clerkProviderOptions.telemetry.disabled).toBe(true);
  });
});
