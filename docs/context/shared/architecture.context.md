# Shared Context: Sentra AI Architecture

## Overview

This document establishes the canonical architectural principles, patterns, and constraints governing all Sentra AI product capsules. It serves as the primary reference for coding agents, system designers, and technical decision-makers across the monorepo.

## Control-Plane Model

Sentra AI operates on a strict control-plane separation:

```
Human Layer (Chief / dr. Ferdi Iskandar)
    ↓ directives, approvals (R2/R3), strategic decisions
Agent Layer (Nara, Sarah, Cursor, Claude, Codex)
    ↓ execution, implementation, recommendations
Runtime Layer (SAFRS framework, Hono API, PostgreSQL, Sandboxes)
    ↓ service, data, computation
```

### Human Responsibilities
- Strategic direction and product vision
- R2 and R3 escalation approvals (per SAFRS_SPEC.md)
- Security-sensitive decisions (credentials, production deploy, DNS changes)
- Final arbitration on architectural conflicts

### Agent Responsibilities
- R1-level implementation (code changes within approved boundaries)
- Proactive identification of risks, blockers, and technical debt
- Documentation and knowledge management
- Quality gate enforcement (lint, typecheck, test)

### Runtime Responsibilities
- Execute commands within sandbox boundaries
- Maintain data integrity and audit trails
- Enforce permission brokers (toolRequiresApproval -> action_approval_rules)
- Handle provider translations (model APIs, sandbox backends, integrations)

## Monorepo Topology (SAFRS)

SAFRS (Sentra AI Framework for Reliable Systems) is the native AI monorepo architecture. All capsules exist within this topology.

### Directory Structure
```
D:\DEV\Monorepo\
├── .agents/           → Agent knowledge and reusable skills
├── .claude/           → Claude-specific agents, commands, hooks, skills
├── .codex/            → Codex-specific agents, environments, hooks
├── .cursor/           → Cursor agents, commands, rules, hooks, skills
├── .droid/            → Sentra engineering factory / plugin configuration
├── .github/           → CI/CD workflows and GitHub automation
├── .husky/            → Git hooks
├── .kilo/             → Planning, skills, and worktree support
├── .safrs/            → SAFRS reviews and schemas
├── .sentra-gsap/      → GSAP reports and screenshots
├── .superpowers/      → Software-design / specification development material
├── .turbo/            → Turborepo cache
├── .vscode/           → VS Code workspace settings
├── database/          → Database artifacts, canonical data, inboxes, logs, sources, state
│   ├── inbox/         → Incoming data (REVIEW before processing)
│   ├── logs/          → Operational logs
│   └── state/         → Runtime state
├── docs/              → Canonical architecture, governance, workflow, design, brand, standards
│   ├── architecture/  → System architecture documents
│   ├── context/       → Project context files (active, sessions, shared)
│   ├── design-system/ → Design system documentation
│   ├── plans/         → Active and archived plans
│   ├── workflow/      → Process documentation and templates
│   └── ...            → Governance, brand, standards
├── node_modules/      → Installed dependencies (DO NOT UPLOAD, DO NOT COMMIT secrets)
├── packages/          → Shared monorepo packages
│   ├── adapter-kit/   → Background jobs, jobKey redelivery
│   ├── adapters/      → SandboxProvider, executor, desktop paths
│   ├── auth/          → Authentication primitives
│   ├── bot-templates/ → Bot template system
│   ├── chat-ui/       → Chat interface components
│   ├── contracts/     → Shared TypeScript interfaces
│   ├── core/          → Run state machine, lease fencing, idempotency
│   ├── db/            → Prisma schema, migrations, generation
│   ├── memory/        → Memory layer for agents
│   ├── testkit/       → Test harnesses
│   ├── ui-tokens/     → Design tokens (@sentra/token)
│   └── ui-web/        → Web UI components
├── projects/          → Independent product capsules
│   ├── _template/     → Capsule scaffolding template
│   ├── academic/      → Academic Smartboard
│   ├── corporate/     → Portfolio Dr. Novia
│   ├── healthcare/    → Avery
│   ├── internal/      → Control Center, Golden Path
│   └── product/       → SentraBot, Kediri History
├── scripts/           → Repository setup, testing, governance, utility scripts
├── sentrawiki/        → Structured internal knowledge base
│   ├── governance/    → Agent governance, project governance
│   ├── projects/      → Project-specific wiki entries
│   ├── tools/         → Tool documentation
│   └── verification/  → Test and verification standards
├── tests/             → Architecture, contract, governance, integration, fixture tests
└── tools/             → Internal automation, code generation, dependency graphs, health checks
```

