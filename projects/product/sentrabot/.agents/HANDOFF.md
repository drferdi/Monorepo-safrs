# HANDOFF — Sentra Bot overrides consolidation

Last updated: 2026-10-18 (Claude Code, branch `feat/capsule-contract-remotes`, task `TASK-20261018-CAPSULE-CONTRACT-REMOTES`)
`D:\DEV\Monorepo.worktrees\fix\sentrabot-overrides`, task `TASK-20260926-SENTRABOT-OVERRIDES`, state REVIEW)

The WhatsApp Business Bridge public beta handoff (worktree `codex-whatsapp-bridge`) is unchanged in git
history; its open items still apply.

## Done in this branch

- 2026-10-18 (Claude Code, task `TASK-20261018-CAPSULE-CONTRACT-REMOTES`, R1): `project.contract.json` declares `repository` `https://github.com/drferdi/sentrabot.git` (the `sentrabot` remote's URL). The root checker `check_capsule_remotes.py` reads it; no lifecycle change.
- 2026-10-11 (Claude Code, task `TASK-20261011-GAFFER-ADDRESS`, R1): docs in this capsule now address the owner as "Gaffer" instead of "Chief" (wording only; no code, config or behaviour change).
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
