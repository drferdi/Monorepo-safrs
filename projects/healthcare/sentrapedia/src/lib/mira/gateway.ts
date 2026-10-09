import { containsIdentity, validCase, validResult } from "./contract";
import { freeServiceVersion } from "./free-profile";
import { miraServiceVersion } from "./model-profile";

type Options = { fetchFn?: typeof fetch; baseUrl?: string; token?: string; timeoutMs?: number; freeModel?: string; model?: string; maxCostUsd?: number };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const failure = (code: string, message: string, status: number) => reply({ error: { code, message } }, status);
async function boundedBody(response: Response | Request, limit: number): Promise<string> {
  const reader = response.body?.getReader(); if (!reader) return "";
  const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error("BODY_LIMIT"); parts.push(value); } }
  catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return new TextDecoder().decode(bytes);
}
export function createMiraGateway(options: Options = {}) {
  const fetchFn = options.fetchFn ?? fetch;
  const token = options.token?.trim() ?? "";
  const selectedModel = options.model ?? options.freeModel;
  const maxCostUsd = options.freeModel ? 0 : options.maxCostUsd ?? 0.1;
  const profileMatches = (version: unknown) => options.freeModel ? freeServiceVersion(version, options.freeModel) : !!selectedModel && miraServiceVersion(version, selectedModel);
  let base = "";
  try { const url = new URL(options.baseUrl ?? "http://127.0.0.1:8787"); if (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/") base = url.origin; } catch { /* Invalid configuration stays unavailable. */ }
  let active = false;
  async function serviceHealth(signal: AbortSignal) {
    const response = await fetchFn(`${base}/healthz`, { cache: "no-store", signal, redirect: "error" });
    const body: unknown = JSON.parse(await boundedBody(response, 4096));
    const reachable = response.ok && !!body && typeof body === "object" && "status" in body && body.status === "ok" && "contractVersion" in body && body.contractVersion === "1";
    const modelReady = reachable && (!selectedModel || (!!body && typeof body === "object" && "version" in body && profileMatches(body.version)));
    return { reachable, modelReady };
  }
  return {
    async health(): Promise<Response> {
      let status = { reachable: false, modelReady: false };
      if (base) try { status = await serviceHealth(AbortSignal.timeout(2500)); } catch { /* Health never triggers inference. */ }
      return reply({ ...status, configured: !!base && !!token, freeOnly: !!options.freeModel, model: selectedModel ?? null, maxCostUsd: selectedModel ? maxCostUsd : null });
    },
    async step(request: Request): Promise<Response> {
      const caller = new URL(request.url);
      let expectedOrigin = caller.origin;
      try {
        const host = request.headers.get("host");
        if (host) {
          const publicUrl = new URL(`${caller.protocol}//${host}`);
          if (!["localhost", "127.0.0.1", "[::1]"].includes(publicUrl.hostname) || publicUrl.port !== caller.port || publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) throw new Error("host");
          expectedOrigin = publicUrl.origin;
        }
      } catch { return failure("ORIGIN", "Alamat workspace lokal tidak valid.", 403); }
      if (!["localhost", "127.0.0.1", "[::1]"].includes(caller.hostname) || request.headers.get("origin") !== expectedOrigin) return failure("ORIGIN", "Permintaan harus berasal dari workspace lokal ini.", 403);
      let payload: unknown;
      try { payload = JSON.parse(await boundedBody(request, 32768)); } catch { return failure("INPUT", "Input tidak valid atau terlalu panjang.", 400); }
      if (!payload || typeof payload !== "object" || !("case" in payload) || !("synthetic" in payload) || payload.synthetic !== true || Object.keys(payload).some(k => !["case", "synthetic"].includes(k)) || !validCase(payload.case)) return failure("INPUT", "Lengkapi kasus terstruktur dan konfirmasi data fiktif.", 400);
      if (containsIdentity(JSON.stringify(payload.case))) return failure("IDENTITY", "Input mengandung pola identitas. Hapus nama, nomor identitas, kontak dan alamat.", 400);
      if (!base || !token) return failure("NOT_CONFIGURED", "Token koneksi layanan analisis belum dikonfigurasi pada server workspace.", 503);
      if (active) return failure("BUSY", "Analisis lain masih berjalan. Coba kembali setelah selesai.", 429);
      if (request.signal.aborted) return failure("ABORTED", "Analisis dibatalkan.", 499);
      active = true;
      const controller = new AbortController(); let timedOut = false;
      const cancel = () => controller.abort(); request.signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 20000);
      const traceId = crypto.randomUUID(); const createdAt = new Date().toISOString();
      try {
        if (selectedModel && !(await serviceHealth(controller.signal)).modelReady) return failure(options.freeModel ? "FREE_MODEL_REQUIRED" : "MODEL_REQUIRED", "Perencanaan dan asesmen harus memakai profil OpenRouter yang dipilih. Tidak ada analisis dijalankan.", 503);
        const response = await fetchFn(`${base}/v1/diagnosis/step`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-MIRA-Case-Origin": "synthetic" }, body: JSON.stringify({ contractVersion: "1", traceId, case: payload.case }), signal: controller.signal, cache: "no-store", redirect: "error" });
        if (!response.ok) return failure("SERVICE", "Layanan analisis menolak permintaan atau belum tersedia.", 502);
        const raw = await boundedBody(response, 1048576);
        if (token.length > 8 && raw.includes(token)) return failure("RESPONSE", "Respons layanan tidak dapat ditampilkan.", 502);
        const result: unknown = JSON.parse(raw);
        if (!validResult(result)) return failure("CONTRACT", "Respons layanan analisis tidak sesuai kontrak. Tidak ada hasil yang digunakan.", 502);
        if (selectedModel && (!profileMatches(result.meta.version) || result.meta.model !== `${selectedModel}+${selectedModel}` || typeof result.meta.costUsd !== "number" || !Number.isFinite(result.meta.costUsd) || result.meta.costUsd < 0 || !Number.isFinite(maxCostUsd) || maxCostUsd < 0 || result.meta.costUsd > maxCostUsd)) return failure(options.freeModel ? "FREE_MODEL_RESPONSE" : "MODEL_RESPONSE", "Profil model atau biaya respons tidak sesuai batas yang dipilih. Hasil tidak digunakan.", 502);
        if (result.status !== "ok") {
          const reasons: Record<string, { status: number; message: string }> = {
            TIMEOUT: { status: 504, message: "Analisis melewati batas waktu layanan. Pertanyaan tetap tersedia; coba kembali beberapa saat lagi." },
            BUDGET_EXHAUSTED: { status: 429, message: "Batas biaya analisis harian tercapai. Analisis belum dijalankan." },
            STEP_BUDGET_EXCEEDED: { status: 429, message: "Analisis melampaui batas biaya per kasus. Tidak ada hasil yang disimpan." },
            PROVIDER_POLICY: { status: 503, message: "Layanan analisis belum tersedia dengan kebijakan privasi yang ditetapkan." },
            API_ERRORS: { status: 503, message: "Layanan analisis dijeda sementara setelah beberapa kegagalan. Coba kembali beberapa saat lagi." },
            MODEL_ERROR: { status: 502, message: "Penyedia analisis sedang mengalami gangguan. Pertanyaan tetap tersedia." },
            MODEL_OUTPUT_INVALID: { status: 502, message: "Hasil analisis tidak dapat diverifikasi. Tidak ada hasil yang disimpan." },
            CONTRACT_MISMATCH: { status: 502, message: "Format hasil analisis tidak sesuai. Tidak ada hasil yang disimpan." },
          };
          const code = result.error?.code;
          if (code && Object.hasOwn(reasons, code)) return failure(code, reasons[code].message, reasons[code].status);
          return failure("UNAVAILABLE", "Analisis belum dapat diselesaikan. Pertanyaan tetap tersedia; coba kembali beberapa saat lagi.", 503);
        }
        return reply({ result, traceId, createdAt });
      } catch { return failure(timedOut ? "TIMEOUT" : controller.signal.aborted ? "ABORTED" : "NETWORK", timedOut ? "Analisis melewati batas waktu. Tidak ada hasil yang disimpan." : controller.signal.aborted ? "Analisis dibatalkan." : "Layanan analisis tidak dapat dihubungi atau respons tidak dapat dibaca.", timedOut ? 504 : controller.signal.aborted ? 499 : 502); }
      finally { clearTimeout(timer); request.signal.removeEventListener("abort", cancel); active = false; }
    },
  };
}
