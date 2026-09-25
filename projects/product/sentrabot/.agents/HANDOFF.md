# HANDOFF — Sentra Bot standalone contract

Last updated: 2026-09-25 (Cursor, branch `feat/sentrabot-standalone`, worktree
`D:\DEV\Monorepo.worktrees\feat\sentrabot-standalone`, tasks `TASK-20260925-SENTRABOT-STANDALONE` and
`TASK-20260925-SENTRABOT-NONCONFORMANCE`, state REVIEW)

The previous handoff (WhatsApp Business Bridge public beta, worktree `codex-whatsapp-bridge`) is unchanged in
git history; its open items still apply.

## Done in this branch

- `project.contract.json`: argv through `scripts/pnpm.mjs`; `install` has `timeoutSeconds: 300` (cold install
  is about 127 s, default is 120 s); `run` serves the built web client with `vite preview` on 127.0.0.1:4390
  (the same serving path as `docker-compose.prod.yml`), smoke `GET /` -> 200.
- `scripts/deploy-dry-run.mjs`: offline check of the inputs `publish-server-image.yml` hands to `docker build`.
- Package `test` scripts name their folder as `../../packages/<name>/src` (same files selected); the
  structural checker read `packages/<name>/src` as a root reference.
- Biome fixes in `packages/adapters` and `infra/updater`; two `bash` tests skip on win32; 17 Expo packages
  raised to the patch versions `expo install --check` expects (Chief decisions 2026-09-25).
- Root `.safrs/known-nonconformance.json`: sentrabot entry removed.

## Verification (rebased on `main` 481801fc, after deleting every `node_modules`)

- `node tools/project-standalone/src/cli.mjs verify product/sentrabot` -> RESULT PASS (install, lint,
  typecheck, test, build, artifacts, deployDryRun, run, smoke `/` -> 200, cleanup).
- `pnpm governance`: every check passes except `check_sensitive_changes.py`, because the change set touches
  `.safrs/known-nonconformance.json` (a verification control) together with capsule implementation.

## Next action

Chief: integrity review (`.safrs/reviews/verification-integrity.json`) for this change set, then merge.