## Risk Tier System

Every change in the monorepo is classified into one of three risk tiers. This determines the approval path and the required verification depth.

| Tier | Scope | Approval Required | Verification | Examples |
|------|-------|-------------------|--------------|----------|
| **R1** | Single capsule, no shared-package impact | Agent self-approval | Lint, typecheck, unit tests | New component in one capsule; bug fix in isolated code |
| **R2** | Shared package changes; cross-capsule interface changes | Chief review required | Full test suite; integration tests | Update to `@safrs/api` contract; change to `packages/db` schema |
| **R3** | Production deploy; credential changes; DNS; security policy | Chief explicit approval + security review | Penetration test; rollback plan; audit log | Production deployment; new OAuth provider; database migration with data loss risk |

### Escalation Rules
- Default assumption: R1 for any change within a single capsule
- Escalate to R2 if: shared package modified, lockfile changed, CI configuration changed, root-level rules modified
- Escalate to R3 if: production deployment, credential or secret handling, DNS changes, security policy modifications, database migrations with destructive operations
- When in doubt: escalate to R2. When R2 is insufficient: escalate to R3.

## Capsule Architecture Patterns

### Pattern A: Full SAFRS Stack (Recommended for complex products)
```
Capsule/
  apps/
    web/         → Next.js frontend
    api/         → Hono backend (optional, may use monorepo api)
  packages/      → (uses monorepo shared packages)
  prisma/
    schema.prisma → Database schema
  tests/
    e2e/         → Browser journey tests
```
Used by: Golden Path (reference), SentraBot (target migration), Control Center

### Pattern B: Standalone Vendored (For simple/static sites)
```
Capsule/
  src/           → Source files
  vendor/        → Vendored dependencies (React, etc.)
  styles/        → CSS
  scripts/       → Build scripts
  server.js      → Static server
```
Used by: Portfolio Dr. Novia
Rules: No shared packages, no monorepo tooling dependency, fully self-contained

### Pattern C: Domain-Specific Framework (Experimental)
```
Capsule/
  src/           → Source files
  runtime/       → Framework runtime
  db/            → SQLite or local database
```
Used by: Avery (Hermes framework)
Status: Experimental — may migrate to Pattern A after Golden Path validation

## Communication Protocols

### Agent-to-Agent Communication
- **Nara (Executive)**: Coordinates cross-project priorities, surfaces blockers, prepares decision briefs for Chief
- **Sarah (Clinical)**: Domain-specific medical knowledge, BPJS protocol expertise, clinical workflow validation
- **Coding Agents (Cursor, Claude, Codex)**: Implementation, code review, debugging, test writing
- **Boundary**: Nara does not write production code; coding agents do not make strategic decisions. Sarah does not modify infrastructure code; coding agents do not modify clinical protocols.

### Human-Agent Communication
- Chief communicates intent, constraints, and approval decisions
- Agents communicate progress, blockers, recommendations, and escalation requests
- All decisions at R2 and R3 are documented in capsule `.context.md` Key Decisions table

## Technology Standards

