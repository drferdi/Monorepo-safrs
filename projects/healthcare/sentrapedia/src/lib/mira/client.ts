import { containsIdentity, validCase, validResult, type MiraAnalysis } from "./contract";
import type { CaseState } from "./types";
import { validOracleGrounding } from "../oracle-grounding-types";

export async function requestMiraAnalysis(caseData: CaseState, options: { synthetic: boolean; signal?: AbortSignal; fetchFn?: typeof fetch }): Promise<MiraAnalysis> {
  if (!options.synthetic) throw new Error("Konfirmasi bahwa keluhan dan konteks menggunakan data fiktif tanpa identitas pribadi.");
  if (!validCase(caseData)) throw new Error("Keluhan atau konteks tidak valid atau terlalu panjang.");
  if (containsIdentity(JSON.stringify(caseData))) throw new Error("Hapus identitas dari keluhan dan konteks. Gunakan data fiktif tanpa nama, nomor identitas, kontak atau alamat.");
  options.signal?.throwIfAborted();
  const snapshot = structuredClone(caseData);
  const response = await (options.fetchFn ?? fetch)("/api/mira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: snapshot, synthetic: true }), signal: options.signal });
  const data: unknown = await response.json();
  options.signal?.throwIfAborted();
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && data.error && typeof data.error === "object" && "message" in data.error && typeof data.error.message === "string" ? data.error.message : "Analisis belum tersedia. Keluhan tetap tersedia.";
    throw new Error(message);
  }
  if (!data || typeof data !== "object" || !("result" in data) || !validResult(data.result) || data.result.status !== "ok" || !("traceId" in data) || typeof data.traceId !== "string" || !("createdAt" in data) || typeof data.createdAt !== "string" || !Number.isFinite(Date.parse(data.createdAt))) throw new Error("Respons analisis tidak dapat diverifikasi.");
  if (!("grounding" in data) || !validOracleGrounding(data.grounding)) throw new Error("Respons analisis tidak dapat diverifikasi.");
  return { case: snapshot, result: data.result, traceId: data.traceId, createdAt: data.createdAt, grounding: data.grounding };
}
