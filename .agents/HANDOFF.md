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
    registered in `.safrs/tool-inventory.json`; Claude PreToolUse guard now covers `Bash`, and
    both Claude hooks launch from `git rev-parse --show-toplevel` (they silently failed open
    after any `cd`); Claude commits as `Claude <claude@local>` via `.claude/settings.json` env;
    `.agents/BOUNDARIES.md` routed as MUST read 3; Cursor guards fail closed on unreadable
    payloads; `check_handoff.py` points at an existing AGENTS.md heading.
  - `docs/gaffer-address` (R3 by path: `projects/**/production/**` text only): "Chief" to
    "Gaffer" across docs, capsule memory and skills, plus the non-control part of e4643c32.
  - `feat/sidepanel-ui-batch` keeps only the parts for capsules that exist on that branch
    (sentrapedia, sentraverse-neural), the root HANDOFF note, and three files whose context exists
    only there. Old tip kept at `refs/backup/2026-10-10/feat-sidepanel-ui-batch`.
- `chore/agent-skill-hygiene` (R2, no controls): verify skills follow the capsule handoff rule,
  `04_CONTEXT.md` follows the AGENTS.md authority order, Cursor reviewers 08-11 `readonly: true`,
  README lists `.env.example` variable names.
- Re-applying both new branches on the rewritten UI branch reproduces the old tree byte for byte.
- `check_sensitive_changes` (SAFRS_BASE_REF=main): this branch and `chore/agent-skill-hygiene`
  R2 and passing; `docs/gaffer-address` R3 and passing. Governance unittest 68/68; Claude guard
  tests pass except the pre-existing Windows-path case; automation-policy 20/22, same two
  pre-existing Codex failures as `main`.
- Merge simulation: no conflicts between the three branches; merging this branch into
  `feat/sidepanel-ui-batch` conflicts only on this file (take this version).

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

- Gaffer: review and merge `governance/agents-jev-policy`, `docs/gaffer-address` and
  `chore/agent-skill-hygiene`; merge `main` into `feat/sidepanel-ui-batch`.
- `.codex/agents` still say "Chief" and two agents share the name `security-reviewer`; left
  alone while Gaffer works in `.codex/`.
- Decide whether `.safrs/adapter-capabilities.json` should drop droid `read_only_disabled`, now
  that Droid runs auto-high and OpenRouter is registered.

## Owner collision

None.
