import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyCase } from "../src/lib/aadi/contract";
import { retrieveTheOracleGrounding, TheOracleGroundingError } from "../src/lib/theoracle-grounding";
import sample from "../oracle/sentrapedia.sample.json";

// Public code, private data (Gaffer, 2026-10-19): the public repository ships without TheOracle and the clinical
// catalog. The workspace must still start, say plainly that the database is not installed, and never invent content.
describe("public build without the private database", () => {
  it("says the TheOracle database is not installed when the index folder is missing", async () => {
    const empty = mkdtempSync(path.join(tmpdir(), "theoracle-missing-"));
    try {
      const failure = await retrieveTheOracleGrounding({ ...emptyCase(), chiefComplaint: "batuk" }, { indexDir: path.join(empty, "index"), embedder: async () => async () => new Float32Array(768) }).catch(error => error);
      expect(failure).toBeInstanceOf(TheOracleGroundingError);
      expect(failure.code).toBe("THEORACLE_UNAVAILABLE");
      expect(failure.message).toBe("Database Oracle belum terpasang di server ini. Analisis tidak dijalankan.");
    } finally { rmSync(empty, { recursive: true, force: true }); }
  });
  it("ships a sample catalog that is marked as sample and carries no clinical content", () => {
    expect(sample.metadata.sample).toBe(true);
    expect(sample.diseases.length).toBeGreaterThan(0);
    for (const disease of sample.diseases) {
      expect(disease.nama).toMatch(/fiktif/i);
      expect(JSON.stringify(disease)).not.toMatch(/\d\s*(mg|mcg|g|ml|IU)\b/i);
      for (const key of ["id", "nama", "kategori", "kode", "definisi", "gejala", "diagnosis", "terapi", "rujukan"]) expect(disease).toHaveProperty(key);
    }
    expect(new Set(sample.categories.map(category => category.id))).toEqual(new Set(sample.diseases.map(disease => disease.kategori)));
  });
});
