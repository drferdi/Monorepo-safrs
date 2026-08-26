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

Root `AGENTS.md` requires every rendered surface to use approved Sentra design tokens, and the
standalone-capsule contract forbids this capsule from resolving `packages/token` or any other root
workspace package. The sanctioned resolution is a capsule-local snapshot carrying version and
provenance, which is what this directory is.

## Rules

- This directory is the **only** place in the capsule where a raw colour or radius value may
  appear. Everything else uses `var(--color-*)` and `var(--radius-*)`.
- `../../../../../../scripts/check-tokens.mjs` enforces that rule and re-measures WCAG contrast
  for every semantic pair, in both light and dark palettes. It runs as part of `pnpm run test`.
- Enforcement is opt-in per path through `scope.txt`. A path enters when it is migrated and never
  leaves.

## Kediri era palette

The era colour script in `docs/bibles/04-visual-design-art-direction-bible.md` (Kediri Black
`#0C0D0C`, River Deep, Civic Green, Civic Gold, Parchment, Iron, Copper, and the per-era ramps)
is **not** yet represented here. It will be added as a Kediri layer inside this directory when the
visual system is implemented, so that raw values still appear nowhere else. Phase 1 ships only the
Sentra foundation.

## Updating

Re-copy from the upstream source, update the commit and date above, then run
`pnpm run test` so the contrast gate re-measures every pair before the change is accepted.
