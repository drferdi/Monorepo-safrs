# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: the cinematic neural journey of Sentra as its own site, fifteen chapters on one GSAP
  master timeline scrubbed by the scroll, ending on the founder's film.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R1
- Stack: Next.js 16 (webpack build), React 19, gsap 3.15, TypeScript 5.9; Node 24, pnpm 11.21.0
  with its own lockfile
- Contract and commands: `project.contract.json` and `AGENTS.md` "Commands"
- Protected areas: the frames inside an existing `public/legacy-film/<version>/` (served
  immutable; a re-export makes a new version), the master timeline's phase mapping in
  `timeline.ts` (the tests pin it), and the chapter order and division names in `story.ts`.

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
