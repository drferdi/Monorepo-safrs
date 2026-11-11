# Testing Guide — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Current Test Coverage

This project has **no automated test suite at v1.0.0**. The two quality gates
currently in place are:

1. **TypeScript strict check** — runs as part of `npm run build`
2. **ESLint** — `npm run lint`

A Playwright E2E suite is on the [roadmap](../ROADMAP.md) for Q2 2026.

---

## Running Quality Gates

```bash
# ESLint — catches code style issues, import errors, React hook violations
npm run lint

# TypeScript strict check + Next.js build
# This is the primary safety gate — fails on any type error
npm run build
```

Both commands must pass with zero errors before any PR can be merged.

---

## TypeScript Configuration

`tsconfig.json` enables strict mode — this covers:

| Check                      | What it catches                            |
| -------------------------- | ------------------------------------------ |
| `strictNullChecks`         | Possible `undefined` / `null` dereferences |
| `noImplicitAny`            | Missing type annotations                   |
| `strictFunctionTypes`      | Incorrect callback signatures              |
| `noUncheckedIndexedAccess` | Array/object access without bounds check   |

All 19 component files, 5 page files, and 3 lib files must satisfy strict
TypeScript before the build succeeds.

---

## Manual Test Checklist

Run this checklist before every production deployment:

### Landing Page

- [ ] All 15 home-page components render without console errors (open DevTools →
      Console)
- [ ] `Hero` animated Audrey chat progresses through all 4 phases automatically
      (allow ~25 seconds)
- [ ] `SentraSim` — click Start → simulation progresses through all 10 steps to
      COMPLETE
- [ ] `SentraSim` — Reset button resets simulation to idle state
- [ ] `Clients` logo marquee scrolls continuously without stopping
- [ ] `ClinicalTrajectory` vital-signs chart renders on scroll-into-view
- [ ] `ClinicalPrognosis` survival curves and radar chart render correctly
- [ ] `ScrollGallery` full-viewport section renders without layout break

### Navigation

- [ ] `Navbar` — all 5 desktop links scroll to correct section anchor
- [ ] `Navbar` — Menu button opens `SentraKineticNav` sidebar overlay
- [ ] `SentraKineticNav` — close button and outside-click both close the overlay
- [ ] Footer links — Insights, Story, Privacy, Terms all navigate correctly

### Pages

- [ ] `/insights` — all 3 articles display with correct title, category, date,
      readTime
- [ ] `/insights/ai-diagnosis-klinis-indonesia` — full article content renders
- [ ] `/insights/clinical-decision-support-vs-emr` — full article content
      renders
- [ ] `/insights/keselamatan-pasien-era-digital-health` — full article content
      renders
- [ ] `/insights/nonexistent-slug` — renders 404 (Next.js `notFound()`)
- [ ] `/story` — team members, admin team, and clinical advisors all render
- [ ] `/privacy` — page renders with correct last-updated date
- [ ] `/terms` — page renders

### SEO

- [ ] View page source on `/` — confirm `<script type="application/ld+json">`
      present with 3 schema nodes
- [ ] `/sitemap.xml` returns valid XML with 8 URLs
- [ ] `/robots.txt` returns valid robots exclusion file
- [ ] `/llms.txt` returns plain-text Sentra summary

### Responsive

- [ ] 375px (iPhone SE) — Navbar collapses to Menu button; all sections readable
- [ ] 768px (iPad) — grid layouts adjust correctly
- [ ] 1440px — hero and section max-widths respected

### Security Headers

```bash
curl -I https://sentrahai.com | grep -iE "x-frame|content-security|strict-transport|x-content-type|permissions-policy"
```

All 6 OWASP headers must be present.

---

## Planned — Playwright E2E (Q2 2026)

When implemented, the suite will cover:

```
tests/
├── landing.spec.ts        — 15 home components render, no console errors
├── navigation.spec.ts     — anchor links, kinetic nav open/close
├── sim.spec.ts            — SentraSim full simulation run + reset
├── insights.spec.ts       — article index + all 3 article detail pages
├── pages.spec.ts          — /story, /privacy, /terms
└── seo.spec.ts            — JSON-LD present, sitemap valid, headers present
```

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Capsule commands (SAFRS, 2026-09-26)

The sections above predate the migration. The current, executable commands are in
`project.contract.json` and `AGENTS.md` "Commands": lint, typecheck (`tsc --noEmit`), the
node:test suite (`test`), build, and a deploy dry-run, all through `node scripts/pnpm.mjs`.
