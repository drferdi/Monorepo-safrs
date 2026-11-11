# Changelog — Sentra AI (sentra-main)

All notable changes to this project are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Documentation

- **Docs-truth audit (2026-04-18):** Canonical architecture docs aligned with the codebase — [`ARCHITECTURE.md`](./ARCHITECTURE.md) (15 components on `/`, dynamic `app/sitemap.ts` entries, Google Search Console verification at `app/google22238cc24e0d1002.html`, `app/robots.ts` disallow for `/dashboard`, dashboard `rewrites()` note, SentraSim `--sdx-*` variables defined on `:root` with `[data-sentra-sim]` reset). [`docs/architecture.md`](./docs/architecture.md) is now a short overview with links. [`docs/API.md`](./docs/API.md) and [`docs/PRIVACY.md`](./docs/PRIVACY.md) updated for the same facts. Spec and task plan: [`docs/specs/aadi-v2/2026-04-18-sentra-main-architecture-docs-truth-design.md`](./docs/specs/aadi-v2/2026-04-18-sentra-main-architecture-docs-truth-design.md), [`docs/guides/implementation-plans/2026-04-18-sentra-main-docs-consolidation.md`](./docs/guides/implementation-plans/2026-04-18-sentra-main-docs-consolidation.md).
- **Further doc reconciliation (2026-04-18):** [`README.md`](./README.md) and [`docs/TESTING.md`](./docs/TESTING.md) aligned to **15** home components (including `FAQ` in the README tree). [`CHANGELOG.md`](./CHANGELOG.md) `[1.0.0]` — landing table, sitemap line, GSC path, SentraSim `--sdx-*` note, `ClinicalPrognosis` description, and **Published Articles** table updated to match `app/insights/data.ts`.

### Removed

- **`public/sentra.mp4`** and **`public/logo-melinda.svg`** — not referenced by any `*.tsx` / `*.ts` / styles; removed as unused binary weight (restore from git history if a future feature needs them).

### Planned
- Lazy loading `SentraSim` + `ScrollGallery` via `next/dynamic` — bundle size reduction
- Per-page Open Graph metadata for `/story` and `/insights/[slug]`
- `ClinicalPrognosis` promoted from standalone component to full landing section (today it ships inside `ClinicalTrajectory`)
- OpenTelemetry SDK integration for Core Web Vitals observability
- RSC migration for static-only sections (About, Footer) to reduce client JS
- Wire `@next/bundle-analyzer` into a documented `pnpm` script or CI step (package is already a devDependency)

---

## [1.0.0] — 2026-03-16

### Added

#### Pages & Routing
- **`/`** — Landing page: 15 components orchestrated in `app/page.tsx`
- **`/story`** — Company story page (`app/story/page.tsx`, 66.2 KB): full team profiles, Sentra founding narrative, clinical advisors, vision statement, and investor/partner CTA
- **`/insights`** — Article index (`app/insights/page.tsx`): lists all published articles with category, read-time, and date
- **`/insights/[slug]`** — Article detail with dynamic routing; articles resolved via `getArticle()` from `data.ts`
- **`/privacy`** — Privacy policy (Bahasa Indonesia, last updated March 2026)
- **`/terms`** — Terms of service (Bahasa Indonesia)

#### Published Articles (`app/insights/data.ts`)
Four articles (slug/title/category/date match `articles[]` in source):

| Slug | Title | Category | Date |
|------|-------|----------|------|
| `peran-generative-ai-dalam-reduksi-beban-administrasi-medis` | Peran Generative AI dalam Reduksi Beban Administrasi Medis | Transformation | 2026-03-16 |
| `medgemma-27b-cdds-masa-depan-ai-multimodal-untuk-praktik-kedokteran-modern` | MedGemma 27B & CDDS: Masa Depan AI Multimodal untuk Praktik Kedokteran Modern | Medical AI | 2026-03-13 |
| `menyelaraskan-visi-dan-implementasi-refleksi-ceo-dan-peneliti-atas-modeling-medical-diagnosis` | Menyelaraskan Visi dan Implementasi: Refleksi CEO dan Peneliti atas 'Modeling Medical Diagnosis' | Research | 2026-03-09 |
| `di-balik-layar-algoritma-ai-dan-masa-depan-empati-dokter-di-indonesia` | Di Balik Layar Algoritma: Artificial Intelligence dan Masa Depan Empati Dokter di Indonesia | Clinical | 2026-03-08 |

#### Landing Page Sections
Fifteen components in render order (CTA and Footer counted separately):

