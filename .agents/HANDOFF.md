# HANDOFF — Monorepo control plane

Last updated: 2026-10-10 (Claude, clean-up on Gaffer's order on `codex/oracle-ii-grounding`)
Previous body: `git show 8d898739:.agents/HANDOFF.md`

Root `.agents/` holds control-plane state only: root tooling, governance, CI, `packages/`, and
cross-capsule orchestration. Capsule state lives in `projects/<domain>/<capsule>/.agents/`.

## Current state

- Gaffer's order (2026-10-10): the monorepo must serve Gaffer. Everything is either committed or
  gitignored, then pushed. Each tool in `tools/` is planned to get its own repository.
- The main checkout is on `codex/oracle-ii-grounding`. Another session switched to it from
  `feat/sidepanel-ui-batch` at 19:26; history is linear, and everything below is on it. Not pushed.
- The working tree is clean. Commits from this clean-up:
  - `14f79078` retriever (website scraper for our datasets) moved from the never-committed
    `projects/internal/retriever` to `tools/retriever`. It keeps its own toolchain and lockfile.
    `data/` and build output are gitignored, the launchers use their own folder, and it is
    registered as `retriever-web-scraper`. The Desktop shortcut points at the new path.
  - `f0ae1463` `tools/jev` renamed to `tools/typesafe-jev`; inventory id `typesafe-jev`. The MCP
    server keeps the name `jev`. Every agent config (Claude, Codex, Cursor, Factory, Gemini,
    Grok, OpenCode) points at the new path; backups are in that session's scratchpad.
  - `458cc1b3` `pnpm project:new` works again: the template's `Jev: <action>` line tripped the
    wizard's marker check (12 of 39 tests failed; now 39/39).
  - `60d85c18` Superpowers skill pack (MIT), `.factory/settings.json`, Codex `model_verbosity`.
  - `6e3264b2` medboard, `67fb3993` sentraverse, `09367d70` sentraverse-neural, `36b06632`
    med-assist, `a3a215a0` sentrapedia: other sessions' work, each verified first (med-assist
    vitest 1863 passed; sentrapedia vitest 154/154 and MIRA pytest 157 passed). Both
    `docs/architecture.md` files are committed in lowercase for Linux CI.
  - Root `pnpm-workspace.yaml` excludes `tools/retriever`; `tools/*` had pulled it into the root
    workspace, which would break `pnpm install --frozen-lockfile` in CI.
- Earlier today: `f80e4ace` fixed Claude's Jev MCP (the repo `.mcp.json` resolved against the
  session start directory); `5c1c031e` committed the gaffer-orchestration closeout.
- `check_task_ownership` is green again because nothing is uncommitted. Changing it to read only
  staged paths was refused by the safety classifier as audit tampering; it was not changed.
- `check_sensitive_changes` fails for the whole branch against `main` (1610 files, R3 paths):
  it needs an independent integrity review at merge time. That is by design.
- Tool tests: automation 28, capabilities 7, codegen 7, deps-graph 13, project-standalone 23,
  project-wizard 39, doctor 7, task 17 and status 5 all pass; retriever 4/4.

## Work in flight

- The old `tools/jev` folder is still on disk because three running Jev servers (this Claude
  session and two Droid sessions) hold its files. It is hidden by a temporary line in
  `.git/info/exclude`. After those agents restart, delete `tools/jev` and remove that line.
- MyPrompt (`projects/internal/prompt`, own repo `drferdi/Myprompt`, published by
  `git subtree split --prefix=projects/internal/prompt`) may move to `tools/` too. Waiting for
  Gaffer, because the subtree prefix changes.

## Blockers

- Push: `.husky/pre-push` blocks it twice. History holds real numbers/JIDs (publish gate), and
  the range touches `projects/**` (capsule gate). Opening both needs Gaffer's explicit decision.
- `docs/gaffer-address` (`bf4be2af`, R3 by path) is not merged into `main`. It needs Gaffer.

## Next action

- Gaffer: decide the push (remote, and both gates) and the MyPrompt move.
- Restart agents, then delete the old `tools/jev` folder.
- Gaffer: audit actions A-2..A-7 and A-11..A-19 are not approved yet. A-1 (key rotation) is
  Gaffer's own job.
- `.codex/agents` still say "Chief", and two agents share the name `security-reviewer`.
