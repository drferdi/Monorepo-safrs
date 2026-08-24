# Sentraverse UI — rules for any agent touching the interface

Read this before writing UI (website, landing page, dashboard). It is short on
purpose. Ported from abyss-monorepo `sentraverse/UI-RULES.md`; the worked
reference examples live in `docs/design-system/reference/`.

## The one-line rule

Raw values do not appear outside `packages/token`. Not in a component,
not in a style block, not "just this once for a demo".
`node scripts/check-tokens.mjs` runs in the governance gate and will fail the
build.

## Where things live

```
packages/token/src/tokens.css     the only file with a hex value in it
packages/token/src/tokens.json    same values, machine readable
packages/token/src/tailwind.css   Tailwind v4 @theme bridge (utilities)
packages/token/scope.txt          paths under enforcement. Add one when
                                          it is migrated; never remove one.
docs/design-system/reference/             six worked HTML examples — the system
                                          built, not described
docs/design-system/assets/sentra-mark.svg the logomark. Use as is; never redraw.
```

## Getting the tokens into an app

A workspace member depends on `@sentra/token` and imports, once, in its
root stylesheet:

```css
@import "tailwindcss";
@import "@sentra/token/tokens.css";
@import "@sentra/token/tailwind.css";
```

Import semantic tokens only. Anything named `--p-*` is a private primitive; if
you find yourself reaching for one, the semantic token you need is missing — add
it to the token package with its measured contrast, do not bypass it.

Dark theme is authored, not derived: set `data-theme="dark"` on the root
element and every semantic token re-resolves. Never hand-pick dark values.

## Colour

**The zone rule.** Vermilion `--color-accent` and crimson
`--color-status-critical` sit 1.91 apart in contrast. They are told apart by
location, not by hue.

- Chrome zone — wordmark, sequence numbers, active navigation, panel corner
  marks, the logomark tile. Uses `--color-accent*`. Never uses status colours.
- Content zone — verdicts, gate results, defect marks, failing rows. Uses
  `--color-status-*`. Never uses the accent.

A block that carries both is a defect, not a variation.

**Colour never carries meaning alone.** Every status has a distinct glyph shape
and a word beside it: filled, half, outline, dashed. The screen must stay
readable in greyscale.

**Tint the worst state only.** Failing rows get `--color-surface-critical`.
Warnings get nothing. If every condition is tinted, none of them is urgent.

**Four data series is the ceiling.** `--color-data-1..4` step in lightness so
they survive greyscale and print. Past four, label the marks directly — no
legend.

## Layout

12 columns, gutter 24, margin 40, max width 1440. Content anchors on columns
1–7, side context on 9–12. **Column 8 stays empty.** That gap is the system's
asymmetry. It is structural. Do not fill it.

Body text never exceeds 68 characters per line (`--layout-container-text`).

## Shape and line

`--radius-structure` is 0 and applies to tables, panels, dividers, surfaces.
`--radius-control` is 2px and applies only to buttons and inputs — the curve
means this can be touched. There is no third radius.

Shadow is for temporary overlays and for control affordance. Buttons carry a 3px
solid ledge (`--button-ledge`), no blur, which disappears as the control travels
on press. Stable content is separated by hairlines and space, never by shadow.

**Cards are not the default unit.** Use a panel's four corner marks, or nothing
at all. A container is the last resort, after typography and whitespace have
failed.

## Type

Geist, one family (+ Geist Mono). Self-hosted variable fonts only, vendored in
`assets/fonts/` (OFL) and loaded via `@sentra/token/fonts` — never from
a font CDN at runtime. The display voice comes from size + weight (Geist has no
width axis; `--font-width-*` stay at neutral 100). Three weights: 400, 500,
600. Left aligned. Tabular figures in every numeric column. Mono means
machine-produced: identifiers, paths, measurements, raw capture.

## Icons

20px canvas, 1.5 stroke, `stroke-linecap: butt`, `stroke-linejoin: miter`. No
rounded terminals — any library may be used if it is configured to this.

Icons accompany labels. They stand alone only for close, more, and dismiss.
Never alone for a destructive action. Every icon-only control needs
`aria-label`, and the SVG itself is `aria-hidden`.

**The logomark is exempt from the icon spec.** It appears on module cards, once
in the chrome, and in empty states. Not on data panels, not as a watermark, not
repeated down a list.

## States are part of the component

A component is not finished until default, hover, focus-visible, active,
disabled, loading, error and empty are all defined.

Empty is three different states and they are not interchangeable:

- nothing has ever been created → explain what the thing is, offer the one
  action
- a filter excludes everything → say how many exist, offer the way back
- the queue is cleared → report it, and give no button at all

A progress bar is used only when progress is genuinely measured. When it cannot
be measured, use a skeleton — never a full-page spinner.

Errors state what failed, what still works, when it happened, and the one action
available. Never write "Something went wrong."

## Forms

Label always visible; a placeholder is not a label. Requirement marked with the
word Required, not an asterisk. Validate on blur, then on every change once a
field has errored, and on submit move focus to the first invalid field. An
invalid control carries `aria-invalid`, a 2px border and a tint — three signals,
so colour is never alone.

## Overlays

One at a time. Focus moves in on open, Tab is trapped inside, Escape closes, and
focus returns to the control that opened it. A modal never opens another modal.

## Accessibility floor

WCAG 2.2 AA, not as a review step but as a build condition. Contrast is
measured, not estimated — `scripts/check-tokens.mjs` recomputes every semantic
pair and fails below threshold. Keyboard reachable, focus visible, 44px minimum
target, `prefers-reduced-motion` honoured, live regions on async content.

## The worked examples

`docs/design-system/reference/` holds six self-contained HTML files. When
building a screen, open the closest one and match it — do not invent a
composition from the token list.

```
reference/01-design-system.html   grid, type, colour, line vocabulary, prohibitions
reference/02-patterns.html        icons, empty/loading/error states, forms, overlays
reference/03-brand-mark.html      logomark rules and product colours
reference/04-runs-index.html      any list screen starts here
reference/05-run-detail.html      any detail screen starts here
reference/06-button-lab.html      why the button looks the way it does (EXC-01)
```
