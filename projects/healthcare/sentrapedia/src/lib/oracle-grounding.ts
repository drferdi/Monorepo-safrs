import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CaseState } from "./mira/types";
import {
  ORACLE_GROUNDING_CAPABILITY,
  OracleGroundingError,
  type OracleGroundingBundle,
  type OracleGroundingEvidence,
} from "./oracle-grounding-types";

export { ORACLE_GROUNDING_CAPABILITY, OracleGroundingError } from "./oracle-grounding-types";
export type { OracleCitationExtraction, OracleCitationSource, OracleGroundingBundle, OracleGroundingEvidence } from "./oracle-grounding-types";
const DEFAULT_DATABASE = path.join(process.cwd(), "oracle-ii", "sentra_clinical_core_source_reparsed.sqlite");
const MAX_EVIDENCE = 6;
const MAX_TEXT_LENGTH = 1_600;
const MAX_TERMS = 24;
const PAGE_FALLBACK_TERMS = 8;
const REVIEW_PROVENANCE = "Gaffer stated on 2026-10-10 that all corpus sources are from Kementerian Kesehatan and that Gaffer personally reviewed the corpus; per-record corpus review fields remain unchanged.";
const STOP_WORDS = new Set([
  "ada", "akan", "atau", "belum", "dalam", "dengan", "dan", "dari", "di", "ini", "itu", "ke", "keluhan",
  "kasus", "pada", "pasien", "saat", "sejak", "serta", "tidak", "untuk", "yang", "the", "and", "with",
]);

interface RetrieveOptions {
  databasePath?: string;
  limit?: number;
  now?: () => Date;
}

interface CandidateRow {
  candidate_id: string;
  file_no: string;
  pdf_page: number;
  category: string;
  evidence_quote: string;
  source_char_offset: number;
  source_char_end: number;
  review_status: string;
  filename: string;
  document_sha256: string;
  drive_url: string;
  page_text_sha256: string;
  page_text: string;
  requires_visual_review: number;
}

interface FactRow {
  fact_id: number;
  file_no: string;
  pdf_page: number;
  category: string;
  evidence_quote: string;
  source_char_offset: number | null;
  review_status: string;
  filename: string;
  document_sha256: string;
  drive_url: string;
  page_text_sha256: string | null;
  page_text: string | null;
  requires_visual_review: number | null;
}

interface PageRow {
  file_no: string;
  pdf_page: number;
  text_search: string;
  text_sha256: string;
  requires_visual_review: number;
  filename: string;
  document_sha256: string;
  drive_url: string;
}

function fields(value: unknown, strings: string[], numbers: string[], nullableStrings: string[] = [], nullableNumbers: string[] = []): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return strings.every(key => key in value && typeof Reflect.get(value, key) === "string")
    && numbers.every(key => key in value && typeof Reflect.get(value, key) === "number" && Number.isSafeInteger(Reflect.get(value, key)))
    && nullableStrings.every(key => key in value && (Reflect.get(value, key) === null || typeof Reflect.get(value, key) === "string"))
    && nullableNumbers.every(key => key in value && (Reflect.get(value, key) === null || typeof Reflect.get(value, key) === "number" && Number.isSafeInteger(Reflect.get(value, key))));
}
function candidateRow(value: unknown): value is CandidateRow {
  return fields(value, ["candidate_id", "file_no", "category", "evidence_quote", "review_status", "filename", "document_sha256", "drive_url", "page_text_sha256", "page_text"], ["pdf_page", "source_char_offset", "source_char_end", "requires_visual_review"]);
}
function factRow(value: unknown): value is FactRow {
  return fields(value, ["file_no", "category", "evidence_quote", "review_status", "filename", "document_sha256", "drive_url"], ["fact_id", "pdf_page"], ["page_text_sha256", "page_text"], ["source_char_offset", "requires_visual_review"]);
}
function pageRow(value: unknown): value is PageRow {
  return fields(value, ["file_no", "text_search", "text_sha256", "filename", "document_sha256", "drive_url"], ["pdf_page", "requires_visual_review"]);
}
function checkedRows<T>(rows: unknown[], valid: (row: unknown) => row is T): T[] {
  return rows.map(row => {
    if (!valid(row)) throw new OracleGroundingError("ORACLE_UNAVAILABLE", "Format sumber Oracle II tidak dapat diverifikasi.");
    return row;
  });
}

