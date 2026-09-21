# Getting the tokens into abyss-monorepo

Three layers. Only the second one actually enforces anything.

```
1. DISTRIBUTION   one package, imported once, exports semantics only
2. ENFORCEMENT    a gate in CI that fails the build       <- the load-bearing part
3. INSTRUCTION    CLAUDE.md, so agents know before they are told by a red build
```

Instructions are advisory. Any agent, human or model, drifts eventually. What
holds is the gate.

## Layer 1 — distribution

```
packages/design-tokens/
  package.json            @sentra/design-tokens
  src/tokens.css          source of truth, the only file with a hex in it
  src/tokens.json         generated from the CSS, for non-CSS consumers
```

Two rules make the package do its job:

**Primitives are not exported.** `--p-vermilion` exists inside `tokens.css` but
no component may name it. If an agent reaches for a primitive, the semantic
token it needs does not exist yet — that is a signal to add one with its
measured contrast, not to bypass the layer.

**One import, at the root.** In the app's root layout:

```ts
import '@sentra/design-tokens/tokens.css'
```

Every descendant inherits the custom properties. No per-component import, no
duplication, no chance of a component shipping without them.

### Where the stack changes this

Everything above is stack-agnostic. Only the consumption step differs:

| Stack                   | What to add                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tailwind v4             | Wrap the `:root` block in `@theme { }`. Tokens become utilities automatically — `bg-background-surface`, `text-status-critical`. Nothing else changes. |
| Tailwind v3             | In `tailwind.config.ts`, map `colors`, `spacing`, `borderRadius` to `var(--color-*)` etc. Never copy the hex across.                                   |
| CSS Modules / plain CSS | Already done. Use `var(--token)` directly.                                                                                                             |
| CSS-in-JS               | Build the theme object from `tokens.json` at startup. Do not hand-write it.                                                                            |

**Do not reach for Style Dictionary yet.** It earns its complexity when there is
a second platform — React Native, Figma sync, an email template renderer. With
one web consumer, CSS as source of truth plus a generated JSON is enough. Build
the pipeline when the need appears, not before.

## Layer 2 — enforcement

`scripts/check-tokens.mjs` runs two checks, both blocking.

**No raw values outside the token package.** Any hex, any non-token
`border-radius`, in any `.css/.ts/.tsx/.vue/.svelte` under `apps/` or
`packages/`. Swatch demos are exempt because they must show the literal value.

**Contrast has not regressed.** It recomputes all 14 semantic
foreground/background pairs and the 3 data-ramp steps from `tokens.json` and
fails below threshold. This is the check that protects the decisions we
measured. Someone will eventually "brighten" a status colour; this is what stops
that shipping.

Wire it in:

```json
// package.json
"scripts": {
  "check:tokens": "node scripts/check-tokens.mjs",
  "lint:css": "stylelint \"**/*.{css,scss}\""
}
```

```yaml
# .github/workflows/ci.yml — add to the existing job
- run: npm run check:tokens
- run: npm run lint:css
```

Also add it as a pre-commit hook if the repo already has husky or lefthook.
Failing fast locally is cheaper than failing in CI, but CI is the one that
cannot be skipped with `--no-verify`.

The gate has been tested in both directions: it exits 1 on a planted `#D6320F`
and a planted `border-radius: 12px`, and exits 0 on a clean tree.

## Layer 3 — instruction

`CLAUDE.md` at the repo root. Agents read it before acting.

Two things matter about how it is written. It contains the **rules themselves**,
not a pointer to a document elsewhere — an agent that has to go fetch the rules
often does not. And it is **short and imperative**, because a rules file long
enough to skim is a rules file that gets skimmed.

Put a second, shorter `CLAUDE.md` inside `packages/sentra-ui/` covering component API
conventions. Nested files are read in addition to the root one, so the root
stays about the system and the local one about the package.

## Order of work — completed 2026-07-25

1. ~~Create `packages/design-tokens`, wire the root import.~~ Done, and the dark
   theme was authored on top of it: every semantic token re-measured against the
   dark canvas rather than inverted.
2. ~~Add `scripts/check-tokens.mjs` to CI before building any component.~~ Done.
   The warning below came true in an unexpected way — the gate could not be
   turned on repo-wide against ~77k inherited values, so scope is opt-in via
   `sentraverse/scope.txt` instead. A path enters when it is migrated and never
   leaves.
3. ~~Add `CLAUDE.md`.~~ Done, plus `AGENTS.md` (the repo's policy authority, so
   Codex and Cursor are bound too) and `.cursor/rules/`.
4. ~~Build `packages/sentra-ui` primitives.~~ Done: `Button`, `Panel`,
   `StatusIndicator`, `GateStrip`, `DataTable`, `Field`, `Modal`, the three
   empty states, `Skeleton`, `ErrorState`, shell and `ThemeToggle`.
5. ~~Migrate one screen end to end.~~ Runs index, as recommended.
6. ~~Migrate the remaining screens.~~ All eight of `platform/sentra-portal`.

What the plan did not anticipate: composition needed a check of its own. The
browser suite in `platform/sentra-portal/tests/` found a contrast defect the
reference screens themselves shipped with — the rail's sequence numbers used a
non-text value as 10px text. No token gate could have caught it.

## What this does not solve

An agent can still write a component that is technically token-compliant and
visually wrong — correct colours, incoherent hierarchy. No linter catches that.
What catches it is the reference screens: `sentraverse-runs-index.html` and
`sentraverse-run-detail.html` are the worked examples, and the instruction to an
agent should be to match them, not to invent from the token list.

Contrast, raw values, and radius are machine-checkable. Composition is not. That
part still needs a human to look.
