# Sentraverse UI — rules for any agent touching the interface

> This file is deliberately **not** named CLAUDE.md so it can never overwrite an
> existing one. It is reached from the repo's own CLAUDE.md by a single line —
> see INSTALL.md.

Read this before writing UI. It is short on purpose. The full reasoning lives in
`docs/design-system/`; what follows is the part you must obey.

## The one-line rule

Raw values do not appear outside `packages/design-tokens`. Not in a component,
not in a style block, not "just this once for a demo".
`node scripts/check-tokens.mjs` runs on every pull request and will fail the
build.

## Where things live

```
packages/design-tokens/src/tokens.css   the only file with a hex value in it
packages/design-tokens/src/tokens.json  same values, machine readable
packages/sentra-ui/src/styles.css       component styles, tokens only
packages/sentra-ui/src/*.tsx            primitives: Button, Panel, StatusIndicator,
                                        DataTable, Field, Modal, states, shell
platform/sentra-portal/                 the worked application. Screens import
                                        @sentra/ui, never raw CSS values.
sentraverse/scope.txt                   paths under enforcement. Add one when it
                                        is migrated; never remove one.
sentraverse/vendored.txt                apps that get a copied tokens.css
```

## Getting the tokens into an app

A workspace member depends on `@sentra/design-tokens` and imports `tokens.css`
once, in its root layout.

An app that cannot — because it is headed for its own repository, or is already
excluded from `pnpm-workspace.yaml` — registers itself in
`sentraverse/vendored.txt` and runs `pnpm sync:tokens`. That writes
`sentra-tokens.css` into the app with the source hash in its banner, and
`pnpm check:tokens` fails whenever the copy and the package disagree. A vendored
file that nobody verifies is how a design system dies quietly: the staging copy
that used to live in this folder had lost the entire dark theme before anyone
noticed.

Registering an app does not change how it looks. It puts the tokens within
reach. Adoption is a separate, deliberate change, and enforcement begins only
when the path also enters `scope.txt`.

Import semantic tokens only. Anything named `--p-*` is a private primitive; if
you find yourself reaching for one, the semantic token you need is missing — add
it to the token package with its measured contrast, do not bypass it.

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
they survive greyscale and print. A fifth hue collides with a status colour.
Past four, label the marks directly — no legend.

## Layout

12 columns, gutter 24, margin 40, max width 1440. Content anchors on columns
1–7, side context on 9–12. **Column 8 stays empty.** That gap is the system's
asymmetry. It is structural. Do not fill it.

Body text never exceeds 68 characters per line.

## Shape and line

`--radius-structure` is 0 and applies to tables, panels, dividers, surfaces.
`--radius-control` is 2px and applies only to buttons and inputs — the curve
means this can be touched. There is no third radius.

Shadow is for temporary overlays and for control affordance. Buttons carry a 3px
solid ledge, no blur, which disappears as the control travels on press. Stable
content is separated by hairlines and space, never by shadow.

**Cards are not the default unit.** Use a panel's four corner marks, or nothing
at all. A container is the last resort, after typography and whitespace have
failed.

## Type

Archivo, one family. The display voice comes from the width axis at 112, not
from a second typeface. Three weights: 400, 500, 600. Left aligned. Tabular
figures in every numeric column. Mono means machine-produced: identifiers,
paths, measurements, raw capture.

## Icons

20px canvas, 1.5 stroke, `stroke-linecap: butt`, `stroke-linejoin: miter`. No
rounded terminals — any library may be used if it is configured to this.

Icons accompany labels. They stand alone only for close, more, and dismiss.
Never alone for a destructive action. Every icon-only control needs
`aria-label`, and the SVG itself is `aria-hidden`.

**The logomark is exempt from the icon spec.** It is filled outline with
horizontal end cuts and is never redrawn to match an internal rule. It appears
on module cards, once in the chrome, and in empty states. Not on data panels,
not as a watermark, not repeated down a list.

## States are part of the component

A component is not finished until default, hover, focus-visible, active,
disabled, loading, error and empty are all defined.

Empty is three different states and they are not interchangeable:

- nothing has ever been created → explain what the thing is, offer the one
  action
- a filter excludes everything → say how many exist, offer the way back
- the queue is cleared → report it, and give no button at all

A progress bar is used only when progress is genuinely measured. A bar driven by
a timer is a lie and operators learn to distrust it. When it cannot be measured,
use a skeleton — never a full-page spinner.

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

`sentraverse/reference/` holds six self-contained HTML files. They are the
system built, not described. When building a screen, open the closest one and
match it — do not invent a composition from the token list.

```
reference/01-design-system.html   grid, type, colour, line vocabulary, prohibitions
reference/02-patterns.html        icons, empty/loading/error states, forms, overlays
reference/03-brand-mark.html      logomark rules and product colours
reference/04-runs-index.html      any list screen starts here
reference/05-run-detail.html      any detail screen starts here
reference/06-button-lab.html      why the button looks the way it does (EXC-01)
```

`sentraverse/assets/sentra-mark.svg` is the logomark. Two paths, viewBox 1000.
Use it as is; never redraw it.

The reference files were never opened in a browser. `platform/sentra-portal`
was: its eight screens are the system running, and
`platform/sentra-portal/tests/accessibility.spec.ts` measures them in Chromium
on every pull request — axe on every screen in both themes, a keyboard walk,
focus visibility, reflow at 200% zoom, and the overlay focus contract.

That suite found a real defect the reference screens shipped with: the rail's
inactive sequence numbers used `--color-text-muted`, which measures 3.21:1 and
is a non-text value. Where the reference and the portal disagree, the portal is
right — it is the one that has been measured.

## If a rule blocks you

Do not work around it quietly. Either the rule is right and the design should
change, or the rule needs an exception — written into
`docs/design-system/exceptions.md` with the measurement that justifies it, the
way EXC-01 records the button ledge against the neumorphism prohibition. An
undocumented workaround is how a system dies.
