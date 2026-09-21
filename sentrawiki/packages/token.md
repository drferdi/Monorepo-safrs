# Token (`@sentra/token`)

> **Scope.** Root **authoring** source for Sentra tokens. ADR 0006: a standalone capsule must own a local snapshot or pin an independently distributable version. Extraction must not resolve `packages/token`. Root `scripts/check-tokens.mjs` is a root gate, not a capsule lifecycle command.

## Purpose

Sentra design tokens. Agents building UI must use approved Sentra tokens. Raw colour or radius values are forbidden outside the owning token file (`packages/token/src/tokens.css` in the root authoring tree, or the capsule-local equivalent).

Root enforcement: `node scripts/check-tokens.mjs` (raw-value scan + WCAG 2.2 AA contrast). `packages/token/scope.txt` currently lists `packages/token`, `packages/ui`, golden-path web, academic-smartboard apps, and `projects/product/sentrabot/apps/web/src`. SentraBot is excluded from the root pnpm workspace; do not assume that scope line means SentraBot runtime-depends on this package.

Ported from `abyss-monorepo/packages/token` (Sentraverse Foundation Tokens v1.0). Do not re-derive measured contrast annotations.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/token/src/tokens.css` | **The only file that may contain a hex value** (`:root` + `[data-theme="dark"]` blocks) |
| `packages/token/src/tokens.json` | Same values, machine-readable; the contrast gate reads this |
| `packages/token/src/tailwind.css` | Tailwind v4 `@theme` bridge exposing token utilities |
| `packages/token/src/fonts.ts` | Self-hosted Archivo / JetBrains Mono font loading |
| `packages/token/scope.txt` | Paths under enforcement; added when migrated, never removed |
| `packages/token/AGENTS.md` | Package mandate and rules |
| `packages/token/UI-RULES.md` | Full UI ruleset (colour zones, layout, type, states, a11y) |
| `docs/design-system/reference/` | Six worked reference screens to match, not invent |

## Consumption (app root stylesheet)

A workspace member depends on `@sentra/token` and imports it once:

```css
@import "tailwindcss";
@import "@sentra/token/tokens.css";
@import "@sentra/token/tailwind.css";
```

Import **semantic** tokens only. Anything named `--p-*` is a private primitive; if a semantic token is missing, add it to the package with its measured contrast ratio — never bypass with a primitive or a literal.

## Non-negotiable rules (from `AGENTS.md`)

1. Read `packages/token/UI-RULES.md` before writing UI code.
2. Raw colour/radius values are forbidden outside `src/tokens.css`; use `var(--color-*)`, `var(--radius-*)`, or Tailwind utilities.
3. Import semantic tokens only; `--p-*` primitives are private.
4. `src/tokens.json` is generated from `src/tokens.css` — keep them in sync in the same change.
5. Changing a token value is **R2**: re-measure affected WCAG pairs and obtain designated review.
6. Dark theme values are **authored, never derived** — a new semantic token goes into both `:root` and `[data-theme="dark"]`, and into both `color` and `colorDark` maps in `tokens.json`.
7. Migrated paths are added to `scope.txt` and never removed.

## Design-language highlights (from `UI-RULES.md`)

- **Zone rule** — vermilion `--color-accent*` is for chrome (wordmark, navigation, corner marks); crimson `--color-status-*` is for content verdicts (failing rows, gates). A block carrying both is a defect.
- **Colour never carries meaning alone** — every status has a distinct glyph and a word beside it; the UI must survive greyscale.
- **Tint the worst state only** — failing rows get `--color-surface-critical`; warnings get nothing.
- **Four data series is the ceiling** — `--color-data-1..4` step in lightness.
- **Layout** — 12 columns, gutter 24, margin 40, max width 1440; column 8 stays empty; body text ≤ 68 chars/line.
- **Shape** — `--radius-structure` 0 (tables, panels); `--radius-control` 2px (buttons/inputs only). No third radius. Buttons carry a 3px solid ledge, no blur.
- **Type** — Archivo + JetBrains Mono, self-hosted variable fonts (OFL), weights 400/500/600, display voice from Archivo's width axis (wdth 112), left-aligned, tabular figures in numeric columns.
- **States are part of the component** — default, hover, focus-visible, active, disabled, loading, error, and empty (three distinct empty states) must all be defined.
- **Accessibility floor** — WCAG 2.2 AA as a build condition: contrast measured (`check-tokens.mjs` recomputes every semantic pair), keyboard reachable, 44px minimum target, `prefers-reduced-motion` honoured, live regions on async content.

## Verification

```bash
pnpm --filter @sentra/token lint
node scripts/check-tokens.mjs     # raw-value scan + WCAG 2.2 AA recomputation
```

## Related pages

- [UI package](ui.md) — React primitives built on the tokens
- [UI rules](../../packages/token/UI-RULES.md) — the full UI convention document
- [Reference screens](../../docs/design-system/reference/) — worked examples to match
- [Shared packages](index.md)