| # | Component | File Size | Description |
|---|-----------|-----------|-------------|
| 1 | `Navbar` | 3.2 KB | Fixed navigation bar with kinetic nav primitive (`sentra-kinetic-nav.tsx`) |
| 2 | `Hero` | 19.4 KB | Full-viewport animated Audrey chat — 4 clinical phases with timed transitions (9500 / 16500 / 24000 ms) |
| 3 | `ProjectSlider` | 2.0 KB | Horizontal scroll slider for project highlights |
| 4 | `About` | 3.4 KB | Company mission section |
| 5 | `Clients` | 13.0 KB | Auto-scrolling client logo marquee with `animate-marquee` CSS animation |
| 6 | `SentraSim` | 57.1 KB | Interactive async clinical simulation engine — multi-branch patient cases, animated text reveal, color-coded clinical findings, 21+ `useState` hooks |
| 7 | `Showcase` | 2.0 KB | Product capability showcase grid |
| 8 | `Services` | 6.9 KB | 7-service accordion with animated image parallax hover |
| 9 | `Audrey` | 21.3 KB | Audrey AI assistant section — animated conversation demo with badge overlays (diagnosis, confidence, triage) |
| 10 | `ClinicalTrajectory` | 27.5 KB | Live vital-signs trajectory chart — 4-visit demo data (HTN + DM Type 2), acute risk probability bars, treatment recommendations |
| 11 | `News` | 3.7 KB | Latest insights/article cards |
| 12 | `ScrollGallery` | 0.3 KB | Full-viewport immersive scroll gallery (delegates to `immersive-scroll-gallery.tsx`) |
| 13 | `FAQ` | 4.6 KB | Accordion FAQ |
| 14 | `CTA` | 2.0 KB | Call-to-action |
| 15 | `Footer` | 6.0 KB | Site footer |

`ClinicalPrognosis` (28.5 KB) — composed inside `ClinicalTrajectory`, not a direct child of `app/page.tsx`.

#### UI Primitives (`components/ui/`)
| File | Description |
|------|-------------|
| `immersive-scroll-gallery.tsx` | Full-viewport scroll-driven gallery primitive |
| `interactive-image-accordion.tsx` | Image accordion with hover/click interaction |
| `morphing-cursor.tsx` | Custom morphing cursor for desktop |
| `sentra-bento-cards.tsx` | Bento grid card layout primitive |
| `sentra-kinetic-nav.tsx` | Kinetic/animated navigation primitive (12.8 KB) |
| `text-scramble.tsx` | Text scramble animation used across multiple sections |

#### Design System (`app/globals.css`)
Full Tailwind v4 CSS-native `@theme` block — no `tailwind.config.ts`. Token groups:
- **Core palette**: `--sentra-bg` (#0d0d0d), `--sentra-fg` (#b7ab98), `--sentra-accent` (#eb5939)
- **Muted scale**: 5 opacity levels (10% → 80%)
- **Canvas surfaces**: `--sentra-canvas`, `--sentra-panel-1/2/3`
- **Semantic**: `--sentra-critical` (#E65A4C), `--sentra-warning` (#FBBF24)
- **Audrey AI**: `--sentra-audrey` (#C4956A) + teal (#6B9B8A) + full shadow/bubble/ring scale
- **SentraSim**: `--sdx-*` variables on `:root`; `[data-sentra-sim]` scopes layout reset

#### SEO & Metadata
- `app/layout.tsx`: full `Metadata` object — title template, description, OG, Twitter Card, canonical, Google Search Console verification
- `app/sitemap.ts`: dynamic `MetadataRoute.Sitemap` (fixed routes + one row per article in `data.ts`)
- `app/robots.ts`: programmatic robots.txt
- `app/opengraph-image.tsx` + `app/story/opengraph-image.tsx`: per-route OG image generators
- `app/google22238cc24e0d1002.html`: Google Search Console domain verification (static App Router file)
- `public/llms.txt`: machine-readable site summary for LLM crawlers

#### Schema.org JSON-LD (`app/layout.tsx`)
Three structured data nodes injected as `application/ld+json`:
- `Organization` + `MedicalOrganization` — Sentra Healthcare Solutions, founding date March 2025, founder Dr. Ferdi Iskandar
- `WebSite` — sentrahai.com
- `SoftwareApplication` — Sentra Clinical Decision Support, 7 featureList items

#### Infrastructure
- **`next.config.mjs`**: OWASP security headers (CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) applied to all routes; remote image allowlist (`framerusercontent.com`, `images.unsplash.com`)
- **`scripts/setup.sh`**: developer bootstrap script — enforces Node.js 22+, runs `npm ci`
- **Turbopack support**: `npm run dev:turbo` for faster local iteration

#### Documentation (`docs/`)
- `architecture.md` — component architecture, design system reference, SentraSim internals
- `ADR-001-nextjs-app-router.md` — formal ADR: Next.js 16 App Router + React 19

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
