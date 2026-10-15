# Sentrapedia handoff

## Public site on Vercel, WIP notice - 2026-10-15 Asia/Jakarta

- Published to `drferdi/Sentrapedia` main as `9b8e4746` (Gaffer pushed from the temporary worktree `D:\DEV\monorepo.worktrees\sentrapedia-publish`; split branch `sentrapedia-site-split`). The merged tree passed typecheck, lint, `test:all` (288 + site 13 + system 8 + MIRA 180/1 skipped), build and deploy dry-run. The monorepo capsule still lacks the 38 dose-gate commits that live only on GitHub main; future monorepo extraction runs test that older clinical code until they are synced back.
- Vercel: project `sentrapedia` (`prj_tJejwcrthTPy78qBtdqbnYoyRvcW`, team Sentraverse), site only (`apps/site`), build `node scripts/transform.mjs`, output `site`. No Git link: the Vercel account has no GitHub login connection and Gaffer's dashboard login loops, so deploys go through the CLI from `apps/site` with `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` set (no `.vercel/` folder is written). The first CLI deploy became production automatically.
- `https://sentrapedia.vercel.app` is public (protection `all_except_custom_domains` leaves the production domain open); per-deployment URLs require Vercel login. Gaffer chose to keep it public with a "Work in progress · Persiapan beta" strip above the header (inline style in `source/index.html`, protected theme CSS untouched; manifest hashes for `source/index.html` and `site/index.html` updated). The `/api/contact` form does not work on static Vercel.
- Open: the site SPDS (`acceptance_report.md`, `deployment_architecture.md`) still says hosting is unknown and production is not granted; update it with Gaffer's decision. Connect Git once the Vercel GitHub login connection exists (then set Root Directory `apps/site` and Git LFS on).

## Standalone extraction after the site move - 2026-10-14 Asia/Jakarta

- The site move landed in `d9dfa44c` (Codex, not pushed). The "still uncommitted" note below is superseded.
- `node tools/project-standalone/src/cli.mjs verify healthcare/sentrapedia` (run 1) failed at install: `apps/site/site` was in `mutableStatePaths` and `apps/site/site/index.html` in `artifacts`, so extraction left out 68 tracked site files (HTML, theme CSS, fonts) that `install:check` and the site tests read before build.
- Fix (uncommitted, Gaffer said "go"): `project.contract.json` drops both entries. `artifacts` is now `.next/BUILD_ID` only; `mutableStatePaths` keeps `apps/site/reference/verification.json`. `check_project_independence.py` OK, verifier `status` structural PASS.
- Run 2: install, lint, typecheck PASS; test FAIL in `test:mira` only (vitest 270/270, site 13/13, system 8/8 passed). build, run, deployDryRun did not run. Cleanup PASS.
- Cause of the MIRA failure (`test_packaging.py`, `service/menu.py`): the working copy has CRLF while `.gitattributes` says `eol=lf`; the Git blob hashes to the recorded `f9f661f4…`. Not a repo defect, so a fresh clone should pass. `git ls-files --eol` shows 8 such files (6 under `mira/`, `tests/mira-composer.test.ts`, `apps/site/docs/migration-manifest.json`).
- Contract fix committed in `2506cdee`. With Gaffer's approval the 8 files were then re-checked out with LF (Git diff empty; `menu.py` hashes to `f9f661f4…`; `test_packaging.py` 2/2).
- Run 3: install, lint, typecheck, test, build, artifacts, deployDryRun and cleanup PASS. Only the HTTP smoke failed: `run-system.mjs start` exits with "OPENROUTER_API_KEY belum tersedia", because the verifier sanitizes the environment and `.env.local` is never copied. This is the declared required secret, not a portability defect.
- The verifier cannot pass the key: its environment allowlist holds only system variables (PATH, TEMP, COMSPEC and similar). Gaffer chose a manual smoke instead. 901 tracked files were copied to a scratch folder with no `.env.local`; `npm ci` and `build` exited 0 there. Gaffer then copied the key in himself, ran the smoke script (`SMOKE PASS (HTTP 200)` at `127.0.0.1:3101/`) and removed the copy. The agent never handled the key.
- Result: every lifecycle stage plus the HTTP smoke is proven for the extracted capsule. The smoke is manual evidence, not a verifier PASS. Passing declared secrets to the verifier would be a separate `tools/` change.
- LFS gap found while preparing the publish: every capsule PNG is an LFS pointer, but the `*.png filter=lfs` rule lived only in the monorepo root `.gitattributes`, which the subtree split does not export. A clone of `drferdi/Sentrapedia` therefore got 130-byte pointer text instead of images (86 PNGs on GitHub main before this publish, including `src/app/icon.png`), and the site test `migration-boundary` failed on the split. The extraction verifier missed it because it copies working-tree files, which the monorepo had already smudged. Fix: the capsule `.gitattributes` now carries the PNG rule itself.

