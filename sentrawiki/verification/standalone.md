# Standalone extraction

**Canonical:** ADR 0006, `docs/governance/CAPSULE_SOVEREIGNTY.md`.
**Tool:** `tools/project-standalone` (`pnpm project:status`, `pnpm project:verify <domain/capsule>`).

Empirical extraction is decisive:

1. Copy only the capsule to a fresh directory outside the Monorepo.
2. Deny access to the root.
3. Install using capsule-owned lock state.
4. Run declared lint/typecheck when applicable.
5. Run tests, build, disposable run, smoke, deploy dry-run.
6. Confirm no required path resolved outside the extracted capsule.

HANDOFF (2026-08-26) records `project-standalone verify product/kediri-history` PASS after a Docker Postgres 18.6 + MinIO empty-database run.

Trap recorded in Kediri `docs/testing.md`: `next build` does not clear `.next/dev/`; leftover `pnpm dev` symlinks fail standalone verify. Remove `apps/web/.next` before verify.

## Related

- [Capsule sovereignty](../governance/capsule-sovereignty.md)
- [tools/project-standalone](../tools/project-standalone.md)
