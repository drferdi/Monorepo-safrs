# SAFRS Monorepo overview

The SAFRS Monorepo is a pnpm-based monorepo governed by the Sentra Agent-First Repository Standard (SAFRS) v1.1. It defines how a software repository should be structured, governed, and enforced when autonomous AI agents perform a substantial share of engineering work. The repository is owned by Dr. Ferdi Iskandar (solo developer, non-coding operator) and follows an agent-first posture: humans set intent, agents execute, machines verify.

The repo's operating model is **Human-Governed, Agent-Executed, Machine-Enforced**. SAFRS v1.1 is the highest normative authority, specified in `SAFRS_SPEC.md`. The repository is currently at the **SAFRS Core** conformance level, with an automation control plane (ADR 0002) extending governance into machine-checked task contracts, lease chains, PR gates, evidence manifests, and a separated publisher identity.

## What lives here

- **One golden-path application**: a Next.js App Router deployment unit that mounts a package-owned typed Hono API under `/api`, proving the typed Database to API to Web flow with one safe demo record.
- **Eight shared packages**: schemas, env, database, api, ui, token, config, and telemetry. These are the product-neutral boundaries consumed by projects.
- **Nine developer tools**: SAFRS governance checkers, automation control plane, environment doctor, project wizard, capability catalog, schema-first codegen, dependency graph visualizer, task CLI, and status CLI.
- **Automation control plane**: canonical JSON contracts, monotonic risk computation, lease event chains, PR gates, budget ledgers, evidence manifests, approval verification, a publisher identity, and vendor-neutral adapter guard. Defined in ADR 0002, implemented in `tools/automation/`.
- **Cross-cutting governance**: a six-layer control architecture (L0 through L5), four-tier risk model (R0 through R3), agent roles, sensitive-path detection, document registry, tool inventory, automation policy, and machine-enforced verification with 16 governance checkers.
- **Agent adapters**: vendor-neutral adapters for Claude Code, Cursor, Codex, and Cline that point at root `AGENTS.md` without duplicating policy. Each adapter has a pre-action guard hook that enforces the shared automation guard.

## Tech stack

| Layer | Technology |
| --- | --- |
| Package manager | pnpm 11.21.0 |
| Runtime | Node.js >= 24.18 < 25 |
| Language | TypeScript (strict), Python 3 (governance) |
| Web framework | Next.js 16 (App Router, Node runtime) |
| API framework | Hono 4 with `@hono/zod-validator` |
| Schema | Zod 4 (shared contracts), JSON Schema 2020-12 (automation) |
| Database | PostgreSQL 17 via Docker Compose |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Build | Turborepo 2 |
| Linter/formatter | Biome 2 |
| Test | Vitest 4, Playwright 1.62, Node `--test` (automation) |
| Observability | OpenTelemetry (OTLP/HTTP to local Jaeger) |
| CI | GitHub Actions (5 workflows: ci, governance, pr-gates, publish, task-control) |

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
- [Automation control plane](../features/automation-control-plane.md) — contracts, leases, gates, evidence
- [Security](../security.md) — trust boundaries and secret policy
