# Testing

SAFRS contract (static, no container needed; `pnpm project:verify healthcare/mantra`):
`python scripts/capsule_check.py test` (boundaries, upstream lock, compose pins, legacy paths,
app JSON) and `python -m compileall -q apps scripts e2e`.

Bench-level checks run inside the dev container against the local site `mantra.localhost`:

1. `python scripts/check_app_boundaries.py` — ADR-0001 dependency direction (no bench needed).
2. `bench --site mantra.localhost run-tests --app <sentra_mantra_*>` — Frappe unit and
   integration tests for each custom app.
3. `cd e2e && npm test` — Playwright Beranda persona suite; needs `bench start` on port 8000
   and the variables described in `e2e/README.md`.

Never run tests or migrations against a real hospital database.
