# Data

- API data: PostgreSQL through Drizzle (`lib/db`, `DATABASE_URL`); optional for the local
  lifecycle.
- Engine references: `sidelab-engine/data/` (clinical reference tables and formulary data).
- Engine sessions are written to `sidelab-engine/sessions/`, which is git-ignored and listed as
  mutable state; it must never be committed.
- Model credentials (`DEEPSEEK_API_KEY` and others) are named in
  `sidelab-engine/.env.example`; values live only in a git-ignored `.env`.
- Tests use synthetic cases only.
