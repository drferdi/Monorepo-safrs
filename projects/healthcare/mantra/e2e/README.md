# Sentra MANTRA — Beranda persona E2E (K1)

Bench-level Playwright harness. Not part of any custom app (ADR-0001: only
`sentra_mantra_portal` owns a product Node toolchain). Asserts Beranda content
per persona against
[`docs/design/2026-07-16-beranda-persona-design.md`](../docs/design/2026-07-16-beranda-persona-design.md)
§4.

## Prerequisites

- Dev container with `bench start` serving `http://localhost:8000`
- Site `mantra.localhost`
- Two separate env vars (ADR-0002 — never commit values):
  - `MANTRA_ADMIN_PASSWORD` — Administrator (persona chief)
  - `MANTRA_E2E_PASSWORD` — synthetic `e2e-*@mantra.test` accounts only

Never put passwords in the repo, commit messages, or command-line literals.
Do **not** fall back from one variable to the other.

```bash
export MANTRA_ADMIN_PASSWORD   # Administrator only
export MANTRA_E2E_PASSWORD     # e2e-* seed + login only
```

Optional: store the same keys in `/workspace/.env` (git-ignored). Helpers
`seed.sh` / `run_tests.sh` read **only** those keys via `env_helpers.sh`
(they do not `source` the whole `.env`).

## Seed test users (idempotent)

Creates four synthetic users (`e2e-*@mantra.test`) plus Employee / Practitioner
fixtures. Seeds one Profil Publik link on `e2e-umum@mantra.test` only.
Uses `MANTRA_E2E_PASSWORD` only (does not change Administrator).

```bash
bash e2e/seed.sh
# equivalent: MANTRA_E2E_PASSWORD set, then ./env/bin/python e2e/run_setup.py
```

## Install & run

```bash
bash e2e/run_tests.sh
```

Manual equivalent:

```bash
cd e2e
npm install
npx playwright install chromium
export MANTRA_ADMIN_PASSWORD
export MANTRA_E2E_PASSWORD
npx playwright test
```

Optional UI mode:

```bash
npm run test:ui
```

## Personas under test

| Login | Persona | Password env |
|---|---|---|
| `Administrator` | chief | `MANTRA_ADMIN_PASSWORD` |
| `e2e-clinical@mantra.test` | clinical | `MANTRA_E2E_PASSWORD` |
| `e2e-hr@mantra.test` | hr | `MANTRA_E2E_PASSWORD` |
| `e2e-finance@mantra.test` | finance | `MANTRA_E2E_PASSWORD` |
| `e2e-umum@mantra.test` | umum | `MANTRA_E2E_PASSWORD` |

## Policy

- Do not change `apps/sentra_*` to make tests pass — report app bugs instead.
- Do not use real staff accounts or patient data.
- Passwords only via the env vars above.
