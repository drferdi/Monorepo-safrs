# Getting started

There are two entry points. Pick the one that matches the work.

## A. Root control plane + legacy golden-path

Use this for governance tooling, golden-path demo, or control-center.

### Prerequisites

- Node.js `>= 24.18 < 25`
- pnpm 11.21.0 (`packageManager` field; `corepack enable` if needed)
- Docker Desktop (root Postgres on `127.0.0.1:54329`)
- Python 3 (`safrs-verify`)
- Git LFS (Playwright visual baselines)

### Setup

```bash
pnpm install
pnpm run setup
```

`pnpm run setup` runs `scripts/setup.mjs`: environment checks, Docker Postgres, Prisma generate/migrate/seed for the **root** `@safrs/database` demo.

### Daily root commands

```bash
pnpm doctor      # environment diagnosis
pnpm status      # task registry and leases
pnpm dev         # golden-path Next.js (scripts/dev.mjs)
pnpm test        # contract + unit tests
pnpm test:e2e    # Playwright
pnpm check       # governance + tokens + lint + typecheck + test + build
pnpm governance  # SAFRS local verification
```

### Task registry

```bash
pnpm task claim --id TASK-YYYYMMDD-XXX --title "..." --owner-id <id> --owner-label "<agent>" --risk R1 --scope <path>
pnpm task state --id TASK-YYYYMMDD-XXX --to EXECUTING
pnpm task list --active
pnpm task close --id TASK-YYYYMMDD-XXX
```

Registry files live under the git common directory (`.git/safrs-control-plane/`), not in the working tree.

### Root database (golden-path only)

```bash
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm db:reset    # blocked unless disposable (reset guard)
```

Postgres image: `postgres:17-alpine` in root `compose.yaml`. This is **not** Kediri's or SentraBot's database.

## B. A sovereign capsule

Work from the **capsule root**. Do not use root `pnpm --filter` as the lifecycle.

```bash
cd projects/product/sentrabot          # example
# then the capsule's own install / test / build from project.contract.json
pnpm project:status                    # from repo root: list contracts
pnpm project:verify product/kediri-history
```

Standalone proof: `tools/project-standalone` copies the capsule out of the monorepo and runs declared lifecycle commands. See [Standalone verification](../verification/standalone.md).

Read the capsule `AGENTS.md` before changing it. Product docs beat this wiki for runtime detail.

| Capsule | Capsule docs |
| --- | --- |
| SentraBot | `projects/product/sentrabot/docs/architecture.md` |
| Kediri | `projects/product/kediri-history/README.md` |
| Avery | `projects/healthcare/avery/docs/spds/read_first.md` |
| Smartboard | `projects/academic/academic-smartboard/docs/architecture.md` |
| Portfolio | `projects/corporate/portfolio-drnovia/docs/quickstart.md` |

## Telemetry (optional, root)

```bash
docker compose -f compose.telemetry.yaml up -d jaeger
# UI http://localhost:16686  OTLP http://localhost:4318/v1/traces
```

## What not to do

- Do not `git clean -xdf` at repo root — it deletes gitignored `database/` corpus data.
- Do not read, print, or commit `.env` or production credentials.
- Do not push without Chief's explicit session order (`CHIEF_PUSH_OK`; project paths need `CHIEF_PUSH_PROJECTS_OK`). See `.agents/BOUNDARIES.md`.
- Do not copy golden-path's `@safrs/*` imports into a new capsule.

## Related

- [How to contribute](../how-to-contribute/index.md)
- [Tools](../tools/index.md)
- [Capsules](../projects/index.md)
