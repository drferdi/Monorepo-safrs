# Contributing

Asisten Medis is a proprietary project (see `LICENSE`). Contributions come from people the owner
has invited; this guide is for them.

## Before you change anything

1. Read `AGENTS.md`, then `.agents/HANDOFF.md` and `.agents/CONTEXT.md`.
2. Follow the read order in `AGENTS.md` for the area you touch.
3. Check the risk tier. The default is R2. Clinical logic (`lib/iskandar-diagnosis-engine/**`,
   `lib/emergency-detector/**`, `lib/clinical/**`, `public/data/penyakit.json`) is R3 and needs
   the owner's approval before it changes.
4. The side panel has protected files; read `entrypoints/sidepanel/AGENTS.md` first.

## Making a change

- Work on a branch; keep the change to what was asked.
- Write the failing test first for a behaviour change, then the code.
- Code, comments and docs are in English; notes for the owner are in Bahasa Indonesia.
- No `@ts-ignore`, no `eslint-disable`, no implicit `any`.
- Never commit patient data, `.env.local`, keys or credentials (see `SECURITY.md`).

## Checks before a commit

Run from the capsule root:

```bash
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run run:check
```

Run `node scripts/pnpm.mjs run test:e2e` when a browser-visible surface changed. `build` comes
first because it regenerates the WXT types that `typecheck` reads.

## Commits and records

- Commit messages follow Conventional Commits, scoped `med-assist`
  (`fix(med-assist): ...`).
- A durable decision goes to `.agents/DECISIONS.md` (append only, newest first); the session
  state goes to `.agents/HANDOFF.md` (overwritten); user-visible changes go to `CHANGELOG.md`.
- Pushing is the owner's decision.
