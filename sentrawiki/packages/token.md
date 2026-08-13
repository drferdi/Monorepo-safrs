# Token (`@sentra/token`)

## Purpose

The Sentra design token package and the enforced source of visual truth for every rendered surface in the repository. **Any agent building UI must consume these tokens** — raw colour or radius values are forbidden outside `packages/token/src/tokens.css`. This is machine-enforced by `node scripts/check-tokens.mjs` (raw-value scan + WCAG 2.2 AA contrast recomputation), which runs as part of the governance gate.

The package was ported verbatim from `abyss-monorepo/packages/token` (Sentraverse Foundation Tokens v1.0). Token values and their measured contrast annotations are the source of truth; do not re-derive them.

## Key source files

| File | Purpose |
| --- | --- |
| `packages/token/src/tokens.css` | **The only file that may contain a hex value** (`:root` + `[data-theme="dark"]` blocks) |
| `packages/token/src/tokens.json` | Same values, machine-readable; the contrast gate reads this |
| `packages/token/src/tailwind.css` | Tailwind v4 `@theme` bridge exposing token utilities |
| `packages/token/src/fonts.ts` | Self-hosted Geist / Geist Mono font loading |
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
- **Type** — Geist + Geist Mono, self-hosted variable fonts (OFL), weights 400/500/600, left-aligned, tabular figures in numeric columns.
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