## Public site integrated into the product capsule - 2026-10-14 Asia/Jakarta

- **Gaffer's authoritative topology:** Sentrapedia is one sovereign product capsule and future repository at `projects/healthcare/sentrapedia/`. The clinical system remains at the capsule root; the public website now lives at `apps/site/`. Do not recreate the former sibling capsule `projects/healthcare/sentrapedia-website/`.
- The move uses Git renames so website history is preserved. Nested capsule metadata (`project.contract.json` and `.agents/`) was removed from the site; site identity is recorded in `apps/site/SITE_GENOME.yaml`. Site SPDS stays under `apps/site/docs/spds/` and applies only to the public non-device marketing surface.
- A future product demo belongs at `apps/demo/` as configuration and synthetic data around shared product code. It must not become another capsule or a fork of the clinical application.
- **Approved visual direction:** the hero intro contains only the animated neuron logo followed by the `Sentrapedia` wordmark. Do not restore the generic headline/copy beginning with “Konteks klinis tertata…”. The last local preview at `http://127.0.0.1:3401/` rendered with CSS after the correct site preview server was started.
- **Website verification observed:** `install:check`, `build`, `docs:verify` (96 documents, 0 errors), `lint` (23 authored JavaScript files), `test` (13/13), `verify` (23 protected presentation files and 48 targets, 0 errors), and `deploy:dry-run` all passed from `apps/site/`. Parent `typecheck` passed; isolated parent `eslint src tests` and site lint both exited 0.
- **Scope boundary:** MIRA belongs to the clinical system, not the website. A broad `npm run test:all` was mistakenly attempted and reached an unrelated pre-existing hash mismatch in `mira/service/menu.py`. Do not modify MIRA or its provenance for this website/topology task. No tracked MIRA file changed; the locally installed `.runtime/mira` and `theoracle/model` are ignored environment artifacts.
- **Current Git state:** topology migration and documentation updates are still uncommitted on branch `codex/sentrapedia-website-docs`. Review/stage only `projects/healthcare/sentrapedia`, the deletion of `projects/healthcare/sentrapedia-website`, and the two healthcare domain navigation files. Then create the pending local commit. No push, merge, deployment, paid inference, or live contact submission is authorized.
## Dose gate audit: corrections applied, three reviews, phase 4 - 2026-10-12 Asia/Jakarta

- Gaffer approved all seven corrections from the audit REPORT section 4, and phase 4 after the gate fixes.
- Commits (all R2):
  - `27b7f108` ch->k
  - `86a8cec7` targeted gate reads the diagnosis passages too (`gateEvidence`)
  - `5e31f714` a strength verifies only the drug it follows
  - `604e286c` a single strength inside a source range
  - `f3966c0f` ODHA = HIV, I84 = K64
  - `12efd483` MIRA breaker counts one failure per part and logs the provider error and status
  - `4d902a4d` the fast therapy prompt asks for an amount in every dose
  - `d6e0768a`, `ee5bc240`, `16e83955` fix the findings of three Opus reviews of the dose window
