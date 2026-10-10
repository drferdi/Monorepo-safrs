import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { emptyCase } from "../src/lib/mira/contract";
import { validOracleGrounding } from "../src/lib/oracle-grounding-types";
import {
  ORACLE_GROUNDING_CAPABILITY,
  OracleGroundingError,
  retrieveOracleGrounding,
} from "../src/lib/oracle-grounding";

const scratch: string[] = [];

function fixtureDatabase(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "sentrapedia-oracle-"));
  scratch.push(directory);
  const databasePath = path.join(directory, "oracle.sqlite");
  const db = new DatabaseSync(databasePath);
  db.exec(`
    CREATE TABLE source_documents_v2(file_no TEXT PRIMARY KEY, disease_slug TEXT NOT NULL, filename TEXT NOT NULL, sha256 TEXT NOT NULL, drive_url TEXT NOT NULL, page_count INTEGER NOT NULL, regulatory_status TEXT NOT NULL, clinical_review_status TEXT NOT NULL);
    CREATE TABLE source_pages_v2(file_no TEXT NOT NULL, pdf_page INTEGER NOT NULL, text_search TEXT NOT NULL, text_sha256 TEXT NOT NULL, requires_visual_review INTEGER NOT NULL, PRIMARY KEY(file_no,pdf_page));
    CREATE TABLE source_candidates_v2(candidate_id TEXT PRIMARY KEY, file_no TEXT NOT NULL, pdf_page INTEGER NOT NULL, disease_slug TEXT NOT NULL, category TEXT NOT NULL, evidence_quote TEXT NOT NULL, source_char_offset INTEGER NOT NULL, source_char_end INTEGER NOT NULL, score INTEGER NOT NULL, review_status TEXT NOT NULL);
    CREATE VIRTUAL TABLE source_candidates_fts_v2 USING fts5(candidate_id UNINDEXED,disease_slug,category,evidence_quote,tokenize='unicode61 remove_diacritics 2');
    CREATE TABLE documents(file_id TEXT PRIMARY KEY, file_no TEXT, topic TEXT NOT NULL, year INTEGER, kmk_number TEXT, document_scope TEXT, clinical_population TEXT NOT NULL, disease_group TEXT NOT NULL, drive_url TEXT NOT NULL, filename TEXT NOT NULL, sha256 TEXT, page_count INTEGER, status TEXT NOT NULL, ingested_at TEXT, source_version_note TEXT, extraction_warnings TEXT);
    CREATE TABLE pages(page_id INTEGER PRIMARY KEY, file_id TEXT NOT NULL, pdf_page INTEGER NOT NULL, printed_page TEXT, text_raw TEXT NOT NULL, text_search TEXT NOT NULL, char_count INTEGER NOT NULL, image_count INTEGER NOT NULL, extraction_flag TEXT);
    CREATE VIRTUAL TABLE pages_fts USING fts5(text_search,content='pages',content_rowid='page_id',tokenize='unicode61 remove_diacritics 2');
  `);
  const documentHash = "a".repeat(64);
  const quote = "Batuk dan demam merupakan gambaran yang perlu dinilai pada pneumonia.";
  const pageOne = `Pendahuluan pedoman. ${quote} Pemeriksaan klinis berikutnya.`;
  const pageTwo = "Pemeriksaan pneumonia untuk batuk menetap. ".repeat(80);
  const pageHash = createHash("sha256").update(pageOne).digest("hex");
  const pageTwoHash = createHash("sha256").update(pageTwo).digest("hex");
  const quoteOffset = pageOne.indexOf(quote);
  db.prepare("INSERT INTO source_documents_v2 VALUES(?,?,?,?,?,?,?,?)").run("001", "pneumonia", "001_PNPK_Pneumonia.pdf", documentHash, "https://example.test/pneumonia", 2, "UNVERIFIED", "SOURCE_REVIEWED");
  db.prepare("INSERT INTO source_pages_v2 VALUES(?,?,?,?,?)").run("001", 1, pageOne, pageHash, 0);
  db.prepare("INSERT INTO source_pages_v2 VALUES(?,?,?,?,?)").run("001", 2, pageTwo, pageTwoHash, 1);
  db.prepare("INSERT INTO source_candidates_v2 VALUES(?,?,?,?,?,?,?,?,?,?)").run("P001-001", "001", 1, "pneumonia", "diagnosis", quote, quoteOffset, quoteOffset + quote.length, 42, "SOURCE_TEXT_EXACT_SEMANTIC_REVIEW_REQUIRED");
  db.prepare("INSERT INTO source_candidates_fts_v2 VALUES(?,?,?,?)").run("P001-001", "pneumonia", "diagnosis", quote);
  db.prepare("INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("doc-1", "001", "Pneumonia", 2024, null, null, "dewasa", "respirasi", "https://example.test/pneumonia", "001_PNPK_Pneumonia.pdf", documentHash, 2, "ready", null, null, null);
  db.prepare("INSERT INTO pages VALUES(?,?,?,?,?,?,?,?,?)").run(1, "doc-1", 1, null, pageOne, pageOne, pageOne.length, 0, null);
  db.prepare("INSERT INTO pages VALUES(?,?,?,?,?,?,?,?,?)").run(2, "doc-1", 2, null, pageTwo, pageTwo, pageTwo.length, 1, null);
  db.exec("INSERT INTO pages_fts(pages_fts) VALUES('rebuild')");
  db.close();
  return databasePath;
}

