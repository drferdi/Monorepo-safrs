# Sentrapedia handoff

## Logo middle: meaning lines under the big wordmark - 2026-10-16 Asia/Jakarta

- Gaffer asked for meaning under the big wordmark in `#logo-middle`: `.logo-middle-lockup` wraps the SVG with two lines, "Architected and built by professional doctors." (`.logo-middle-claim`, ink, weight 500) and "Dikembangkan di RSIA Melinda DHAI." (`.logo-middle-origin`, muted), where the hospital name links to https://melinda.co.id/ (same tab, underlined in the action colour, focus ring). The copy is Gaffer's wording with the English grammar fixed; the hospital name is exactly as he wrote it.
- Styling lives in `assets/design-audit.css`. The wordmark SVG (1380x650) carries its own whitespace: the artwork ends 16.6% of the width above the bottom edge and is centred at 47.5%, measured by rasterising the SVG in the browser. The lines use `margin-top: calc(-10% + .75rem)` and `left: -2.5%` so they sit under the artwork on its own axis; block flow on purpose, because a negative margin inside a grid stretched the paragraph box to 166 px. After Gaffer's "too tight" note the gaps are about 6.6% of the lockup width plus 12 px above the first line and .9em between the lines.
- `scripts/verify.mjs` (verification control, R2): the external-target rule now carries `outboundLinks`, an allowlist holding only `https://melinda.co.id/`; every other `src`/`href`/`poster`/`srcset` target must still be local. The site had no outbound link before this.
- Verification: build, lint 26 files, test 15/15, verify 22 protected files, 57 local targets, 0 errors, docs:verify 96/0, deploy dry-run OK; manifest regenerated (140 entries). Browser at 1440 and 375 wide: lines centred under the artwork, link present, no horizontal overflow. Committed as `4cd5667b` on `feat/sentrapedia-hero-workspace`, not pushed.
- Open: whether line one should be Indonesian ("Dirancang dan dibangun oleh dokter profesional.") is Gaffer's call; FR-03 and the 4.6 MB clip carry over.

## Hero film revised: push-in match cut - 2026-10-16 Asia/Jakarta

- Gaffer reviewed the hero live and judged the film-to-simulation transition disconnected ("putus"): the first clip barely moved, so the dissolve jumped from a wide studio shot to the flat device. Replaced on his instruction with a second Kling 3.0 Turbo clip (Higgsfield MCP `generate_video`, job `900d4a3c`, 5 s, 720p, same start image `workspace.png`): a continuous dolly-in from the wide shot until the monitor screen nearly fills the frame. Frames checked at 0, 1.6, 3.2, 4.3 and 5.0 s. The MCP's "IN THE DARK" preset recommendation was declined; the literal camera move was generated. Cost 7.5 credits (112.5 -> 105); total for the task 15 of the approved 18. The first clip is kept only in the session scratchpad (`higgsfield/hero-film-v1.mp4`). Committed as `d7ae2c48` on `feat/sentrapedia-hero-workspace`, not pushed.
- `hero-workspace.js`: the dissolve now starts 1.2 s before the film ends (`timeupdate`) instead of after the last frame, the video keeps zooming (scale 1 -> 1.12) while the device frame fades in from scale .9; the way back (simulation -> film) mirrors it (frame to .92, video from 1.12 to 1, video plays at once). After Gaffer's second note (no black bars above and below, "tablet only") the film layer became the same device frame as the simulation: `.hero-workspace-film` carries the bezel padding, radius and shadow, and a new `.hw-film-screen` wrapper (3:2, 4:5 under 768px) clips the `object-fit: cover` video, so film and simulation share one footprint to the pixel and nothing is letterboxed. `transform-origin: var(--hw-film-focus, 50% 50%)` on the video tunes the zoom focus. A `play()` promise rejected with `AbortError` (a pause right after play, e.g. scrolling away) no longer falls back to the simulation; only other rejections (autoplay blocked) do.
- Verification: build, lint 26 files, test 15/15, verify 22 protected files, 57 targets, 0 errors, docs:verify 96/0, deploy dry-run OK; manifest regenerated (140 entries). Browser (seek-based, hidden-page throttling as before): both transitions reach the intended end states, mid-dissolve state captured with the new clip on desktop and mobile, film and frame rects identical at 1440 and 375 wide (677x459 and 356x441), console 0 errors. Real-time playback still only observable by Gaffer with the window in view.
- Open: the clip is still 4.6 MB (no ffmpeg here); FR-03 wording; the film's last frame is a slightly angled screen, so the cut is close but not pixel-matched (a start+end-frame Kling 3.0 render at 10 credits would be the next step if Gaffer wants it tighter).

