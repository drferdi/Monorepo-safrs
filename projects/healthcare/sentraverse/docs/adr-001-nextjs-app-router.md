<!-- Designed and constructed by Drferdi. -->

# ADR-001: Next.js App Router with React 19

**Status:** Accepted **Date:** 2026-01-15 **Deciders:** Drferdi (Principal
Architect)

---

## Context

We need a modern, production-ready web framework for the Sentra AI landing site.
The site is primarily a marketing/showcase page with rich animations and no
server-side data requirements.

---

## Decision

Use **Next.js 16 with the App Router** and **React 19**.

---

## Rationale

| Criterion                     | Rationale                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **App Router**                | Enables future adoption of React Server Components, streaming, and Suspense without a migration penalty                                                                              |
| **React 19**                  | Latest stable, provides improved performance, concurrent features, and the React Compiler roadmap                                                                                    |
| **TypeScript strict**         | Catches type errors at compile time; the entire codebase uses strict mode                                                                                                            |
| **`"use client"` everywhere** | Since the site is animation-heavy (Framer Motion, GSAP), all sections require client-side execution. This is acceptable for a marketing site where SEO is handled by static metadata |
| **Tailwind CSS v4**           | CSS-native, zero-config `@theme` block eliminates the need for a JS config file. Significantly faster build times than v3                                                            |
| **Railway deployment**        | Zero-config deployment for Node.js apps with automatic HTTPS                                                                                                                         |

---

## Consequences

**Positive:**

- Excellent developer experience with Fast Refresh
- Automatic image optimisation via `next/image`
- Zero-layout-shift font loading via `next/font`
- Future-proof App Router path

**Negative:**

- All components are client components due to Framer Motion dependency — no RSC
  benefit currently
- Bundle size is higher than a pure static site (React + Framer Motion + GSAP)

**Mitigations:**

- Could progressively convert static sections (Hero text, Footer) to Server
  Components in the future
- Lazy-load heavy components (SentraSim, ScrollGallery) using `next/dynamic` if
  bundle size becomes a concern

---

_Designed and constructed by Drferdi._
