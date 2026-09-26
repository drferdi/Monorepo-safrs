# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: Chrome side-panel extension for FKTP clinicians in ePuskesmas (triage, diagnosis
  support, RME transfer), powered by the Iskandar Diagnosis Engine.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R2; clinical logic is R3
- Stack: WXT 0.20 (MV3), React 18, TypeScript, Tailwind, Vitest 4; Node 24, pnpm 11.21.0,
  own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: `lib/iskandar-diagnosis-engine/**`, `lib/emergency-detector/**`,
  `lib/clinical/**`, `public/data/penyakit.json`, and `entrypoints/sidepanel/**` (refactor
  freeze, see its `AGENTS.md`)

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
