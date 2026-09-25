# HANDOFF

Last updated: 2026-09-25

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- Branch `integration/capsules-standalone` (base `main` de9e91bb), task
  `TASK-20260925-CAPSULES-STANDALONE-INTEGRATION` (R2, Cursor, REVIEW), shared with sentrabot.
- `project.contract.json` added; root packages localized under `packages/` (see `DECISIONS.md`).
- Token gate: `scripts/check-tokens.mjs` over `apps/` and `packages/`, run by the `packages/token`
  `test` script, so the contract `test` stage enforces it.
- `scripts/lib/process.mjs` is capsule-internal (used by `scripts/next-production-build.mjs`), not a
  root path.
- Security: next 16.3.6 plus overrides (sharp, mysql2, fast-uri, deepmerge-ts); `pnpm audit` 0 high,
  5 moderate.
- The known-nonconformance entry for this capsule is removed; independence check OK.

## Verification (after deleting `node_modules`)

- `node tools/project-standalone/src/cli.mjs verify internal/golden-path` → RESULT PASS (all stages).
- `pnpm governance`: all checks pass except `check_sensitive_changes.py` (needs Chief integrity review).
  Root `pnpm-lock.yaml` stays unmodified.

## Next action

- Chief: integrity review, then merge the integration branch.
