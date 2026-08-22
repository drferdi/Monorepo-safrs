import { checkSignup } from "@safrs/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { auth, authConfig } from "../../../../lib/auth.ts";

const handlers = toNextJsHandler(auth);

function normalize(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/u, "");
  return new Request(`${url.origin}${pathname}${url.search}`, request);
}

async function guardSignup(request: Request) {
  if (
    request.method !== "POST" ||
    !new URL(request.url).pathname
      .replace(/\/$/u, "")
      .endsWith("/sign-up/email") ||
    authConfig.signupPolicy.mode !== "allowlist"
  ) {
    return null;
  }
  const body = (await request.clone().json()) as { email?: string };
  const decision = checkSignup(authConfig, {
    email: body.email ?? "",
    emailVerified: false,
  });
  return decision.allowed
    ? null
    : Response.json({ error: decision.reason }, { status: 403 });
}

export const GET = (request: Request) => handlers.GET(normalize(request));
export const POST = async (request: Request) =>
  (await guardSignup(request)) ?? handlers.POST(normalize(request));
export const PATCH = (request: Request) => handlers.PATCH(normalize(request));
export const PUT = (request: Request) => handlers.PUT(normalize(request));
export const DELETE = (request: Request) => handlers.DELETE(normalize(request));
