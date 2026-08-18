# CONTEXT — SAFRS Monorepo Identity

Rarely updated. Answers: what this repo is, what matters, what must not be changed casually.

Last updated: 2026-08-18

---

## Project

- **Name:** SAFRS Monorepo (`safrs-monorepo`, private)
- **Root:** `D:\DEV\Monorepo`
- **Owner:** Dr. Ferdi Iskandar (solo developer, non-coding operator)
- **Posture:** Agent-first — human sets intent, agents execute, machines verify.
- **Standard:** SAFRS v1.1 — `SAFRS_SPEC.md` is the highest normative reference.
- **Package manager:** `pnpm@11.21.0` only (never npm/yarn)
- **Runtime:** Windows 11, PowerShell 7, Node >= 24.18 < 25, TypeScript strict, Turborepo, Biome
- **Database:** PostgreSQL via Docker Compose (`pnpm db:start`); Prisma in `packages/database`
- **Main branch:** `main`
- **Legacy repo:** `abyss-monorepo` is a separate, read-only migration source. Never mix the two.

## Authority Chain

Authority and read order are **not defined here** — the single source is the Priority section and the generated Read order block in root `AGENTS.md`, derived from `.safrs/document-registry.json`. This file is identity only.

## Repository Shape

```
projects/     golden-path (Next.js + Hono + Prisma demonstrator), control-center (operator UI),
              _template — the only three capsules that exist; every other product is unbuilt
packages/     api config database env schemas telemetry token ui — shared boundaries;
              never import server/db code into browser components
tools/        automation capabilities codegen deps-graph doctor project-wizard safrs status task
              — dev tooling, not deployed
scripts/      setup, dev, test, safrs-verify
tests/        cross-cutting contract tests
docs/         adrs bootstrap design-system evidence governance handbook plans superpowers
.agents/      memory files + knowledge/ (numbered KB 00–12, 99)
.safrs/       machine-readable policy (registry, policy.json, sensitive-paths)
sentrawiki/   documentation surface; its setup plan is still PROPOSED
```

## Protected Areas & Risk Tiers

Single source: `.safrs/sensitive-paths.json` (R2/R3 patterns, machine-enforced) and the Risk handling section in `AGENTS.md`. Standing non-machine reminders: never read/print/commit/transmit `.env`; never modify `.agents/knowledge/` without Chief's approval.

## Golden-Path Baseline

Single source: Golden-path baseline section in `AGENTS.md` and [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md).

## Environment & Conventions

- Shell: PowerShell on Windows.
- Line endings: git stores LF (`.gitattributes`); `.ps1/.bat/.cmd` stay CRLF. Do not change `.gitattributes` casually.
- Language: agent chat diagnostics in Bahasa Indonesia; all repo docs, code, commands, and identifiers in English — concise, no filler.
- Legacy repo (`D:\Devops\abyss-monorepo`): migration source only. **Never read its `.env`** (live credentials); never copy its `node_modules`, `.env`, `.next`, or lockfiles.

## AI Agent Knowledge

Read order: follow the generated block in `AGENTS.md` — never define an order here.
ChatGPT Memory and past conversations are not repo SSOT — truth lives in repo files.
