Last updated: 2026-09-21 (Papan pekerjaan — FAIL → WARN end-to-end)

## Capsule

`projects/internal/control-center` + gate `check_sensitive_changes`

## Current state

### Papan (verified)
- topology OK · ownership OK · sensitive **approved**
- `pnpm status` → **WARN** (governance PASS; peringatan inventori tool lama)
- Bukan FAIL — UI Situasi harus **Perlu dilihat**, bukan Rusak

### Perbaikan inti
1. Fallback diff base lokal ke `main` bila `origin/main` bukan ancestor
2. Graft lokal parent hilang pasca rewrite origin
3. Segel integrity (Chief) untuk change set vs `main`
4. Fingerprint **mengabaikan** berkas memori sesi (HANDOFF dkk.) supaya edit HANDOFF tidak merusak segel
5. Situasi: plane WARN ≠ Rusak

### Tasks
- `TASK-20260921-CONTROL-CENTER-BOARD`
- `TASK-20260921-SENSITIVE-PLANE-FIX`
- `TASK-20260921-SENSITIVE-TEST`

## Next action

1. Chief: **hard refresh** Control Center (Ctrl+Shift+R) → cek “Keadaan sekarang”
2. Harapan: **Perlu dilihat** + teks peringatan papan, bukan Rusak
3. Commit bila disetujui

## Owner collision

Tidak ada.

---

## ADR 0007 WP-E (2026-09-24, Claude Code, branch `fix/adr-0007-wp-e`)

- Scope: `packages/database/prisma/schema.prisma` only. Removed the six `SentraBot*` models
  (ADR 0007 decision 5: product models do not live in the root schema). `Demo`, `User`,
  `Session`, `Account` and `Verification` untouched; no migration added. `packages/token/scope.txt`
  still names the SentraBot capsule path; that belongs to the token-gate backlog, not WP-E.
- Grep: outside the schema, the only `sentrabot` reference in `packages`, golden-path, `tools`
  and `tests` is `packages/token/scope.txt:10`. `pnpm db:generate` exit 0.
- Drift: `prisma migrate diff --from-migrations` could not run (no `migration_lock.toml`, no
  `shadowDatabaseUrl` in `prisma.config.ts`, Docker daemon down; `pnpm db:start` exit 1).
  Substitute: schema-to-schema diff against `main` is exactly six `DROP TABLE "sentrabot_*"`,
  and no migration mentions them. Inherited drift remains: the migrations end at `demos` only,
  so `user`, `session`, `account` and `verification` have no migration.
- Next: independent review by Codex, then Claude. Do not merge before review.

---

## ADR 0007 WP-A (2026-09-24, Claude Code, branch `fix/adr-0007-wp-a`)

- Scope: `tools/project-standalone/src/contract.mjs`, `tools/safrs/check_project_independence.py`,
  shared vectors `tools/safrs/fixtures/path-classification.json`, both test suites.
- Change: one path-classification rule (ADR 0007 decision 3, as corrected on `main`). Script
  names such as `deploy:dry-run` are opaque; `file:`/`link:`/`portal:`/`workspace:` remainders
  are evaluated as paths; any `X:` drive prefix (including drive-relative `C:x`) and non-http
  scheme values with a separator stay rejected. The Python checker gained the URL-credential
  check the Node validator already had.
- Evidence (rebased on `main` c1dbbb70): red 3 vectors (Node) and 4 (Python) → green; Node
  15/15, Python 17/17, `safeRelativePath` one-liner `true false false` (baseline `false false
  false`). `check_project_independence.py` findings drop from 13 to 1 inherited finding:
  `projects/internal/prompt/package.json [scripts.db:generate]` (placeholder `postgresql://`
  URL with a separator; rejected by the rule, capsule-side follow-up).
