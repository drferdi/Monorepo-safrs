# SAFRS Monorepo by the numbers

Do not treat this page as a live dashboard. Counts below are dated.

## Verified in this wiki refresh (2026-09-21)

| Metric | Value | How |
| --- | --- | --- |
| Git commits on current HEAD | not countable | `git rev-list --count HEAD` fails: Git objects `844b446…`/`3a6188f…` are unreadable in this clone |
| Wiki pages after this refresh | see `.wiki-meta.json` `pageCount` | generated list |
| ADRs | 7 | `docs/adrs/0001`–`0006` + `README.md` |
| JSON Schema contracts | 8 | `.safrs/schemas/` |
| GitHub workflows | 5 | `.github/workflows/` |
| Root shared packages | 8 | `packages/*/package.json` (`auth` incomplete) |
| Gaffer source modules | 13 | `tools/automation/src/gaffer/` |
| Gaffer test modules | 8 | `tools/automation/test/gaffer/` |
| Codex agent roster | 13 | `.codex/agents/*.toml` |
| Capsule contract count | 0 at `project.contract.json` glob | contracts live under `projects/<domain>/<capsule>/project.contract.json` |

Commit-count note: the working clone has unreadable tree objects (documented in `.agents/HANDOFF.md`, 2026-09-21). Treat the "550 commits (2026-09-05)" figure below as the last reliable count; HEAD is now at `21f4774` (2026-09-15).

## Historical snapshot (2026-09-05, previous wiki)

| Metric | Value | How |
| --- | --- | --- |
| Git commits on current HEAD | 550 | `git rev-list --count HEAD` |
| ADRs | 6 | `docs/adrs/0001`–`0006` |
| GitHub workflows | 5 | `.github/workflows/` |
| JSON Schema contracts | 7 | `.safrs/schemas/` |

## Historical snapshot (2026-08-12, first wiki)

The original wiki reported 302 tracked files, ~14,600 non-JSON source lines, and 174 commits across three days. That snapshot is **HISTORICAL**. It described the golden-path-only repo.

## Complexity (qualitative, still true)

- Control plane and capsules are separate dependency graphs.
- Golden-path remains two-to-three packages deep (`web` → `api` → `database`).
- SentraBot is a multi-app capsule with its own packages and worker.
- Gaffer's heaviest modules are `runner.mjs` (~10.8 KB) and `safrs-ports.mjs` (~21 KB) — orchestration plus the SAFRS bridge, not application source.
- Avery's heaviest bytes are Hermes runtime caches under `runtime/` — not application source.

## Related

- [Overview](overview/index.md)
- [Lore](lore.md)
