# SAFRS Monorepo by the numbers

Data collected on 2026-08-12 across all Git refs (branches and tags) in the repository.

## Size

| Metric | Value |
| --- | --- |
| Tracked files | 302 |
| Test files (`*.test.*` / `*.spec.*`) | 36 (~12% of tracked files) |
| Source-line total (non-JSON) | ~14,600 |
| `package.json` manifests | 16 (8 shared packages + 6 tools + 1 deployable app + 1 template) |
| Shared packages | 8 (`schemas`, `env`, `database`, `api`, `ui`, `token`, `config`, `telemetry`) |
| Developer tools | 6 |

### Lines of code by language

Measured over tracked source, excluding `node_modules`, build output, Turbo caches, and lockfiles.

```mermaid
xychart-beta
    title "Lines of code by language (horizontal)"
    x-axis ["JSON", "TypeScript", "JavaScript", "Python", "CSS", "Prisma"]
    y-axis "Lines"
    orientation horizontal
    bar [22326, 6562, 6818, 607, 579, 27]
```

| Language | Lines | Files |
| --- | --- | --- |
| JSON | 22,326 | 153 |
| JavaScript (`.mjs`/`.js`/`.cjs`) | 6,818 | 53 |
| TypeScript (`.ts`/`.tsx`) | 6,562 | 76 |
| Python (`.py`) | 607 | 11 |
| CSS | 579 | 3 |
| Prisma | 27 | 1 |

Source (`.ts`/`.tsx`/`.mjs`/`.py`/`.css`/`.prisma`) totals roughly 14,600 lines across ~144 files, an average of about 100 lines per source file. JSON and lockfiles carry the largest byte volume because the repository centralizes configuration, schemas, and tooling manifests.

## Activity

| Day (Aug 2026) | Commits |
| --- | --- |
| Aug 10 | 51 |
| Aug 11 | 65 |
| Aug 12 | 58 |
| **Total** | **174** |

Activity clustered in three waves matching the repo's eras (see [Lore](lore.md)):

- **Aug 10 — Bootstrap & golden path**: SAFRS scaffold, shared packages, typed Hono API, local database, project wizard.
- **Aug 11 — Agent automation & DX**: agent adapters (Claude Code, Cursor, Codex, Cline), memory routing, design tokens, email/Stripe capability.
- **Aug 12 — SOTA enhancements & corpus engine**: telemetry, codegen, dependency graph, OpenAPI endpoint, property tests, supply-chain scan, and the medical-PDF corpus engine.

## Bot-attributed commits

A keyword scan of commit messages (case-insensitive `bot` or `Co-authored-by`) attributes a meaningful share of the 174 commits to AI contributors — 27 commits carry a `Co-authored-by` trailer and 6 mention a bot in the message. Trails reference Claude Opus 5, Claude Fable 5, and Cursor. This is a **lower bound**: AI authorship is not always tagged, so the real number is likely higher.

This page intentionally reports no individual contributor statistics.

## Complexity

- **Average source file size**: roughly 100 lines (see table above).
- **Dependency depth**: most flows stay two to three packages deep. The golden-path web app (`projects/golden-path/apps/web`) depends on `@safrs/api`, `@safrs/env`, `@safrs/ui`, and `@safrs/database`; `@safrs/telemetry` extends `@safrs/config` presets; most tools are standalone. The root `pnpm-workspace.yaml` catalog pins every version so the graph resolves against one version of each dependency (see [Dependencies](reference/dependencies.md)).

## Related pages

- [Overview](overview/index.md)
- [Lore](lore.md)
- [Security](security.md)
- [Reference overview](reference/index.md)
