# UNICOM

Status: active SAFRS capsule.

## Objective

UNICOM is a Next.js multi-agent communication room migrated from `D:\Devops\abyss-monorepo\apps\internal\unicom`. This migration preserves the legacy chat page, chat endpoint, webhook endpoint, and in-memory chat state without importing legacy dependency state or environment files.

## Boundaries

- In scope: the web interface, `POST /api/chat`, `POST /api/webhooks`, and in-memory chat state.
- Out of scope: Slack, Discord, Teams, persistent state, streaming, and provider-specific agent enhancements.
- Human owner: Chief.

## Interfaces

- Consumes: npm registry packages and an operator-selected AI model provider when agent inference is enabled.
- Exposes: the Next.js application, `POST /api/chat`, and `POST /api/webhooks`.
- Data: no database or persistent state; the legacy baseline uses in-memory state.

## Lifecycle contract

| Stage | Program | Arguments |
| --- | --- | --- |
| install | `pnpm` | `install --frozen-lockfile` |
| lint | `pnpm` | `run lint` |
| typecheck | `pnpm` | `run typecheck` |
| test | `pnpm` | `run test` |
| build | `pnpm` | `run build` |
| run | `pnpm` | `run start` |
| deployDryRun | `pnpm` | `run deploy:dry-run` |

## Local verification

Run the contract stages from this capsule directory. `verify:structure` proves there are no parent-path or root-workspace dependencies. `verify:extraction` copies only this capsule to a temporary directory, installs from its local lockfile, and executes lint, typecheck, test, build, production smoke test, and deployment dry-run.
