# Installed — 2026-07-25

This folder arrived as a staging package: it carried its own copies of
`tokens.css`, `tokens.json`, `check-tokens.mjs` and a stylelint sample, plus
instructions to move them into place later.

**That move has happened, and the copies have been deleted.** They had already
drifted from what shipped: the staged `tokens.css` had no dark theme, and the
staged gate was missing four bug fixes. An agent following the old instructions
would have overwritten a working system with a broken one.

## Where everything actually lives

```
packages/design-tokens/src/tokens.css   the only file with a hex value in it
packages/design-tokens/src/tokens.json  same values, machine readable
packages/sentra-ui/                            @sentra/ui — primitives and styles
platform/sentra-portal/                 the worked application, eight screens
scripts/check-tokens.mjs                the token gate
scripts/lint-css.mjs                    stylelint over scoped paths
.stylelintrc.json                       the CSS rules
sentraverse/scope.txt                   which paths are enforced
```

What remains in this folder is documentation and reference only: `UI-RULES.md`
(binding), `reference/` (six worked screens), `assets/`, `DESIGN-NOTES.md`,
`IMPLEMENTATION.md`, and `scope.txt`.

## Running the gates

```bash
pnpm check:tokens          # raw values + contrast, both themes
pnpm check:tokens:audit    # what is still unmigrated, by area
pnpm lint:css              # stylelint over scoped paths

pnpm --filter @the-abyss/sentra-portal test:a11y       # axe, keyboard, zoom, overlay
pnpm --filter @the-abyss/sentra-portal test:hydration  # must run against next dev
```

The first three also run in the pre-commit hook. All of them run in CI.

`test:hydration` has its own config because React only reports hydration
mismatches in development; run against a production build it would pass no
matter how badly the trees diverged.

## Adding a path to enforcement

Put it in `sentraverse/scope.txt`, run `pnpm check:tokens`, and fix what it
reports. A path never leaves that file — one that does is a regression that
stopped being visible.
