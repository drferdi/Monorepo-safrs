# CONTEXT

- Purpose: Sentra Bot, one product across web, Electron desktop, and Expo mobile; Electron hosts
  the web UI (`AGENTS.md`).
- Human owner: not stated in the capsule's `README.md` or `AGENTS.md`.
- Stack: pnpm with Turbo; source development runs `pnpm install`, `pnpm sandbox:build`, and
  `pnpm dev` (api, worker, web) on `http://127.0.0.1:5173` (`README.md` "Run protocol").
- Contract and commands: this capsule has no `project.contract.json`. Verification commands are
  `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, and `pnpm test:e2e`
  (`README.md` "Verification gate").
- Protected areas: this is a public repository, so never commit secrets, `.env` files, private
  URLs, personal or customer data, or real production data; auth, secret handling, sandbox
  boundaries, host commands, and integrations are security-sensitive; hosted vendors stay optional
  behind provider-neutral interfaces (`AGENTS.md`).

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
