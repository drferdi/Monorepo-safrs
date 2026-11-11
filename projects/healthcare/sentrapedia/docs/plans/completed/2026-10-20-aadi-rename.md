# Rename MIRA to AADI - plan, awaiting Gaffer

Status 2026-10-20: done locally (not committed); see the newest `.agents/HANDOFF.md` entry. Approved with Gaffer's four choices below.

Gaffer's decisions (relayed by the coordinator session):
1. "Migrasi data lama": stored answers with `kind: "MIRA"` are rewritten to `"AADI"` when a workspace is read (saved or imported). Doctor-edited content stays intact; only the marker and engine text change. Idempotent. Design: in `parseWorkspace`, a message whose `sourceText` parses with `kind: "MIRA"` gets `"kind":"AADI"` (first key, byte-preserving replace); the word MIRA becomes AADI in `originalContent` (engine text) and in `content` only when `content === originalContent` (untouched); `content` of an edited answer and its revisions are left as written. The source check then accepts only `"AADI"`.
2. "Ganti bersih saja": no `MIRA_*` warning, no old `/api/mira` path in the health check. Rollback to a pre-AADI image is manual.
3. "Ambil alih, ganti AADI": `common/providers.py` becomes `owner: capsule`.
4. "Ganti semua": dated records are renamed too, except identifiers of external facts (`upstreamCommit`, upstream paths and repo names in `SOURCE.json`, hashes in `theoracle/provenance`) and false positives (mirabilis, Miranda, Ammirati, SVG path data). The exceptions are listed in the final report.
Open: the site poster and video (`mira-poster.webp`, `mira-web.mp4`, LFS) show "MIRA" in their pixels; not touched until Gaffer decides.

The original proposal follows. Gaffer: "Kemudian stop penggunaan kata MIRA< ganti dengan AADI (Augmented Artificial Intelligence Diagnosis Integration)". Scope chosen: "Semua, termasuk kode". Expansion: "Sekali di Tentang & laporan".

## Inventory (git-tracked, case-insensitive)

- 171 files, about 2,140 lines. Live files (excluding dated records): 115 files, about 1,100 lines.
- Dated records: `docs/verification/` 41 files (plus `mira-*.png` screenshots), `docs/plans/completed/` 5, `docs/specs/` 1, `.agents/HANDOFF*.md`, `.agents/DECISIONS.md`.
- False positives to skip: "mirabilis" (`mira/service/data/icd10.json`), "Miranda", "Ammirati", SVG path data in `apps/site/assets/branding/*.svg`, `theoracle/provenance/**`.

| Kind | Where | Examples |
| --- | --- | --- |
| Visible to the doctor | `src/lib/mira/presentation.ts` (report: "Kandidat MIRA", "Draf analisis MIRA", "Usulan terapi dari MIRA", 10 lines) | report title line, parts 2-7 |
| Public site | `apps/site/source/index.html`, `ruang-kerja/index.html`, `assets/workflows.json` | card "MIRA", copy, alt text |
| Media with "MIRA" burned in | `apps/site/assets/workflows/mira-poster.webp`, `mira-web.mp4` (LFS) | poster header reads "MIRA" |
| Folders and files | `mira/` (Python engine), `src/lib/mira/`, `src/app/api/mira/`, `src/components/mira-case-form.tsx`, `scripts/{install-mira,mira-runtime,test-mira}.mjs`, `scripts/mira-profile.json`, `scripts/run-mira.ps1`, `config/mira-gemini.env.example`, `docs/mira-integration.md`, `tests/mira-*.test.ts`, `tests/theoracle-mira.test.ts`, `mira/service/contract/**/mira-step-*.json` | |
| Identifiers | TS/Python | `createMiraGateway`, `MiraResult`, `miraDraft`, `hasMiraSource`, `selectedMiraModel`, `miraEnabled`, CSS `.mira-*` |
| Endpoint, headers | `/api/mira`; `X-MIRA-Case-Origin`, `X-MIRA-Plan-Model` | |
| Env vars | 28 `MIRA_*` names plus `SENTRAPEDIA_SKIP_MIRA` | see below |
| Stored data | `sourceText.kind: "MIRA"` in browser workspaces and backups | `presentation.ts:50`, `:290` |
| Runtime paths | `.runtime/mira/venv`, `.runtime/mira/installed.json`, `.runtime/mira-deepseek/audit` | |
| Scripts, CI, Docker | `package.json` `test:mira`, `Dockerfile` COPY lines, `ci.yml` `ruff check mira`, `deploy/beta/update.sh` health check `/api/mira` | |

