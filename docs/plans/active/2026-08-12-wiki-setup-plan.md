# Implementation Plan: Comprehensive Wiki for SAFRS Monorepo

**Status:** PROPOSED
**Risk:** R1 (documentation generation, no code mutation)
**Date:** 2026-08-12
**Owner:** Chief

## Objective

Generate a comprehensive, well-structured wiki that documents the entire SAFRS v1.1
monorepo: its governance model, architecture, topology, shared packages, tools,
projects, verification tooling, agent adapters, design system, and development
workflows. The wiki must serve as a navigable knowledge reference for humans and
onboarding agents alike.

## Scope

**In scope:**

- Read and analyze all canonical SAFRS documents, governance docs, ADRs, packages,
  tools, projects, scripts, tests, and config files.
- Generate structured wiki pages organized into logical sections.
- Output as Markdown files suitable for the Factory Wiki viewer.

**Out of scope:**

- Modifying any source code, governance files, or configuration.
- CI auto-refresh setup (deferred — no Factory API key available).
- External publishing beyond the Factory Wiki.

## Wiki Structure

### Section 1: Overview

| Page | Source material |
| --- | --- |
| **Home** | README.md (executive summary, mission, authority hierarchy) |
| **SAFRS v1.1 at a glance** | SAFRS_SPEC.md §1-3 (scope, core invariants, six-layer architecture) |
| **Conformance levels** | SAFRS_SPEC.md §19, `docs/governance/SAFRS_CONFORMANCE.md` |
| **Repository glossary** | `.agents/knowledge/10_GLOSSARY.md` + SAFRS_SPEC.md terminology |

### Section 2: Governance & Risk

| Page | Source material |
| --- | --- |
| **Risk model (R0–R3)** | SAFRS_SPEC.md §7, `.safrs/policy.json` risk_tiers |
| **Agent roles & permissions** | SAFRS_SPEC.md §6, `.safrs/policy.json` roles, `docs/governance/SAFRS_AGENT_PERMISSIONS.md` |
| **Control matrix** | `docs/governance/SAFRS_CONTROL_MATRIX.md`, SAFRS_SPEC.md §8, §10 |
| **Sensitive paths** | `.safrs/sensitive-paths.json` (patterns, verification controls, overrides) |
| **Tool inventory policy** | `docs/governance/SAFRS_TOOL_INVENTORY.md`, `.safrs/tool-inventory.json` |
| **Multi-agent protocol** | `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md`, SAFRS_SPEC.md §9 |
| **Document lifecycle** | `docs/governance/SAFRS_DOCUMENT_LIFECYCLE.md`, SAFRS_SPEC.md §13 |
| **Verification integrity** | SAFRS_SPEC.md §12, `tools/safrs/check_sensitive_changes.py` |
| **Secret & credential policy** | SAFRS_SPEC.md §16, `SECURITY.md` |
| **Prompt/context injection boundary** | SAFRS_SPEC.md §14 |

### Section 3: Architecture & Topology

| Page | Source material |
| --- | --- |
| **Monorepo topology** | `AGENTS.md` topology section, SAFRS_SPEC.md §4, `pnpm-workspace.yaml` |
| **Six-layer control architecture** | SAFRS_SPEC.md §3 (L0–L5 deep dive) |
| **Golden-path baseline** | `.agents/knowledge/03_ARCHITECTURE.md`, ADR 0001, `projects/golden-path/` |
| **Package boundaries** | `.agents/knowledge/03_ARCHITECTURE.md`, `packages/README.md` |
| **Project capsules** | `docs/governance/SAFRS_PROJECT_CAPSULES.md`, `projects/_template/` |

### Section 4: Shared Packages

Each package gets its own page with: purpose, public API surface, dependencies,
and usage examples.

| Page | Source |
| --- | --- |
| **packages/schemas** | Zod contracts, schemas package docs |
| **packages/env** | Environment validation (t3-oss/env) |
| **packages/database** | Prisma + PostgreSQL, migrations, seed, reset safety |
| **packages/api** | Hono routes, typed RPC client, error envelopes, OpenAPI endpoint |
| **packages/ui** | Reusable presentation primitives |
| **packages/token** | Sentra design tokens, WCAG enforcement, `scripts/check-tokens.mjs` |
| **packages/config** | Shared configuration (tsconfig, biome, turbo) |
| **packages/telemetry** | OpenTelemetry tracing, OTLP/HTTP to Jaeger |

### Section 5: Tools

| Page | Source |
| --- | --- |
| **tools/safrs** | Governance checkers: policy, routing, docs, handoff, sensitive changes, topology, actions pinning, tool inventory; `generate_routing.py` |
| **tools/doctor** | Environment diagnosis (`pnpm doctor`) |
| **tools/project-wizard** | New project scaffolding (`pnpm project:new`) |
| **tools/capabilities** | Optional capability packs (`pnpm capability:add`) |
| **tools/codegen** | Schema-first codegen: OpenAPI, mock factories, typed client |
| **tools/deps-graph** | Monorepo dependency graph visualization |

