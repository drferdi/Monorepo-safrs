import { containsIdentity, validCase, validResult, type MiraResult } from "./contract";
import { gateTherapy, type EvidenceGateReport } from "../theoracle-evidence-gate";
import { miraServiceVersion } from "./model-profile";
import { THEORACLE_GROUNDING_CAPABILITY, TheOracleGroundingError, validTheOracleGrounding, type TheOracleGroundingBundle } from "../theoracle-grounding-types";
import type { CaseState } from "./types";

type Options = { fetchFn?: typeof fetch; baseUrl?: string; token?: string; timeoutMs?: number; model?: string; maxCostUsd?: number; retrieveGrounding?: (caseData: CaseState) => Promise<TheOracleGroundingBundle>; retrieveTherapyGrounding?: (caseData: CaseState, diagnosis: { icd10: string; label: string }) => Promise<TheOracleGroundingBundle>; targetedTherapy?: boolean; retrievalTimeoutMs?: number; log?: (entry: StageLog) => void };
export interface StageLog { traceId: string; stage: string; ms: number; ok: boolean; code?: string }
class ServiceFailure extends Error { constructor(readonly code: string) { super(code); } }
// Targeted retrieval limit: a cold start loads the index and hashes the model files (measured 2.5-3 s).
const RETRIEVAL_TIMEOUT_MS = 15000;
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
  const selectedModel = options.model;
  const maxCostUsd = options.maxCostUsd ?? 0.1;
  const profileMatches = (version: unknown) => !!selectedModel && miraServiceVersion(version, selectedModel);
  let base = "";
  try { const url = new URL(options.baseUrl ?? "http://127.0.0.1:8787"); if (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/") base = url.origin; } catch { /* Invalid configuration stays unavailable. */ }
  let active = false;
  async function serviceHealth(signal: AbortSignal) {
    const response = await fetchFn(`${base}/healthz`, { cache: "no-store", signal, redirect: "error" });
    const body: unknown = JSON.parse(await boundedBody(response, 4096));
    const reachable = response.ok && !!body && typeof body === "object" && "status" in body && body.status === "ok" && "contractVersion" in body && body.contractVersion === "1";
    const modelReady = reachable && (!selectedModel || (!!body && typeof body === "object" && "version" in body && profileMatches(body.version)));
    const capabilities: unknown[] = reachable && !!body && typeof body === "object" && "capabilities" in body && Array.isArray(body.capabilities) ? body.capabilities : [];
    const groundingReady = capabilities.includes(THEORACLE_GROUNDING_CAPABILITY);
    const targetedReady = groundingReady && capabilities.includes("theoracle-targeted-therapy-v1");
    return { reachable, modelReady, groundingReady, targetedReady };
  }
  return {
    async health(): Promise<Response> {
      let status = { reachable: false, modelReady: false, groundingReady: false, targetedReady: false };
      if (base) try { status = await serviceHealth(AbortSignal.timeout(2500)); } catch { /* Health never triggers inference. */ }
      return reply({ reachable: status.reachable, modelReady: status.modelReady, groundingReady: status.groundingReady, configured: !!base && !!token, model: selectedModel ?? null, maxCostUsd: selectedModel ? maxCostUsd : null });
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
      const caseData = payload.case;
      if (containsIdentity(JSON.stringify(caseData))) return failure("IDENTITY", "Input mengandung pola identitas. Hapus nama, nomor identitas, kontak dan alamat.", 400);
      if (!base || !token) return failure("NOT_CONFIGURED", "Token koneksi layanan analisis belum dikonfigurasi pada server workspace.", 503);
      if (active) return failure("BUSY", "Analisis lain masih berjalan. Coba kembali setelah selesai.", 429);
      if (request.signal.aborted) return failure("ABORTED", "Analisis dibatalkan.", 499);
      active = true;
      const controller = new AbortController(); let timedOut = false;
      const cancel = () => controller.abort(); request.signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 20000);
      const traceId = crypto.randomUUID(); const createdAt = new Date().toISOString();
      const stages: StageLog[] = [];
      const log = options.log ?? (entry => console.info(JSON.stringify({ event: "mira.stage", ...entry })));
      const record = (stage: string, started: number, ok: boolean, code?: string) => { const entry = { traceId, stage, ms: Math.round(performance.now() - started), ok, ...(code ? { code } : {}) }; stages.push(entry); log(entry); };
      const timed = async <T>(stage: string, run: () => Promise<T>, limitMs?: number): Promise<T> => {
        const started = performance.now();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const value = await (limitMs ? Promise.race([run(), new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Pencarian TheOracle melewati batas waktu.")), limitMs); })]) : run());
          record(stage, started, true);
          return value;
        } catch (error) {
          record(stage, started, false, error instanceof TheOracleGroundingError ? error.code : error instanceof ServiceFailure ? error.code : timedOut ? "TIMEOUT" : controller.signal.aborted ? "ABORTED" : "ERROR");
          throw error;
        } finally { clearTimeout(timer); }
      };
      const postService = async (path: string, body: unknown): Promise<unknown> => {
        const serviceBody = JSON.stringify(body);
        if (new TextEncoder().encode(serviceBody).length > 65536) throw new ServiceFailure("INPUT");
        const response = await fetchFn(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-MIRA-Case-Origin": "synthetic" }, body: serviceBody, signal: controller.signal, cache: "no-store", redirect: "error" });
        if (!response.ok) throw new ServiceFailure("SERVICE");
        const raw = await boundedBody(response, 1048576);
        if (token.length > 8 && raw.includes(token)) throw new ServiceFailure("RESPONSE");
        return JSON.parse(raw);
      };
      try {
        let targetedReady = false;
        if (selectedModel || options.retrieveGrounding) {
          const health = await serviceHealth(controller.signal);
          if (selectedModel && !health.modelReady) return failure("MODEL_REQUIRED", "Perencanaan dan asesmen harus memakai profil OpenRouter yang dipilih. Tidak ada analisis dijalankan.", 503);
          if (options.retrieveGrounding && !health.groundingReady) return failure("GROUNDING_REQUIRED", "Layanan analisis belum mendukung referensi TheOracle. Muat ulang layanan setelah pembaruan.", 503);
          targetedReady = health.targetedReady;
        }
        const targeted = !!options.targetedTherapy && !!options.retrieveTherapyGrounding && targetedReady;
        if (options.targetedTherapy && !targeted) record("route", performance.now(), false, "TARGETED_UNAVAILABLE");
        const retrievalLimitMs = options.retrievalTimeoutMs ?? RETRIEVAL_TIMEOUT_MS;
        // The flag-off path keeps its original behaviour: no retrieval time limit beyond the overall request timer.
        const grounding = options.retrieveGrounding ? await timed("retrieve_dx", () => options.retrieveGrounding!(caseData), targeted ? retrievalLimitMs : undefined) : undefined;
        if (options.retrieveGrounding && !validTheOracleGrounding(grounding)) throw new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Referensi TheOracle tidak dapat diverifikasi.");
        controller.signal.throwIfAborted();
        let result: unknown;
        try { result = await timed("mira_dx", () => postService("/v1/diagnosis/step", { contractVersion: "1", traceId, case: caseData, ...(grounding ? { grounding } : {}), ...(targeted ? { omitTherapy: true } : {}) })); }
        catch (error) { if (error instanceof ServiceFailure) return error.code === "INPUT" ? failure("INPUT", "Kasus dan referensi melebihi batas layanan.", 413) : error.code === "RESPONSE" ? failure("RESPONSE", "Respons layanan tidak dapat ditampilkan.", 502) : failure("SERVICE", "Layanan analisis menolak permintaan atau belum tersedia.", 502); throw error; }
        if (!validResult(result)) return failure("CONTRACT", "Respons layanan analisis tidak sesuai kontrak. Tidak ada hasil yang digunakan.", 502);
        if (selectedModel && (!profileMatches(result.meta.version) || result.meta.model !== `${selectedModel}+${selectedModel}` || typeof result.meta.costUsd !== "number" || !Number.isFinite(result.meta.costUsd) || result.meta.costUsd < 0 || !Number.isFinite(maxCostUsd) || maxCostUsd < 0 || result.meta.costUsd > maxCostUsd)) return failure("MODEL_RESPONSE", "Profil model atau biaya respons tidak sesuai batas yang dipilih. Hasil tidak digunakan.", 502);
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
        let final: MiraResult = result;
        let therapyGrounding: TheOracleGroundingBundle | undefined;
        const diagnosis = result.differential.likely[0];
        if (targeted && diagnosis) {
          try {
            const target = { icd10: diagnosis.icd10, label: diagnosis.label };
            therapyGrounding = await timed("retrieve_tx", () => options.retrieveTherapyGrounding!(caseData, target), retrievalLimitMs);
            if (!validTheOracleGrounding(therapyGrounding)) throw new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Referensi terapi tidak dapat diverifikasi.");
            const bundle = therapyGrounding;
            const base = final;
            final = await timed("mira_tx", async () => {
              const value = await postService("/v1/therapy/step", { contractVersion: "1", traceId, case: caseData, diagnosis: target, grounding: bundle });
              if (!value || typeof value !== "object" || !("status" in value) || value.status !== "ok") throw new ServiceFailure(value && typeof value === "object" && "error" in value && value.error && typeof value.error === "object" && "code" in value.error && typeof value.error.code === "string" ? value.error.code : "UNAVAILABLE");
              if (!("therapy" in value)) throw new ServiceFailure("CONTRACT");
              const merged = { ...base, therapy: value.therapy };
              const cost = "meta" in value && value.meta && typeof value.meta === "object" && "costUsd" in value.meta ? value.meta.costUsd : null;
              if (!validResult(merged) || typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > maxCostUsd) throw new ServiceFailure("CONTRACT");
              return merged;
            });
          } catch (error) {
            // A stage failure leaves the diagnosis without therapy; an overall timeout or cancel still ends the request.
            if (controller.signal.aborted) throw error;
            therapyGrounding = undefined;
          }
        }
        let evidenceGate: EvidenceGateReport | undefined;
        if (final.therapy) {
          const gated = await timed("gate", async () => gateTherapy(final.therapy!, targeted ? therapyGrounding : grounding, diagnosis ? { icd10: diagnosis.icd10, label: diagnosis.label } : undefined));
          evidenceGate = gated.report;
          const withoutTherapy = { ...final };
          delete withoutTherapy.therapy;
          final = gated.therapy ? { ...final, therapy: gated.therapy } : withoutTherapy;
        }
        return reply({ result: final, traceId, createdAt, ...(grounding ? { grounding } : {}), ...(therapyGrounding ? { therapyGrounding } : {}), ...(evidenceGate ? { evidenceGate } : {}), pipeline: { path: targeted ? "targeted" : "legacy", stages } });
      } catch (error) {
        if (!timedOut && !controller.signal.aborted && error instanceof TheOracleGroundingError) return failure(error.code, error.message, error.code === "THEORACLE_UNAVAILABLE" ? 503 : 422);
        return failure(timedOut ? "TIMEOUT" : controller.signal.aborted ? "ABORTED" : "NETWORK", timedOut ? "Analisis melewati batas waktu. Tidak ada hasil yang disimpan." : controller.signal.aborted ? "Analisis dibatalkan." : "Layanan analisis tidak dapat dihubungi atau respons tidak dapat dibaca.", timedOut ? 504 : controller.signal.aborted ? 499 : 502);
      }
      finally { clearTimeout(timer); request.signal.removeEventListener("abort", cancel); active = false; }
    },
  };
}
