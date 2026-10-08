# Architecture — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

> For the formal ADR, see
> [`docs/adr-001-nextjs-app-router.md`](./docs/adr-001-nextjs-app-router.md).
> For a shorter overview with links back here, see
> [`docs/architecture.md`](./docs/architecture.md).

---

## Overview

`sentra-main` is the primary marketing and product showcase site for **Sentra
Healthcare AI**, deployed at **[sentrahai.com](https://sentrahai.com)**. It is a
static-first Next.js application with rich client-side animations. There is no
database, no backend API, and no user authentication.

---

## Technology Stack

| Layer                  | Technology                         | Version  |
| ---------------------- | ---------------------------------- | -------- |
| Framework              | Next.js App Router                 | 16.1.6   |
| UI Runtime             | React                              | 19.2.4   |
| Language               | TypeScript (strict)                | 5.9.3    |
| Styling                | Tailwind CSS (CSS-native `@theme`) | 4.2.1    |
| Animation — components | Framer Motion                      | 12.35.2  |
| Animation — scroll     | GSAP                               | 3.14.2   |
| Icons                  | Lucide React                       | 0.577.0  |
| Node.js (dev + prod)   | Node.js                            | 22.x LTS |
| Deployment             | Railway                            | —        |

When the environment variable `SENTRA_DASHBOARD_URL` is set (for example on
Railway), [`next.config.mjs`](./next.config.mjs) rewrites `/dashboard/:path*` to
that origin so the marketing host can serve the clinical dashboard under the
same domain. WebSocket upgrades for Socket.IO are **not** handled by Next.js
rewrites alone; see comments in `next.config.mjs` and
[`docs/deployment.md`](./docs/deployment.md) for edge or reverse-proxy guidance.

---

## Application Structure

```
sentra-main/
├── app/
│   ├── layout.tsx                 Root HTML shell, fonts, JSON-LD, security headers
│   ├── page.tsx                   Landing page — 15 components (see table below)
│   ├── globals.css                Tailwind v4 @theme tokens + SentraSim --sdx-* vars
│   ├── story/
│   │   ├── layout.tsx             /story layout
│   │   ├── page.tsx               66.2 KB — full company narrative, 4 team members,
│   │   │                          7 admin staff, clinical advisors, investor CTA
│   │   └── opengraph-image.tsx    OG image for /story
│   ├── insights/
│   │   ├── data.ts                All article content — single source of truth
│   │   ├── page.tsx               /insights — article listing
│   │   └── [slug]/page.tsx        /insights/[slug] — dynamic article detail
│   ├── privacy/page.tsx           /privacy — Kebijakan Privasi (Bahasa Indonesia)
│   ├── terms/page.tsx             /terms — Syarat & Ketentuan
│   ├── sitemap.ts                 Generates /sitemap.xml — dynamic URLs (see SEO Architecture)
│   ├── robots.ts                  Generates /robots.txt
│   ├── opengraph-image.tsx        OG image for root route
│   └── google22238cc24e0d1002.html  Google Search Console verification
│
├── components/
│   ├── neural/                    The home page journey — see "Home Page — The Neural Journey" below
│   └── ui/
│       ├── immersive-scroll-gallery.tsx    Scroll-driven full-viewport gallery
│       ├── interactive-image-accordion.tsx Image accordion with hover interaction
│       ├── morphing-cursor.tsx             Desktop cursor morphing effect
│       ├── sentra-kinetic-nav.tsx          12.8 KB — full-screen kinetic sidebar nav
│       └── text-scramble.tsx              Text scramble animation primitive
│
├── lib/
│   ├── site-links.ts              Navigation anchor + route constants (single source)
│   └── utils.ts                   cn() — clsx + tailwind-merge
│
├── public/
│   ├── llms.txt                   Machine-readable site summary for LLM crawlers
│   ├── ferdi.png                  Founder photo (307 KB)
│   ├── hero.png / hero2.png       Hero backgrounds (`ProjectSlider`)
│   ├── hero3.png                  Hero variant
│   ├── join.jpg                   CTA/join section background (441 KB)
│   ├── gt.png / fi9.png           README hero + scroll gallery assets
│   ├── fit1–fit8.png              Showcase/gallery images
│   └── melinda2.avif              Pilot site image (`Clients`)
│
└── scripts/
    └── setup.sh                   Bootstrap script — enforces Node.js 22+
```

---

## Home Page — The Neural Journey

`app/page.tsx` renders `components/neural/NeuralJourney.tsx` alone: fifteen chapters on one GSAP
master timeline (`components/neural/timeline.ts`) scrubbed by one pinned ScrollTrigger. The
design record, the knobs and the test map live in `docs/neural-journey.md`.

| File | Role |
| --- | --- |
| `components/neural/story.ts` | The chapters (id, phase, words); `phaseOf(id)` feeds the jump buttons and hash aliases |
| `components/neural/timeline.ts` | The master, the phase→time tempo, THE LEGACY's beats, `settleLegacy` |
| `components/neural/NeuralJourney.tsx` | `gsap.matchMedia` lifecycle, the ScrollTrigger, pointer, sound, reading mode, film preload |
| `components/neural/renderer.ts` · `geometry.ts` · `signal.ts` | WebGL neural field (Canvas 2D fallback) and its activity cycle |
| `components/neural/film.ts` · `morph.ts` · `LegacyScene.tsx` | The founder's film as a scrubbed WebP frame sequence (`public/legacy-film/<version>/`) and the face's transformation |
| `scripts/legacy-film/` | `extract.mjs` (re-export the frames into a new version folder) and `measure.mjs` (re-measure `MORPH`) |

---

## SentraSim — Detailed Architecture

**File:** `components/SentraSim.tsx` — 57.1 KB

SentraSim is the most architecturally significant component. It implements a
**sequential async clinical simulation** across a single patient case.

### Simulation Case

- **Patient:** Female, 46 years old — `RM-88492-A` (RSIA Melinda DHAI)
- **Presentation:** High fever, productive green cough, dyspnea on light
  exertion, right-sided pleuritic chest pain
- **Likely Diagnosis:** Community-Acquired Pneumonia (CAP)

### Simulation Steps & Status Progression

| Status Key     | Display Text                                | Phase           |
| -------------- | ------------------------------------------- | --------------- |
| `idle`         | `LIVE CASE: IDLE`                           | Before start    |
| `synthesizing` | `STRUCTURING CHIEF COMPLAINT...`            | NLP extraction  |
| `emr`          | `RETRIEVING HISTORY, ALLERGY, AND COMORBID` | EMR retrieval   |
| `synced`       | `TRIAGE CONTEXT VERIFIED`                   | Context sync    |
| `lab`          | `REQUESTING DIAGNOSTIC WORKUP...`           | Lab ordering    |
| `evidence`     | `FUSING LAB AND RADIOLOGY EVIDENCE...`      | Result analysis |
| `trajectory`   | `MONITORING CLINICAL RESPONSE...`           | Trajectory      |
| `diagnosis`    | `RANKING DIFFERENTIAL DIAGNOSES...`         | Differential    |
| `management`   | `BUILDING INITIAL MANAGEMENT PLAN...`       | Management      |
| `complete`     | `CASE SIMULATION COMPLETE`                  | Done            |

### Vital Signs (Demo Data)

| Parameter | Value       | Status      |
| --------- | ----------- | ----------- |
| GCS       | 15 (E4V5M6) | Normal      |
| BP        | 132/84 mmHg | Normal      |
| HR        | 108 bpm     | ⚠️ Critical |
| RR        | 24 x/min    | ⚠️ Critical |
| Temp      | 38.8°C      | ⚠️ Critical |
| SpO2      | 92%         | ⚠️ Critical |
| CRT       | < 2 sec     | Normal      |

### Lab Results (Demo Data)

| Test        | Result                      | Interpretation           |
| ----------- | --------------------------- | ------------------------ |
| Leukosit    | 15,200/uL                   | Leukositosis neutrofilik |
| CRP         | 86 mg/L                     | Inflamasi akut bermakna  |
| Foto Toraks | Infiltrat lobus bawah kanan | Konsolidasi sesuai CAP   |

### State Architecture

21+ `useState` hooks — all local, no external state library:

```typescript
interface SimulationState {
  isRunning: boolean
  isComplete: boolean
  status: SimulationStatus
  headerTone: HeaderTone
  anamnesaText: string
  anamnesaTagCount: number
  historyPhase: HistoryPhase
  showVitalsAnomaly: boolean
  vitalsTagCount: number
  labOpen: boolean
  selectedLabCount: number
  showLabResults: boolean
  labResultCount: number
  trajectoryOpen: boolean
  showTrajectoryInsight: boolean
  showDiagnosis: boolean
  diagnosisCount: number
  showManagement: boolean
  managementCount: number
}
```

### Color Coding (CSS vars)

| Class          | Token                          | Meaning                      |
| -------------- | ------------------------------ | ---------------------------- |
| Anamnesis text | `--sdx-c-anamnesa`             | Normal clinical info         |
| Assessment     | `--sdx-c-asesmen` (`#eb5939`)  | Accent — clinical assessment |
| Critical       | `--sdx-c-critical` (`#E65A4C`) | Critical findings            |
| Warning        | `--sdx-c-warning` (`#FBBF24`)  | Warning flags                |

---

## Design System

All tokens defined in `app/globals.css` — no `tailwind.config.ts` exists.

### Core Palette

| Token               | Value     | Usage                              |
| ------------------- | --------- | ---------------------------------- |
| `--sentra-bg`       | `#0d0d0d` | Page background                    |
| `--sentra-fg`       | `#b7ab98` | Primary text                       |
| `--sentra-accent`   | `#eb5939` | CTAs, highlights, assessment color |
| `--sentra-canvas`   | `#1C1B1A` | Elevated surface background        |
| `--sentra-critical` | `#E65A4C` | Critical clinical findings         |
| `--sentra-warning`  | `#FBBF24` | Warning clinical flags             |

### Audrey AI Tokens

| Token                         | Value                       |
| ----------------------------- | --------------------------- |
| `--sentra-audrey`             | `#C4956A` (amber)           |
| `--sentra-audrey-teal`        | `#6B9B8A`                   |
| `--sentra-audrey-bubble`      | `#F2EBE0` (light bubble bg) |
| `--sentra-audrey-bubble-text` | `#1a1510`                   |

### Typography

| Variable         | Font              | Usage                    |
| ---------------- | ----------------- | ------------------------ |
| `--font-jakarta` | Plus Jakarta Sans | Primary headings + body  |
| `--font-inter`   | Inter             | Secondary / numeric text |

Both loaded via `next/font/google` in `app/layout.tsx` — zero layout shift.

### SentraSim Scoped Tokens

`--sdx-*` prefix — CSS variables are defined on `:root` in `app/globals.css`;
`[data-sentra-sim]` applies a scoped box-model reset for the simulation UI:

```css
--sdx-bg-canvas, --sdx-bg-page, --sdx-text-main, --sdx-text-muted,
--sdx-line-base, --sdx-grid-faint,
--sdx-c-anamnesa, --sdx-c-asesmen, --sdx-c-critical, --sdx-c-warning
```

---

## Navigation Architecture

**`Navbar`** renders two navigation surfaces:

1. **Horizontal desktop nav** — links: Home, About, Services, Audrey, Insights,
   Get Started
2. **`SentraKineticNav`** (12.8 KB) — full-screen animated sidebar overlay,
   triggered by Menu button on all screen sizes

All route/anchor constants live in `lib/site-links.ts`:

```typescript
export const siteLinks = {
  home: '#top',
  about: '#about',
  services: '#services',
  audrey: '#audrey',
  insights: '/insights',
  story: '/story',
  faq: '#faq',
  privacy: '/privacy',
  terms: '/terms',
  contact: '#contact',
} as const
```

---

## SEO Architecture

| Mechanism       | Implementation                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page metadata   | `Metadata` object in `app/layout.tsx` — title template, description, OG, Twitter Card                                                                                                               |
| Canonical URL   | `alternates.canonical: "/"`                                                                                                                                                                         |
| Sitemap         | `app/sitemap.ts` → `/sitemap.xml` — dynamic list: `/`, `/story`, `/insights`, one URL per article in `app/insights/data.ts`, `/privacy`, `/terms` (article count changes with the `articles` array) |
| Robots          | `app/robots.ts` → `/robots.txt` — allows `/`; disallows `/dashboard` and `/dashboard/`                                                                                                              |
| OG images       | `app/opengraph-image.tsx` + `app/story/opengraph-image.tsx`                                                                                                                                         |
| Structured data | JSON-LD in `app/layout.tsx` — 3 schema nodes                                                                                                                                                        |
| Search Console  | `app/google22238cc24e0d1002.html` — static verification route (App Router)                                                                                                                          |
| LLM crawlers    | `public/llms.txt` — plain-text site summary                                                                                                                                                         |

### Schema.org JSON-LD Nodes

```
Organization + MedicalOrganization
  name: "Sentra Healthcare Solutions" / "Sentra AI"
  url: "https://sentrahai.com"
  foundingDate: "2025-03"
  founder: Dr. Ferdi Iskandar, S.H., M.Kn., CMDC, CLM
  address: Laboratorium Technology RSIA Melinda DHAI, Kediri, Jawa Timur
  email: drferdiiskandar@melinda.co.id
  sameAs: LinkedIn, GitHub, X (Twitter), Instagram

WebSite
  url: "https://sentrahai.com"

SoftwareApplication (Sentra Clinical Decision Support)
  featureList: 7 items — Real-time CDSS, Audrey AI, Clinical Trajectory,
               Prognosis Intelligence, Patient Risk Scoring, EMR Integration,
               Immutable Audit Trail
```

---

## Security Headers

Configured in `next.config.mjs` via the `headers()` async function, applied to
all routes:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: [full CSP — see SECURITY.md]
```

`/legacy-film/:version/:file*` (the film frames) also gets
`Cache-Control: public, max-age=31536000, immutable`; the folder is versioned, so a re-export
never changes a cached file in place.

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
