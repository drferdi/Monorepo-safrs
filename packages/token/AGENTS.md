# AGENTS.md — packages/token (@sentra/token)

## Mandate

Every agent that designs or implements UI in this repository — website, landing
page, dashboard, email template, any rendered surface — MUST consume Sentra
design tokens from this package. This is machine-enforced by
`node scripts/check-tokens.mjs` (raw-value scan + WCAG 2.2 AA contrast
recomputation), which runs as part of the governance gate.

## Rules

1. Read `packages/token/UI-RULES.md` before writing any UI code.
2. Raw colour or radius values are forbidden outside `src/tokens.css`.
   Use `var(--color-*)`, `var(--radius-*)`, or the Tailwind utilities generated
   by `src/tailwind.css`.
3. Import semantic tokens only. `--p-*` primitives are private. If a semantic
   token is missing, add it here with its measured contrast ratio — do not
   bypass with a primitive or a literal.
4. `src/tokens.json` is generated from `src/tokens.css`. Edit the CSS, keep the
   JSON in sync in the same change; the contrast gate reads the JSON.
5. Changing a token value is an R2 change (shared package, affects every
   consumer, governed by the contrast gate). It requires re-measuring the
   affected WCAG pairs and designated review.
6. Dark theme values are authored, never derived. A new semantic token must be
   added to BOTH the `:root` and `[data-theme="dark"]` blocks and to both
   `color` and `colorDark` maps in tokens.json.
7. When a path is migrated to tokens, add it to `scope.txt`. Paths are never
   removed from `scope.txt`.

## Consumption (app root stylesheet)

```css
@import "tailwindcss";
@import "@sentra/token/tokens.css";
@import "@sentra/token/tailwind.css";
```

Worked reference screens: `docs/design-system/reference/`. Match the closest
reference; do not invent a composition from the token list.

## Provenance

Ported verbatim from `abyss-monorepo/packages/token` (Sentraverse
Foundation Tokens v1.0, Sentra Artificial Intelligence). The token values and
their measured contrast annotations are the source of truth; do not
re-derive them.
