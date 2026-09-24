# HANDOFF

Last updated: 2026-09-25 (Claude Code, branch `integration/post-adr-0007-2`, claim `KEDIRI-STANDALONE-NO-ENV`)

Overwrite this file at the end of every capsule-scoped session; never append. Durable decisions go
to `DECISIONS.md`.

## Current state

- `project.contract.json`: `build` and `run` run through `scripts/skip-env-validation.mjs`
  (Chief decision, see `DECISIONS.md`); `externalDependencies` now declares `DATABASE_URL` and
  `PAYLOAD_SECRET`.
- `node tools/project-standalone/src/cli.mjs verify product/kediri-history` (2026-09-25): install,
  lint, typecheck, test PASS; build FAIL. Env validation no longer stops it. Next Payload itself
  fails while prerendering `/sources`: "missing secret key. A secret key is needed to secure
  Payload." The public pages (`apps/web/src/app/(public)/**`) read content through
  `apps/web/src/content/queries.ts` from Payload at build time, so a static build needs a
  database with content.

## Work in flight

None.

## Blockers

- Chief decision (touches `docs/ARCHITECTURE_LOCK.md` territory): either the public content pages
  render at request time (no database at build; every request hits Payload), or the standalone
  proof provides a disposable PostgreSQL plus a throwaway `PAYLOAD_SECRET` (the contract schema
  has no way to start a service today, so this needs a verifier or contract change).

## Next action

- After Chief decides, implement that option and rerun `verify product/kediri-history` until every
  stage passes.
