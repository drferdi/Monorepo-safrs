// The backend verifier takes a plain Request; the nextjs re-export wants a NextRequest, which a route handler has no need of.
import { verifyWebhook } from "@clerk/backend/webhooks";
import { errorResponse } from "../../../../lib/auth/access";
import { validUserId } from "../../../../lib/auth/policy";
import { syncConfigured } from "../../../../lib/sync/db";
import { purgePrincipal } from "../../../../lib/sync/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Clerk's payloads are a few kilobytes; anything larger is not Clerk.
const maxBodyBytes = 65_536;
const ok = (body: Record<string, unknown>) => Response.json({ status: "ok", ...body }, { headers: { "Cache-Control": "no-store" } });

// Clerk reports a closed account here (user.deleted), and the rows that account owned in Neon go with it: the erasure a
// doctor is owed under UU PDP must not stop at the identity provider (tier 2 of the 2026-11-02 auth audit). The request
// is authenticated by its Standard Webhooks signature, checked by Clerk's own verifier against
// CLERK_WEBHOOK_SIGNING_SECRET; the proxy sends this path straight here because no browser session exists for it.
// A non-2xx answer makes Clerk retry, which is what a failed purge wants.
export async function POST(request: Request) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return errorResponse(503, "WEBHOOK_UNAVAILABLE", "Webhook belum dikonfigurasi di instance ini.");
  if (Number(request.headers.get("content-length")) > maxBodyBytes) return errorResponse(413, "INPUT", "Payload webhook terlalu besar.");
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try { event = await verifyWebhook(request); } catch { return errorResponse(400, "SIGNATURE", "Tanda tangan webhook tidak valid."); }
  if (event.type !== "user.deleted") return ok({ handled: false });
  const id = event.data.id;
  if (typeof id !== "string" || !validUserId(id)) return errorResponse(400, "INPUT", "Identitas pengguna tidak valid.");
  if (!syncConfigured()) return ok({ handled: true, purged: 0 });
  try { return ok({ handled: true, purged: await purgePrincipal(id) }); }
  catch { return errorResponse(500, "PURGE_FAILED", "Penghapusan data belum berhasil; webhook akan diulang."); }
}
