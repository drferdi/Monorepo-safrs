# Testing

## Objective

Tests prove the human-visible readiness desk, typed demo response handling, API adapter, and graceful server-data recovery.

## Exact commands

- `pnpm --filter @safrs/web test`
- `pnpm --filter @safrs/web typecheck`
- `pnpm --filter @safrs/web build`

## Boundaries and dependencies

Unit tests use safe local environment values only when a build needs them. They do not print secrets or call production services. API and database contracts are consumed through declared `@safrs/*` packages.

## Non-goals and canonical policy

Browser end-to-end testing and deployment verification are outside this capsule's initial test scope. Follow the root [AGENTS.md](../../../AGENTS.md) and [SAFRS_SPEC.md](../../../SAFRS_SPEC.md) for risk and verification requirements.
