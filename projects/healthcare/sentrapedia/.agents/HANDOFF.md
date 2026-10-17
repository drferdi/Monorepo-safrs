# Sentrapedia handoff

## Tech-debt rows 16 (capsule CI) and 32 (README provider and privacy) - 2026-10-17 Asia/Jakarta

- Gaffer: "Kerjakan row 16 (workflow CI untuk capsule, jangan push) lalu row 32 (koreksi README soal provider dan privasi)." Risk R2 (CI workflow and public README; no app code). Not pushed.
- Row 16: `.github/workflows/ci.yml` for the standalone drferdi/Sentrapedia repository: checkout with LFS, Node 24, Python 3.11, a cache for `theoracle/model`, then `npm ci`, lint, typecheck, test:all, site:verify, site:docs, build and deploy:dry-run on push to `main`, pull requests and manual runs. No secret, no paid call (`tests/mira-paid.test.ts` is mocked).
- Verified in a fresh clone of drferdi/Sentrapedia `main` (Windows, not the Linux runner): all eight steps exit 0; Vitest 296/296, site 38 passed, system 8 passed. Two clone-only artefacts were fixed on the way (LFS pointers from a partial pull; a junctioned model that Turbopack rejects). The workflow has not run on GitHub.
- Blocker found: 84 LFS objects (80 PNGs under `docs/verification/`, 4 under `src/assets/`, 1 under `src/app/`) return 404 on the Sentrapedia LFS server, while all 84 exist in the local LFS store. The CI checkout with `lfs: true` fails until they are uploaded with `git lfs push` (needs Gaffer's approval).
- Row 32: README names the Gemini API in the three diagrams, the stack and integration cells, the privacy and external-service rows; the build protocol adds the postinstall model download and the startup metadata read, the run section explains `npm run dev` versus `npx next dev` and the gitignored `.claude/` preview config, and the verification section points at the CI. The 135-second claim and the missing grounding path were already gone. No test reads the README.
- Also seen: Gaffer merged PR #6 (`feat/sentrapedia-hero-workspace`) into Sentrapedia `main` at 22:49 and the branch was deleted.
- Next: Gaffer approves uploading the 84 LFS objects, then pushes this commit so the CI runs once on GitHub.

## Gaffer's decisions on tech-debt rows 11, 12, 15, 17, 18 and the run command - 2026-10-17 Asia/Jakarta

- Gaffer: "2. Setuju Baris 18 ... 3. Saya pilih A 4. Perbaiki 5. Setuju semua 6. samakan ke npm run start". Risk R1 (engine, gate, storage code) and R2 (manifest, provenance manifest, docs). Item 1 (push) is approved but waits for Gaffer to name the destination.
- Row 15 (choice A): `mira/SOURCE.json` marks the 14 diverged files `owner: capsule` with no `packagedSha256`; `test_packaging.py` checks pinned files against upstream, owned files for no pin, and that providers, guard and settings stay pinned.
- Rows 11 and 12: `engine.py` treats a 503 as a policy refusal only on OpenRouter, so a Gemini 503 is an outage with retries; `app.py` refuses to start when the profile model has no registered price. New `mira/service/tests/test_gemini_route.py` (3 tests). No paid MIRA call was made.
- Row 18: `applyTherapyGate` is the one therapy gate in the gateway, client and presentation; the client test now expects a server report to be re-checked and an unsupported dose downgraded to `doseRemoved`.
- Row 17: 20 revisions per document, compact source JSON (the source-display test now expects the compact form), and a save warning from 4 million characters. Row 4 follow-up: `capsule.json` `run` is `npm run start`.
- Verified: tsc 0; lint 0; Vitest 296/296; site tests 0; site:verify and site:docs 0 errors; test:system 0; test:mira 189 passed, 1 skipped. `next-env.d.ts` is a generated change and not committed.
- Pushed (Gaffer: "Push lewat subtree split ke remote sentrapedia, branch feat/sentrapedia-hero-workspace (bukan main)"): `git subtree split --prefix=projects/healthcare/sentrapedia` gave `d7c0fc08` (tree identical to the capsule at `a05168c8`), pushed as a new branch `feat/sentrapedia-hero-workspace` on drferdi/Sentrapedia; no force, `main` untouched, origin not pushed. Jev: proceed_full.
- Next: Gaffer decides whether to open a pull request on drferdi/Sentrapedia; this handoff note itself is a later local commit, not in the pushed branch.

## Tech-debt rows 6, 7, 9, 23 and 25 - 2026-10-17 Asia/Jakarta

- Gaffer: "Ok lanjutkan". Risk R2 (agent governance docs: AGENTS.md, CONTEXT.md, DECISIONS.md, HANDOFF); R1 for lint and tsconfig. No app behaviour changed.
- Row 6: `.agents/CONTEXT.md` rewritten from 20 KB of 2026-10-09 session log to a 4.5 KB current-state brief (runtime, workspace behaviour, safety boundary, where to look); history stays in git.
- Row 7: capsule `AGENTS.md` now states the five-entry handoff retention, commit-hash status lines and tracked-evidence citations; this file was rotated (13 entries moved verbatim under "Archived on 2026-10-17") and kept entries carry their commit hashes.
- Row 9: `.agents/DECISIONS.md` gains a status rule and `- Status:` lines on nine superseded or closed decisions (Vera launcher clearance, anatomy card, OpenRouter Gemini route, the promo and hero chain; the Gemini-direct "not verified live" item is closed).
- Row 23: `tsconfig.json` excludes the dead `oracle/data.ts` and `oracle/diseases-data.ts`. Row 25: `npm run lint` now runs eslint on `scripts/` and `vitest.config.ts` too (14 scripts, 0 findings).
- Verified: tsc 0; lint 0; Vitest 294/294; site tests and docs:verify unchanged.

## Tech-debt rows 1, 3, 5, 10, 24, 27 and 42 - 2026-10-17 Asia/Jakarta

- Gaffer: "Lanjutkan" on the tech-debt plan. Risk R1 (build, tooling, docs, a pure memo); no clinical logic changed. Committed as `6bbe3366`.
- Row 1: `Dockerfile` dependencies stage now copies the five files the site's `install:check` reads. Verified with a real `docker build --target dependencies` (exit 0, postinstall ran `install:check`: "Local website sources available"); the full image and container were not built; the 4.7 GB check image was removed.
- Row 5: `apps/site/tools/write-migration-manifest.mjs` (`npm --prefix apps/site run manifest`) rewrites the manifest keeping the existing order; on the current tree it reproduces the committed file byte for byte, and a probe file was added and removed with the boundary test green.
- Row 10: `diagnosisContent` caches its view per message object and re-derives when content, original, source or mode change; new test (watched failing first) proves no second `JSON.parse`.
- Row 27: `vitest.config.ts` holds the exclusions, so bare `npx vitest run` and `npm test` see the same 15 files.
- Rows 3, 24, 42: `docs/mira-integration.md` (Gemini key, real preflight), `.env.example` (no hand-set MIRA_SERVICE_URL/TOKEN, PORT, SENTRAPEDIA_HOST), `config/mira-deepseek.env.example` (reference only), `docs/testing.md`, README (theoracle file names, 45/65 s gateway deadline, lint row).
- Verified: tsc 0; root lint 0; Vitest 294/294; site tests 38/38; docs:verify 0; test:system 8/8.
- Left: `next-env.d.ts` stays uncommitted (rewritten by `next dev`).

## An unreadable saved workspace is kept and downloadable instead of lost - 2026-10-17 Asia/Jakarta

- Gaffer: "Lanjutkan" on tech-debt row 14 (silent reset of an invalid saved workspace). Risk R1 (browser-local data handling; behaviour change approved). Committed as `3655c04f`.
- Change: `loadWorkspace()` in `src/lib/workspace.ts` returns the workspace plus the saved text when it fails validation. `src/components/workspace.tsx` copies that text to `sentrapedia-workspace-v1-unreadable` (`unreadableKey`), shows an error notice, and the Workspace dialog offers "Unduh data tak terbaca" (`workspace-tidak-terbaca.json`) while a copy exists. "Hapus semua data lokal" also removes it. If the second copy does not fit in storage, the in-memory copy stays downloadable until reload. The main key is still reset to the demo workspace as before.
- Verified: new test `tests/workspace.test.ts` (watched failing first); `npx tsc --noEmit` exit 0; eslint on the 3 touched files exit 0; Vitest 293/293. Browser on `sentrapedia` preview with fictional data: a version-2 blob and a broken blob each ended in the backup key; the notice appeared; the dialog showed the button and its download carried the exact saved text (anchor click intercepted, no file written); after reload the button stayed with no repeated notice; clear removed key and button. Console showed view-transition timeout/abort errors from `smooth()` while the pane runs hidden (scripted rapid clicks), not from this change. Preview stopped afterwards.
- Still open from row 14: no migration for a future v2 format; an import of the downloaded file still fails validation by design.
