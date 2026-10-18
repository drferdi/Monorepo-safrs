# Control Center

**Path:** `projects/internal/control-center/`
**App:** `apps/web` (Next.js, intended local-only)
**Posture:** own pnpm workspace and lockfile, capsule-local `@sentra/token` snapshot (`packages/token`), self-contained `tsconfig.json`, plain `next build`; excluded from the root workspace (2026-10-18). Local operator surface, never deployed.

The repository it reports on is data, not a dependency: it finds the checkout by walking up from its working directory or through `SENTRA_REPO_ROOT`. Started anywhere else, `/` renders "Repository tidak ditemukan" instead of failing.

Canonical: `projects/internal/control-center/docs/architecture.md`.

## One rule

**Status is derived, not declared.** `src/lib/repo/catalog.ts` names evidence paths; `registry.ts` checks the disk. A deleted file turns its feature red without a catalog edit.

No `@safrs/env/server`. No database. No network. No credentials. `dynamic = "force-dynamic"`.

Reads git and the filesystem from the repository root with path containment (`src/lib/repo/root.ts`).

## Related

- `docs/dashboard-integration.md` (root)
- [Features](../features/index.md)