### Section 6: Verification & CI

| Page | Source |
| --- | --- |
| **safrs-verify pipeline** | `scripts/safrs-verify.sh` / `.mjs` / `.ps1`, `tools/safrs/check_*.py` |
| **CI workflows** | `.github/workflows/ci.yml`, `.github/workflows/safrs-governance.yml` |
| **Token enforcement** | `scripts/check-tokens.mjs` (raw-value scan, WCAG contrast) |
| **Supply-chain scan** | `scripts/check-supply-chain.mjs` (npm audit + osv-scanner) |
| **Test architecture** | `tests/` (architecture, contracts, governance, integration, repository), `vitest.workspace.ts`, `scripts/test.mjs` |
| **E2E testing** | `scripts/test-e2e.mjs`, Playwright config, visual regression with Git LFS |

### Section 7: Agent Adapters

| Page | Source |
| --- | --- |
| **Vendor-neutral instruction model** | SAFRS_SPEC.md §5 |
| **Claude Code setup** | `CLAUDE.md`, `docs/bootstrap/CLAUDE_SETUP.md`, `.claude/` |
| **Cursor setup** | `.cursor/rules/`, `docs/bootstrap/CURSOR_SETUP.md` |
| **Codex setup** | `docs/bootstrap/CODEX_SETUP.md`, `.codex/` |
| **Gemini adapter** | `GEMINI.md` |
| **Agent memory system** | `.agents/` (CONTEXT, DECISIONS, HANDOFF, PROGRESS, LESSONS), document-registry routing |

### Section 8: Development Workflow

| Page | Source |
| --- | --- |
| **Getting started** | `docs/bootstrap/INSTALL.md`, `scripts/setup.mjs`, `scripts/dev.mjs` |
| **pnpm scripts reference** | `package.json` scripts (setup, doctor, dev, build, lint, test, check, governance, db:*, codegen, deps:graph) |
| **Database workflow** | `packages/database/` (start, migrate, seed, reset, studio) |
| **Design tokens workflow** | `packages/token/`, `docs/design-system/`, `packages/token/UI-RULES.md` |
| **Platform activation** | `docs/governance/PLATFORM_ACTIVATION.md` (Electron, WXT, Stripe, email, AI, Python) |

### Section 9: Decision History

| Page | Source |
| --- | --- |
| **ADR index** | `docs/adrs/README.md`, `docs/adrs/0001-solo-developer-golden-path.md` |
| **Decision log** | `.agents/DECISIONS.md` (all durable decisions, chronological) |

### Section 10: Project Status

| Page | Source |
| --- | --- |
| **Progress board** | `.agents/PROGRESS.md` (Phase 0/1/2 status) |
| **Active plans** | `docs/plans/active/` (SOTA enhancements, governance remediation) |
| **Completed plans** | `docs/plans/completed/SAFRS_BOOTSTRAP_IMPLEMENTATION.md` |
| **Handoff state** | `.agents/HANDOFF.md` (current session state) |
| **Lessons learned** | `.agents/knowledge/12_LESSONS.md` |

## Execution Method

Since no Factory API key is available for CI auto-refresh, the wiki will be
generated in this session via the `/wiki` skill command, which produces wiki
content from the repository's own files.

**Steps:**

1. **Run `/wiki`** — Factory's wiki generator will scan the repository and produce
   structured wiki pages from the source files.
2. **Review output** — Inspect the generated wiki for completeness and accuracy.
3. **Fill gaps** — Manually write any pages that the auto-generator misses, using
   the structure above as a checklist.
4. **Verify** — Cross-reference each wiki page against its source document to
   ensure no information is fabricated or stale.
5. **Publish** — The wiki uploads to the Factory Wiki viewer for browsing.

## Success Criteria

- All 10 sections are represented with at least one page each.
- Every canonical document in `.safrs/document-registry.json` is referenced.
- Every shared package in `packages/` has its own page.
- Every tool in `tools/` has its own page.
- The golden-path project is documented.
- All agent adapters are covered.
- No fabricated information — every claim traces to a repo file.
- Wiki is navigable and readable in the Factory Wiki viewer.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Auto-generator misses pages | Manual gap-fill using the structure above as checklist |
| Stale information from old docs | Cross-reference against `.safrs/document-registry.json` status fields; skip ARCHIVED/SUPERSEDED |
| Sensitive data leakage | Never read `.env`; skip `docs/evidence/` detail; exclude credential/key material |
| Wiki too large / unstructured | Follow the 10-section hierarchy; keep pages focused |

## Dependencies

- `/wiki` skill (available in current Droid session)
- Read access to all repository files (R0)

## Next Action

Upon Chief's approval: execute `/wiki` and iteratively fill gaps per the structure above.
