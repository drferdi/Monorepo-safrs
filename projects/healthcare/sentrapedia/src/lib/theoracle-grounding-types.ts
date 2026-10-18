import { filledText, record } from "./guards";

export const THEORACLE_GROUNDING_CAPABILITY = "theoracle-grounding-v2" as const;

// Evidence text is the stored chunk without its metadata header, whitespace collapsed;
// textSha256 identifies the stored chunk in theoracle/index/chunks.jsonl.
export interface TheOracleCitationSource {
  readonly title: string;
  readonly docSource: string;
  readonly origin: string;
  readonly textSha256: string;
}

export interface TheOracleGroundingEvidence {
  readonly evidenceId: string;
  readonly text: string;
  readonly retrievalRank: number;
  readonly similarity: number;
  readonly source: TheOracleCitationSource;
}

export interface TheOracleEmbeddingModel {
  readonly id: string;
  readonly revision: string;
  readonly dtype: string;
  readonly dims: number;
}

export interface TheOracleGroundingBundle {
  readonly version: typeof THEORACLE_GROUNDING_CAPABILITY;
  readonly corpus: {
    readonly name: "TheOracle";
    readonly indexSha256: string;
    readonly embeddingModel: TheOracleEmbeddingModel;
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

const hash = (value: unknown): boolean => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export function validTheOracleGrounding(value: unknown): value is TheOracleGroundingBundle {
  if (!record(value) || value.version !== THEORACLE_GROUNDING_CAPABILITY || !record(value.corpus) || value.corpus.name !== "TheOracle" || !hash(value.corpus.indexSha256) || !filledText(value.corpus.retrievedAt, 64) || !Number.isFinite(Date.parse(value.corpus.retrievedAt)) || !filledText(value.corpus.reviewProvenance, 500) || !hash(value.queryDigest) || !Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 6) return false;
  const model = value.corpus.embeddingModel;
  if (!record(model) || !filledText(model.id, 200) || !/^[a-f0-9]{40}$/.test(String(model.revision)) || !filledText(model.dtype, 16) || typeof model.dims !== "number" || !Number.isSafeInteger(model.dims) || model.dims < 1) return false;
  return value.evidence.every((item: unknown, index: number) => {
    if (!record(item) || !filledText(item.evidenceId, 100) || !filledText(item.text, 2400) || item.retrievalRank !== index + 1 || typeof item.similarity !== "number" || !Number.isFinite(item.similarity) || item.similarity < -1 || item.similarity > 1 || !record(item.source)) return false;
    const source = item.source;
    return filledText(source.title, 500) && filledText(source.docSource, 500) && filledText(source.origin, 100) && hash(source.textSha256);
  });
}
