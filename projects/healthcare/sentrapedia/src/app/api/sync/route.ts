import { getBetaAccess } from "../../../lib/auth/server";
import { accessFailure, errorResponse } from "../../../lib/auth/access";
import { syncPrincipal } from "../../../lib/sync/principal";
import { syncConfigured } from "../../../lib/sync/db";
import { pullEncounters, pushEncounters } from "../../../lib/sync/store";
import type { Encounter } from "../../../lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBodyBytes = 1_000_000;
const unavailable = () => errorResponse(503, "SYNC_UNAVAILABLE", "Sinkronisasi server belum aktif di instance ini.");
const badInput = () => errorResponse(400, "INPUT", "Data sinkronisasi tidak valid. Muat ulang halaman dan coba kembali.");

// The principal always comes from the verified session, never from the request body: a client-supplied id would
// become the database principal and defeat every policy. An instance without sync answers before any identity lookup.
async function principalOf(): Promise<{ ok: true; principal: string } | { ok: false; response: Response }> {
  if (!syncConfigured()) return { ok: false, response: unavailable() };
  const access = await getBetaAccess().resolve();
  if (access.status !== "allowed") return { ok: false, response: accessFailure(access) };
  const principal = syncPrincipal(access.userId);
  return principal ? { ok: true, principal } : { ok: false, response: unavailable() };
}

export async function GET() {
  const resolved = await principalOf();
  if (!resolved.ok) return resolved.response;
  try {
    return Response.json({ status: "ok", documents: await pullEncounters(resolved.principal) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Local state stays authoritative, so a failed pull is reported rather than raised.
    return unavailable();
  }
}

export async function POST(request: Request) {
  const resolved = await principalOf();
  if (!resolved.ok) return resolved.response;
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return badInput();
  let encounters: Encounter[];
  try {
    const text = await request.text();
    if (text.length > maxBodyBytes) return badInput();
    const parsed = JSON.parse(text) as { encounters?: unknown };
    if (!Array.isArray(parsed.encounters)) return badInput();
    encounters = parsed.encounters as Encounter[];
  } catch { return badInput(); }
  try {
    // held lists the documents the guard refused; they stay in the browser and are never rewritten to fit.
    const outcome = await pushEncounters(resolved.principal, encounters);
    return Response.json({ status: "ok", ...outcome }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}