- The window rule is now: after a cut point, every word up to the next strength must be on a known-word list or be the drug's own name, otherwise the window ends (fails safe). A "+" partner is masked. A daily total does not verify each of several doses.
- Offline replay of the same 122 replies: legacy 42 -> 48, targeted 42 -> 48 at `ae480804`, with no wrong-disease or wrong-drug verification left among them. Against the 49/49 peak: the impetigo amoxicillin-clavulanate row was another drug's range (a correct block), and legacy isoniazid 300 mg came from an MDR weight-band table (a fail-safe blank).
- Tests: gate 91/91, the 7 gate test files 181/181, MIRA 180 passed + 1 skipped. `tsc` 0, `eslint` 0 on the touched files.
- Live eval: the third run reached 8/61. The new engine log shows the cause of all three failed runs: OpenRouter HTTP 402 (credit exhausted). The earlier rate-limit reading was wrong. The live before/after and the effect of the prompt change wait for Gaffer to top up the credit.
- Phase 4, REPORT section 7: no wrong dose in the 10 Gaffer-approved tatalaksana documents against PNPK, IDSA/SIS, ADA and AAO-HNS.
  - Six coverage gaps, among them the asphyxia ETT dose and 1:10.000 concentration, and the Hirschsprung irrigation of 10-20 mL/kgBB.
  - Three doses are unverified: oxymetazoline, topical TXA, and pip-tazo 4,5 g / meropenem.
  - Editing the documents is Gaffer's clinical decision.
- Known limits (REPORT section 6):
  - Two drugs with no cut point between them share a window.
  - The FORNAS sentence-end case blanks citations.
  - Section 3 design items 1-4 are unchanged.
