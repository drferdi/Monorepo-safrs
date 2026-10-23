import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { resolveAuthConfig } from "./lib/auth/config";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const config = resolveAuthConfig(process.env);
  // Public health probes must work without interactive login; mutations are guarded at the route.
  if ((request.method === "GET" && request.nextUrl.pathname === "/api/aadi") || config.mode !== "clerk") return NextResponse.next();
  const origin = config.publicOrigin ?? request.nextUrl.origin;
  // Keys use the SDK's server environment, not runtime dynamic-key options or client-supplied headers.
  return clerkMiddleware({ authorizedParties: [origin] })(request, event);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/api/(.*)"],
};
