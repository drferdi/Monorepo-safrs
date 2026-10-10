export const ORACLE_GROUNDING_CAPABILITY = "oracle-grounding-v1" as const;

export interface OracleCitationSource {
  readonly fileNo: string;
  readonly filename: string;
  readonly documentSha256: string;
  readonly pdfPage: number;
  readonly pageTextSha256: string;
  readonly driveUrl: string;
}

export interface OracleCitationExtraction {
  readonly candidateId: string | null;
  readonly category: string | null;
  readonly sourceCharOffset: number | null;
  readonly sourceCharEnd: number | null;
  readonly reviewStatus: string;
  readonly requiresVisualReview: boolean;
}

export interface OracleGroundingEvidence {
  readonly evidenceId: string;
  readonly text: string;
  readonly retrievalKind: "candidate" | "clinical_fact" | "page";
  readonly retrievalRank: number;
  readonly source: OracleCitationSource;
  readonly extraction: OracleCitationExtraction;
}

export interface OracleGroundingBundle {
  readonly version: typeof ORACLE_GROUNDING_CAPABILITY;
  readonly corpus: {
    readonly name: "Oracle II";
    readonly databaseSha256: string;
    readonly retrievedAt: string;
    readonly reviewProvenance: string;
  };
  readonly queryDigest: string;
  readonly evidence: readonly OracleGroundingEvidence[];
}

export class OracleGroundingError extends Error {
  constructor(readonly code: "ORACLE_QUERY_EMPTY" | "ORACLE_NO_MATCH" | "ORACLE_UNAVAILABLE", message: string) {
    super(message);
    this.name = "OracleGroundingError";
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const hash = (value: unknown): boolean => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown): value is string => typeof value === "string" && !!value.trim() && value.length <= 2048;
const offset = (value: unknown): value is number | null => value === null || typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const nullableText = (value: unknown): boolean => value === null || text(value);

export function validOracleGrounding(value: unknown): value is OracleGroundingBundle {
  if (!record(value) || value.version !== ORACLE_GROUNDING_CAPABILITY || !record(value.corpus) || value.corpus.name !== "Oracle II" || !hash(value.corpus.databaseSha256) || !text(value.corpus.retrievedAt) || !Number.isFinite(Date.parse(value.corpus.retrievedAt)) || !text(value.corpus.reviewProvenance) || !hash(value.queryDigest) || !Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 6) return false;
  return value.evidence.every((item: unknown, index: number) => {
    if (!record(item) || !text(item.evidenceId) || !text(item.text) || item.text.length > 1600 || !["candidate", "clinical_fact", "page"].includes(String(item.retrievalKind)) || item.retrievalRank !== index + 1 || !record(item.source) || !record(item.extraction)) return false;
    const source = item.source; const extraction = item.extraction;
    if (!text(source.fileNo) || !text(source.filename) || !hash(source.documentSha256) || !hash(source.pageTextSha256) || typeof source.pdfPage !== "number" || !Number.isSafeInteger(source.pdfPage) || source.pdfPage < 1 || !text(source.driveUrl)) return false;
    try { if (new URL(source.driveUrl).protocol !== "https:") return false; } catch { return false; }
    return nullableText(extraction.candidateId) && nullableText(extraction.category) && offset(extraction.sourceCharOffset) && offset(extraction.sourceCharEnd) && (extraction.sourceCharOffset === null ? extraction.sourceCharEnd === null : extraction.sourceCharEnd !== null && extraction.sourceCharEnd >= extraction.sourceCharOffset) && text(extraction.reviewStatus) && typeof extraction.requiresVisualReview === "boolean";
  });
}
