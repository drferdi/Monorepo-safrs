# CONTEXT

- Purpose: the Sentra Control Center, a local Node-runtime Next.js application that reads this
  repository and shows every capability it owns, with an honest status, to a solo non-coding
  operator. It does not deploy, does not talk to production, and holds no credentials
  (`AGENTS.md`).
- Human owner: not stated in the capsule's `README.md` or `AGENTS.md`.
- Default risk: R1 for presentation-only changes; changes inside `apps/web/src/lib/repo/` are at
  least R2 once command execution lands (`AGENTS.md` "Risk").
- Stack: Node-runtime Next.js with `@sentra/token` design tokens.
- Contract and commands: this capsule has no `project.contract.json`. Commands are in `AGENTS.md`
  "Commands" (`pnpm --filter @sentra/control-center dev` on port 3100).
- Protected areas: no invented status; every filesystem read goes through `repoPath()`; no shell
  commands built from strings; read-only by default; no secrets in UI, logs, or responses; no
  import of `@safrs/env/server`; user-facing strings are Indonesian.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
