# Sentrapedia handoff

## Public site integrated into the product capsule - 2026-10-14 Asia/Jakarta

- **Gaffer's authoritative topology:** Sentrapedia is one sovereign product capsule and future repository at `projects/healthcare/sentrapedia/`. The clinical system remains at the capsule root; the public website now lives at `apps/site/`. Do not recreate the former sibling capsule `projects/healthcare/sentrapedia-website/`.
- The move uses Git renames so website history is preserved. Nested capsule metadata (`project.contract.json` and `.agents/`) was removed from the site; site identity is recorded in `apps/site/SITE_GENOME.yaml`. Site SPDS stays under `apps/site/docs/spds/` and applies only to the public non-device marketing surface.
- A future product demo belongs at `apps/demo/` as configuration and synthetic data around shared product code. It must not become another capsule or a fork of the clinical application.
- **Approved visual direction:** the hero intro contains only the animated neuron logo followed by the `Sentrapedia` wordmark. Do not restore the generic headline/copy beginning with “Konteks klinis tertata…”. The last local preview at `http://127.0.0.1:3401/` rendered with CSS after the correct site preview server was started.
- **Website verification observed:** `install:check`, `build`, `docs:verify` (96 documents, 0 errors), `lint` (23 authored JavaScript files), `test` (13/13), `verify` (23 protected presentation files and 48 targets, 0 errors), and `deploy:dry-run` all passed from `apps/site/`. Parent `typecheck` passed; isolated parent `eslint src tests` and site lint both exited 0.
- **Scope boundary:** MIRA belongs to the clinical system, not the website. A broad `npm run test:all` was mistakenly attempted and reached an unrelated pre-existing hash mismatch in `mira/service/menu.py`. Do not modify MIRA or its provenance for this website/topology task. No tracked MIRA file changed; the locally installed `.runtime/mira` and `theoracle/model` are ignored environment artifacts.
- **Current Git state:** topology migration and documentation updates are still uncommitted on branch `codex/sentrapedia-website-docs`. Review/stage only `projects/healthcare/sentrapedia`, the deletion of `projects/healthcare/sentrapedia-website`, and the two healthcare domain navigation files. Then create the pending local commit. No push, merge, deployment, paid inference, or live contact submission is authorized.

## Eval: ICD-10 label-to-name overlap (M5) - 2026-10-12 Asia/Jakarta

- Gaffer asked for M5 and approved the bounded design with one Opus review.
- `0663d938` (R1):
  - New `scripts/icd-name-match.mjs` applies the `postchecks.py` lexical rule: a meaningful label word must occur in the official name of the code or its category.
  - `scripts/eval-theoracle-pipeline.mjs` adds per-row `icdNameMatch` and summary `icd10.nameMatch`. `valid` still only means "the code exists in the BPJS list".
- The Opus review returned "with fixes" (wording only). The metric is not a lower bound: a wrong disease that shares a class word ("Typhoid fever" for R50.9, "Type 1 diabetes" for E11.9) still matches. `df5829f8` calls it "approximate lexical overlap", and a test records both directions.
- Offline re-score of the stored rows (no model calls): 57/61 on both paths. The 4 non-overlapping rows have correct codes (synonyms, Indonesian labels, stunting), as recorded in `PIPELINE-REPORT.md`.
- Verified: RED first; `tests/icd-name-match.test.ts` 3/3, `npm test` 270/270, `tsc` 0, `eslint` 0, `node --check` on the eval script. The eval script itself was not run, because it makes paid calls.
- Not pushed.

## MIRA client gates therapy that arrives without a gate report (M1) - 2026-10-12 Asia/Jakarta

- Gaffer asked for M1 and approved the bounded design with one Opus review.
- `f0341f0f` (R2), `src/lib/mira/client.ts`:
  - When `result.therapy` arrives without `evidenceGate`, the client runs `gateTherapy` itself, against `therapyGrounding` (or the diagnosis `grounding`) and `likely[0]`, as the gateway does. This can only happen with an older or faulty server.
  - The diagnosis is kept. Unverified doses are blanked, and the therapy is dropped when no drug is kept.
  - The report is stored, so `content` and `sourceText` no longer hold unchecked doses.
  - A reply with a valid report is used as sent.
- Opus review: "Yes", no Critical or Important.
  - Every view (message card, document studio, history, export) already renders through `diagnosisContent`, which gates again.
  - Its test gaps are covered by a follow-up test: fallback to the diagnosis bundle, and therapy written for another diagnosis.
