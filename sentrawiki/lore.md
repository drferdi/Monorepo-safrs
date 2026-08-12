# Lore — a three-day history

The SAFRS Monorepo was bootstrapped across three dense days in August 2026 by Dr. Ferdi Iskandar (Chief), a solo developer operating under SAFRS v1.1.

## Eras

### Era 1 — SAFRS Bootstrap & Golden Path (Aug 10, 2026)

The repository was created with the SAFRS v1.1 governance skeleton: six-layer control architecture, `policy.json`, risk tiers (R0–R3), agent roles, and sensitive-path detection. On the same day Chief set the monorepo topology in the decision _Monorepo topology: projects / packages / tools / tests / docs_ (Aug 10).

The golden path was defined by [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) on Aug 10 — a single Next.js application mounting a package-owned typed Hono API under `/api`, with Zod as the shared contract. The first shared packages arrived (schemas, env, database, api, ui, config, design-tokens), the typed Hono RPC API was added, the safe local database workflow was built, and the SAFRS project wizard joined `tools/`.

By Aug 10 the flush of commits (51) built the whole baseline: golden-path app, contract tests, the project wizard, and initial governance.

### Era 2 — Agent Automation & DX (Aug 11, 2026)

The busiest day (65 commits) focused on agent-first developer experience:

- Agent memory files were created under `.agents/` (_Agent memory files: CONTEXT / DECISIONS / HANDOFF / PROGRESS / 12_LESSONS_, Aug 11) and wired into registry-driven routing (_Memory routing_, Aug 11).
- Vendor agent adapters were added for Claude Code, Cursor, Codex, and Cline (all Aug 11), each pointing at `AGENTS.md` without duplicating policy, with hooks and verification controls registered as R2.
- Sentra design tokens shipped and the `@sentra/design-tokens` package was renamed to `@sentra/token` (Aug 11).
- The email and Stripe capability packs were activated (Aug 11).
- Docs were converted to concise English (Aug 11).

### Era 3 — SOTA Enhancements & Corpus Engine (Aug 12, 2026)

The most recent day (58 commits) raised the golden path to current practice:

- SOTA enhancements v1 added the dependency graph tool, Playwright visual regression with Git LFS baselines, shared OpenTelemetry tracing (`@safrs/telemetry`), and schema-first codegen (Aug 12).
- SOTA enhancements v2 added a live OpenAPI 3.1 endpoint, property-based testing with `fast-check`, and a supply-chain scan (Aug 12).
- The corpus-engine PoC added a medical-PDF corpus engine design and implementation plan (Aug 12).

## Longest-standing features

These have been present since Day 1 (Aug 10) and remain the foundation:

- **The golden-path demo flow** — Next.js → Hono → Prisma → PostgreSQL with one safe demo record, defined by ADR 0001 on Aug 10.
- **Zod schema contracts** — Zod schemas as the shared API/Database contract since the first API work on Aug 10; type drift is caught at compile time.
- **The reset guard** — the safe local database workflow and reset guard built Aug 10 to keep local verification from destroying data.

## Deprecated features

None yet — the repository is only 3 days old, so no feature has been formally deprecated.

## Major rewrites

- **Package rename** — `@sentra/design-tokens` renamed to `@sentra/token`, with the `packages/design-tokens` folder renamed to `packages/token` (Aug 11).
- **KB relocation** — the knowledge base moved from `docs/knowledge-base/` to `.agents/knowledge/`, driven by registry-driven agent routing (Aug 11, commit `de1410f`).

## Growth trajectory

| Day (Aug 2026) | Added |
| --- | --- |
| Aug 10 | SAFRS skeleton, golden-path app, 7 shared packages, tools (doctor, project-wizard, capabilities), contract tests |
| Aug 11 | Agent adapters, memory files, design tokens, email/Stripe capability, repository automation packs |
| Aug 12 | `@safrs/telemetry`, `@safrs/codegen`, `@safrs/deps-graph`, OpenAPI endpoint, property tests, supply-chain scan, corpus-engine PoC |

Packages grew from the core seven on Aug 10 to eight on Aug 12 with the addition of `@safrs/telemetry`, while developer tools expanded to six with codegen and deps-graph.

## Related pages

- [By the numbers](by-the-numbers.md)
- [Background & decisions](background/index.md)
- [Overview](overview/index.md)
