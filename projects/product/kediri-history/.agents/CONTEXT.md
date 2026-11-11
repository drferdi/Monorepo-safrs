# CONTEXT

- Purpose: Kediri — A Living Civilization, a cinematic web history experience for Pemerintah Kota
  Kediri (`AGENTS.md` objective).
- Human owner: Chief (dr. Ferdi Iskandar). Default risk: R2; production publish and credential use
  are R3 (`AGENTS.md`, `project.contract.json`).
- Stack: Node.js 24 and pnpm; application code lives under `apps/`, not the placeholder `src/`.
- Contract and commands: lifecycle argv is declared in `project.contract.json`. Standalone
  verification from the Monorepo root: `node tools/project-standalone/src/cli.mjs verify
  product/kediri-history`.
- Protected areas: no production credentials or production data; do not modify other projects or
  shared packages without recording scope expansion.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
