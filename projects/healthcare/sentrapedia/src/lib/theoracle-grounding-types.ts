export const THEORACLE_GROUNDING_CAPABILITY = "theoracle-grounding-v1" as const;

export interface TheOracleCitationSource {
  readonly fileNo: string;
  readonly filename: string;
  readonly documentSha256: string;
  readonly pdfPage: number;
  readonly pageTextSha256: string;
  readonly driveUrl: string;
}

export interface TheOracleCitationExtraction {
  readonly candidateId: string | null;
  readonly category: string | null;
  readonly sourceCharOffset: number | null;
  readonly sourceCharEnd: number | null;
  readonly reviewStatus: string;
  readonly requiresVisualReview: boolean;
}

export interface TheOracleGroundingEvidence {
  readonly evidenceId: string;
  readonly text: string;
  readonly retrievalKind: "candidate" | "clinical_fact" | "page";
  readonly retrievalRank: number;
  readonly source: TheOracleCitationSource;
  readonly extraction: TheOracleCitationExtraction;
}

export interface TheOracleGroundingBundle {
  readonly version: typeof THEORACLE_GROUNDING_CAPABILITY;
  readonly corpus: {
    readonly name: "TheOracle";
    readonly databaseSha256: string;
    readonly retrievedAt: string;
    readonly reviewProvenance: string;
  };
  readonly queryDigest: string;
  readonly evidence: readonly TheOracleGroundingEvidence[];
}

export class TheOracleGroundingError extends Error {
  constructor(readonly code: "THEORACLE_QUERY_EMPTY" | "THEORACLE_NO_MATCH" | "THEORACLE_UNAVAILABLE", message: string) {
    super(message);
    this.name = "TheOracleGroundingError";
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const hash = (value: unknown): boolean => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown): value is string => typeof value === "string" && !!value.trim() && value.length <= 2048;
const offset = (value: unknown): value is number | null => value === null || typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const nullableText = (value: unknown): boolean => value === null || text(value);

export function validTheOracleGrounding(value: unknown): value is TheOracleGroundingBundle {
  if (!record(value) || value.version !== THEORACLE_GROUNDING_CAPABILITY || !record(value.corpus) || value.corpus.name !== "TheOracle" || !hash(value.corpus.databaseSha256) || !text(value.corpus.retrievedAt) || !Number.isFinite(Date.parse(value.corpus.retrievedAt)) || !text(value.corpus.reviewProvenance) || !hash(value.queryDigest) || !Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 6) return false;
  return value.evidence.every((item: unknown, index: number) => {
    if (!record(item) || !text(item.evidenceId) || !text(item.text) || item.text.length > 1600 || !["candidate", "clinical_fact", "page"].includes(String(item.retrievalKind)) || item.retrievalRank !== index + 1 || !record(item.source) || !record(item.extraction)) return false;
    const source = item.source; const extraction = item.extraction;
    if (!text(source.fileNo) || !text(source.filename) || !hash(source.documentSha256) || !hash(source.pageTextSha256) || typeof source.pdfPage !== "number" || !Number.isSafeInteger(source.pdfPage) || source.pdfPage < 1 || !text(source.driveUrl)) return false;
    try { if (new URL(source.driveUrl).protocol !== "https:") return false; } catch { return false; }
    return nullableText(extraction.candidateId) && nullableText(extraction.category) && offset(extraction.sourceCharOffset) && offset(extraction.sourceCharEnd) && (extraction.sourceCharOffset === null ? extraction.sourceCharEnd === null : extraction.sourceCharEnd !== null && extraction.sourceCharEnd >= extraction.sourceCharOffset) && text(extraction.reviewStatus) && typeof extraction.requiresVisualReview === "boolean";
  });
}
