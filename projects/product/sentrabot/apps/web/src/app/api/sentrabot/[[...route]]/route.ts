import { createApp } from "@safrs/api";
import { createSentraBotActorResolver } from "@safrs/auth";
import { auth } from "../../../../lib/auth.ts";

const api = createApp({
  getSentraBotActor: createSentraBotActorResolver(auth),
});

async function handler(request: Request) {
  const url = new URL(request.url);
  const normalizedPath = url.pathname.replace(/\/$/u, "");
  return api.fetch(
    new Request(`${url.origin}${normalizedPath}${url.search}`, request),
  );
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
