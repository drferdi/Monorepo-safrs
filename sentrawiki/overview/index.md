# SAFRS Monorepo overview

The SAFRS Monorepo is a pnpm-based monorepo governed by the Sentra Agent-First Repository Standard (SAFRS) v1.1. It defines how a software repository should be structured, governed, and enforced when autonomous AI agents perform a substantial share of engineering work. The repository is owned by Dr. Ferdi Iskandar (solo developer, non-coding operator) and follows an agent-first posture: humans set intent, agents execute, machines verify.

The repo's operating model is **Human-Governed, Agent-Executed, Machine-Enforced**. SAFRS v1.1 is the highest normative authority, specified in `SAFRS_SPEC.md`. The repository is currently at the **SAFRS Core** conformance level.

## What lives here

- **One golden-path application**: a Next.js App Router deployment unit that mounts a package-owned typed Hono API under `/api`, proving the typed Database to API to Web flow with one safe demo record.
- **Eight shared packages**: schemas, env, database, api, ui, token, config, and telemetry. These are the product-neutral boundaries consumed by projects.
- **Six developer tools**: SAFRS governance checkers, environment doctor, project wizard, capability catalog, schema-first codegen, and dependency graph visualizer.
- **Cross-cutting governance**: a six-layer control architecture (L0 through L5), four-tier risk model (R0 through R3), agent roles, sensitive-path detection, document registry, and machine-enforced verification.
- **Agent adapters**: vendor-neutral adapters for Claude Code, Cursor, Codex, Cline, and Gemini that point at root `AGENTS.md` without duplicating policy.

## Tech stack

| Layer | Technology |
| --- | --- |
| Package manager | pnpm 11.21.0 |
| Runtime | Node.js >= 24.18 < 25 |
| Language | TypeScript (strict) |
| Web framework | Next.js 16 (App Router, Node runtime) |
| API framework | Hono 4 with `@hono/zod-validator` |
| Schema | Zod 4 (shared contracts) |
| Database | PostgreSQL 17 via Docker Compose |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Build | Turborepo 2 |
| Linter/formatter | Biome 2 |
| Test | Vitest 4, Playwright 1.62 |
| Observability | OpenTelemetry (OTLP/HTTP to local Jaeger) |

## Quick links

- [Architecture](architecture.md) — system architecture and data flow
- [Getting started](getting-started.md) — setup, build, test, run
- [Glossary](glossary.md) — SAFRS-specific terminology
- [By the numbers](../by-the-numbers.md) — codebase statistics
- [Lore](../lore.md) — repository timeline
- [How to contribute](../how-to-contribute/index.md) — working in this repo
- [Packages](../packages/index.md) — shared workspace packages
- [Tools](../tools/index.md) — developer tooling
- [Golden-path web app](../apps/golden-path-web.md) — the reference application
- [SAFRS governance](../features/safrs-governance.md) — risk model, roles, verification
- [Security](../security.md) — trust boundaries and secret policy
