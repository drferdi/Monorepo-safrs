# HANDOFF

Last updated: 2026-09-26 (Claude Code, branch `fix/kediri-gsap-hardening`, claim `KEDIRI-GSAP-PRODUCTION-HARDENING`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- GSAP production hardening (2026-09-26): commit `800f0dff` (merged on the `kediri` remote as PR #2
  on 2026-09-12, never brought into the Monorepo) is cherry-picked: production motion canary
  workflow, `e2e/production-motion.spec.ts`, `playwright.production.config.ts`,
  `tests/motion-gsap-registration.test.ts`, `scripts/run-production-motion.mjs`. Files match the
  `kediri` remote except `apps/web/package.json`, which keeps `next` 16.3.6. `verify` PASS on
  every stage after the cherry-pick. The Monorepo capsule and `kediri/main` may still differ
  elsewhere; compare before the next publish.

- Security patch (2026-09-25): `apps/web` pins `next` 16.3.6 (was 16.3.0, RCE advisories
  GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 below 16.3.3); `pnpm-workspace.yaml` overrides
  `next` 16.3.6 (also the `@payloadcms/ui` peer), `sharp >=0.35.4`, `js-yaml ^4.3.2`. Capsule
  `pnpm audit --audit-level=high` exit 0 (2 low, 6 moderate remain). `project-standalone verify
  product/kediri-history` PASS on every stage after the change.

- Public routes render at request time (Chief decision, see `DECISIONS.md`):
  `apps/web/src/app/(public)/layout.tsx` and `apps/web/src/app/sitemap.ts` export
  `dynamic = "force-dynamic"`. Every public read in `apps/web/src/content/queries.ts` except
  `searchArchive` is wrapped in `unstable_cache` with `revalidate: 300`.
- New guard `apps/web/tests/architecture/request-time-rendering.test.ts`: every `src/app` file
  that imports `content/queries` must sit under a `force-dynamic` segment. It failed on the 10
  reader routes before the change and passes after it.
- `node tools/project-standalone/src/cli.mjs verify product/kediri-history` (2026-09-25): every
  stage PASS (install, lint, typecheck, test, build, artifacts, deployDryRun, run, smoke `/` 200,
  cleanup). Before the change, build failed prerendering `/sources` ("missing secret key").

## Work in flight

None.

## Blockers

None.

## Next action

- Not yet observed: that the data cache cuts database reads at runtime. That needs a running app
  with a content database; check it on the next session that has one.
- `revalidateTag` is still never called, so edits in the CMS show on public pages after at most
  five minutes. Publish hooks that call it would make updates immediate.
- The brief's `docs/ARCHITECTURE_LOCK.md` does not exist; the capsule's architecture doc is
  `docs/architecture.md`.
