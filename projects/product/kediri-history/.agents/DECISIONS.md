# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-25 — Public pages render at request time, with a data cache

- Decision (Chief, 2026-09-25: "(a) dengan cache"): the public routes and the sitemap render at
  request time (`dynamic = "force-dynamic"`), so `build` needs no database. Public CMS reads are
  cached with `unstable_cache` and refresh at most every 300 seconds; search stays uncached.
- Rationale: the standalone proof has no database, and the alternative (a disposable PostgreSQL
  in the verifier) would change the shared verifier and contract schema for every capsule.
- Evidence: `verify product/kediri-history` passes every stage; the guard test
  `request-time-rendering.test.ts` keeps new reader routes from prerendering.

## 2026-09-25 — Standalone build and run skip env validation

- Decision (Chief, 2026-09-25: "boleh berjalan tanpa validasi"): the contract's `build` and `run`
  go through `scripts/skip-env-validation.mjs`, which sets `SKIP_ENV_VALIDATION=1` for that one
  process. This is the explicit, recorded escape that `apps/web/src/env.ts` requires. Production
  deploys do not use the script, so validation still applies there.
- Rationale: the standalone extraction has no production secrets; `env.ts` validates
  `DATABASE_URL` and `PAYLOAD_SECRET` at import time.
- Evidence: with the wrapper, `verify product/kediri-history` gets past env validation and stops
  at the next dependency (Payload needs a secret and a database while prerendering `/sources`).