## Hero: product film + workspace simulation, arrival choreography - 2026-10-16 Asia/Jakarta

- Branch `feat/sentrapedia-hero-workspace` (cut from a dirty `main`, earlier WIP carried along); committed as `2bfcc5f9` on that branch, not pushed. R2: `scripts/verify.mjs` (gate) and `reference/design-integrity.json` (baseline) changed.
- Removed: `assets/sentrapedia-hero.webm` and `site/assets/theme/img/sentrapedia-hero.webm` (never rendered), their copy step in `transform.mjs`, the hash and Range checks in `verify.mjs`, the `design-integrity.json` entry, and the uncommitted carousel WIP (`assets/hero-showcase.css/js`, `site/media/hero-showcase.*`; a copy exists only in the session scratchpad `wip-hero-showcase-2026-10-15/`).
- Added `assets/hero-workspace.css`, `assets/hero-workspace.js` and `assets/hero-film.mp4` (all copied to `site/media/` by `transform.mjs`). `source/index.html`: `#intro` keeps the neuron and the `h1` wordmark; beside them `.hero-workspace` holds a `role="img"` stage (its aria-label describes film and simulation, children `aria-hidden`), a muted `playsinline` `<video>` layer, the device frame with the simulated workspace (sidebar, topbar, Analisis/Dokumentasi/Rencana tabs, composer, DDx draft, SOAP document, review checklist, referral draft, SVG pointer), the caption "Film produk dan simulasi visual · kasus sintetis · keputusan dokter" and a "Jeda/Putar" button (`aria-pressed`).
- Motion (vendored GSAP 3.15, `gsap.matchMedia`): a 3.9 s arrival in Gaffer's order (neuron alone in the centre, slides left as the wordmark joins it, the lockup slides left again as the device enters from the right; offsets are measured from the final CSS layout and are zero on the column layout). Then the film (Kling 3.0 Turbo, 5 s, 720p, letterboxed in a 3:2 ink box so it shares the frame's footprint) dissolves into the simulation: scene 1 opens the encounter -> DDx chip -> the synthetic case is typed -> send -> "Draf lokal" DDx card; scene 2 Dokumentasi -> SOAP -> the document opens; scene 3 review checklist 4/4 -> status "Ditinjau"; scene 4 Rencana -> referral reason typed -> referral draft; then back to the film. Film-first only when `readyState >= 3`, otherwise simulation-first; `ended`/`error` fall back to the simulation. An IntersectionObserver pauses off-screen, the button pauses both, resize calls `tl.invalidate()`.
- Accessibility and no-JS: `prefers-reduced-motion: reduce` -> `.is-static` (static composition, film `display: none`, no float or light sweep, button hidden); `@media (scripting: none)` shows the static frame; entrance fades use `opacity` rather than `visibility`, so the `h1` never leaves the accessibility tree; `#intro.is-choreographed { overflow-x: clip }` keeps the slide-in off the horizontal scrollbar; the theme's `neuron-arrive`/`wordmark-arrive` keyframes are disabled only while GSAP owns the arrival.
- Pipeline: `transform.mjs` copies css, js and mp4; `verify.mjs` compares `assets/` with `site/media/` hashes for all three and requires HTTP 200 for `/media/hero-film.mp4` plus a 206 Range answer with `video/mp4`; `hero.test.mjs` asserts the new markup; `docs/migration-manifest.json` regenerated (140 entries).
- Verification (from `apps/site`): build OK; lint 26 files; test 15/15; verify 22 protected files, 57 targets, 6 motion assets, 0 errors; docs:verify 96 documents, 0 errors; deploy dry-run OK. Browser: desktop 1440x900, mobile 375x812 and 1024x768 checked by timeline seeks (arrival states at 0.9 s, 2.4 s and the end; film-first state; simulation scenes; pointer within 2 px of its targets; no horizontal overflow at any step; the main pane fits the 4:5 mobile screen); reduced motion via Playwright emulation (static, film hidden, button hidden). Console: 0 errors. Real-time playback was NOT observed: both test browsers ran as hidden pages (rAF about 1 Hz, GSAP lag smoothing), so the timing is proven by seeks only.
- Higgsfield: Seedance 2.5 refused ("Pro or Ultimate plan required", no charge); Kling 3.0 Turbo image-to-video, 5 s, 720p from `clinical-product/workspace.png` cost 7.5 credits (120 -> 112.5). Gaffer approved up to 18 credits for the draft; a final-quality render is a separate decision. The clip was saved from the Higgsfield CDN result as `assets/hero-film.mp4` (4.5 MB).
- Open risks: (1) `hero-film.mp4` is 4.5 MB with `preload="auto"`; no ffmpeg on this machine to re-encode (a web encode near 1-1.5 MB is advisable before the next publish); (2) SPDS FR-03 ("Hero contains only the neuron and Sentrapedia heading") now drifts from the shipped hero; amending the requirement text is Gaffer's call; (3) arrival offsets are measured once at script time, so a resize during the 3.9 s arrival is not re-measured; (4) `.impeccable/` at the monorepo root is an untracked artefact of the impeccable plugin hook, not part of this change.
- Next: Gaffer reviews the hero live (Claude or browser window in view so the motion runs in real time), decides on the commit, on a re-encode of the clip and on the FR-03 wording; then the usual publish path (split + merge in the publish worktree).

