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
