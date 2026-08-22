import { readdir } from "node:fs/promises";

import { deriveCounts } from "./library-derive.ts";
import { readRepoFile, repoPath, repoPathExists } from "./root.ts";

/**
 * Medical library figures, read from the corpus data root.
 *
 * Three separate things are counted, deliberately kept apart:
 *
 * - **source PDFs** on disk — what has been curated,
 * - **canonical JSON** files — what the parser has actually produced,
 * - **manifest entries** — what the pipeline has recorded.
 *
 * They can disagree, and when they do the disagreement is the finding. A
 * manifest well behind the canonical directory means runs were not recorded —
 * the corpus README notes a 2026-08-12 race that corrupted it. Collapsing the
 * three into one "documents" number would hide exactly that.
 *
 * The data root is gitignored, so a worktree sees only what git tracks. When a
 * directory is absent the count is reported as unreadable rather than as zero.
 */

export type LibrarySnapshot = {
  /** False when the corpus data root is not present in this checkout. */
  available: boolean;
  /** Curated source PDFs, or null when the directory is unreadable here. */
  sourcePdfs: number | null;
  /** Lossless canonical documents produced by the parser. */
  canonicalDocuments: number | null;
  /** Entries the pipeline recorded in manifest.jsonl. */
  manifestEntries: number;
  /** Recorded and parsed successfully. */
  parsed: number;
  /** Recorded as failed, with the reason kept. */
  failed: number;
  /**
   * Documents that can honestly be called queryable, or null when that cannot
   * be established. The only authority is the pgvector projection; the manifest
   * is a record of runs, not a census.
   */
  readyToUse: number | null;
  /** Why readyToUse is unknown, when it is. */
  readyUnknownReason: string | null;
  /** On disk as canonical output but absent from the manifest. */
  unrecorded: number | null;
  /** Curated but not yet turned into canonical output. */
  notYetParsed: number | null;
  /** Human-readable failures, so a defect is named rather than counted. */
  failures: { docId: string; error: string }[];
  /** Stated plainly when the numbers disagree. */
  problems: string[];
};

const CORPUS_ROOT = "database";

async function countFiles(
  relativeDirectory: string,
  extension: string,
): Promise<number | null> {
  if (!(await repoPathExists(relativeDirectory))) {
    return null;
  }

  let total = 0;
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(await repoPath(directory), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(`${directory}/${entry.name}`);
      } else if (entry.name.toLowerCase().endsWith(extension)) {
        total += 1;
      }
    }
  };

  try {
    await walk(relativeDirectory);
    return total;
  } catch {
    return null;
  }
}

export async function readLibrary(): Promise<LibrarySnapshot> {
  const problems: string[] = [];
  const manifestRaw = await readRepoFile(
    `${CORPUS_ROOT}/canonical/manifest.jsonl`,
  );

  if (manifestRaw === null) {
    return {
      available: false,
      sourcePdfs: null,
      canonicalDocuments: null,
      manifestEntries: 0,
      parsed: 0,
      failed: 0,
      readyToUse: null,
      readyUnknownReason: "Catatan pustaka tidak terbaca di checkout ini.",
      unrecorded: null,
      notYetParsed: null,
      failures: [],
      problems: [
        "Catatan pustaka tidak ditemukan di checkout ini. Data korpus tidak ikut git, jadi angkanya hanya terbaca dari checkout utama.",
      ],
    };
  }

  let parsed = 0;
  let failed = 0;
  let readyToUse = 0;
  let entries = 0;
  const failures: { docId: string; error: string }[] = [];

  for (const line of manifestRaw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    entries += 1;

    let record: {
      doc_id?: string;
      status?: string;
      quality?: unknown;
      error?: string;
    };
    try {
      record = JSON.parse(trimmed);
    } catch {
      problems.push(
        "Satu baris catatan pustaka tidak dapat dibaca. Berkas ini pernah rusak karena dua proses menulis bersamaan.",
      );
      continue;
    }

    if (record.status === "parsed") {
      parsed += 1;
      // Only a document that passed the quality gate can honestly be called
      // ready to use. The recorded report is an object in the manifest, but
      // older lines carry it as a Python-style string, so both are accepted.
      const quality = record.quality;
      const verdict =
        quality !== null && typeof quality === "object"
          ? (quality as { verdict?: unknown }).verdict
          : undefined;
      const passed =
        verdict === "OK" ||
        (typeof quality === "string" && quality.includes("'verdict': 'OK'"));

      if (passed) {
        readyToUse += 1;
      }
    } else {
      failed += 1;
      failures.push({
        docId: record.doc_id ?? "(tanpa id)",
        error: record.error?.trim() || "Tidak ada alasan yang dicatat.",
      });
    }
  }

  const sourcePdfsRaw = await countFiles(`${CORPUS_ROOT}/sources`, ".pdf");
  const canonicalRaw = await countFiles(`${CORPUS_ROOT}/canonical`, ".json");

  const derived = deriveCounts({
    entries,
    readyCount: readyToUse,
    sourcePdfs: sourcePdfsRaw,
    canonicalDocuments: canonicalRaw,
  });

  if (derived.dataMissingHere) {
    problems.push(
      "Berkas korpus tidak ada di checkout ini — data tidak ikut git. Hitungan dokumen hanya terbaca dari checkout utama; catatan manifest di bawah tetap akurat.",
    );
  }
  if (derived.unrecorded !== null && derived.unrecorded > 0) {
    problems.push(
      `${derived.unrecorded} dokumen sudah ada sebagai hasil parse di disk tetapi tidak tercatat di manifest. Catatan tertinggal di belakang isi sebenarnya.`,
    );
  }

  return {
    available: true,
    sourcePdfs: derived.sourcePdfs,
    canonicalDocuments: derived.canonicalDocuments,
    manifestEntries: entries,
    parsed,
    failed,
    readyToUse: derived.readyToUse,
    readyUnknownReason: derived.readyUnknownReason,
    unrecorded: derived.unrecorded,
    notYetParsed: derived.notYetParsed,
    failures,
    problems,
  };
}
