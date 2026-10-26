import { trustedConsentOrigin, type AuthConfig } from "./config";
import { assessBetaUser, betaPolicyVersion, isRecord, validUserId, type AccessResult, type BetaConsent, type BetaUser } from "./policy";

const identityTimeoutMs = 5000;
const consentBytes = 1024;
type Dependencies = {
  config: AuthConfig;
  session: () => Promise<string | null>;
  user: (id: string) => Promise<BetaUser>;
  writeConsent: (id: string, consent: BetaConsent) => Promise<void>;
  now?: () => Date;
};

export function boundedIdentity<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([Promise.resolve().then(operation), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Identity unavailable")), identityTimeoutMs); })]).finally(() => clearTimeout(timer));
}

export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ status: "error", error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function accessFailure(result: Exclude<AccessResult, { status: "allowed" }>): Response {
  const states = {
    "signed-out": [401, "AUTH_REQUIRED", "Silakan masuk untuk membuka workspace."],
    "consent-required": [403, "CONSENT_REQUIRED", "Setujui ketentuan beta sebelum melanjutkan."],
    disabled: [403, "ACCESS_DENIED", "Akses akun ini belum diizinkan."],
    unavailable: [503, "AUTH_UNAVAILABLE", "Layanan akses belum tersedia. Coba kembali nanti."],
  } as const;
  const [status, code, message] = states[result.status];
  return errorResponse(status, code, message);
}

function inputFailure(status = 400): Response {
  return errorResponse(status, status === 403 ? "ORIGIN" : "INPUT", "Persetujuan tidak valid. Muat ulang halaman dan coba kembali.");
}

async function readConsent(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || !request.body) throw new Error("Invalid body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  const timer = setTimeout(() => { expired = true; cancel(); }, identityTimeoutMs);
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > consentBytes) { cancel(); throw new Error("Invalid body"); }
      chunks.push(next.value);
    }
    if (expired) throw new Error("Invalid body");
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

export function createBetaAccess(deps: Dependencies) {
  // User access follows verified Clerk sign-in. Explicit legacy callers may still inspect consent.
  async function resolve(requireConsent = false): Promise<AccessResult> {
    if (deps.config.mode === "unavailable") return { status: "unavailable" };
    if (deps.config.mode === "local") return { status: "allowed", userId: deps.config.userId };
    try {
      return await boundedIdentity(async () => {
        const id = await deps.session();
        if (!id) return { status: "signed-out" };
        if (!validUserId(id)) return { status: "unavailable" };
        const user = await deps.user(id);
        if (user.id !== id) return { status: "unavailable" };
        return assessBetaUser(user, requireConsent);
      });
    } catch { return { status: "unavailable" }; }
  }
  async function consent(request: Request): Promise<Response> {
    const result = await resolve(false);
    if (result.status !== "allowed") return accessFailure(result);
    if (!trustedConsentOrigin(request, deps.config.mode === "clerk" ? deps.config.publicOrigin : null)) return inputFailure(403);
    let body: unknown;
    try { body = await readConsent(request); } catch { return inputFailure(); }
    if (!isRecord(body) || Object.keys(body).length !== 2 || body.version !== betaPolicyVersion || body.accepted !== true) return inputFailure();
    if (deps.config.mode !== "local") {
      try { await boundedIdentity(() => deps.writeConsent(result.userId, { version: betaPolicyVersion, acceptedAt: (deps.now?.() ?? new Date()).toISOString() })); }
      catch { return accessFailure({ status: "unavailable" }); }
    }
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }
  return { resolve, consent };
}