## Naming map

`MIRA` -> `AADI`, `Mira` -> `Aadi`, `mira` -> `aadi` (word-bounded, per file group, reviewed; no blind replace). Renames by `git mv`. `test:mira` -> `test:aadi`.

Expansion shown exactly twice: the report subtitle ("Draf analisis AADI (Augmented Artificial Intelligence Diagnosis Integration) • Untuk tinjauan dokter") and one new sentence in the "Tentang workspace ini" dialog (`AccountDialog`, which today names no engine). Everywhere else "AADI".

## (a) Old answers

Smallest change: the source check accepts `kind` `"AADI"` or the legacy `"MIRA"`; new answers write `"AADI"`. No stored data is rewritten. Untouched old answers re-render through `deriveContent`, so they show "AADI". A doctor-edited old answer keeps the doctor's own text (stored text is never rewritten in place), and the source pane shows the stored JSON with `kind: "MIRA"`. A test pins that a legacy source is still recognised.

## (b) Env vars and deploy

New names (no fallback to the old ones):
- Next and launcher: `AADI_SERVICE_URL`, `AADI_SERVICE_TOKEN`, `AADI_TARGETED_THERAPY`, `AADI_MAX_CONCURRENT`, `SENTRAPEDIA_SKIP_AADI`.
- Engine: `AADI_SERVICE_ENV`, `AADI_DEV_TOKEN`, `AADI_LLM_PROVIDER`, `AADI_DATA_POLICY`, `AADI_PLAN_MODEL`, `AADI_PLAN_MODEL_CHOICES`, `AADI_ASSESS_MODEL`, `AADI_PROVISIONAL_DIFFERENTIAL`, `AADI_FAST_ASSESSMENT`, `AADI_FAST_THERAPY`, `AADI_FAST_COPIES`, `AADI_FAST_COPY_PROVIDERS`, `AADI_STEP_DEADLINE_S`, `AADI_MAX_USD_PER_STEP`, `AADI_DAILY_BUDGET_USD`, `AADI_ALLOWED_ORIGINS`, `AADI_AUDIT_DIR`, `AADI_OPENROUTER_ZDR`, `AADI_OPENROUTER_PROVIDER_SORT`, `AADI_API_ERROR_COOLDOWN_S`, `AADI_MAX_BODY_BYTES`, `AADI_MAX_CONSECUTIVE_API_ERRORS`, `AADI_RATE_LIMIT_PER_MINUTE`, `AADI_DIAGNOSIS_DATASETS_DIR`.
- Unchanged: `GEMINI_API_KEY`, `SENTRAPEDIA_PUBLIC_ORIGIN`, `SENTRAPEDIA_HOST_PORT`, `SENTRAPEDIA_BUILD`, `SENTRAPEDIA_IMAGE_TAG`.
- Opt-in only (default off, beyond the rename): the launcher warns about any `MIRA_*` variable still set (names only).

