# HANDOFF — Monorepo control plane

Last updated: 2026-10-10 (Claude, agent-compliance fixes on `governance/agents-jev-policy`)

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- `main` at `e1bb32c8` (2026-10-07). Agent compliance audit report:
  `verify-report/agent-audit-2026-10-10.txt` (gitignored).
- The governance commits that sat on `feat/sidepanel-ui-batch` (e4643c32, 000a4f7a, fab8dc31) were
  split by risk class, based on `main`:
  - `governance/agents-jev-policy` (this branch, R2, controls and root memory only): Jev and
    Gaffer address rules in root and capsule `AGENTS.md` files and `.cursor/rules`; OpenRouter
    registered in `.safrs/tool-inventory.json`; Claude PreToolUse guard now covers `Bash`; Claude
    commits as `Claude <claude@local>` through the `env` block in `.claude/settings.json`.
  - `docs/gaffer-address` (R3 by path: `projects/**/production/**` text only): "Chief" to
    "Gaffer" across docs, capsule memory and skills, plus the non-control part of e4643c32.
  - `feat/sidepanel-ui-batch` keeps only the parts for capsules that exist on that branch
    (sentrapedia, sentraverse-neural), the root HANDOFF note, and three files whose context exists
    only there. Old tip kept at `refs/backup/2026-10-10/feat-sidepanel-ui-batch`.
- Re-applying both new branches on the rewritten UI branch reproduces the old tree byte for byte.
- `check_sensitive_changes` (SAFRS_BASE_REF=main): this branch R2 and passing; `docs/gaffer-address`
  R3 and passing.

## Work in flight

- Git identity: the shared `user.name=Codex` was removed from `.git/config`. Agents now commit
  under their own name through `includeIf "onbranch:<agent>/**"` and, for Claude and Codex, an
  environment block that applies on any branch.

## Blockers

- Merging this branch (R2) and `docs/gaffer-address` (R3) into `main` needs Gaffer.
- `feat/sidepanel-ui-batch` still couples five capsule `AGENTS.md` files with the capsules created
  next to them (healthcare index, medboard, sentraverse, sentrapedia, sentraverse-neural). A
  Gaffer integrity review clears it at merge time.

## Next action

- Gaffer: review and merge `governance/agents-jev-policy`, then `docs/gaffer-address`; merge
  `main` into `feat/sidepanel-ui-batch`.
- Decide whether `.safrs/adapter-capabilities.json` should drop droid `read_only_disabled`, now
  that Droid runs auto-high and OpenRouter is registered.
- `check_handoff.py` still points to "AGENTS.md § Session protocol", which no longer exists.

## Owner collision

None.
