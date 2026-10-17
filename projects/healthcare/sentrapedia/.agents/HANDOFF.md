# Sentrapedia handoff

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

## Tech-debt rows 2, 4 and 8 fixed without behaviour change - 2026-10-17 Asia/Jakarta

- Gaffer: "Kerjakan" the three isolation-safe rows of `docs/TECH-DEBT.md`. Risk R1 for the code, R2 for the manifests (governance text). Committed as `9af7a45c`.
- Row 2: `src/lib/mira/client.ts` throws `MiraRequestError` carrying the gateway's `code` (undefined when the server sent none); every message is unchanged. New test in `tests/mira-client.test.ts`, watched failing first. No UI reads the code yet.
- Row 8: `missingField` and new `missingFieldEnglish` in `src/lib/clinical-templates.ts` are now the only copies; `drafts.ts` and `studio.ts` import them. `tests/studio.test.ts` pins the equality.
- Row 4: `capsule.json` and `project.contract.json` declare `GEMINI_API_KEY` and the Gemini API instead of OpenRouter. The `run` difference (`dev` vs `start`) is left for Gaffer.
- Verified: `npx tsc --noEmit` exit 0; eslint on the 5 touched TS files exit 0; Vitest 292/292; both manifests parse; `tools/safrs/check_topology.py` and `check_project_independence.py` exit 0. Not browser-verified: nothing rendered changed.
- Next: Gaffer picks further rows; row 14 (silent workspace reset) is the highest risk and changes behaviour.

## Technical debt audit written to docs/TECH-DEBT.md - 2026-10-17 Asia/Jakarta

- Gaffer asked for a technical-debt audit with subagents and a prioritised list; nothing was fixed. Risk R0 (read-only scan, one new Markdown file). Committed as `9af7a45c` with rows 2, 4 and 8.
- Four read-only subagent scans (Next.js app and tests; MIRA engine, launcher and provenance; site, scripts and repository hygiene; docs and governance) consolidated into 44 rows ranked by risk divided by effort (S=1, M=2, L=3); rows 1, 3, 4, 5, 6, 7, 8, 11, 14, 15, 16, 18, 21, 32, 36, 41 and 43 were re-read by hand. Flagged as safe to fix in isolation with an existing automated check: attach the gateway error code to the client error (row 2), correct `capsule.json` and `project.contract.json` (row 4), one exported constant for the empty-section sentence (row 8). Highest absolute risk: an invalid saved workspace is silently replaced by the demo data (row 14).
- Headline findings: the Dockerfile `dependencies` stage cannot pass postinstall since 2026-10-14 (row 1); the monorepo CI runs nothing for the capsule and rejects its code by design (row 16); MIRA provenance pins 42 files with 14 diverged and no upstream sync (row 15); browser storage is unbounded (row 17); the therapy late gate is written three times (row 18).
- Excluded: the fast-copies change in the parallel session, other sessions' uncommitted edits, `.env.local`. No lint, typecheck or test applies to the Markdown file; Vitest 291/291 was observed during the scan. Jev: allow_subagent. `/gaffer-routing-superpower` cannot be invoked by the agent; Gaffer runs it directly if wanted.
- Follow-up (`/engineering:tech-debt`): the doc now also gives each row a debt category and Priority = (Impact + Risk) x (6 - Effort), plus a three-phase remediation plan alongside feature work. The risk-to-effort ranking stays the primary order.
- Next: Gaffer picks rows to fix; none started.
