# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-18 (E2E web-server race fixed locally — staged, not yet committed)

## Current state

- Work in flight on `main`: the Browser smoke job (`@safrs/web#test:e2e`), red on every push since
  `fe1af2d`, both specs failing with `net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3001/`.
- Root cause: `playwright.config.ts` declared `webServer` with neither `url` nor `port`. Playwright
  only builds a readiness probe when `url` is set (`WebServerPlugin.setup`); without it
  `_waitForProcess()` returns immediately, so the runner spawns `next dev` and starts navigating in
  the same tick. The CI job bore this out — the whole turbo task finished in 2.656s.
- Fix (1 file, uncommitted): add `url: "http://127.0.0.1:3001"`, raise the boot budget to 180s
  because the probe also drives Next's first compile, and pipe the dev server's stdout so a future
  boot failure is readable in the job log.
- Task: `TASK-20260818-E2E-WEBSERVER-WAIT`, R2, `EXECUTING`, owner `agent:claude:root`, owns the
  config and this file.

## Verification evidence (this worktree)

- Isolated repro, same Playwright 1.62.1, server that binds after 4s: without `url` the probe test
  fails on a refused connection; with `url` and nothing else changed it passes in 5.4s. The scratch
  project was deleted afterwards.
- `pnpm test:e2e` locally: `2 passed`, with `[WebServer]` lines now visible in the output.
- Local runs alone cannot reproduce the CI failure — a warm `next dev` binds the port before the
  first navigation, so the race is only lost on a cold runner. CI is the real check.

## Shipped earlier this session

- Dependabot alert 6 (GHSA-ggr8-5vv4-36mx, `deepmerge-ts`) remediated via a pnpm override to
  `>=8.0.1` — GitHub reports the alert `fixed`.
- `README.md` restored to the SAFRS entrypoint after `e746969` overwrote it with the brand page
  (`806e7dd`). The brand README survives at `git show e746969:README.md`.

## Next actions

| Area | Action |
| --- | --- |
| **Chief** | Authorize the E2E fix commit and the push; the CI run on that push is the verification |
| **Chief** | Decide whether the "THE ORIGIN" brand README gets a home (e.g. `docs/brand/`) |
| **Watch** | If CI still fails, the next suspect is the dev server dying on boot — the piped stdout will now say so |
| **Open** | The integrity control verifies fingerprint match, not reviewer independence |
| **Do not** | Expire `refs/original` or the reflog; Phase 1 remains unstarted |

## Session guardrails

- PowerShell; explicit staging only; never `git add -A`.
- Evidence before assertions.
