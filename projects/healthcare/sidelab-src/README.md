# Sentra SideLab

Research-prototype clinical decision support for FKTP physicians. Not production-ready; do not
use in live clinical care without physician oversight. The engine's own documentation is in
[`sidelab-engine/README.md`](./sidelab-engine/README.md).

## Layout

- `sidelab-engine/` — Python engine (Python 3.12 or newer): clinical reasoning, red-flag
  detection, pharmacology guardrails, and local references; pytest suite in `tests/`
- `artifacts/api-server` — Express 5 API with Drizzle ORM (PostgreSQL)
- `artifacts/stride-dashboard` — Vite web dashboard
- `artifacts/mockup-sandbox`, `artifacts/sidelab-video` — design sandbox and video assets
- `lib/` — OpenAPI spec, generated React client and Zod schemas, database schema
- `electron-app/` — desktop shell (`cdss-fktp-sidelab`, own npm lockfile)

## Commands

From this folder, with Node 24 and pnpm 11.21.0:

```bash
node scripts/install.mjs
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run test
node scripts/with-local-env.mjs run build
node scripts/with-local-env.mjs run start:local
```

`start:local` serves the dashboard on http://127.0.0.1:4345. Environment variable names are in
`project.contract.json` and `sidelab-engine/.env.example`.
