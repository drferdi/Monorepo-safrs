# Architecture

SideLab has four parts in one pnpm workspace plus a Python engine:

- `sidelab-engine/` — the clinical engine (`sidelab.py`, package `sidelab/`, HTTP entry
  `api.py`). It supports several model backends (DeepSeek, local Ollama, and others) and keeps
  local clinical references in `data/`.
- `artifacts/api-server` — Express 5 API; its contract is the OpenAPI spec in `lib/api-spec`,
  from which Orval generates `lib/api-client-react` and `lib/api-zod`. `lib/db` holds the
  Drizzle schema for PostgreSQL.
- `artifacts/stride-dashboard` — Vite web dashboard; `start:local` serves its built output.
- `electron-app/` — desktop shell that packages the engine for Puskesmas use.

`build` type-checks the TypeScript project references, then builds every package that has a
`build` script.
