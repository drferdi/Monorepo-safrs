# Academic Smartboard

**Path:** `projects/academic/academic-smartboard/`
**Contract:** `project.contract.json` id `academic/academic-smartboard`
**Posture:** own pnpm workspace and lockfile; excluded from the root workspace. Product implementation is **partial** (web ported, API not yet).

Objective (capsule README): multi-tenant tutoring platform — session scheduling, curriculum, evaluation, tutor payroll, and the Kayyisa AI agent for Kurikulum Merdeka.

## Current vs missing

| Surface | Status |
| --- | --- |
| `apps/web` | Ported through sub-phase 5/5 (see below) |
| `apps/site` | Ported — public El-Kayyisa site, Next.js 16 static export |
| `apps/api` | Not yet ported — backend runtime stays the archived FastAPI via `NEXT_PUBLIC_BACKEND_URL` |
| `apps/demo` | Not created |
| `ai/kayyisa/` | Migrated knowledge package |
| `data/curriculum/`, `data/reference/` | Migrated |

### apps/web (S1–S5)

The web app is ported through sub-phase 5. Alongside the earlier surfaces (login, role-aware shell, scheduling/academics, payroll/overtime, ops/master data), S5 added:

- **Pengaturan** (`src/app/pengaturan/`): hak-akses, directory-tutor, template-evaluasi, audit.
- **Persetujuan** (`src/app/persetujuan/`).
- **Platform admin** (`src/app/platform/`) for `is_platform_admin`: Institusi, Paket, Audit.
- **Kayyisa**: dashboard column, FAB in `AppShell.tsx`, and a trajectory-of-development panel — not a stub.

Handoff (2026-09-15) records 103 unit tests PASS with typecheck and build PASS.

Migration origin: archived `abyss-monorepo` (ADR 0003).

Tokens: capsule-local `packages/token` plus vendored `vendor/sentra-token-1.0.0.tgz`. Extraction must not resolve root `packages/token`.

## Related

- `projects/academic/academic-smartboard/docs/architecture.md`
- ADR 0003 — `docs/adrs/0003-smartboard-migration.md`
- [Projects index](index.md)
