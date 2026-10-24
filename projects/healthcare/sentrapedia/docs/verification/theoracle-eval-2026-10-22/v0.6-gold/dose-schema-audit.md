# Dose schema audit, SSOT v0.6 (read-only), 2026-10-23

Scope: the `dosis` rows of `theoracle/ssot/sentrapedia-knowledge-ssot.json` (v0.6, sha256 `338316f5…`) and the code that reads them. No file outside this report was changed.

## Volume

- 8,925 dose rows over 336 entries; 295 entries have at least one row.
- Median 9 rows per entry, maximum 496 (Anestesiologi Dan Terapi Intensif); 24 entries have more than 100 rows.
- 889 of the 1,974 SSOT chunks in the index carry dose lines.

## Fields

| Field | Filled | Rendered by `doseLines` |
|---|---|---|
| obat, dosis, sumber | 8,925 | yes |
| halaman | 7,975 (6,933 number, 1,042 digit string, 950 null) | yes |
| frekuensi | 2,438 | yes |
| rute | 2,240 | yes |
| durasi | 1,277 | yes |
| populasi | 1,202 | yes |
| konteks | 2,403 | **no** |
| kutipan | 8,925 | **no** |
| catatan | 6,677 | **no** |
| kelas | 0 (gone in v0.6) | still listed in `DOSE_FIELDS` |

`scripts/knowledge-ssot.mjs` renders only `DOSE_FIELDS = [obat, dosis, frekuensi, durasi, rute, populasi, sumber, halaman, kelas]`, so the three fields v0.6 added are dropped without a warning.

## Where the rows come from

| `catatan` | Rows |
|---|---|
| "Diekstrak otomatis dari naskah PNPK; cek kutipan." | 4,550 |
| "Diekstrak otomatis dari naskah terapi; cek kutipan." | 1,901 |
| empty (manual rows: PNPK, PPK FKTP, KMK, Permenkes, SKDI) | 2,248 |
| "indikasi …" | 108 |
| "Dosis umum obat ini dari penyakit lain; bukan regimen khusus …" (`sumber` "rujukan silang", 14 entries) | 106 |
| "obat disebut di narasi gudang; dosis umum obat menurut ISO" | 12 |

About 72% of the rows (6,451) are auto-extracted and the SSOT itself asks for a check against `kutipan`.

## Quality findings

1. **Cross-referenced doses lose their caveat.** The 106 "rujukan silang" rows are another disease's dose (e.g. Alergi Makanan gets cetirizine 10 mg from Influenza). The SSOT marks them "bukan regimen khusus … Verifikasi" in `catatan`, but `catatan` is not rendered, so the chunk shows them like any other dose line. The evidence gate matches dose strengths in passage text, so nothing stops it from verifying such a dose for the receiving disease.
2. **Non-drug values in `obat`.** A heuristic finds about 590 rows, all auto-extracted, where `obat` is a statistic or a lab target: first words "sekitar" 108, "sebanyak" 57, "angka" 46, "pasien" 35, "kebutuhan" 35, "penurunan" 30, "target" 26, "kadar" 23, "sensitivitas" 19, "TBSA" 14. These reach the index, e.g. `- obat: Sensitivitas; dosis: 95%; sumber: PNPK (004_PNPK_2024_Tata_Laksana_Akupunktur_Medik.pdf) …`.
3. **Percent-only doses.** 2,361 rows have a dose that is only a percentage. Many are real concentrations (NaCl 0.9%, lidocaine 2%); 479 sit next to statistics words and overlap finding 2.
4. **Duplicates.** 1,550 rows repeat the same entry, obat, dosis and populasi with a different `sumber` (mostly "Oracle II / PNPK" vs "dokumen index"). They take chunk space and push other lines out.
5. **`halaman` types.** Number, digit string and null are mixed; rendering hides this, but any future page check has to normalise it.

## Who reads the dose fields

- `scripts/knowledge-ssot.mjs` `doseLines` → `build-theoracle-chunks.mjs` (the "## Dosis" section of each SSOT chunk) and `build-oracle-catalog.mjs` (`terapi` + "Dosis:").
- `src/lib/theoracle-evidence-gate.ts` reads passage text only, not SSOT fields. No other `src` code reads SSOT dose fields.

