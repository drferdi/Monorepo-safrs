/**
 * Pure derivation of the library counts. Extracted from readLibrary so the
 * absent-data and manifest-behind rules are testable without touching disk.
 */

export type DeriveInput = {
  /** Lines recorded in manifest.jsonl. */
  entries: number;
  /** Recorded, parsed, and passed the quality gate. */
  readyCount: number;
  /** .pdf files under database/sources, 0/positive from a real count, null when unreadable. */
  sourcePdfs: number | null;
  /** .json files under database/canonical, 0/positive from a real count, null when unreadable. */
  canonicalDocuments: number | null;
};

export type DerivedCounts = {
  sourcePdfs: number | null;
  canonicalDocuments: number | null;
  readyToUse: number | null;
  readyUnknownReason: string | null;
  unrecorded: number | null;
  notYetParsed: number | null;
  dataMissingHere: boolean;
};

export function deriveCounts(input: DeriveInput): DerivedCounts {
  // The corpus directories are tracked only as .gitkeep placeholders, so a
  // worktree sees them empty even though the main checkout holds the data.
  const dataMissingHere = input.entries > 0 && input.canonicalDocuments === 0;

  const canonicalDocuments = dataMissingHere ? null : input.canonicalDocuments;
  const sourcePdfs =
    dataMissingHere && input.sourcePdfs === 0 ? null : input.sourcePdfs;

  const unrecorded =
    canonicalDocuments === null
      ? null
      : Math.max(0, canonicalDocuments - input.entries);
  const notYetParsed =
    sourcePdfs === null || canonicalDocuments === null
      ? null
      : Math.max(0, sourcePdfs - canonicalDocuments);

  const manifestIsBehind = unrecorded !== null && unrecorded > 0;

  if (dataMissingHere) {
    return {
      sourcePdfs,
      canonicalDocuments,
      readyToUse: null,
      readyUnknownReason:
        "Tidak dapat dipastikan dari checkout ini. Berkas korpus tidak ada di checkout ini — data tidak ikut git, jadi angka manifest tidak bisa diperiksa terhadap isi disk.",
      unrecorded,
      notYetParsed,
      dataMissingHere,
    };
  }

  return {
    sourcePdfs,
    canonicalDocuments,
    readyToUse: manifestIsBehind ? null : input.readyCount,
    readyUnknownReason: manifestIsBehind
      ? `Tidak dapat dipastikan. Manifest hanya mencatat ${input.entries} dari ${canonicalDocuments} dokumen yang ada di disk, dan berkas kanonik tidak menyimpan hasil gerbang mutu. Jawaban yang sah hanya ada di basis data pgvector — nyalakan basis data lalu jalankan sensus.`
      : null,
    unrecorded,
    notYetParsed,
    dataMissingHere,
  };
}