- Verified: RED first; `tests/mira-client.test.ts` 10/10, `npm test` 266/266 at commit time, `tsc` 0, `eslint` 0.
- Known limits:
  - The client trusts any well-formed `evidenceGate`. A forged report marking doses verified is still stored in `content`/`sourceText`, but `diagnosisContent` gates the regimen again before showing it.
  - A stale "verified" citation line for a drug no longer in the regimen predates this change.
- Not pushed.

## Evidence gate: Unicode minus and every range separator - 2026-10-12 Asia/Jakarta

- Gaffer asked for the Unicode minus fix and approved the bounded design with one Opus review.
- `81459977` (R2): FORNAS writes ranges with U+2212 ("4−8 mL", "15−30 gram"). One dash class now serves STRENGTH, the range pattern in `strengths()`, PER_KG, tablet counts, and `unstrength`'s trim. Both ends of a range are still required.
- The Opus review said "Yes": the classes are correct, and the gate is stricter on the model side. It found an older Important gap.
  - A model range written with an em dash, a figure dash, U+2010, "~", "s/d", "sampai" or "hingga" was read as its upper end alone.
  - So "250—500 mg" was verified by a passage with only "500 mg" (a leak, not fail-safe), and `unstrength` left "Amoksisilin 250".
- Fixed in `2e6a2ecd`: one `RANGE` separator (U+2010-2014, U+2212, "~", "s/d", "s.d.", "sampai", "hingga") used everywhere a range is read.
- Verified:
  - RED first (both rounds); gate tests 73/73, `npm test` 263/263, `tsc` 0, `eslint` 0.
  - Replay of 122 replies against `a7c739c2`: verified 41 -> 42 legacy and 41 -> 42 targeted. Each addition was checked by hand against its passage:
    - targeted: kalsium polistiren sulfonat 15-30 g/hari for N18.5 (FORNAS 2023 "15−30 gram/hari ... sampai dengan dialisis");
    - legacy and targeted: furosemid 1x20-40 mg for I50.0 (FKTP 2022 and PPK IDI 2017 "furosemid injeksi 20 s/d 40 mg bolus", acute heart failure);
    - the budesonid duration is now shown whole.
- Known limits:
  - A lab range next to a drug can match a model "dose" with the same numbers and unit ("Hb 10−12 g/dL"). This was already the case before; it is unrealistic, since it needs the model to write that range as a dose.
  - Frequency is still not checked (furosemid "1x" vs "dapat diulang tiap jam").
- Not pushed.

## Evidence gate: stripped drug names are clean (#11) - 2026-10-12 Asia/Jakarta

- Gaffer asked for #11 (cosmetic leftovers after a strength is removed) and approved the bounded design with one Opus review.
- `3c80e08b` (R2), `unstrength` only, so dose verification is untouched:
  - A frequency glued to a strength goes with it: "3x500 mg", "500mg x 3", "3x1 tablet", "x 3 hari".
  - "per kg", "kg BB", "kilogram" and "berat badan" are per-unit tails.
  - A bracket left empty or holding only a limit word (max/maks/maksimal/hingga/sampai/s.d./s/d) is removed.
  - Punctuation is tidied ("Amoksisilin, 3 kali sehari", "Lidokain-adrenalin").
- The Opus review returned "with fixes".
  - Critical: a removal could join a leftover number to a leftover unit and show a new dose. Examples: "Amoksisilin 3 (500 mg) kapsul" became "Amoksisilin 3 kapsul", and "Obat 2 D5% tablet" became "Obat 2 tablet". The review found 19 such names.
  - Important: "Vitamin E400 IU" became "Vitamin".
- Fixed in `4685276f`:
  - `unstrength` repeats until the text stops changing. Its pattern contains STRENGTH, so the fixed point holds no strength.
  - Only the D of "D5%" is taken with a strength.
  - The remaining minor leftovers are tidied: "(maks,)", "(s/d)", "[]", "x 3 hari", "x 3.5 mg".
- Verified:
  - RED first (both rounds; the review's leaking names are now a test).
  - Gate tests 67/67, `npm test` 257/257, `tsc` 0, `eslint` 0.
  - Replay of 122 replies against `9bc97db2`: no output change. Only one real name carried a strength ("Permetrin krim 5%"), and it already stripped cleanly.
- Known limits:
  - A bare frequency number can remain ("Parasetamol 1-2 x 500 mg" -> "Parasetamol 1"). It carries no unit, so it is not a dose.
  - Unicode minus ranges ("4−8 mL") are still not read as ranges; that is a separate small fix.
- Not pushed.