## Public site on Vercel, WIP notice - 2026-10-15 Asia/Jakarta

- GitHub and monorepo are in sync. `drferdi/Sentrapedia` main went `9b8e4746` -> `2b371155` (pushed by the agent on Gaffer's "Samakan GitHub", fast-forward, no force; publish worktree `D:\DEV\monorepo.worktrees\sentrapedia-publish`, split branch `sentrapedia-site-split`). Gates on the pushed tree: typecheck, lint, `test:all` (288 + site 15 + system 8 + MIRA 180/1 skipped), build, deploy dry-run; sanitation clean. GitHub reports 1 high Dependabot alert (not read).
- The 38 dose-gate commits that lived only on GitHub were brought into the monorepo as a tree import (`9b759c98`): the capsule tree equalled `2b371155` exactly (empty tree diff); typecheck, MIRA packaging 2/2 and evidence gate 91/91 passed. Histories stay unrelated, so the next publish again uses split + merge in the publish worktree.
- Vercel: project `sentrapedia` (`prj_tJejwcrthTPy78qBtdqbnYoyRvcW`, team Sentraverse), site only (`apps/site`), build `node scripts/transform.mjs`, output `site`. Deploy from `apps/site` with `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` set and `npx vercel@latest deploy [--prod] --yes` (no `.vercel/` folder). `https://sentrapedia.vercel.app` is public with the "Work in progress · Persiapan beta" strip, by Gaffer's decision.
- Contact form: `api/contact.mjs` (Vercel Function) reuses `scripts/contact.mjs`; rate limit keys on `X-Forwarded-For`. `CONTACT_PUBLIC_ORIGIN` is set on Vercel. Live matrix: GET 405, wrong type 415, foreign origin 403, patient-like 400, valid 503 "Layanan pengiriman belum tersedia". To turn delivery on, Gaffer adds `RESEND_API_KEY` and `RESEND_FROM_EMAIL` himself (Vercel env, production), then redeploys.
- Site SPDS updated (deployment architecture, acceptance, risk register, snapshot, genome unknowns); `docs:verify` 96 documents, 0 errors.
- Blocked on Gaffer's Vercel dashboard login (Google loop): Git-connected deploys need a GitHub login connection (then Root Directory `apps/site`, Git LFS on) or a `VERCEL_TOKEN` for GitHub Actions. Not built, since neither can be tested now.
- Local monorepo `main` now contains branch `codex/sentrapedia-website-docs`: merge commit `67b1c045` (`--no-ff`, 0 conflicts, all 32 branch commits including the non-Sentrapedia ones, by Gaffer's choice). After the merge `check_topology.py` and `check_project_independence.py` passed. Not pushed.
- Still open: third-party license register for the site; monitoring.

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
