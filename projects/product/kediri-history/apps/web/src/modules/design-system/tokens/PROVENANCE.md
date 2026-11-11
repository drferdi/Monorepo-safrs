# Token snapshot provenance

| Field | Value |
| --- | --- |
| Package | `@sentra/token` |
| Version | 1.0.0 |
| Source | Sentra Monorepo `packages/token/src/` |
| Source commit | `2fa329a` (last commit touching `packages/token`) |
| Copied on | 2026-08-26 |
| Upstream origin | abyss-monorepo, Foundation Tokens v1.0 |
| Files | `tokens.css`, `tokens.json` |

## Why a snapshot and not a dependency

Every rendered surface uses approved Sentra design tokens. The capsule-local snapshot keeps the
project standalone without resolving an external workspace package.

## Rules

- This directory is the **only** place in the capsule where a raw colour or radius value may
  appear. Everything else uses `var(--color-*)` and `var(--radius-*)`.
- `../../../../../../scripts/check-tokens.mjs` enforces that rule and re-measures WCAG contrast
  for every semantic pair, in both light and dark palettes. It runs as part of `pnpm run test`.
- Enforcement is opt-in per path through `scope.txt`. A path enters when it is migrated and never
  leaves.

## Kediri era palette

The Kediri layer defines the cinematic palette and per-era ramps inside this directory, so raw
values remain local to the token contract.

## Updating

Re-copy from the upstream source, update the commit and date above, then run
`pnpm run test` so the contrast gate re-measures every pair before the change is accepted.
