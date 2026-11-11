# Contributing Guide — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding Content](#adding-content)
- [Adding a New Section](#adding-a-new-section)
- [Code Conventions](#code-conventions)
- [Commit Conventions](#commit-conventions)
- [Clinical Content Policy](#clinical-content-policy)
- [Pull Request Process](#pull-request-process)

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | **22.x LTS** | Enforced by `scripts/setup.sh`. Older versions are rejected. |
| npm | 10.x | Bundled with Node.js 22 |
| Git | 2.40+ | — |

> **Why Node 22?** The bootstrap script (`scripts/setup.sh`) checks `node --version` and exits with a clear error if the major version is below 22. This matches the Railway production runtime.

---

## Development Setup

```bash
# 1. Clone
git clone <repository-url>
cd sentra-main

# 2. Run the bootstrap script (checks Node version, runs npm ci)
bash scripts/setup.sh

# OR manually:
npm ci

# 3. Start dev server (webpack mode — stable)
npm run dev
# → http://localhost:3000

# 4. Alternatively — Turbopack mode (faster HMR, experimental)
npm run dev:turbo
```

There are no environment variables required to run the development server. This is a fully static site.

---

## Project Structure

```
sentra-main/
├── app/
│   ├── layout.tsx              Root layout — fonts, metadata, JSON-LD, security headers
│   ├── page.tsx                Landing page — section composition only
│   ├── globals.css             Tailwind v4 @theme design tokens + SentraSim CSS vars
│   ├── story/page.tsx          /story — 66.2 KB — full company narrative + team profiles
│   ├── insights/
│   │   ├── data.ts             All article content — edit here to add/modify articles
│   │   ├── page.tsx            /insights — article listing
│   │   └── [slug]/page.tsx     /insights/[slug] — article detail
│   ├── privacy/page.tsx        /privacy
│   ├── terms/page.tsx          /terms
│   ├── sitemap.ts              Auto-generates /sitemap.xml
│   ├── robots.ts               Auto-generates /robots.txt
│   └── opengraph-image.tsx     OG image for root route
│
├── components/
│   ├── Hero.tsx                19.4 KB — animated Audrey chat, 4 clinical phases
│   ├── SentraSim.tsx           57.1 KB — interactive CDSS simulation, multi-branch
│   ├── Audrey.tsx              21.3 KB — Audrey AI section with conversation demo
│   ├── ClinicalTrajectory.tsx  27.5 KB — vital-signs chart, risk probability bars
│   ├── ClinicalPrognosis.tsx   28.5 KB — survival curves, radar chart, heatmap
│   ├── Clients.tsx             13.0 KB — auto-scroll logo marquee
│   ├── Services.tsx             6.9 KB — 7-service accordion
│   ├── FAQ.tsx                  4.6 KB — accordion FAQ
│   ├── Footer.tsx               6.0 KB
│   ├── Navbar.tsx               3.2 KB
│   ├── News.tsx                 3.7 KB
│   ├── About.tsx                3.4 KB
│   ├── ProjectSlider.tsx        2.0 KB
│   ├── Showcase.tsx             2.0 KB
│   ├── CTA.tsx                  2.0 KB
│   ├── ScrollGallery.tsx        0.3 KB — delegates to ui/immersive-scroll-gallery
│   └── ui/
│       ├── immersive-scroll-gallery.tsx
│       ├── interactive-image-accordion.tsx
│       ├── morphing-cursor.tsx
│       ├── sentra-bento-cards.tsx
│       ├── sentra-kinetic-nav.tsx   (12.8 KB)
│       └── text-scramble.tsx
│
├── lib/
│   ├── site-links.ts           Navigation anchor/route constants
│   └── utils.ts                cn() — clsx + tailwind-merge
│
├── public/
│   ├── llms.txt                Machine-readable site summary for LLM crawlers
│   ├── ferdi.png               Founder photo (307 KB)
│   ├── hero.png / hero2.png / hero3.png — hero assets (`ProjectSlider`)
│   ├── join.jpg, melinda2.avif, gt.png, fi9.png, fit1.png–fit8.png — section imagery
│
├── scripts/
│   └── setup.sh                Developer bootstrap — enforces Node 22+
│
├── next.config.mjs             Security headers, image allowlist, Turbopack config
├── tsconfig.json               TypeScript strict mode
└── eslint.config.mjs           ESLint with eslint-config-next
```

---

## Development Workflow

```bash
npm run dev          # Start dev server on http://localhost:3000 (webpack)
npm run dev:turbo    # Start dev server with Turbopack (faster HMR)
npm run build        # Production build — TypeScript check + Next.js build
npm run start        # Run production build locally
npm run lint         # ESLint across all source files
```

---

## Adding Content

### Adding an Insight Article

All articles live in `app/insights/data.ts`. Add a new object to the `articles` array:

```typescript
{
  slug: "your-article-slug",          // URL: /insights/your-article-slug
  title: "Judul Artikel",
  description: "Deskripsi singkat untuk card dan meta description.",
  date: "2026-04-01",                  // ISO date string
  readTime: "5 menit",
  category: "Clinical AI",             // Displayed as badge
  content: `
    Konten artikel dalam Markdown-like format.
    Gunakan ## untuk subheadings.
  `.trim(),
}
```

Also add the new URL to `app/sitemap.ts`:

```typescript
{
  url: "https://sentrahai.com/insights/your-article-slug",
  lastModified: new Date("2026-04-01"),
  changeFrequency: "monthly",
  priority: 0.7,
},
```

### Updating Navigation Links

All anchor links and routes are centralised in `lib/site-links.ts`:

```typescript
export const siteLinks = {
  home: "#top",
  about: "#about",
  services: "#services",
  audrey: "#audrey",
  insights: "/insights",
  story: "/story",
  faq: "#faq",
  privacy: "/privacy",
  terms: "/terms",
  contact: "#contact",
} as const;
```

### Updating Company / Social Media Information

JSON-LD structured data (used by search engines) is in `app/layout.tsx`:

```typescript
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "MedicalOrganization"],
      sameAs: [
        "https://linkedin.com/company/sentra-ai",
        "https://github.com/sentraai",
        // add new profiles here
      ],
      // ...
    }
  ]
}
```

### Updating Design Tokens

All design tokens are in `app/globals.css` inside the `@theme { }` block and `:root { }`:

```css
:root {
  --sentra-bg: #0d0d0d;
  --sentra-fg: #b7ab98;
  --sentra-accent: #eb5939;
  --sentra-audrey: #C4956A;
  --sentra-audrey-teal: #6B9B8A;
  /* ... */
}
```

Do not hardcode colour values in component files. Always reference tokens.

---

## Adding a New Section

1. Create `components/YourSection.tsx` — add `"use client"` directive (required for Framer Motion)
2. Add a `<section id="your-section">` with the appropriate anchor ID
3. Import and add the component in `app/page.tsx` in the desired render order
4. Add the anchor to `lib/site-links.ts` if it needs to be linked from the Navbar
5. Add brand signature: `// Architected and built by Drferdi.`

---

## Code Conventions

- **Language**: TypeScript strict mode — no `any`, no `// @ts-ignore`
- **Styling**: Tailwind utility classes only. No inline `style={}` except for dynamic CSS custom properties that cannot be expressed as classes
- **Animation**: Framer Motion for component-level transitions; GSAP for complex scroll-driven sequences
- **State**: Local `useState`/`useRef` — no global state library
- **Client directive**: All components in `components/` use `"use client"` due to Framer Motion dependency
- **Brand signature**: Every new file must include `// Architected and built by Drferdi.` on the first or second line

---

## Commit Conventions

Format: `type(scope): description`

| Type | When to use |
|------|------------|
| `feat` | New component or page |
| `fix` | Bug fix |
| `content` | Copy, article, or media update |
| `style` | Visual/CSS-only change |
| `refactor` | Code restructuring without behaviour change |
| `docs` | Documentation update |
| `chore` | Dependency update, config change |
| `perf` | Performance improvement |

**Examples:**
```
feat(sim): add hypertension crisis branch to SentraSim
content(insights): publish article on triage AI
fix(hero): correct phase 3 timing from 24000ms to 22000ms
style(navbar): tighten mobile menu padding
docs(contributing): add section on updating JSON-LD
chore: bump framer-motion to 12.35.2
```

---

## Clinical Content Policy

All clinical claims published on `sentrahai.com` must be verified by Chief (Dr. Ferdi Iskandar) before merge. This includes:

- Statistical claims (e.g. "40% reduction in misdiagnosis", "97.2% triage accuracy")
- Clinical descriptions in article content (`app/insights/data.ts`)
- Feature descriptions in `components/Services.tsx`
- Any data displayed in `SentraSim`, `ClinicalTrajectory`, or `ClinicalPrognosis` demo datasets

Demo data in these components represents simulated clinical scenarios for illustration only. Any update to demo datasets must include a note in the PR confirming the data does not contain or derive from real patient information.

---

## Pull Request Process

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Run `npm run lint` — zero errors required
3. Run `npm run build` — must complete without TypeScript errors
4. Open PR against `main` with the PR template filled in completely
5. Clinical content changes require explicit sign-off from Chief in the PR review

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
