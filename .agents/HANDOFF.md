# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-11 (Codex repository automation)

## Current state

- **Branch:** `feat/codex-repository-automation` in the dedicated Codex worktree.
- **Commits:** `bf3c8a3` guard, `1163f04` formatter, `28d1f05` config/reviewers/Context7,
  `30b8ec5` skills, `6eccc85` governance/docs, plus this handoff commit.
- **Context7:** `@upstash/context7-mcp@4.0.0` inventoried; project trust smoke check remains pending.
- **Integrity:** adapter controls and tests changed together; designated review is required
  (`SAFRS_VERIFICATION_INTEGRITY_REVIEW=required`).
- **Prisma/Postgres MCP:** still deferred.

## Work in flight (do not clobber)

- DX friction plan owns `scripts/`, root `package.json`, and `INSTALL.md`.
- Cursor non-coding-agent work remains in its sibling worktree and is out of scope.

## Verification evidence

- `pnpm install --frozen-lockfile` — PASS.
- `pnpm governance` baseline — PASS before Codex changes.
- `node --test tests/repository/automation-policy.test.mjs` — PASS, 16/16.
- `python tests/architecture/test_safrs_topology.py` — PASS, 6/6.
- `python tests/governance/test_sensitive_classification.py` — PASS, 5/5.
- `python tools/safrs/check_tool_inventory.py` — PASS.
- `python tools/safrs/check_docs.py` — PASS.
- `python tools/safrs/check_routing.py` — PASS.
- `git diff --check` — PASS.
- `pnpm governance` — PASS (`SAFRS_RISK=R2`).
- `pnpm check` — FAIL at existing Biome lint findings in design-system/token files; no Codex paths were reported.
- `pnpm typecheck` — FAIL because generated Prisma client is absent at
  `packages/database/src/generated/prisma/client.ts`.
- `pnpm test` — FAIL before tests because repository `.env` is not present.
- `pnpm build` — FAIL because `APP_URL` and `DATABASE_URL` are not configured.
- `scripts/safrs-verify.sh` via Git Bash — PASS.
- `codex mcp list` — global `node_repl` and `hindsight` only; project Context7 remains **PENDING HUMAN TRUST CHECK**.

## Next actions

1. Review/trust project hooks in a fresh Codex session; confirm Context7 under `/mcp` and skills/reviewers under `/skills`.
2. Obtain designated R2/integrity review before integration.
3. Push/merge only under repository policy after review; do not remediate unrelated baseline lint/env failures in this branch.

## Session guardrails

- Never read `.env` in `D:\Devops\abyss-monorepo`; never copy old `node_modules`/`.env`/`.next`/lockfiles.
- `.agents/knowledge/` — no changes without Chief approval.
- PowerShell for commands; chat diagnostics in Bahasa Indonesia; docs/code in English.
