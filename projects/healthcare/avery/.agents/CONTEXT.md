# CONTEXT

- Purpose: run and maintain Avery, Sentra's Hermes agent, as versioned configuration from laptop
  to VPS (`AGENTS.md` objective). Machine-readable identity: `PROJECT_GENOME.yaml`; SPDS entry:
  `docs/spds/read_first.md`.
- Human owner: Chief (dr. Ferdi Iskandar). Default risk: R1 (`AGENTS.md`).
- Stack: configuration, operational scripts, and one small standard-library Python package
  (`src/avery_outbound`); the runtime is a separately installed Hermes Studio.
- Contract and commands: this capsule has no `project.contract.json`. Build, lint, and type check
  are not applicable; test is `pwsh -NoProfile -File projects/healthcare/avery/scripts/test.ps1`
  from the Monorepo root (`AGENTS.md` "Commands").
- Protected areas: never commit `auth.json` or model-provider credentials, the WhatsApp session
  directory, filled `.env` files, `state.db`, `kanban.db`, or other runtime databases, `memories/`,
  or the installed Hermes Studio; do not rewrite `ai/profiles/avery/SOUL.md` without Chief's
  approval (`AGENTS.md` "Batas data").

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
