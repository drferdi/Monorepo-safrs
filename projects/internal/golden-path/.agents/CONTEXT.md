# CONTEXT

- Purpose: prove the SAFRS typed Database → API → Web flow with one safe demo record
  (`AGENTS.md` objective).
- Human owner: Chief. Default risk: R1; dependency, shared-package, API, database, or architecture
  changes are R2 (`AGENTS.md`).
- Stack: Next.js on the Node runtime with the Hono adapter, capsule-local snapshots of `@safrs/api`,
  `@safrs/env`, `@safrs/ui` (and their closure) under `packages/`, and local PostgreSQL through
  `@safrs/database`.
- Contract and commands: `project.contract.json`; commands run from this capsule root and are
  listed in `AGENTS.md` "Exact commands".
- Protected areas: `DATABASE_URL` stays server-only; no `NEXT_PUBLIC_*` secrets; database mutation
  routes, the dependency lockfile, and shared API/UI interfaces are sensitive.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
