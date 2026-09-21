# Sentraverse UI — v1.0

Design system and reference screens for Sentraverse, built on Swiss Design
principles. Everything here is self-contained HTML; open any file in a browser.

## Files

| File                             | What it is                                                                                  | Open it when               |
| -------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
| `sentraverse-tokens.css`         | The system. Semantic tokens over private primitives.                                        | Porting into the repo      |
| `sentraverse-design-system.html` | Foundations: doctrine, grid, type, colour, line vocabulary, space, components, prohibitions | Before touching any screen |
| `sentraverse-patterns.html`      | Icons, empty/loading/error states, forms, overlays — all live                               | Building a new screen      |
| `sentraverse-brand-mark.html`    | Logomark rules, product colours, where the mark may appear                                  | Placing the mark anywhere  |
| `sentraverse-runs-index.html`    | Reference screen: list, filter, sort, select, paginate, three states                        | Building any list          |
| `sentraverse-run-detail.html`    | Reference screen: detail, verdict, evidence                                                 | Building any detail view   |
| `sentraverse-button-lab.html`    | EXC-01 record: five button treatments, one struck                                           | Revisiting the button      |
| `sentra-mark.svg`                | The logomark, two paths, viewBox 1000                                                       | Any implementation         |

## Six locked decisions

1. **Colour** — brand plus status, not status alone
2. **Canvas** — pure white; surfaces warmed to `#F7F5F1`
3. **Typeface** — Archivo, one family, width axis carries the display voice
4. **Radius** — 0 on structure, 2px on controls; the curve means touchable
5. **Density** — comfortable only; a compact mode is deferred until asked for
6. **Button** — treatment C, hard ledge (EXC-01)

## Three rules that settle most arguments

**The zone rule.** Vermilion `#DE4526` and crimson `#A11208` sit 1.91 apart —
too close to tell apart at a glance. They are separated by location, not hue.
Vermilion lives only in chrome: wordmark, sequence numbers, active navigation,
panel corners, the mark's tile. Crimson lives only in content: verdicts, failed
gates, defect marks. A screen that mixes them in one block is a defect.

**Tint the worst state only.** Failing rows are tinted; warnings are not. If
every condition gets a wash, the page is evenly coloured and nothing is urgent.
The tint is a second signal behind the glyph and the word, never the first.

**Four data series is the ceiling.** The ramp steps in lightness so series
survive greyscale and print. A fifth hue cannot be added without colliding with
a status colour. Beyond four, label the marks directly.

## Column 8

Content anchors on columns 1–7, side context on 9–12. Column 8 is left empty on
purpose — that gap is the system's asymmetry. It is structural. Do not fill it.

## The logomark

`sentra-mark.svg` is a **trace**, not the vector source. It was measured from
`logo.png` and fitted until it overlapped the original by 97.06% of pixels.

The SVG that shipped inside `Sentra_Product_Logos.html` was a reconstruction —
13.8% wrong on aspect ratio, 11% wrong on stroke weight, split into three loose
pieces with a detached circle. It was discarded and must not be reused.

Two properties of the real artwork worth knowing: the bar ends are cut
**horizontally**, not square to the bar, which is why no `stroke-linecap` will
ever match and why the mark must be filled paths rather than strokes; and the
stroke **swells at the bend**, 77.2 to 86.5, the optical correction that stops a
curve reading thinner than the straight it joins.

At 20–96px the 3% residual is invisible. For print, signage or packaging, use
the vector source. When it appears, replace `#sentra-mark` and delete the
provenance note in section 01 of the brand page.

## Status — 2026-07-25

The system is implemented, enforced and measured. What follows below this
section describes the reference package as it was authored; where it and the
implementation disagree, the implementation is the newer fact.

|                               | Where                                                  |
| ----------------------------- | ------------------------------------------------------ |
| Tokens, light and dark        | `packages/design-tokens`                               |
| Primitives                    | `packages/sentra-ui`                                          |
| Worked application, 8 screens | `platform/sentra-portal`                               |
| Raw-value and contrast gate   | `pnpm check:tokens`, CI + pre-commit                   |
| CSS lint                      | `pnpm lint:css`, CI + pre-commit                       |
| Browser accessibility suite   | `pnpm --filter @the-abyss/sentra-portal test:a11y`, CI |

Three of the four items listed as open below are closed: the stack is Next.js
with plain CSS custom properties, the dark theme is authored and measured (34
contrast checks across both themes), and the product is named Smartboard
throughout.

**Localisation is still open.** The portal ships English copy, so the concern
about mono uppercase labels at .07em tracking breaking under longer Indonesian
strings has not been tested. It will surface the first time a screen is
translated.

## What is verified, and what is not

**Verified by measurement:** every contrast figure, computed not estimated. All
small text meets AA. Markup checks pass on every page — `aria-hidden` on all
decorative SVG, `role="dialog"` and `aria-modal` on overlays, live regions on
async content, `aria-sort` on sorted columns, accessible names on icon-only
controls, `prefers-reduced-motion` honoured throughout. No hardcoded hex outside
the token layer, except swatch chips, which must be literal.

**Not verified:** no real browser pass. Nothing here has been through a screen
reader, a keyboard walk, 200% zoom, or Safari. That is the first job for whoever
picks this up.

## Four things still open

1. **Stack.** `abyss-monorepo` framework unknown. Tokens ship as plain CSS
   custom properties, which map to Tailwind v4 `@theme`, a `tailwind.config`
   extend, or CSS-in-JS without a rewrite. This blocks everything else.
2. **Dark theme.** Not started. Every token needs a counterpart, and the zone
   rule needs re-verifying — the product colours were authored for dark and
   measure 6.3–8.9 there against 2.1–3.0 on white.
3. **Localisation.** Untested with Indonesian copy. Mono uppercase labels at
   .07em tracking are tight; longer strings will break them.
4. **Product naming.** The brand file says _Smartboard_; an earlier screenshot
   said _Medboard_. Smartboard is used throughout. Confirm which is current.
