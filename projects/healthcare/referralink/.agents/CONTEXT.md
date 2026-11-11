# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: MEDLINK public sandbox for differential diagnosis, ICD-10 mapping, and referral
  considerations on synthetic data.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R2 (diagnosis logic is treated as R3)
- Stack: React 19, Vite 6, TypeScript, Vercel Node handlers in `api/`, Upstash Redis and
  Vector, OpenAI-compatible gateway; Node 24, pnpm 11.21.0, own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: auth surface listed in `AGENTS.md` "Scope rules"; `api/diagnosis.ts` and
  `api/_services/diagnosis*`

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
