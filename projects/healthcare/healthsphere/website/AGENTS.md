# AGENTS.md — Puskesmas Website

Read the capsule router [`../AGENTS.md`](../AGENTS.md) first; this file only adds website scope.

## Identity

- Name: Puskesmas Website (HealthSphere)
- Package: `@the-abyss/puskesmas-website`
- Type: Static React 19 + Vite single-page site for UPTD Puskesmas PONED Balowerti Kediri
- Owner: Chief (dr. Ferdi Iskandar)

## Run

From the capsule root:

```bash
node scripts/pnpm.mjs --dir website run lint
node scripts/pnpm.mjs --dir website run typecheck
node scripts/pnpm.mjs --dir website run test --run
node scripts/pnpm.mjs --dir website run build
node scripts/pnpm.mjs --dir website run dev
```

## Rules

- No patient data or secrets in content or commits.
- Public information site, not a clinical engine.
