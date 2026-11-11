# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: research-prototype clinical decision support for FKTP physicians (engine, API,
  dashboard, desktop shell).
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R2; `sidelab-engine/sidelab/` clinical reasoning and
  `sidelab-engine/tests/clinical/` are R3
- Stack: Python 3.12+ engine with pytest; TypeScript 5.9, Express 5, Drizzle, Vite, Electron;
  Node 24, pnpm 11.21.0, own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