- Review 4 of `16e83955` returned FIX with three new leak categories: slash-positional combination strengths, a model-written combined name, and a "+" partner with two strengths (REPORT section 6). Gaffer chose a drug-name lexicon: `2327700f` (837 words, `scripts/build-drug-words.mjs`), tests 89, replay 49/48. Review 5 returned FIX with three new categories: lexicon misses fail open (metformin, simvastatin, lamivudin, INH...), salt-only drug names, and slash alternatives with different doses. Gaffer then chose a per-strength fail-safe rule: `ea2fe8f8` (a strength counts only when the last name-like word before it is the drug's own; any unknown word fails safe; lexicon removed) and `ae480804` (review-6 fixes: alias bracket, partner after a separator, 4+ letter own names, vitamin codes, FORNAS form reset only in FORNAS passages, column tables). Review 7 (class A only) was fixed in the following commit, which has not been reviewed itself. Tests 91, gate test files 181/181, replay legacy 48 / targeted 48 (two fail-safe blanks, REPORT section 6).
- Harness: `.runtime/audit/` (git-ignored), rows-review.json (49/49 baseline), rows-rereview.json, rows-round3.json.
- Published 2026-10-12 with Gaffer's approval ("commit and push"):
  - The dose gate audit plan is now tracked: `docs/plans/active/Audit_actions.md` (`c1acef29`).
  - Split `9a6e2dc0` (from `c1acef29`) was not a fast-forward of `sentrapedia/main` `c0ef8ba6`, because GitHub main holds the README edits. It was merged in the temporary worktree `D:\DEV\monorepo.worktrees\sentrapedia-publish` (only `README.md` differs from the split) and pushed as `cebb6753`, a fast-forward. No force push.
  - Before the push, the repo was checked as private (the anonymous GitHub API returns 404), so `data/dose-inventory/iso_gap_fill.json` (ISO excerpts) is not public. A leak scan of the split found no key or token; the only env file is `.env.example`.
  - GitHub reports 1 high Dependabot alert on the default branch (`security/dependabot/1`). It was not read, because `gh` is not authenticated.
  - Main checkout `D:\DEV\monorepo` (`chore/tools-closeout`): the `tools/retriever` handoff edits were committed as `eefe8982`. The stale sentrapedia copies there (older `SOURCE.json` and `test_packaging.py`, the HANDOFF sections already ported, the `next-env.d.ts` dev touch, and the audit plan, now tracked) were stashed, not deleted: `stash@{0}` "superseded by feat/sentrapedia-dify-theoracle @c1acef29". The `next-env.d.ts` dev touch in this worktree was restored.
  - Then this note was committed and published again with the same merge step.

## Dose gate audit, phase 2-3 (offline) - 2026-10-12 Asia/Jakarta

- Gaffer approved the audit of `docs/plans/active/Audit_actions.md` (main checkout, untracked), then chose to continue offline after two failed live runs.
- Live 61-case eval failed twice (18/61, 12/61; about $0.29). The MIRA API-error breaker opened after consecutive provider errors and paused calls for 60 s. It counts failed parallel copies too; the provider error type is not logged. Committed eval files were restored after each run.
- Offline harness in `.runtime/audit/` (git-ignored): `extract.py`, `replay.test.ts` (run with `REPLAY_IN`/`REPLAY_OUT` and `npx vitest run .runtime/audit/replay.test.ts`), `corpus_scan.py`, `classify.py`. It reproduces the 2026-10-11 replay exactly: 42 verified on both paths.
- Result in `docs/verification/dose-gate-audit-2026-10-12/` (`REPORT.md`, `classification-targeted.json`): 29 non-verified targeted drugs. 20 are correct blocks (A 5, E 2, F 1, G 1, H1 6, H2 5); 9 are correct doses not shown (B 3, D 6). Confirmed defect: `spell()` maps "ch" to "kh", so chlorpheniramine never matches klorfeniramin.
- Verified doses (42): one unsupported, lamivudin 300 mg verified by zidovudin 300 mg in the same FORNAS passage. Design limits: a concentration or a FORNAS strength counts as a dose, frequency is not checked, population is not checked.
- No code changed. Six bounded corrections are proposed in REPORT section 4, awaiting Gaffer.
- Not done: live reproduction, the 10-disease benchmark (phase 4).
- Not pushed.

## Dify out of the main composer; dose inventory tracked - 2026-10-12 Asia/Jakarta

- Gaffer: Dify is only a side chatbot, not part of the main system; the main system is MIRA diagnosis and therapy accuracy. Gaffer chose this branch for the work and to track the inventory without the legacy files.
- `0a708b4e` (R2): `analyzeMain` in `src/components/workspace.tsx` calls MIRA only. The block is restored byte for byte from `0ebd2abf^` (checked with `diff`). Before, with `DIFY_API_KEY` set, every MIRA-mode question was answered by Dify and skipped grounding, postchecks and the evidence gate. The `/dify` page, `api/dify/*` and the sidebar entry are unchanged.
- Dose inventory: five files copied from the main checkout's `.runtime/dose-inventory/` to `data/dose-inventory/` (SHA-256 identical), plus a README. `penyakit.json` and `drug_mapping.json` stay untracked. `build_inventory.py` cannot rerun on this branch: `oracle-ii/knowledge_base/json/` is not here.
- Main checkout (`chore/tools-closeout`): its four uncommitted MIRA files are an older copy of this branch (`postchecks.py`, `test_components.py` identical; `test_packaging.py`, `SOURCE.json` older). Left untouched; Gaffer decides whether to discard them.
- Verified: `tsc` 0, `eslint src/components/workspace.tsx` 0, `vitest tests/workspace.test.ts tests/mira-composer.test.ts` 47/47. Full suite, build and browser check not run.
- Open: `iso_gap_fill.json` holds verbatim ISO Indonesia excerpts; decide before pushing to a public remote. Next dose-gate work is `docs/plans/active/Audit_actions.md` in the main checkout (untracked there), which needs paid eval calls.
- Not pushed.

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
