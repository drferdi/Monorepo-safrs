# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: Public website of UPTD Puskesmas PONED Balowerti Kediri plus primary-care master
  reference datasets.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R1 (destructive dataset changes R2)
- Stack: React 19, Vite 7, Tailwind, Vitest in `website/`; JSON datasets in `database/`;
  Node 24, pnpm 11.21.0, lockfile `website/pnpm-lock.yaml`
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: `database/icd10.json`, `database/144_penyakit_puskesmas.json`

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
