# Med Assist — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Med Assist, formerly Sentra Assist (package `@the-abyss/med-assist`, domain:
  `healthcare`)
- Objective: Chrome side-panel extension that assists FKTP clinicians in ePuskesmas with
  anamnesis, vital signs, differential diagnosis, and pharmacotherapy.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2`. Clinical logic — `lib/iskandar-diagnosis-engine/**`,
  `lib/emergency-detector/**`, `lib/clinical/**`, and `public/data/penyakit.json` — is R3:
  get Chief's approval before changing it.
- Language: Bahasa Indonesia for Chief-facing notes; English for code.

## Standalone contract

This capsule owns its runtime: its own pnpm workspace, lockfile, scripts, and WXT build
configuration. It never depends on an enclosing workspace, catalog, lockfile, configuration,
script, tool, package, or another capsule. External services are declared in
`project.contract.json` by name only.

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`
3. `docs/data.md`
4. `docs/testing.md`
5. `docs/clinical-rules.md` before touching clinical reference logic
6. `entrypoints/sidepanel/AGENTS.md` before touching the side panel

## Commands

All commands run from this capsule root as argv; see `project.contract.json`.

- `install`: `node scripts/pnpm.mjs install --frozen-lockfile`
- `lint`: `node scripts/pnpm.mjs run lint`
- `typecheck`: `node scripts/pnpm.mjs run typecheck`
- `test`: `node scripts/pnpm.mjs run test` (full Vitest suite, including every clinical test)
- `build`: `node scripts/pnpm.mjs run build` (output in `.output/chrome-mv3-dev`)
- `run`: `node scripts/pnpm.mjs run run:check` (loads the built extension and checks every
  referenced file)
- `deployDryRun`: `node scripts/pnpm.mjs run deploy:dry-run` (`wxt zip`, no upload)
- Development in a browser: `node scripts/pnpm.mjs run dev`; after editing entrypoints or
  parsers, hard-reload the extension in `chrome://extensions` before concluding a fix failed.

## Domain rules

- Diagnosis logic must be deterministic, auditable, and traceable to clinical criteria.
- Every diagnostic rule requires input criteria, differential exclusions, a confidence tier,
  and an ICD-10 mapping. No probabilistic guessing without explicit uncertainty flags.
- Clinical source of truth: the local knowledge base (`public/data/penyakit.json`) wins; the
  LLM is a reranker only.
- Trajectory: visualise visit history from one visit onward.
- Emergency Detector 4-Gate with Pattern-Engine v2, and Clinical Trajectory V1/V2, are
  intentional layering, not duplication to clean up.
- Browser code uses `import.meta.env.*` only, never `process.env.*`.
- UI uses Sentra design tokens (`var(--*)`), no ad-hoc Tailwind colour classes.
- Never mount heavy clinical components hidden with `display:none`; mount conditionally.
- Side panel UI authority and its refactor freeze: `entrypoints/sidepanel/AGENTS.md`.

## Prohibited actions

- Never put patient data or secrets into fixtures, tests, or commits.
- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.