const checksumCache = new Map<string, { key: string; value: string }>();

// Match the local MIRA privacy guard; public-source matches are skipped, not rewritten.
function sourceTriggersMiraPrivacy(item: Omit<OracleGroundingEvidence, "retrievalRank">): boolean {
  const value = JSON.stringify(item);
  if ([/\b\d{16}\b/, /\b\d{13}\b/, /\b08\d{8,11}\b/, /\+?62\d{9,12}\b/, /\b(?:\+62|62|0)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/].some(pattern => pattern.test(value))) return true;
  return [...value.matchAll(/\b(?:tn\.|ny\.|nn\.|an\.|sdr\.|sdri\.|bpk\.|bapak|ibu|dr\.)\s*([a-z]+)/gi)].some(match => /^[A-Z][a-z]+/.test(match[1]));
}

function sha256(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

function databaseSha256(databasePath: string): string {
  const stat = statSync(databasePath);
  const key = `${stat.size}:${stat.mtimeMs}`;
  const cached = checksumCache.get(databasePath);
  if (cached?.key === key) return cached.value;
  const value = sha256(readFileSync(databasePath));
  checksumCache.set(databasePath, { key, value });
  return value;
}

function queryText(caseData: CaseState): string {
  return [
    caseData.chiefComplaint,
    caseData.anamnesis.freeText,
    ...(caseData.anamnesis.qa ?? []).flatMap(item => [item.question, item.answer]),
    ...caseData.physicalExam,
    ...caseData.results.flatMap(item => [item.name, String(item.value)]),
    ...caseData.currentMedications,
    ...caseData.knownConditions,
  ].filter(Boolean).join(" ");
}

function queryTerms(caseData: CaseState): string[] {
  const words = queryText(caseData).normalize("NFKC").toLocaleLowerCase("id-ID").match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter(word => word.length >= 3 && !STOP_WORDS.has(word)))].slice(0, MAX_TERMS);
}

function ftsExpression(terms: string[]): string {
  return terms.map(term => `"${term.replaceAll('"', '""')}"`).join(" OR ");
}

function excerpt(text: string, terms: string[]): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_TEXT_LENGTH) return compact;
  const lower = compact.toLocaleLowerCase("id-ID");
  const first = Math.min(...terms.map(term => lower.indexOf(term)).filter(index => index >= 0));
  const center = Number.isFinite(first) ? first : 0;
  const start = Math.max(0, Math.min(center - 240, compact.length - MAX_TEXT_LENGTH));
  const clipped = compact.slice(start, start + MAX_TEXT_LENGTH);
  return `${start > 0 ? "…" : ""}${clipped.slice(start > 0 ? 1 : 0, clipped.length - (start + MAX_TEXT_LENGTH < compact.length ? 1 : 0))}${start + MAX_TEXT_LENGTH < compact.length ? "…" : ""}`;
}

function tableExists(db: DatabaseSync, name: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?").get(name);
}

function candidateEvidence(row: CandidateRow): Omit<OracleGroundingEvidence, "retrievalRank"> | null {
  if (sha256(row.page_text) !== row.page_text_sha256) return null;
  if (row.page_text.slice(row.source_char_offset, row.source_char_end) !== row.evidence_quote) return null;
  const text = row.evidence_quote.slice(0, MAX_TEXT_LENGTH);
  return {
    evidenceId: row.candidate_id,
    text,
    retrievalKind: "candidate",
    source: {
      fileNo: row.file_no,
      filename: row.filename,
      documentSha256: row.document_sha256,
      pdfPage: Number(row.pdf_page),
      pageTextSha256: row.page_text_sha256,
      driveUrl: row.drive_url,
    },
    extraction: {
      candidateId: row.candidate_id,
      category: row.category,
      sourceCharOffset: Number(row.source_char_offset),
      sourceCharEnd: Number(row.source_char_offset) + text.length,
      reviewStatus: row.review_status,
      requiresVisualReview: !!row.requires_visual_review,
    },
  };
}

