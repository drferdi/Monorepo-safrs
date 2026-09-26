# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/sidelab-src` was copied as it is
  to `projects/healthcare/sidelab-src`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `.env*` files other than `*.example`, `node_modules/`,
  `dist/`, the engine's virtual environment and caches.
- Toolchain: fresh pnpm 11.21.0 lockfile, Node 24. In `pnpm-workspace.yaml`: `nodeLinker:
  hoisted`; the win32-x64 platform exclusions removed so the capsule installs on Windows;
  `onlyBuiltDependencies` became `allowBuilds`; the `catalog:` block was inlined into the 59
  specifiers that used it (the repository rejects catalogs); the `esbuild` override raised to
  `^0.28.1` and `@scalar/json-magic>undici` pinned to `^7.29.0` for `pnpm audit`.
- `preinstall` became `node scripts/only-pnpm.mjs` (portable, no `sh`).
- `install` also creates the engine venv and installs `requirements.txt`; `test` runs the full
  engine pytest suite (`not live and not performance`) with the project's own coverage gate.
- `replit.md` (an unfilled template) is kept; `README.md` is the capsule entry point.
- Known test failures are left as they were in legacy on Chief's instruction (2026-09-27:
  "biarkan dulu, buat catatan"); see `docs/testing.md` "Known gaps" and `HANDOFF.md`.