function caseFor(complaint: string) {
  return { ...emptyCase(), chiefComplaint: complaint };
}

afterEach(() => {
  while (scratch.length) rmSync(scratch.pop()!, { recursive: true, force: true });
});

describe("Oracle II grounding retrieval", () => {
  it("returns frozen, bounded candidate-first citations with exact source and page provenance", () => {
    const databasePath = fixtureDatabase();
    const bundle = retrieveOracleGrounding(caseFor("batuk demam pneumonia"), {
      databasePath,
      limit: 2,
      now: () => new Date("2026-10-10T12:00:00.000Z"),
    });

    expect(bundle.version).toBe(ORACLE_GROUNDING_CAPABILITY);
    expect(validOracleGrounding(bundle)).toBe(true);
    expect(bundle.evidence).toHaveLength(2);
    expect(bundle.evidence[0]).toMatchObject({
      evidenceId: "P001-001",
      retrievalKind: "candidate",
      retrievalRank: 1,
      source: {
        fileNo: "001",
        filename: "001_PNPK_Pneumonia.pdf",
        documentSha256: "a".repeat(64),
        pdfPage: 1,
        pageTextSha256: createHash("sha256").update("Pendahuluan pedoman. Batuk dan demam merupakan gambaran yang perlu dinilai pada pneumonia. Pemeriksaan klinis berikutnya.").digest("hex"),
      },
      extraction: {
        candidateId: "P001-001",
        category: "diagnosis",
        sourceCharOffset: 21,
        sourceCharEnd: 90,
        reviewStatus: "SOURCE_TEXT_EXACT_SEMANTIC_REVIEW_REQUIRED",
        requiresVisualReview: false,
      },
    });
    expect(bundle.evidence[1].retrievalKind).toBe("page");
    expect(bundle.evidence.every(item => item.text.length <= 1_600)).toBe(true);
    expect(bundle.corpus.reviewProvenance).toContain("Gaffer stated");
    expect(bundle.queryDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(bundle)).toBe(true);
    expect(Object.isFrozen(bundle.evidence)).toBe(true);
    expect(Object.isFrozen(bundle.evidence[0].source)).toBe(true);
  });

  it("returns at most six distinct pages and uses full-page fallback only after candidates", () => {
    const databasePath = fixtureDatabase();
    const bundle = retrieveOracleGrounding(caseFor("batuk pneumonia"), { databasePath, limit: 99 });
    expect(bundle.evidence.length).toBeLessThanOrEqual(6);
    expect(new Set(bundle.evidence.map(item => `${item.source.fileNo}:${item.source.pdfPage}`)).size).toBe(bundle.evidence.length);
    expect(bundle.evidence[0].retrievalKind).toBe("candidate");
    expect(bundle.evidence.slice(1).every(item => item.retrievalKind === "page")).toBe(true);
  });

  it("validates curated clinical-fact quotations against their source page and retains exact coordinates", () => {
    const databasePath = fixtureDatabase();
    const db = new DatabaseSync(databasePath);
    db.exec("CREATE TABLE clinical_facts(fact_id INTEGER PRIMARY KEY, file_id TEXT, pdf_page INTEGER, evidence_category TEXT, evidence_quote TEXT, source_char_offset INTEGER, review_status TEXT); CREATE VIRTUAL TABLE clinical_facts_fts USING fts5(concept,evidence_quote,search_aliases); DELETE FROM source_candidates_fts_v2;");
    const quote = "Batuk dan demam merupakan gambaran yang perlu dinilai pada pneumonia.";
    db.prepare("INSERT INTO clinical_facts VALUES(?,?,?,?,?,?,?)").run(1, "doc-1", 1, "diagnosis", quote, 21, "SOURCE_REVIEWED");
    db.prepare("INSERT INTO clinical_facts_fts(rowid,concept,evidence_quote,search_aliases) VALUES(?,?,?,?)").run(1, "pneumonia", quote, "batuk demam");
    db.close();
    const bundle = retrieveOracleGrounding(caseFor("batuk demam pneumonia"), { databasePath, limit: 1 });
    expect(bundle.evidence[0]).toMatchObject({ retrievalKind: "clinical_fact", text: quote, extraction: { sourceCharOffset: 21, sourceCharEnd: 21 + quote.length } });
    expect(validOracleGrounding(bundle)).toBe(true);
  });

  it("fails explicitly for an unusable query or lexical no-match", () => {
    const databasePath = fixtureDatabase();
    for (const complaint of ["...", "xylophone quasar"]) {
      expect(() => retrieveOracleGrounding(caseFor(complaint), { databasePath })).toThrow(OracleGroundingError);
      try { retrieveOracleGrounding(caseFor(complaint), { databasePath }); }
      catch (error) { expect((error as OracleGroundingError).code).toMatch(/^ORACLE_(QUERY_EMPTY|NO_MATCH)$/); }
    }
  });

  it("rejects a candidate whose quote or offsets no longer match the hashed source page", () => {
    const databasePath = fixtureDatabase();
    const db = new DatabaseSync(databasePath);
    db.prepare("UPDATE source_candidates_v2 SET evidence_quote = ?, source_char_end = source_char_end + 1 WHERE candidate_id = ?").run("tampered quote", "P001-001");
    db.close();

    const bundle = retrieveOracleGrounding(caseFor("batuk demam pneumonia"), { databasePath, limit: 2 });
    expect(bundle.evidence.some(item => item.retrievalKind === "candidate")).toBe(false);
    expect(bundle.evidence.every(item => item.retrievalKind === "page")).toBe(true);
  });

  it("does not mutate the real Oracle II database", () => {
    const databasePath = path.join(process.cwd(), "oracle-ii", "sentra_clinical_core_source_reparsed.sqlite");
    const before = createHash("sha256").update(readFileSync(databasePath)).digest("hex");
    const bundle = retrieveOracleGrounding(caseFor("malaria demam"), { databasePath, limit: 2 });
    const after = createHash("sha256").update(readFileSync(databasePath)).digest("hex");
    expect(bundle.evidence.length).toBeGreaterThan(0);
    expect(validOracleGrounding(bundle)).toBe(true);
    expect(after).toBe(before);
  });

  it("skips public-source quotations that trigger the MIRA PII guard without weakening it", () => {
    for (const complaint of ["whooping cough", "maksilofasial"]) {
      try {
        const bundle = retrieveOracleGrounding(caseFor(complaint));
        expect(bundle.evidence.map(item => item.evidenceId)).not.toContain(complaint === "whooping cough" ? "P005-002" : "P079-009");
        expect(validOracleGrounding(bundle)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(OracleGroundingError);
        if (error instanceof OracleGroundingError) expect(error.code).toBe("ORACLE_NO_MATCH");
      }
    }
  });
});