function factEvidence(row: FactRow): Omit<OracleGroundingEvidence, "retrievalRank"> | null {
  if (row.page_text_sha256 && (!row.page_text || sha256(row.page_text) !== row.page_text_sha256)) {
    throw new OracleGroundingError("ORACLE_UNAVAILABLE", "Integritas halaman Oracle II tidak dapat diverifikasi. Analisis tidak dijalankan.");
  }
  if (!row.page_text || !row.evidence_quote) return null;
  const sourceOffset = row.page_text.indexOf(row.evidence_quote);
  if (sourceOffset < 0) return null;
  const text = row.evidence_quote.slice(0, MAX_TEXT_LENGTH);
  return {
    evidenceId: `fact:${row.fact_id}`,
    text,
    retrievalKind: "clinical_fact",
    source: {
      fileNo: row.file_no,
      filename: row.filename,
      documentSha256: row.document_sha256,
      pdfPage: Number(row.pdf_page),
      pageTextSha256: row.page_text_sha256 || sha256(row.page_text ?? row.evidence_quote),
      driveUrl: row.drive_url,
    },
    extraction: {
      candidateId: null,
      category: row.category,
      sourceCharOffset: sourceOffset,
      sourceCharEnd: sourceOffset + text.length,
      reviewStatus: row.review_status,
      requiresVisualReview: !!row.requires_visual_review,
    },
  };
}

function pageEvidence(row: PageRow, terms: string[]): Omit<OracleGroundingEvidence, "retrievalRank"> | null {
  if (sha256(row.text_search) !== row.text_sha256) return null;
  return {
    evidenceId: `page:${row.file_no}:${row.pdf_page}`,
    text: excerpt(row.text_search, terms),
    retrievalKind: "page",
    source: {
      fileNo: row.file_no,
      filename: row.filename,
      documentSha256: row.document_sha256,
      pdfPage: Number(row.pdf_page),
      pageTextSha256: row.text_sha256,
      driveUrl: row.drive_url,
    },
    extraction: {
      candidateId: null,
      category: null,
      sourceCharOffset: null,
      sourceCharEnd: null,
      reviewStatus: "FULL_PAGE_LEXICAL_FALLBACK",
      requiresVisualReview: !!row.requires_visual_review,
    },
  };
}

function freezeBundle(bundle: OracleGroundingBundle): OracleGroundingBundle {
  for (const item of bundle.evidence) {
    Object.freeze(item.source);
    Object.freeze(item.extraction);
    Object.freeze(item);
  }
  Object.freeze(bundle.evidence);
  Object.freeze(bundle.corpus);
  return Object.freeze(bundle);
}