| Layer | Canonical Technology | Exceptions |
|-------|---------------------|------------|
| Frontend framework | Next.js (React) | Portfolio Dr. Novia uses vendored React 18 |
| API framework | Hono | — |
| Database | PostgreSQL + Prisma | Avery uses SQLite (development only) |
| Styling | Tailwind CSS + @sentra/token | — |
| Typography | Geist + Geist Mono | Never Plus Jakarta Sans, never IBM Plex (deprecated) |
| Build tool | Turborepo + pnpm | Portfolio Dr. Novia uses custom Node.js script |
| Testing | Vitest + Playwright | — |
| Lint/Format | Biome | — |
| Node version | ^22.22.2 || ^24.0.0 || >=26.0.0 | — |
| Package manager | pnpm 9.15.0 | Portfolio Dr. Novia has no package manager |

## Integration Points

### Shared Packages Integration
All capsules using Pattern A must consume these packages in order:
1. `@safrs/env` — environment validation (first, everything depends on it)
2. `@safrs/contracts` — TypeScript interfaces (second, types flow downstream)
3. `@safrs/db` — database schema and client (third, data layer)
4. `@safrs/auth` — authentication (fourth, security layer)
5. `@safrs/api` — API patterns and utilities (fifth, business logic)
6. `@safrs/ui` — UI components (last, presentation layer)

### External Integrations
| Service | Purpose | Capsules | Status |
|---------|---------|----------|--------|
| BPJS API | Health insurance claims | SentraBot | Blocked (credential pending) |
| Vapi | Voice reminders | SentraBot | Active |
| SendBlue / WhatsApp Cloud API | Text reminders | SentraBot | Active |
| PostHog | Product analytics | All (optional) | Active |
| Xendit | Payment processing | Future (finance vertical) | Planned |
| OpenRouter / Anthropic | AI model providers | All AI features | Active |
| E2B / Daytona / Box | Sandbox compute | SentraBot | Active |

## Security Posture

### Data Classification
| Level | Handling | Examples |
|-------|----------|----------|
| Public-safe | Can be committed, uploaded, shared publicly | Design tokens, architecture docs, public marketing content |
| Internal | Monorepo-internal, no external sharing | AGENTS.md, workflow docs, most READMEs |
| Confidential | Encryption required for storage, access logging | SECURITY.md, credential handling docs, patient data schemas |
| Restricted | Chief-only access, air-gapped if possible | Production credentials, API keys, database connection strings, patient PHI |

### Sensitive Surfaces (Always R3)
- `.env` and `.env.local` files
- Database connection strings (`DATABASE_URL`)
- API keys and tokens
- Database mutation routes
- Dependency lockfile changes (supply-chain risk)
- Shared API/UI interface changes (breaking change risk)

## Performance Expectations

| Metric | Target | Measurement |
|--------|--------|-------------|
| API p99 latency | < 500ms | Prometheus / internal metrics |
| Frontend First Contentful Paint | < 1.5s | Lighthouse |
| Frontend Time to Interactive | < 3.5s | Lighthouse |
| Test suite execution | < 5 minutes | CI pipeline |
| Typecheck | < 30 seconds | Local dev |
| Build | < 2 minutes | CI pipeline |

## Key Principles

1. **Local-first for health data**: Patient data never leaves the hospital infrastructure. All health vertical products must operate with local PostgreSQL and on-premise deployment.

2. **Type safety end-to-end**: Database schema -> API contracts -> frontend props must all be type-safe at compile time. Runtime type errors are considered architecture failures.

3. **Privacy by design**: Data collection minimized. Purpose limitation enforced. Consent tracked. Access logged. Encryption at rest and in transit.

4. **Reproducible builds**: Every production build must be deterministic — identical source produces identical output. This requires pinned dependencies, no dynamic imports in build path, and fixed build environment.

5. **Agent transparency**: All agent actions are logged, auditable, and reversible. Agents must declare their reasoning when escalating to Chief. Chief has override authority on all agent decisions.

6. **Fail secure, not fail safe**: When systems fail, they fail in the most restrictive mode. Examples: sandbox stops rather than leaks; API returns 403 rather than 500 with data exposure; patient data access denied rather than permitted.
