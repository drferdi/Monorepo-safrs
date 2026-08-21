# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-21 (Portfolio unified to portfolio-drnovia; 3D card deck switcher, Deepsea Dolphins hero background, and dramatic beach 2nd background installed)

## Current state

- **Task:** `TASK-20260821-PORTFOLIO-LATE-SCAFFOLD` — `VERIFYING` — R1/R2 — scope `projects/portfolio-drnovia/`.
- **Sentra Bot phase:** disposable runtime is complete and currently running; release/closure is not complete.
- **Sentra Bot runtime:** Compose project `sentrabot-disposable` is up. PostgreSQL is `healthy`; worker is `healthy`; supervisor is running; web is available at `http://localhost:3000`; all 7 Prisma migrations are applied to disposable `sentrabot_test`.
- **Sentra Bot runtime evidence:** `/api/sentrabot/health/` is `200`; `/workspace/` and `/api/auth/get-session/` are `200`; anonymous bots access is `401`; closed-signup check is `403 SIGNUP_CLOSED`; Better Auth tables exist.
- **Sentra Bot lifecycle:** `TASK-20260821-SENTRABOT-RELEASE-CLOSEOUT`, `TASK-20260821-SENTRABOT-BIOME-MARKETING`, `TASK-20260821-BRAND-BASELINE-OWNERSHIP`, `TASK-20260821-SENTRABOT-LOCKFILE-OWNERSHIP`, and `TASK-20260821-SENTRABOT-WORKSPACE-CATALOG-OWNERSHIP` are all `VERIFYING`.
- **Sentra Bot release blockers:** valid machine-readable integrity manifest/approval is missing for current diff base `b5e064c1b98ee828527dbd7e508f37f3df65da40`; required intake pin `d17a138` remains unavailable and must not be substituted.
- **Portfolio migration:** Unified into `projects/portfolio-drnovia/` (single capsule with complete docs, tests, and interactive React 18 site).
- **Interactive & Visual features:**
  - 3D Card Deck Switcher installed in hero section.
  - Hero background updated to deepsea ocean with dolphins (`assets/hero-dolphin.jpg` - 3420x2565) with dark ocean gradient overlay and enhanced contrast for maximum text legibility.
  - 2nd section (Project Showcase) background updated to 4K dramatic sunset beach with rolling ocean surf (`assets/bg-beach-dramatic.jpg` - 3840x2560).
- **Portfolio tests:** 32/32 tests PASS (`capsule-paths` + `lenis-contract`). Static server active on `http://127.0.0.1:4173`.

## Next actions

1. Chief: feel-test Lenis (`node projects/portfolio-drnovia/server.js` → `:4173`).
2. Delete `projects/portfolio/` once IDE workspace handle lock is released.
3. Integrity review / split merges before claiming full `safrs-verify` green.
4. Co-review `biome.jsonc` with `TASK-20260821-SENTRABOT-BIOME-MARKETING`.

## Verify

```bash
node --test projects/portfolio-drnovia/tests/capsule-paths.test.mjs projects/portfolio-drnovia/tests/lenis-contract.test.mjs
bash scripts/safrs-verify.sh
```