export function retrieveOracleGrounding(caseData: CaseState, options: RetrieveOptions = {}): OracleGroundingBundle {
  const terms = queryTerms(caseData);
  if (!terms.length) throw new OracleGroundingError("ORACLE_QUERY_EMPTY", "Keluhan belum memiliki istilah klinis yang dapat dicari di Oracle II.");
  const databasePath = options.databasePath ?? DEFAULT_DATABASE;
  const limit = Math.max(1, Math.min(Math.trunc(options.limit ?? MAX_EVIDENCE), MAX_EVIDENCE));
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(databasePath, { readOnly: true });
    db.exec("PRAGMA query_only = ON");
    const match = ftsExpression(terms);
    const candidateRows = checkedRows(db.prepare(`
      SELECT c.candidate_id, c.file_no, c.pdf_page, c.category, c.evidence_quote,
             c.source_char_offset, c.source_char_end, c.review_status,
             d.filename, d.sha256 AS document_sha256, d.drive_url,
             p.text_sha256 AS page_text_sha256, p.text_search AS page_text, p.requires_visual_review
      FROM source_candidates_fts_v2 AS f
      JOIN source_candidates_v2 AS c ON c.candidate_id = f.candidate_id
      JOIN source_documents_v2 AS d ON d.file_no = c.file_no
      JOIN source_pages_v2 AS p ON p.file_no = c.file_no AND p.pdf_page = c.pdf_page
      WHERE source_candidates_fts_v2 MATCH ?
      ORDER BY bm25(source_candidates_fts_v2, 0, 4, 2, 1), c.score DESC, c.candidate_id
      LIMIT 24
    `).all(match), candidateRow);

    let factRows: FactRow[] = [];
    if (tableExists(db, "clinical_facts_fts") && tableExists(db, "clinical_facts")) {
      factRows = checkedRows(db.prepare(`
        SELECT cf.fact_id, d.file_no, cf.pdf_page, cf.evidence_category AS category,
               cf.evidence_quote, cf.source_char_offset, cf.review_status,
               d.filename, d.sha256 AS document_sha256, d.drive_url,
               sp.text_sha256 AS page_text_sha256, COALESCE(sp.text_search, p.text_raw) AS page_text,
               sp.requires_visual_review
        FROM clinical_facts_fts AS f
        JOIN clinical_facts AS cf ON cf.fact_id = f.rowid
        JOIN documents AS d ON d.file_id = cf.file_id
        LEFT JOIN pages AS p ON p.file_id = cf.file_id AND p.pdf_page = cf.pdf_page
        LEFT JOIN source_pages_v2 AS sp ON sp.file_no = d.file_no AND sp.pdf_page = cf.pdf_page
        WHERE clinical_facts_fts MATCH ?
        ORDER BY bm25(clinical_facts_fts, 3, 2, 1), cf.fact_id
        LIMIT 12
      `).all(match), factRow);
    }

    const selected: Omit<OracleGroundingEvidence, "retrievalRank">[] = [];
    const pages = new Set<string>();
    const perDocument = new Map<string, number>();
    const add = (item: Omit<OracleGroundingEvidence, "retrievalRank">) => {
      if (sourceTriggersMiraPrivacy(item)) return;
      const pageKey = `${item.source.fileNo}:${item.source.pdfPage}`;
      if (pages.has(pageKey) || (perDocument.get(item.source.fileNo) ?? 0) >= 2 || selected.length >= limit) return;
      pages.add(pageKey);
      perDocument.set(item.source.fileNo, (perDocument.get(item.source.fileNo) ?? 0) + 1);
      selected.push(item);
    };
    const candidates = candidateRows.map(candidateEvidence).filter((item): item is Omit<OracleGroundingEvidence, "retrievalRank"> => !!item);
    const facts = factRows.map(factEvidence).filter((item): item is Omit<OracleGroundingEvidence, "retrievalRank"> => !!item);
    for (let index = 0; index < Math.max(candidates.length, facts.length) && selected.length < limit; index++) {
      if (candidates[index]) add(candidates[index]);
      if (facts[index]) add(facts[index]);
    }

    if (selected.length < limit) {
      const fallbackTerms = terms.slice(0, PAGE_FALLBACK_TERMS);
      const score = fallbackTerms.map(() => "CASE WHEN lower(p.text_search) LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END").join(" + ");
      const patterns = fallbackTerms.map(term => `%${term}%`);
      const pageRows = checkedRows(db.prepare(`
        WITH ranked AS (
          SELECT p.file_no, p.pdf_page, p.text_search, p.text_sha256, p.requires_visual_review,
                 d.filename, d.sha256 AS document_sha256, d.drive_url,
                 (${score}) AS lexical_hits
          FROM source_pages_v2 AS p
          JOIN source_documents_v2 AS d ON d.file_no = p.file_no
        )
        SELECT file_no, pdf_page, text_search, text_sha256, requires_visual_review,
               filename, document_sha256, drive_url
        FROM ranked
        WHERE lexical_hits > 0
        ORDER BY lexical_hits DESC, file_no, pdf_page
        LIMIT 48
      `).all(...patterns), pageRow);
      for (const row of pageRows) {
        const item = pageEvidence(row, terms);
        if (item) add(item);
      }
    }

    if (!selected.length) throw new OracleGroundingError("ORACLE_NO_MATCH", "Oracle II tidak menemukan referensi leksikal untuk keluhan ini. Analisis tidak dijalankan.");
    const evidence = selected.map((item, index) => ({ ...item, retrievalRank: index + 1 }));
    return freezeBundle({
      version: ORACLE_GROUNDING_CAPABILITY,
      corpus: {
        name: "Oracle II",
        databaseSha256: databaseSha256(databasePath),
        retrievedAt: (options.now ?? (() => new Date()))().toISOString(),
        reviewProvenance: REVIEW_PROVENANCE,
      },
      queryDigest: sha256(terms.join("\n")),
      evidence,
    });
  } catch (error) {
    if (error instanceof OracleGroundingError) throw error;
    throw new OracleGroundingError("ORACLE_UNAVAILABLE", "Oracle II tidak dapat dibuka atau dibaca. Analisis tidak dijalankan.");
  } finally {
    db?.close();
  }
}