## Options (Gaffer decides; none applied)

| Option | Where | Effect | Cost |
|---|---|---|---|
| A. Render `catatan` for "rujukan silang" rows (or drop those rows) | builder | caveat visible to model and gate | rebuild + full re-embed (~21 min) |
| B. Render `kutipan` (and `konteks`) | builder | passages carry the guideline's own sentence | larger chunks; retrieval numbers move, needs a benchmark |
| C. Filter non-drug `obat` rows | SSOT (preferred) or builder | removes ~590 junk lines | a builder heuristic can drop real rows; better fixed upstream |
| D. Deduplicate identical rows, keep both sources in one line | builder or SSOT | ~1,550 fewer lines | rebuild + re-embed |
| E. Remove `kelas` from `DOSE_FIELDS`, normalise `halaman` | builder | housekeeping only, no output change | small |

Any of A–D changes the index and so the retrieval numbers; per Gaffer's rule that retrieval is not tuned again, they need a deliberate decision and a benchmark against the v0.6 baseline (`benchmark-v06-index`).

## Option A applied (Gaffer, 2026-10-23)

- `doseLines` adds `catatan` to a row whose `sumber` starts with "rujukan silang"; other rows are rendered as before.
- Rebuild: 17,570 chunks (1,984 SSOT + 15,586 PDF), all 106 caveats present, `indexSha256` `0dccb6dc…`. The 17,541 chunks with unchanged text keep their vectors (min cosine 0.99999994 against the previous index).
- Benchmark (`benchmark-v06-optA.json` vs `benchmark-v06-index.json`): identical in every category; overall recall@5 0.864, doseRecall 0.82, targetedDoseRecall 0.934.
- Limit: the evidence gate still matches dose strengths and does not read the caveat; a gate rule for cross-referenced doses is gate-logic work.

## Gate rule for cross-referenced doses (Gaffer, 2026-10-23)

- `gateTherapy` no longer reads a strength from an SSOT dose statement whose `sumber` is "rujukan silang"; the drug can still be named from it and is then shown without a dose. Replay: `cross-reference-gate-replay.jsonl` (TB isoniazid 300 mg now `doseRemoved`; food-allergy cetirizine still verified through Rinitis Alergika).

## Options B-E applied (Gaffer, 2026-10-23)

- B: `konteks` and `kutipan` are rendered; every field is kept on one line ("6\njam" reads "6 jam").
- C: 754 auto-extracted rows whose `obat` starts with a statistic, lab or fragment word (sekitar, sebanyak, angka, sensitivitas, kadar, TBSA, glukosa darah, …) are left out; manual rows are never dropped. Spot check: the clinically relevant dropped fragments (measles vitamin A by age, iron 120 mg in pregnancy, delirium "maksimal 20 mg") are still in their entry's therapy text or another dose row.
- D: 406 rows merge into lines that say the same thing (every field but `sumber` and `halaman`), with sources and pages joined by " / "; a cross-referenced row never merges with the entry's own.
- E: `kelas` left the field list; `halaman` numbers and digit strings render alike.
- Rebuild: 7,765 dose lines from 8,925 rows; 17,993 chunks (2,407 SSOT + 15,586 PDF), `indexSha256` `c63b1627…`; the 16,654 chunks with unchanged text keep their vectors (min cosine 0.99999994). No cross-referenced line is cut before its `sumber` at a chunk boundary.
- Benchmark (`benchmark-v06-optBE.json` vs `benchmark-v06-optA.json`): no category drops; drug_dose 0.625 → 0.75, exact_terms 0.63 → 0.667, overall 0.864 → 0.875; doseRecall 0.82 and targeted 0.934 unchanged. Warm query latency p50 73.7 → 86.1 ms.
- Replay of the shown doses (`gate-rules-replay-optBE.jsonl` vs `gate-rules-replay.jsonl`): 48 → 47 verified. typos-11 (D56.1) asam folat 2x1mg is now `removed`: the Thalasemia entry grew from 13 to 17 chunks and its dose chunk holding asam folat is no longer among the retrieved passages (two-per-document cap). Reported, not tuned.
