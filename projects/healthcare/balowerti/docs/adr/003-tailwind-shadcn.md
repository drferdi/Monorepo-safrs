<!-- Drferdi's vision, brought to life. -->

# ADR-003: Tailwind CSS + shadcn/ui for Styling and UI Components

**Date:** 2025-12-01
**Status:** Accepted
**Deciders:** dr. Ferdi Iskandar, Sentra Healthcare Solutions

---

## Context

The project required a styling approach that enables rapid development with
consistent design while providing accessible, composable UI primitives.

## Decision

Use **Tailwind CSS v3** as the primary styling utility layer, with **shadcn/ui**
(new-york style) for accessible interactive components (buttons, badges, cards,
sheets/drawers).

Custom design tokens are defined as CSS variables in `:root` within `index.css`
using HSL color values, following shadcn/ui's convention.

## Rationale

- **Tailwind CSS:** Utility-first approach eliminates CSS file bloat. PurgeCSS
  integration ensures minimal production bundle.
- **shadcn/ui:** Components are copied into the codebase (not imported from npm),
  making them fully customisable with no runtime overhead.
- **Radix UI Primitives:** shadcn/ui is built on Radix UI, ensuring full
  keyboard accessibility and ARIA compliance out of the box.
- **HSL CSS variables:** Enables dynamic theme switching without recompilation.

## Consequences

**Positive:**
- Consistent accessible components with minimal effort.
- Zero runtime component library overhead (shadcn/ui components live in `src/`).
- Easy brand customisation via CSS variable overrides.

**Negative:**
- Long Tailwind class strings can reduce readability in JSX.
- shadcn/ui component updates require manual re-runs of `npx shadcn@latest add`.
- Team members unfamiliar with Tailwind require an onboarding curve.

## Design Token Reference

```css
:root {
  --primary: #C9A87C;       /* Warm gold — primary brand accent */
  --background: #FAF8F4;    /* Cream white — page background */
  --foreground: #1C1C1E;    /* Near-black — body text */
}
```
