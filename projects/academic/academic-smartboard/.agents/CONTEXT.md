# CONTEXT

- Purpose: multi-tenant tutoring platform covering session scheduling, curriculum, evaluation,
  tutor payroll, and the Kayyisa AI agent for Kurikulum Merdeka (`AGENTS.md` objective).
- Human owner: Chief (dr. Ferdi Iskandar). Default risk: R1 (`project.contract.json`).
- Stack: Node.js 24 and pnpm; apps under `apps/site` and `apps/web` build as static exports; the
  token source and gate live in `packages/token`, and apps consume the pinned tarball
  `vendor/sentra-token-1.0.0.tgz`.
- Contract and commands: `project.contract.json`; the command list is in `AGENTS.md` "Commands".
  Run: `node scripts/serve.mjs` (site 127.0.0.1:4310, web 127.0.0.1:4311). All commands run from
  the capsule root.
- Protected areas: no production credentials or production data; after changing the token run
  `pnpm run token:pack` and then `pnpm install`; do not modify other projects or shared packages
  without recording scope expansion.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
