# ADR 0001: Adopt the SAFRS solo-developer golden path

- Status: ACCEPTED
- Date: 2026-08-10
- Decision owner: Chief
- Risk: R2 (shared architecture, packages, database, CI, and governance)

## Context

Chief needs a monorepo that makes safe application delivery approachable without hand-writing API documentation, opening several terminals, or remembering fragile setup steps. The repository must preserve all SAFRS v1.1 controls and avoid inventing a product domain.

## Options considered

1. Separate web and API deployments with manually maintained HTTP documentation.
2. A single Next.js deployment unit mounting a package-owned Hono API with Zod-derived contracts.
3. A generic empty repository with no executable reference path.

## Decision

Adopt option 2. The default reference application is Next.js App Router on Node.js, mounting Hono under `/api`. Zod schemas are the shared contract; the Hono client derives TypeScript autocomplete and compile-time drift detection. PostgreSQL and Prisma are local-only baseline data tooling. Turborepo provides root commands, while the doctor/setup/dev workflow reduces the number of operator decisions.

Electron, WXT, Stripe, email, AI, and Python remain optional capability packs. Python is permitted only when a technical need cannot be met by the baseline. Stable/active-LTS releases are required; prerelease dependencies and Edge runtime work require a later accepted ADR.

## Consequences

- A backend contract change is caught by frontend type checking rather than a separately maintained Swagger/Postman collection.
- The repository has one documented reference path but does not claim a production deployment or product feature.
- Shared packages, migrations, API boundaries, dependencies, CI, and governance are R2. Production infrastructure/data, credentials, financial action, or healthcare-critical execution are R3 and require explicit human authorization.
