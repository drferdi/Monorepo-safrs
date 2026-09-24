# HANDOFF

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007-3`, claim `KEDIRI-REQUEST-TIME`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

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