- The 12 findings that moved to accept were each triggered only by opaque `word:word` script
  tokens with no `/`, `\`, `..` or drive prefix: prompt `scripts.build`, `desktop:dev`,
  `desktop:smoke`, `test:e2e` (`desktop:build`), `dev`, `start` (`desktop:dev`),
  `desktop:build`, `typecheck` (`db:generate`), `verify` (`verify:structure`, `desktop:smoke`,
  `deploy:dry-run`); unicom `scripts.verify` (`verify:structure`, `smoke:production`,
  `deploy:dry-run`); both `commands.deployDryRun.args[1]` (`deploy:dry-run`). These are the
  false positives decision 3 removes; no path-shaped token moved to accept.
- Codex review fix (rebased on `main` d0a24a96): contract fields and command arguments reject any
  `..` segment (`x/..`, `a/../b`, `..\x`) and any NUL, identically in Node and Python;
  `check_packages` dependency resolution is unchanged. Red: 2 Node tests (NUL arguments), 2
  Python tests (6 vectors; NUL crashed the checker with `ValueError`) → green Node 16/16, Python
  18/18. Parity harness over 50 adversarial inputs: 0 disagreements, 0 accepted escapes.
- Gate: `check_sensitive_changes.py` (and so `pnpm governance`) requires Chief integrity review,
  because verification controls and implementation change together. No review record created.
- Next: Chief integrity review, then merge. Codex verdict was CHANGES REQUESTED on `x/..` and NUL.

## ADR 0007 WP-B — valid contracts for prompt and unicom (2026-09-25, Claude Code)

- Change: `internal/prompt` and `internal/unicom` contracts now use `{kind, name, locator,
  required}` dependencies (prompt locators are `.env.example` variable names, never values;
  unicom has no `.env.example` and reads no environment, so its locators are public endpoints).
  Prompt `smoke` is `none` (desktop Electron app) and `mutableStatePaths` is `[]`. Unicom smoke is
  a loopback HTTP probe on `127.0.0.1:4330`, and `run` serves there. Prompt `db:generate` is
  plain `prisma generate`; the schema already reads `env("DATABASE_URL")`, and generate succeeds
  with `DATABASE_URL`/`DIRECT_URL` unset. The placeholder `postgresql://` URL is gone.
- Evidence vs `main` eb287e65: `status` for both capsules went from invalid contract to
  `contract: PASS`, `structural: PASS`. `check_project_independence.py` went from 1 finding
  (prompt `scripts.db:generate`) to `OK`. Prompt `pnpm run typecheck` with no DB variables: exit
  0; `pnpm run build` exit 0. Unicom `pnpm run start --hostname 127.0.0.1 --port 4330` answers
  200 on `/` (pnpm 11 passes a literal `--` to `next start`, so `run` has none). Tooling tests
  unchanged: Node 16/16, Python 24/24.
- Inherited: `verify` for both capsules fails at the install stage with "Capsule tree contains a
  symbolic link or reparse point" under `node_modules/.pnpm`, because pnpm's default layout uses
  links on Windows. On `main`, `verify` could not start because the contracts were invalid.
- Next: Codex review.

## ADR 0007 WP-D — doctrine alignment (2026-09-25, Claude Code)

- Change: `.agents/knowledge/03_ARCHITECTURE.md` now says to reuse within a capsule and share
  across capsules only through versioned, independently distributable artifacts. The
  "Implemented solo-developer baseline" section became a short "Repository shape" section (root
  as optional control plane, sovereign capsules, golden-path as legacy non-conformance). ADR 0001
  is `SUPERSEDED` by ADR 0006. `08_DECISIONS.md` lists ADR 0006 and ADR 0007 instead of ADR 0001.
  The registry adds ADR 0006 and ADR 0007 and marks ADR 0001 superseded. README labels
  golden-path "legacy, pending capsule migration".
- Evidence: the acceptance grep for the old baseline phrase in `.agents` goes from 1 hit to none. `check_docs.py` and
  `check_routing.py` are OK before and after. `generate_routing.py` output is identical, so the
  `AGENTS.md` routing block is unchanged.
- Next: Codex review. Merge WP-D and WP-G one after the other (both edit routed knowledge).

## ADR 0007 WP-F — visible type-check gate (2026-09-25, Claude Code)

- Change: in `.github/workflows/ci.yml`, "Type check" and its "control-plane packages" fallback
  now key on `projects/internal/golden-path/apps/web/package.json`, the condition the test and
  browser smoke steps already use, instead of the removed `packages/database/src/sentrabot/bots.ts`.
  Full `pnpm typecheck` now runs whenever golden-path exists. The fallback step and its filters
  are unchanged and run only when golden-path is absent.
- Evidence: local `pnpm typecheck` exit 0, 8/8 tasks, before and after, including
  `@safrs/database:typecheck` and `@safrs/api:typecheck`. No type errors to record.
- Next: Codex review; confirm on the pull request that "Type check" runs and is not skipped.
