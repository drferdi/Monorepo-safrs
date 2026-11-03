// Browser hardening for every response the proxy sees (tier 2 of the 2026-11-02 auth audit). The static headers are the
// same on every response; the Content-Security-Policy carries a per-request nonce. Next.js reads that nonce from the
// request's Content-Security-Policy header and puts it on its own script tags (node_modules/next/dist/docs/01-app/02-guides/
// content-security-policy.md), and 'strict-dynamic' then trusts the chunks those scripts load, and the clerk.browser.js
// that Clerk's provider loads from the Frontend API host. Nothing else inline runs.
export const securityHeaders: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  // Belt and braces with frame-ancestors below, for the clients that still read this header.
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  // Dictation is the browser's own speech recognition (src/components/use-dictation.ts), so the microphone stays
  // available to this origin alone; nothing here uses a camera, location, payment or USB.
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(self), payment=(), usb=()",
};

// Clerk's own hosts (clerk.com/docs/guides/secure/best-practices/csp-headers): its widgets fetch the Frontend API,
// show avatars from img.clerk.com, and run bot protection (Cloudflare Turnstile) in a frame.
const CLERK_IMAGES = "https://img.clerk.com";
const CLERK_PROTECTION = "https://*.protect.clerk.com";
const TURNSTILE = "https://challenges.cloudflare.com";

export function contentSecurityPolicy(nonce: string, options: { frontendApi?: string; development?: boolean } = {}): string {
  const clerk = options.frontendApi ? `https://${options.frontendApi}` : "";
  const directives = [
    "default-src 'self'",
    // React rebuilds server error stacks with eval in development only (the Next guide above).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    // Clerk's widgets and Next's streamed styles are inline; a style nonce would break both.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${CLERK_IMAGES}`,
    "font-src 'self'",
    // Next's development server talks over a websocket for hot reload.
    `connect-src 'self' ${clerk} ${CLERK_PROTECTION}${options.development ? " ws: wss:" : ""}`,
    `frame-src ${TURNSTILE} ${CLERK_PROTECTION}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.development ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.map(directive => directive.replace(/\s{2,}/g, " ").trim()).join("; ");
}

export function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// Sets the static headers and the policy on a response built elsewhere (a redirect, a JSON denial, a pass-through).
export function harden<T extends Response>(response: T, policy: string): T {
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}
