# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/referralink` was copied as it is
  to `projects/healthcare/referralink`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.git/` (an empty nested folder; the files are tracked by the legacy root repo),
  `.agent/`, `graphify-out/`, `dist/`, `test-results/`, `.env.local`, `node_modules/`.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh lockfile and `nodeLinker: hoisted`;
  Node 22 became Node 24. The pnpm 9 override block was dropped.
- `pnpm audit` on 2026-09-26: every advisory came through `@vercel/node` 3.x, which the code
  uses for types only. Upgraded to `@vercel/node` `^16.0.1`; that release still pulls old
  `undici`, `path-to-regexp`, and `ajv`, so three scoped overrides remain in
  `pnpm-workspace.yaml`. Audit then reported no known vulnerabilities.
- pnpm 11 build-script policy: `esbuild` allowed; Carbon and IBM Plex postinstall scripts
  (telemetry and fonts) and `@parcel/watcher` denied.
- Lint is N/A because the project's `lint` script is `tsc --noEmit`, which the contract runs as
  `typecheck`. The 87 node:test tests pass.
- The legacy `AGENTS.md` protected-auth-surface rule was kept. Its mention of a
  `.husky/pre-commit` guard was dropped because that hook was not part of the tracked source.
- Absolute legacy paths were rewritten, including the `source` field in
  `data/sentrapediaDiseaseExtract.json` (provenance text only).
