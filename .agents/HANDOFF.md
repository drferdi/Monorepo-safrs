# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (stability repair committed on Chief's yes)

## Current state

- Branch `main`. Stability slice: production `next build` wrapper, Postgres host-port doctor check, `--force-recreate` on local compose, Control Center port 3100, Golden Path bind `127.0.0.1`.
- Local `safrs_local` already has migration `0002_align_demo_schema` (applied on this machine; not a schema-file change).
- Debug instrumentation from session `49373b` is gone. `debug-*.log` is gitignored.

## Work in flight

Nothing.

## Waiting on Chief

Nothing for this slice. Do not claim 100% feature reliability: Stripe optional 503, `/favicon.ico` 404, Next 16 one-lock-per-app-dir remain known limits.

## Next actions

1. `pnpm test:e2e` only when Golden Path `next dev` is not holding the app lock.
2. Push only if Chief asks.
