# HANDOFF

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007`, claim `KEDIRI-BUILD-ENV`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- `node tools/project-standalone/src/cli.mjs verify product/kediri-history` (Monorepo root,
  2026-09-25) passes install, lint, typecheck, and test, and fails build: "Failed to collect
  configuration for /api/graphql-playground", cause "Invalid environment variables".
- Cause: `apps/web/src/app/(payload)/api/graphql-playground/route.ts` imports
  `@payload-config`, which reads `apps/web/src/env.ts`. `createEnv` validates the server schema
  at import time (`DATABASE_URL` and `PAYLOAD_SECRET` are required), so `next build` needs
  production secrets. The verifier's extraction has none.
- `project.contract.json` declares `externalDependencies: []`, which does not match: the build
  needs at least `DATABASE_URL` and `PAYLOAD_SECRET`.
- `env.ts` has an explicit escape: `SKIP_ENV_VALIDATION=1` skips validation. The comment in
  `env.ts` says this escape must be explicit and recorded.

## Work in flight

None.

## Blockers

- Chief decision: should a standalone build run with `SKIP_ENV_VALIDATION=1` (for example a
  `build:standalone` script the contract calls), or should build keep requiring real secrets and
  the contract declare them as external dependencies?

## Next action

- After Chief decides, change the contract (and, if chosen, add the script), declare the env
  locators in `externalDependencies`, and rerun `verify product/kediri-history`.
