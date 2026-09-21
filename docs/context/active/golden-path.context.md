# Context: Golden Path

## Metadata
- Slug: golden-path
- Created: 2025-2026 (TBD exact date from git history)
- Lead Agent: Cursor / Claude + shared @safrs/* packages
- Domain: internal / infrastructure / reference implementation
- Status: active
- Priority: p1 (reference implementation — enables all other SAFRS migrations)
- Location: `projects/internal/golden-path/`
- Human Owner: Chief (dr. Ferdi Iskandar)

## Objective

Golden Path is the reference implementation and proof-of-concept that demonstrates the complete SAFRS typed stack: typed Database -> typed API -> typed Web. It serves as the "table of readiness" where the Chief can observe the end-to-end flow and verify that each layer is properly connected and functional.

The project has one explicit purpose and four explicit non-goals:

**Purpose:**
- Prove that the `@safrs/*` shared package ecosystem can support a full-stack application with end-to-end type safety from database schema to frontend props

**Non-Goals (explicitly out of scope):**
1. NOT a product with branding, marketing, or external users
2. NOT a production deployment with real traffic or SLAs
3. NOT an authentication system (no login, no users, no sessions)
4. NOT production credentials or real data (all data is synthetic demo records)
5. NOT payment, email, AI, or capability-pack integration (stripped to core stack only)

Success criteria:
- Database schema defined in Prisma and auto-generating TypeScript types
- API endpoints in Hono with full type safety (request validation, response types)
- Next.js frontend consuming typed API with compile-time type checking
- A single demo record successfully traversing the full path: DB row -> API response -> rendered UI element
- All quality gates passing: lint, typecheck, test, build

## Architecture Overview

Golden Path is the canonical implementation of the SAFRS typed stack. It consumes the shared `@safrs/*` packages and demonstrates how all capsules should eventually be structured.

### Technology Stack
| Layer | Technology | Package | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | `@safrs/web` | React framework with SSR/SSG support |
| API Adapter | Hono | `@safrs/api` | Type-safe HTTP API framework |
| Environment | Config management | `@safrs/env` | Type-safe environment variable validation |
| UI Components | React components | `@safrs/ui` | Shared UI primitives across all capsules |
| Database | PostgreSQL + Prisma | `@safrs/database` | ORM, schema definition, migrations, type generation |
| Type Safety | TypeScript | Cross-cutting | End-to-end: Prisma schema -> API types -> frontend props |

### Type Safety Flow
```
Prisma Schema (schema.prisma)
    ↓ prisma generate
Prisma Client (TypeScript types)
    ↓ imported by @safrs/api
API Routes (Hono handlers with typed request/response)
    ↓ oRPC / tRPC contract
Frontend Components (Next.js with typed API client)
    ↓ renders
UI Elements with full type safety at compile time
```

### Project Structure
```
golden-path/
  apps/
    web/              → Next.js frontend (consumes @safrs/web)
  packages/
    (none — uses monorepo root packages)
  prisma/
    schema.prisma     → Database schema definition
  src/
    api/              → Hono API routes
    lib/              → Shared utilities
  tests/
    e2e/              → Browser journey tests
```

### Quality Gates
Golden Path enforces strict quality gates that all SAFRS-based capsules must pass:

```bash
# First-run diagnosis
pnpm run doctor

# Quality gates (must all pass)
pnpm --filter @safrs/web lint        # Code style and formatting
pnpm --filter @safrs/web typecheck   # TypeScript compilation
pnpm --filter @safrs/web test        # Unit and integration tests
pnpm --filter @safrs/web build       # Production build

# End-to-end browser journey
pnpm test:e2e                         # Playwright or similar E2E tests
```

## Key Decisions

| Date | Decision | Rationale | Owner | Impact | Status |
|------|----------|-----------|-------|--------|--------|
| 2026 | Use @safrs/* shared packages | Centralizes common functionality (auth, database, API patterns, UI components) across all capsules. Reduces duplication and ensures consistency. | Chief | Architecture standard | Enforced |
| 2026 | No production deploy | Explicitly scoped as proof-of-concept. Production concerns (scaling, monitoring, security hardening) add complexity that distracts from the core type-safety demonstration. | Chief | Scope boundary | Enforced |
| 2026 | No authentication system | Auth is a complex domain (sessions, JWT, OAuth, password hashing). Adding auth to a POC creates noise. Auth will be added as a separate reference implementation after Golden Path passes. | Chief | Scope boundary | Enforced |
| 2026 | Synthetic demo data only | Using real data in a POC creates privacy and compliance risks. Synthetic data enables free experimentation and public sharing of the codebase. | Chief | Data strategy | Enforced |
| 2026 | Quality gates as mandatory | Without enforced quality gates, the reference implementation becomes a broken window. Other capsules will copy bad patterns. | Chief | Quality standard | Enforced |

## Current Focus

### Active Development Streams (as of 2026-09-14)

1. Database Schema Definition and Migration
   - Prisma schema defining core entities (User, Post, Comment as demo domain)
   - Migration generation and application
   - Seed script for synthetic demo records
   - Type generation verification: `prisma generate` produces valid TypeScript types

2. API Endpoint Development
   - Hono routes with Zod request validation
   - Typed response contracts
   - Error handling patterns (400, 404, 500) with consistent response shape
   - Integration with `@safrs/api` shared package patterns

3. Frontend Consumption
   - Next.js pages/routes rendering data from API
   - Type-safe API client (oRPC or tRPC)
   - Loading states and error boundaries
   - Form submission with validation feedback

4. Demo Record End-to-End
   - Create one complete demo record through all layers: DB insert -> API create -> UI form submission -> UI list display
   - Verify type safety at each boundary: compile-time type checking catches mismatches
   - Document the exact steps as a runbook for other capsule developers

5. Quality Gate Enforcement
   - All lint, typecheck, test, build commands passing in CI
   - E2E test verifying the demo record journey in a headless browser

## Blockers & Dependencies

| # | Blocker | Severity | Dependency | ETA | Owner | Impact if Unresolved | Mitigation |
|---|---------|----------|------------|-----|-------|---------------------|------------|
| 1 | Shared package stability | High | @safrs/api, @safrs/database, @safrs/web must be stable and documented | TBD | Chief | Golden Path cannot demonstrate type safety if shared packages are broken or changing | Freeze shared package APIs for Golden Path duration; version lock |
| 2 | Type generation pipeline | High | Prisma -> TypeScript types auto-generation must work reliably | TBD | Chief | Manual type maintenance defeats the purpose; introduces human error | Automate `prisma generate` in pre-build hook; fail build if generation fails |
| 3 | E2E test environment | Medium | Headless browser + test database setup in CI | TBD | Chief | Cannot verify end-to-end flow automatically; relies on manual testing | Use Playwright with `playwright-test` and testcontainers for PostgreSQL |
| 4 | Documentation for other capsules | Medium | Clear runbook showing how to replicate Golden Path pattern | TBD | Chief | Other capsule developers cannot learn from Golden Path; adoption blocked | Document every step in `docs/golden-path-runbook.md`; include video walkthrough |

## Related Projects

| Project | Relationship | Data Flow | Notes |
|---------|-------------|-----------|-------|
| [SentraBot](sentrabot.context.md) | Primary migration target | SentraBot will gradually adopt @safrs/* patterns from Golden Path | SentraBot is the highest-value migration because it is the core revenue product. Priority order: packages/contracts -> packages/db -> packages/ui-tokens. |
| [Avery](avery.context.md) | Secondary migration target | Avery (Hermes/SQLite) will evaluate migration to @safrs/* after Golden Path validation | Decision pending: absorb Hermes into @safrs/* layer or maintain as domain-specific framework. Golden Path success supports convergence. |
| [Control Center](control-center.context.md) | Monitoring consumer | Control Center will consume Golden Path health metrics as the canonical SAFRS health endpoint pattern | Golden Path must implement the standard health endpoint that Control Center expects. |
| [Portfolio Dr. Novia](portfolio-drnovia.context.md) | Architectural contrast | None | Dr. Novia uses standalone vendored approach; Golden Path uses full @safrs/* stack. Both are valid patterns for different project types. |

## Session Log

| # | Date | Agent | Mode | Summary | Outcomes |
|---|------|-------|------|---------|----------|
| 001 | 2026-09-14 | Vida (external) | Observation | Discovered during workspace scan as internal infrastructure/reference capsule | Confirmed Next.js + Hono + PostgreSQL + @safrs/* stack; identified as proof-of-concept |

## Knowledge Base

### Key Documents

| # | Document | Path | Type | Sensitivity | Last Modified |
|---|----------|------|------|-----------|---------------|
| 1 | Golden Path README | `projects/internal/golden-path/README.md` | Product | Internal | 2026-09-02 |
| 2 | Golden Path AGENTS.md | `projects/internal/golden-path/AGENTS.md` | Governance | Internal | 2026-09-02 |

### Extracted Insights

- **Reference Implementation as Force Multiplier**: Golden Path's value is not in the demo application itself but in the pattern it establishes. Every subsequent SAFRS-based capsule will copy its structure, its quality gates, and its type-safety patterns. A well-designed Golden Path accelerates all future development; a poorly designed one propagates technical debt.
- **Type Safety as Quality Gate**: The requirement that all type mismatches be caught at compile time (not runtime) is a fundamental architectural principle. It eliminates an entire class of bugs (API contract violations) that traditionally require integration testing to catch. This shifts the "tax" from testing to type design.
- **Scope Discipline**: The explicit non-goals (no auth, no production deploy, no real data) demonstrate mature product management. Scope creep is the primary killer of proof-of-concept projects. Golden Path's narrow focus maximizes the probability of delivering a working demonstration.
- **Package Ecosystem Dependency**: Golden Path's success is inseparable from the stability of the `@safrs/*` packages. If those packages are unstable or poorly documented, Golden Path fails regardless of its own code quality. This creates a critical path: stabilize shared packages -> validate with Golden Path -> migrate other capsules.
