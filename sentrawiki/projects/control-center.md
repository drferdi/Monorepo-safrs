# Control Center

**Path:** `projects/internal/control-center/`
**App:** `apps/web` (Next.js, intended local-only)
**Posture:** root-coupled (`@sentra/token`, `@safrs/config`, root Next build script). Local operator surface, never deployed.

Canonical: `projects/internal/control-center/docs/architecture.md`.

## One rule

**Status is derived, not declared.** `src/lib/repo/catalog.ts` names evidence paths; `registry.ts` checks the disk. A deleted file turns its feature red without a catalog edit.

No `@safrs/env/server`. No database. No network. No credentials. `dynamic = "force-dynamic"`.

Reads git and the filesystem from the repository root with path containment (`src/lib/repo/root.ts`).

## Related

- `docs/dashboard-integration.md` (root)
- [Features](../features/index.md)
