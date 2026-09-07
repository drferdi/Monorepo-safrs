# Academic Smartboard

**Path:** `projects/academic/academic-smartboard/`
**Contract:** `project.contract.json` id `academic/academic-smartboard`
**Posture:** own pnpm workspace and lockfile; excluded from the root workspace. Product implementation is **partial**.

Objective (capsule README): multi-tenant tutoring platform — session scheduling, curriculum, evaluation, tutor payroll, and the Kayyisa AI agent for Kurikulum Merdeka.

## Current vs missing

| Surface | Status (capsule README) |
| --- | --- |
| `apps/web` | Ported sub-phase 1/5 — scaffold, auth shell, Master›Murid |
| `apps/site` | Ported — public El-Kayyisa site, Next.js 16 static export |
| `apps/api` | Not yet ported |
| `apps/demo` | Not created |
| `ai/kayyisa/` | Migrated knowledge package |
| `data/curriculum/`, `data/reference/` | Migrated |

Migration origin: archived `abyss-monorepo` (ADR 0003).

Tokens: capsule-local `packages/token` plus vendored `vendor/sentra-token-1.0.0.tgz`. Extraction must not resolve root `packages/token`.

## Related

- `projects/academic/academic-smartboard/docs/architecture.md`
- ADR 0003 — `docs/adrs/0003-smartboard-migration.md`
