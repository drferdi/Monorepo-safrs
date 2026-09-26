# HANDOFF — Sentra Bot overrides consolidation

Last updated: 2026-09-26 (Cursor, branch `fix/sentrabot-overrides`, worktree
`D:\DEV\Monorepo.worktrees\fix\sentrabot-overrides`, task `TASK-20260926-SENTRABOT-OVERRIDES`, state REVIEW)

The WhatsApp Business Bridge public beta handoff (worktree `codex-whatsapp-bridge`) is unchanged in git
history; its open items still apply.

## Done in this branch

- The `react`, `react-dom`, `better-auth` overrides moved from `pnpm-workspace.yaml` (ignored by pnpm 9.15.0)
  to `package.json` `pnpm.overrides`, next to the security overrides. All overrides now live in one place.
- Lockfile: no resolved version changed (2833 package entries before and after); only specifiers and peer
  ranges for react, react-dom, better-auth are pinned to the override versions (`apps/site` `^19.1.0` ->
  `19.2.3`, which already resolved to 19.2.3).

## Verification (base `main` 01587ee3, after deleting every `node_modules`)

- `node tools/project-standalone/src/cli.mjs verify product/sentrabot` -> RESULT PASS (all stages, smoke `/` -> 200).

## Open

- Legacy raw colour values in `apps/web/src` still need migrating to tokens (UI work, Chief scope).

## Next action

Chief: review and merge `fix/sentrabot-overrides`.
