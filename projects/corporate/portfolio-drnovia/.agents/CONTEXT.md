# CONTEXT

- Purpose: NOVIA STUDIO portfolio site for Dr. Novia Anggraini (`AGENTS.md` "Owned scope").
- Human owner: Chief (dr. Ferdi Iskandar). Default risk: R1 (`project.contract.json`).
- Stack: Node.js 24, static React 18 with vendored Lenis 1.3.26, no package manager or lockfile;
  served on `http://127.0.0.1:4173`.
- Contract and commands: `project.contract.json`; exact commands are in `AGENTS.md` "Exact
  commands". Lint and typecheck are declared not applicable.
- Protected areas: preserve the Framer visual composition; attach Lenis to `.framer-bpy7lj`, never
  to `window`; no packages, lockfile, Turbo, or Biome without a separately approved architecture
  change; no invented auth, CMS, analytics pixels, or production URLs.
- Earlier local decisions also live in `docs/decisions.md`.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
