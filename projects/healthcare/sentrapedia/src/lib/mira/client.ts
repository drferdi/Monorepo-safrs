import { containsIdentity, validCase, validResult, type MiraAnalysis } from "./contract";
import type { CaseState } from "./types";
import { validTheOracleGrounding } from "../theoracle-grounding-types";
import { gateEvidence, gateTherapy, validGate } from "../theoracle-evidence-gate";

/** A failed analysis request; `code` is the gateway's error code when the server sent one. */
export class MiraRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export async function requestMiraAnalysis(caseData: CaseState, options: { synthetic: boolean; signal?: AbortSignal; fetchFn?: typeof fetch }): Promise<MiraAnalysis> {
  if (!options.synthetic) throw new Error("Konfirmasi bahwa keluhan dan konteks menggunakan data fiktif tanpa identitas pribadi.");
  if (!validCase(caseData)) throw new Error("Keluhan atau konteks tidak valid atau terlalu panjang.");
  if (containsIdentity(JSON.stringify(caseData))) throw new Error("Hapus identitas dari keluhan dan konteks. Gunakan data fiktif tanpa nama, nomor identitas, kontak atau alamat.");
  options.signal?.throwIfAborted();
  const snapshot = structuredClone(caseData);
  let response: Response;
  let data: unknown;
  try {
    response = await (options.fetchFn ?? fetch)("/api/mira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: snapshot, synthetic: true }), signal: options.signal });
    data = await response.json();
  } catch (error) {
    // A cancel stays a cancel; a lost connection or unreadable body gets the same wording as the server's 502.
    if (options.signal?.aborted) throw error;
    throw new Error("Layanan analisis tidak dapat dihubungi atau respons tidak dapat dibaca.");
  }
  options.signal?.throwIfAborted();
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data && data.error && typeof data.error === "object" ? data.error : {};
    const message = "message" in error && typeof error.message === "string" ? error.message : "Analisis belum tersedia. Keluhan tetap tersedia.";
    throw new MiraRequestError(message, "code" in error && typeof error.code === "string" ? error.code : undefined);
  }
  if (!data || typeof data !== "object" || !("result" in data) || !validResult(data.result) || data.result.status !== "ok" || !("traceId" in data) || typeof data.traceId !== "string" || !("createdAt" in data) || typeof data.createdAt !== "string" || !Number.isFinite(Date.parse(data.createdAt))) throw new Error("Respons analisis tidak dapat diverifikasi.");
  if (!("grounding" in data) || !validTheOracleGrounding(data.grounding)) throw new Error("Respons analisis tidak dapat diverifikasi.");
  const therapyGrounding = "therapyGrounding" in data ? data.therapyGrounding : undefined;
  if (therapyGrounding !== undefined && !validTheOracleGrounding(therapyGrounding)) throw new Error("Respons analisis tidak dapat diverifikasi.");
  const evidenceGate = "evidenceGate" in data ? data.evidenceGate : undefined;
  if (evidenceGate !== undefined && !validGate(evidenceGate)) throw new Error("Respons analisis tidak dapat diverifikasi.");
  // Therapy without a gate report (an older or faulty server) is gated here as the gateway does, so no unchecked dose reaches a draft.
  const likely = data.result.differential.likely[0];
  const late = data.result.therapy && !evidenceGate ? gateTherapy(data.result.therapy, gateEvidence(therapyGrounding, data.grounding), likely && { icd10: likely.icd10, label: likely.label }) : undefined;
  const result = late?.therapy ? { ...data.result, therapy: late.therapy } : { ...data.result };
  if (late && !late.therapy) delete result.therapy;
  const gate = late ? late.report : evidenceGate;
  return { case: snapshot, result, traceId: data.traceId, createdAt: data.createdAt, grounding: data.grounding, ...(therapyGrounding ? { therapyGrounding } : {}), ...(gate ? { evidenceGate: gate } : {}) };
}
