import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { resolveAuthConfig } from "./lib/auth/config";
import { accessFailure, boundedIdentity } from "./lib/auth/access";
import { contentSecurityPolicy, harden, nonce } from "./lib/auth/headers";

// Two requests carry no browser session by design and skip identity, never the headers: the readiness probe the launcher
// and the deploy script call, and Clerk's webhook, which authenticates by its own signature (src/app/api/webhooks/clerk).
const sessionFree = (request: NextRequest) => (request.method === "GET" && request.nextUrl.pathname === "/api/aadi") || (request.method === "POST" && request.nextUrl.pathname === "/api/webhooks/clerk");

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const config = resolveAuthConfig(process.env);
  const policy = contentSecurityPolicy(nonce(), { frontendApi: config.mode === "clerk" ? config.frontendApi : undefined, development: process.env.NODE_ENV !== "production" });
  // The policy travels on the request too: that is where Next reads the nonce for its script tags.
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  const next = () => NextResponse.next({ request: { headers } });
  if (sessionFree(request) || config.mode !== "clerk") return harden(next(), policy);
  const origin = config.publicOrigin ?? request.nextUrl.origin;
  // Keys use the SDK's server environment, not runtime dynamic-key options or client-supplied headers.
  try { return harden(await boundedIdentity(async () => clerkMiddleware(() => next(), { authorizedParties: [origin] })(request, event)) ?? next(), policy); }
  catch { return harden(accessFailure({ status: "unavailable" }), policy); }
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/api/(.*)"],
};
