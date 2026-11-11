# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-25 — Standalone contract with localized package snapshots

- Decision: the capsule owns its pnpm workspace (`package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`), exact dependency versions instead of `catalog:`, and snapshots of the eight
  private root packages it used (`@safrs/api`, `config`, `database`, `env`, `schemas`,
  `telemetry`, `ui`, `@sentra/token`) under `packages/`. It also owns `biome.jsonc`, `.npmrc`,
  `.gitignore`, `.env.example` (safe disposable local values only), the Next.js production build
  script, and a capsule-scoped token gate (`scripts/check-tokens.mjs` over `apps/` and `packages/`).
- Rationale: the root packages are private and unpublished, so localizing is the only way to
  satisfy the standalone contract (root `AGENTS.md`); snapshots now evolve with this capsule.
- Evidence: `node tools/project-standalone/src/cli.mjs verify internal/golden-path` → RESULT PASS
  (all stages) after deleting `node_modules`; `check_project_independence.py` → OK.

## 2026-09-25 — Security patch: next 16.3.6 and transitive overrides

- Decision: `apps/web` pins `next` 16.3.6; `pnpm-workspace.yaml` overrides `next` 16.3.6 (also the
  optional `@sentra/token` peer), `sharp >=0.35.4`, `mysql2 ^3.22.0`, `fast-uri ^3.1.6`, the same
  pattern as root `main`, kediri-history and academic-smartboard.
- Evidence: lockfile next 16.3.6, mysql2 3.24.4, sharp 0.35.4; `pnpm audit` 0 high (5 moderate).
