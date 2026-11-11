# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: Public Sentra marketing website and platform hub for sentrahai.com.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R1
- Stack: Next.js 16 (App Router, webpack build) on Node 24, pnpm 11.21.0, own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: security headers and rewrites in `next.config.mjs`; `/api/medical-knowledge`

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
