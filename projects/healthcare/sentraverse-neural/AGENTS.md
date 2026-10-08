# Sentraverse Neural — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Sentraverse Neural (domain: `healthcare`)
- Objective: the cinematic neural journey of the Sentra brand as its own site — fifteen chapters
  on one GSAP master timeline scrubbed by the scroll, ending on the founder's film. Split out of
  `sentraverse` on 2026-10-09.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R1`. No patient data, no credentials, no environment variables, no API.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace (`pnpm-workspace.yaml`), lockfile,
scripts, and build configuration. It never depends on an enclosing workspace, catalog,
lockfile, configuration, script, tool, package, or another capsule. The pages it points to
(`/story`, `/ekosistem`, `/privacy`, `/terms`) are absolute links to sentrahai.com, not imports.

## Owned scope

- This capsule directory and all descendants.
- Declared external dependencies (the npm registry, pinned in `pnpm-lock.yaml`) only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md` and `docs/neural-journey.md` (the design record)
3. `docs/data.md`
4. `docs/testing.md`

## Commands

All commands run from this capsule root as argv (`program` plus `args`); see
`project.contract.json`.

- `install`: `node scripts/pnpm.mjs install --frozen-lockfile`
- `lint`: `node scripts/pnpm.mjs run lint`
- `typecheck`: `node scripts/pnpm.mjs run typecheck`
- `test`: `node scripts/pnpm.mjs run test` (every `*.test.mjs` under `components/`)
- `build`: `node scripts/pnpm.mjs run build`
- `run`: `node scripts/pnpm.mjs run start` (serves on 127.0.0.1:4346)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run`
- Browser end-to-end (needs Playwright and the installed Chrome; local only for now):
  `node scripts/pnpm.mjs run test:e2e`, with `PLAYWRIGHT_BASE_URL` pointing at a running build
- Film re-export: `node scripts/legacy-film/extract.mjs`, then `node scripts/legacy-film/measure.mjs`
  (see `docs/neural-journey.md`)

## Prohibited actions

- Never expose secrets or personal data; this is a public site.
- Never replace the film with a seeked `<video>`; it stays a scrubbed frame sequence.
- Never change a frame inside an existing `public/legacy-film/<version>/` folder: it is served
  `immutable`; a re-export goes into a new version folder.
- Do not modify other projects or shared packages without recording scope expansion.
- Do not use production credentials or production data.
- When nested in a governed repository, follow its contribution review and authorization rules;
  never make this capsule's lifecycle or standalone proof depend on those repository controls.
