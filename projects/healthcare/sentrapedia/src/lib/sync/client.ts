import type { SyncPushResult, SyncedDocument } from "./contract";
import type { Encounter } from "../workspace";

// Browser side of /api/sync. Every call can fail and none of them may disturb the workspace: the browser copy
// is authoritative, so a failure is reported to the doctor and nothing local changes. The route answers 503
// SYNC_UNAVAILABLE where the instance has no database or SENTRAPEDIA_SYNC_MODE=off, which is the normal state
// of a local install rather than an error worth alarming anyone about.

export type SyncOutcome<T> = { ok: true; value: T } | { ok: false; reason: "unavailable" | "signed-out" | "failed" };

const timeoutMs = 15000;

async function call(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(path, { ...init, signal: controller.signal, cache: "no-store" }); }
  finally { clearTimeout(timer); }
}

function reasonFor(status: number): "unavailable" | "signed-out" | "failed" {
  if (status === 503) return "unavailable";
  if (status === 401 || status === 403) return "signed-out";
  return "failed";
}

export async function pullSyncedDocuments(): Promise<SyncOutcome<SyncedDocument[]>> {
  try {
    const response = await call("/api/sync");
    if (!response.ok) return { ok: false, reason: reasonFor(response.status) };
    const body = await response.json() as { documents?: unknown };
    return Array.isArray(body.documents) ? { ok: true, value: body.documents as SyncedDocument[] } : { ok: false, reason: "failed" };
  } catch { return { ok: false, reason: "failed" }; }
}

export async function pushEncountersToServer(encounters: Encounter[]): Promise<SyncOutcome<SyncPushResult>> {
  try {
    const response = await call("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ encounters }) });
    if (!response.ok) return { ok: false, reason: reasonFor(response.status) };
    const body = await response.json() as Partial<SyncPushResult>;
    return Array.isArray(body.saved) && Array.isArray(body.held) ? { ok: true, value: { saved: body.saved, held: body.held } } : { ok: false, reason: "failed" };
  } catch { return { ok: false, reason: "failed" }; }
}
