# HANDOFF — Sentra Bot standalone contract

Last updated: 2026-09-25 (Cursor, branch `integration/capsules-standalone`, worktree
`D:\DEV\Monorepo.worktrees\integration\capsules-standalone`, task
`TASK-20260925-CAPSULES-STANDALONE-INTEGRATION`, state REVIEW)

The previous handoff (WhatsApp Business Bridge public beta, worktree `codex-whatsapp-bridge`) is unchanged in
git history; its open items still apply.

## Done in this branch

- `project.contract.json`: argv through `scripts/pnpm.mjs`; `install` has `timeoutSeconds: 300`; `run`
  serves the built web client with `vite preview` on 127.0.0.1:4390, smoke `GET /` -> 200.
- `scripts/deploy-dry-run.mjs`: offline check of the inputs `publish-server-image.yml` hands to `docker build`.
- Capsule token gate `scripts/check-tokens.mjs` in `lint`: ratchet over `apps/web/src` with the 1268 legacy
  raw values locked per file in `scripts/token-baseline.json` (see `DECISIONS.md`).
- Security: `pnpm.overrides` in `package.json` (deepmerge-ts, mysql2, fast-uri, sharp); `pnpm audit` 0 high,
  3 moderate.
- Root `.safrs/known-nonconformance.json`: sentrabot entry removed.

## Verification (base `main` de9e91bb, after deleting every `node_modules`)

- `node tools/project-standalone/src/cli.mjs verify product/sentrabot` -> RESULT PASS (all stages).
- `pnpm governance`: every check passes except `check_sensitive_changes.py` (`.safrs/**` plus capsule
  implementation in one change set).

## Open

- The `react`, `react-dom`, `better-auth` overrides in `pnpm-workspace.yaml` have no effect under pnpm 9.15.0.
- Legacy raw colour values in `apps/web/src` still need migrating to tokens (UI work, Chief scope).

## Next action

Chief: integrity review (`.safrs/reviews/verification-integrity.json`), then merge the integration branch.