Gaffer's own steps (nothing external is written by the agent):
- Local `.env.local`: 2 keys start with `MIRA_`; rename them to `AADI_` (or allow the agent to rename the key names only, without reading values).
- Beta server `/etc/sentrapedia/beta.env`: `MIRA_MAX_CONCURRENT=3` -> `AADI_MAX_CONCURRENT=3`, before the first update to an AADI image. Without it the beta falls back to one analysis at a time.
- Rollback risk: `update.sh` will check `/api/aadi`; rolling back with `SENTRAPEDIA_IMAGE_TAG` to a pre-AADI image fails that check. Opt-in only (default off): the health check also accepts the old path until no pre-AADI image remains (retention keeps five).
- Cloudflare: check that no Access or WAF rule names the path `/api/mira` (the tunnel itself is host-based).
- Vercel: no env change (it serves `apps/site` only). The public site shows "AADI" only after Gaffer redeploys.
- CI: `ruff check mira` -> `ruff check aadi` (in the repo). No secret is named MIRA. Renaming the install script changes the Docker dependency stage, so the next image may re-publish and re-pull the model and node_modules layers once (about 1.8 GB).
- Local: the engine venv moves to `.runtime/aadi/` (`node scripts/install-aadi.mjs`, same hash-locked packages); the audit ledger moves too, so today's local spend count restarts once.

## (c) Upstream pins (`mira/SOURCE.json`)

Still pinned byte-identical and containing MIRA: `common/data_policy.py` (reads `MIRA_DATA_POLICY`, defines `X-MIRA-Case-Origin`), `common/providers.py` (OpenRouter title "Sentra MIRA reasoning service" and a docstring; CONTEXT says it must stay byte-identical), `service/auth.py` (docstring), `service/sim_benchmark.py`, `service/tests/conftest.py`, `test_cors.py`, `test_providers.py`, `service/README.md`, `DESIGN.md`, `HANDOFF_NOTES.md`, the two contract examples (file names), `cases/synthetic_appendicitis_001.json`.

`data_policy.py`, `conftest.py`, `test_cors.py`, `test_providers.py` and `sim_benchmark.py` hard-code the env or header names, so they must change if those names change. Proposal: mark every pinned file that must change as `owner: capsule` (origin and `sourceSha256` kept, `packagedSha256` dropped), as done for 18 files since 2026-10-17; `test_packaging.py` keeps checking the rest. `common/providers.py` needs Gaffer's explicit choice (own it, or keep its pin and its two MIRA strings, which only reach OpenRouter). Keep as records, unchanged: `provenance/*.txt`, the `source` paths, `upstreamCommit` and the `source` name in `SOURCE.json`.

Effect on upstream sync: the engine stops matching upstream names, so a future upstream change is ported by hand with the name map instead of copied and hash-checked. That is already the case for the 18 owned files; this adds about 10.

## Dated records

Recommendation: leave `docs/verification/`, `docs/plans/completed/`, `docs/specs/`, archived handoffs and past DECISIONS unchanged (they record what was true then) and add one DECISIONS line: "MIRA was renamed AADI on 2026-10-20". Living docs (README, CONTEXT, AGENTS, `docs/*.md`, engine README) are renamed.

## Order

Starts only when the "Format laporan" and "Alur klinis dokter" sessions have no uncommitted edits in progress on the same files. `git mv` keeps their uncommitted content but moves it to the new paths.

## Verification

The engine folder rename is mechanical: `run-system.mjs` starts uvicorn with `--app-dir mira` and the engine imports `service.*`/`common.*` relative to that folder.

`tsc --noEmit`; eslint on touched files; Vitest on renamed and touched tests; `npm run test:aadi`; `npm run test:system`; `npm run site:verify` and `site:docs` (the site manifest names the media files); ruff on the engine; the provider-body leak test (`mira-paid.test.ts:53`) checks for "AADI" as well as "MIRA"; TS and engine response schemas edited in lockstep; audit-ledger line count recorded before and after the ledger path moves (the no-paid-call proof); `grep` shows no "MIRA" outside the legacy kind, provenance and dated records; browser on the dev server with every non-GET `/api/aadi` and `/api/mira` blocked through `page.route`: no "MIRA" on the page, an old stored answer still renders.
