# Design brief — Sentraverse Design System v1.0

Notes taken from `01-design-system.html`. This is the governing reference for every Sentraverse
surface. Rule from the source, quoted because it settles the rest:

> If a decision is not on this page, it has not been made — raise it rather than inventing it.

## Doctrine — six rules

| | Rule | What it forbids |
| --- | --- | --- |
| R1 | Structure before style | A layout that only works once styled is not resolved |
| R2 | Every element earns its place | If it does not orient, inform, group, act, or give feedback it is **removed — not made subtler** |
| R3 | **Type does the structural work** | Hierarchy comes from size, weight, position, space — **not** from boxes, fills, shadows. **Containers are the last resort, never the first** |
| R4 | Colour is meaning, never filling | No colour because a region looked empty |
| R5 | Never colour alone | Every status carries a glyph **and** a word; readable in greyscale |
| R6 | Say the true thing | Report what happened, not what is comfortable |

## Grid

- 12 columns · gutter 24 · margin 40 · max width 1440 · rail 232.
- **Content anchors on columns 1–7. Summary, verdict, side context on 9–12.**
- **Column 8 stays empty.** That gap is the system's asymmetry — structural, not decorative,
  and **not to be filled**.
- Body text never exceeds 68 characters per line.
- Breakpoints: <640 → 4 col / margin 20 · 640–1023 → 8 / 32 · 1024–1439 → 12 / 40 · ≥1440 centred.

## Typography

| Role | Spec |
| --- | --- |
| `t-display` | 40 / 1.06 / 600, width axis 112 |
| `t-section` | 12 / 600 / caps / tracking .09em |
| body | 15 / 1.5 / 400 |
| `t-compact` | 13 / 1.45 |
| `t-label` | mono 11 / caps / tracking .07em |
| `t-data` | mono 13, tabular figures |

- Left aligned. Centred type only inside a modal title.
- **Three weights only: 400, 500, 600.**
- All numeric columns tabular.
- **Uppercase reserved for labels under four words.**
- **Mono means machine-produced**: ids, paths, measurements, raw capture.

## Colour — the zone rule

Vermilion and crimson are 1.91:1 apart in hue. They are kept apart **by location, not by hue**:

- **Vermilion (`--color-accent`) lives only in chrome**: wordmark, sequence numbers, active
  navigation, panel corners.
- **Crimson (`--color-status-critical`) lives only in content**: verdicts, failed gates, defect marks.
- The two never appear in the same block. Breaking this is **a defect, not a variation**.

Status: critical filled glyph · warning half · success outline · idle dashed.

**Tint only the worst state.** Failing rows are tinted; warnings are not. The tint is a second
signal behind the glyph and the word — never the first, never the only one.

## Line vocabulary — four devices, each with one job

1. **Corner marks** (`.panel`) — four 10px brackets implying a container without drawing one.
   Replaces the card. **Use only for a genuinely bounded object.** Turn vermilion when focused.
2. **App chrome** — identity and module path, mono, wide tracking. **Exactly once per screen, at
   the top.** Repeating it on panels turns a signature into decoration.
3. **Dash-rule label** (`.rulelabel`) — 28px hairline into a right-aligned meta label. Carries
   type, count, or scope — **never an action**.
4. **Sequence marker** (`.seq`) — vermilion, mono, tabular. **Only where order is real
   information.** Never applied to an unordered set to look systematic.

## Space and shape

- 4px base: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- **Structure is square.** Radius 0 on tables, dividers, panels, surfaces.
  **Radius 2px only on controls** — the curve means "this can be touched".
- Lines: 1px subtle separates inside a group · 1px strong under a section title · 2px strong closes
  a page header · 2px status opens a verdict.
- Shadow only for temporary overlays and control affordance. Buttons carry a 3px solid ledge, no
  blur, which disappears on press (EXC-01).
- Motion ≤ 200ms.

## Components

- **One primary action per view.** Minimum target 44px. The label keeps its name through the whole
  flow — a button that says Publish produces a message that says Published.
- Status: four glyphs plus the word; the word is never dropped.
- Table rows separate with a hairline — **never fills or stripes**. Numbers tabular. Hover tints
  the row; it does not lift it.

## Prohibitions (need a written exception)

