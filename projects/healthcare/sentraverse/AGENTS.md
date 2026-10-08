# Sentraverse — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Sentraverse (domain: `healthcare`)
- Objective: Public Sentra marketing website and platform hub for sentrahai.com.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R1`. Breaking public routes or the `/dashboard` and `/asisten-medis`
  rewrites needs review.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace (`pnpm-workspace.yaml`), lockfile,
scripts, and build configuration. It never depends on an enclosing workspace, catalog,
lockfile, configuration, script, tool, package, or another capsule. External services are
declared in `project.contract.json` by environment-variable name only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md` and `ARCHITECTURE.md`
3. `docs/data.md`
4. `docs/testing.md`

## Commands

All commands run from this capsule root as argv (`program` plus `args`); see
`project.contract.json`.

- `install`: `node scripts/pnpm.mjs install --frozen-lockfile`
- `lint`: `node scripts/pnpm.mjs run lint`
- `typecheck`: `node scripts/pnpm.mjs run typecheck`
- `test`: `node scripts/pnpm.mjs run test` (every `*.test.mjs` under `app/` and `components/`)
- `build`: `node scripts/pnpm.mjs run build`
- `run`: `node scripts/pnpm.mjs run start` (serves on 127.0.0.1:4340)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run`
- Browser end-to-end smoke (needs Playwright browsers installed): `node scripts/pnpm.mjs run test:e2e`

## Prohibited actions

- Never expose secrets or patient data; this is a public site.
- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
