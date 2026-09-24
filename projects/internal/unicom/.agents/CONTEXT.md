# CONTEXT

- Purpose: UNICOM, the legacy multi-agent communication room as a standalone Next.js capsule
  (`AGENTS.md` objective): web interface, `POST /api/chat`, `POST /api/webhooks`, and in-memory
  chat state (`README.md`).
- Human owner: Chief. Default risk: R1; provider credentials, production platform adapters, and
  persistent-state changes need separate authorization.
- Stack: Node.js 24.18.0, pnpm 11.21.0, Next.js; the HTTP smoke probe is `127.0.0.1:4330`
  (`project.contract.json`).
- Contract and commands: `project.contract.json`; the stage table is in `AGENTS.md` "Standalone
  contract". Commands run from the capsule root.
- Protected areas: provider credentials stay outside the repository; no parent-path imports,
  `workspace:*` dependencies, or cross-capsule links; `scripts/verify-structure.mjs` and
  `scripts/verify-extraction.mjs` stay local.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
