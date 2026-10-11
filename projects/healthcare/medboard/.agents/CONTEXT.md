# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: clinical intelligence dashboard (CDSS, trajectory, NEWS2, safety gates) for FKTP
  clinicians.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R2; `src/lib/cdss/**` is R3
- Stack: Next.js 16, React 19, TypeScript, Prisma with PostgreSQL, Socket.IO, `node:test` via
  `tsx`; Node 24, pnpm 11.21.0, own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: `src/lib/cdss/**`, `prisma/` schema and migrations, auth

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
