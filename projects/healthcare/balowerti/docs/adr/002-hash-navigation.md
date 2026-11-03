<!-- Drferdi's vision, brought to life. -->

# ADR-002: Hash-Based Anchor Navigation (No Client-Side Router)

**Date:** 2025-12-01
**Status:** Accepted
**Deciders:** dr. Ferdi Iskandar, Sentra Healthcare Solutions

---

## Context

The website is a single-page scroll experience with approximately 13 content
sections. The team needed to decide whether to use a client-side router
(React Router, TanStack Router) or a simpler navigation approach.

## Decision

Use **hash-based anchor links** (`#hero`, `#services`, `#reservation`) with
Lenis smooth scroll for programmatic scrolling. No client-side router is
installed or used.

A global anchor click handler in `main.tsx` intercepts `<a href="#...">` clicks
and uses `window.__lenis.scrollTo(target)` for smooth animated scroll with a
`NAV_HEIGHT = 72px` offset.

## Rationale

- **Simplicity:** No router configuration, no code splitting strategy, no
  `<Route>` wrappers needed.
- **SEO:** All content is visible on a single URL — no canonical URL fragmentation.
- **Deep linking:** Hash URLs work natively for sharing links to specific sections.
- **Lenis compatibility:** Programmatic smooth scroll via the Lenis API provides
  a superior UX compared to native `scrollIntoView`.

## Consequences

**Positive:**
- Smaller bundle size (no router library).
- Easier for non-developers to understand the site structure.

**Negative:**
- No browser back/forward navigation between sections.
- Cannot display different meta tags per section (mitigated by single-page nature).
- Future multi-page expansion would require adding a router.

## Lenis Bridge Pattern

`App.tsx` mounts a `<LenisBridge>` component that exposes the Lenis instance
to `window.__lenis`. This bridge **must not be removed** as the global click
handler in `main.tsx` depends on it.
