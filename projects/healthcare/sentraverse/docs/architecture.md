<!-- Architected and built by Drferdi. -->

# Architecture Documentation — Sentra AI Landing Site

_Last updated: 2026-04-18_

> **Canonical deep-dive:** [`ARCHITECTURE.md`](../ARCHITECTURE.md) (repository
> root).  
> **ADR:** [`adr-001-nextjs-app-router.md`](./adr-001-nextjs-app-router.md).  
> **Docs vs code audit:**
> [`superpowers/specs/2026-04-18-sentra-main-architecture-docs-truth-design.md`](./superpowers/specs/2026-04-18-sentra-main-architecture-docs-truth-design.md).

---

## Overview

The Sentra marketing site (**sentrahai.com**) is a **Next.js 16** App Router
application with **React 19**, **Tailwind CSS v4** (`@theme` in
`app/globals.css`), **Framer Motion**, and **GSAP**. There is no first-party
database or authenticated API in this app; insights copy lives in
`app/insights/data.ts`.

For the full route map, landing page composition (15 components in
`app/page.tsx`), SentraSim state model, design tokens, SEO (JSON-LD, sitemap, OG
images), and security headers, read **[`ARCHITECTURE.md`](../ARCHITECTURE.md)**.

---

## Technology decisions

Formal record:
**[`docs/adr-001-nextjs-app-router.md`](./adr-001-nextjs-app-router.md)**.

---

## Tooling (verified in repo)

| Area                    | Location                                                          |
| ----------------------- | ----------------------------------------------------------------- |
| E2E                     | `npm run test:e2e` — `playwright.config.ts`, `e2e/`               |
| Bundle analysis         | `@next/bundle-analyzer` in `package.json` devDependencies         |
| Security headers + CSP  | `next.config.mjs` `headers()` — details in `SECURITY.md`          |
| Dashboard reverse proxy | `next.config.mjs` `rewrites()` when `SENTRA_DASHBOARD_URL` is set |

---

## Open improvement ideas (not yet implemented)

- OpenTelemetry or exported Web Vitals pipelines
- Further React Server Component adoption for static slices (per ADR
  mitigations)
- Lazy-loading the heaviest client-only sections if bundle budgets tighten

---

_Architected and built by Drferdi._