Glassmorphism · neumorphism (EXC-01 allows the hard ledge on controls only) · gradients as surface ·
glow/halo/ambient shadow · **radius above 2px** · **a card around every section** · centred layout as
page default · **colour as the only carrier of status** · grey body text below 4.5:1 · icon-only
actions without an accessible name · decorative 3D or AI imagery · bento grids without ordering
logic · **vermilion inside the content zone** · **crimson inside the chrome zone** · motion over
200ms · **numbering an unordered set**.

## Patterns (`02-patterns.html`)

**Icons.** 20px canvas · 1.5 stroke · **butt cap, miter join**. A rounded terminal reads as a
foreign object in a system built on hairlines. Any library is allowed if set to that spec.

- With a label, always — an icon reinforces a word, it does not replace one.
- Alone only when repeated and learned: close, more, dismiss.
- **Never alone for a destructive action.** Delete, revoke, block always carry a word.
- Icon-only controls need `aria-label`; the SVG itself is `aria-hidden`.
- **No icon carries status alone.**

**Empty is three states, not one.** Treating them alike is the most common failure here.

| | Case | Content |
| --- | --- | --- |
| A | Nothing exists yet | Explain what the thing is, offer the one action that creates it |
| B | Nothing matches the filters | **Name the number that does exist** so the operator knows data is not lost, and offer the way back |
| C | Queue is clear | A report, not an invitation — **deliberately has no button** |

**Loading.** Skeleton when the shape of the result is already known, mirroring the real layout so
nothing jumps. Progress bar **only when progress is genuinely measurable** — a bar moving on a timer
rather than on work completed is a lie, and operators learn to distrust it. Never a spinning
full-page overlay.

**Errors have three scopes.** Section scope: say what is still unaffected — that sentence prevents
an unnecessary escalation. Degraded: the page works but data is stale ("Showing cached results from
10:47") — the state most systems skip, and the one that causes the worst decisions when skipped.
**Never write "Something went wrong."** Every error states what failed, what still works, when it
happened, and the one action available.

## Detail page shape (`05-run-detail.html`)

The pattern for any screen that judges something:

1. **Verdict** first, in plain words, with the honest sentence underneath — "The crawl succeeded.
   The dataset it produced did not."
2. **Counts** beside it: failed · warned · passed.
3. **Actions**: one primary, plus the blocking note — "Export is blocked while any gate fails."
4. **Yield**: numbered stages, each measured **against the stage above**, so loss is visible.
5. **Gate table**: numbered, with measured value and status glyph per row.

## Button (`06-button-lab.html`, EXC-01)

Treatment **C · hard ledge** is the ruling: a solid 3px offset slab, no blur; on press the button
travels onto its own shadow and the slab disappears. Print register, not soft plastic. Boundary
stays 18.68:1.

## Logomark (`03-brand-mark.html`)

Filled paths, not strokes — **exempt from the icon spec**; brand geometry is never redrawn to match
an internal rule. Option 1 is the ruling: **the mark keeps its own ink ground** wherever it appears,
which also gives it a consistent optical size. Sizes 20 minimum, 96 maximum.

---

# What I got wrong

| # | Violation | Rule broken | Fix |
| --- | --- | --- | --- |
| 1 | Wrapped **every** block in `.panel` — corner marks around each section | Prohibition "a card around every section"; corner marks are "only for a genuinely bounded object"; R3 "containers are the last resort" | Remove the panels. Structure with type, space, and a 1px rule under each section title. Corner marks stay only where one bounded object is genuinely being shown. |
| 2 | Used `.t-data` as a large figure | `t-data` is mono **13px**, tabular — a data cell, not a headline | Figures belong in tables and `dl` rows, sized by role, not blown up. |
| 3 | Invented `factlist` as a container | R3, and "if a decision is not on this page it has not been made" | Use `.locked` — the reference's own `dl` pattern with a 2px accent top rule. |
| 4 | Repeated section headings inside panels | App chrome / signature rule; heading hierarchy is `t-section` + 1px strong rule | One `section__head` per section: `seq` + `t-section` + right-aligned `rulelabel`. |

# One open decision — not mine to make

The reference sets the typeface to **Archivo + JetBrains Mono** (`01-design-system.html`, dated
26 Jul). The repository's own token package and the later reference screens (`04-runs-index.html`,
dated Aug) use **Geist + Geist Mono**, and `packages/token/assets/fonts/` ships only Geist.

Both cannot be true. Per the reference's own instruction I am raising it rather than choosing:
which typeface is current — Archivo, or has the system moved to Geist?
