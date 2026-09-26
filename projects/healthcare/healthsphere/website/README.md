Architected and built by the one and only Drferdi.
<div align="center">

# Puskesmas PONED Balowerti Kediri
### Public-Facing Website

**A modern, fully static single-page application for UPTD Puskesmas PONED Balowerti — a primary healthcare clinic (Puskesmas with PONED capability) located in Kediri, East Java, Indonesia.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app/)

**Live:** [puskesmas-website-production.up.railway.app](https://puskesmas-website-production.up.railway.app)

<img src="./public/site.png" alt="Puskesmas PONED Balowerti Website Preview" width="900" />

</div>

---

## Overview

This repository contains the complete source code for the public website of **UPTD Puskesmas PONED Balowerti**, serving the community of Kediri, East Java. The website is designed to provide clear, accessible information about the clinic's services, medical staff, patient flow procedures, and appointment reservations — all without requiring any backend infrastructure.

Built as a purely static, client-rendered SPA, it is deployed to Railway via a lightweight static file server, ensuring high availability and minimal operational overhead.

---

## Features

The website is organized into a seamless, scroll-driven single-page experience with the following sections:

- **Hero** — Full-screen banner with a doctor search panel and a floating service shortcut (FAB)
- **About** — Clinic overview, accreditation, and mission statement
- **Doctors** — Medical staff profiles with schedules and specializations
- **Patient Flow** — Animated step-by-step BPJS patient flow diagrams (Framer Motion)
- **Diseases** — Informational cards covering common health conditions
- **Services** — Comprehensive list of available healthcare services
- **Facilities** — Visual showcase of clinic facilities and equipment
- **USG** — Dedicated section for ultrasound services
- **Testimonials** — Patient reviews synced from Google Places API (served as static JSON)
- **Reservation** — WhatsApp-based appointment booking form
- **Location** — Embedded map, address, and contact information
- **ABBY AI Chatbot** — An intelligent chatbot assistant (`LuxuryChatbox`) for visitor guidance
- **Crew Portal Integration** — Navigation shortcut to the internal staff dashboard

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 3.4 (HSL CSS variables) |
| UI Components | shadcn/ui (new-york style) + Radix UI Primitives |
| Animation | Framer Motion 12, Lenis smooth scroll, IntersectionObserver |
| Form Handling | React Hook Form 7 + Zod 4 validation |
| Icons | Lucide React |
| Deployment | Railway (Railpack, Node.js 20.19+ / 22.12+, static `serve`) |
| Package Manager | npm (bun.lock also present) |

---

## Project Structure

```
puskesmas-website/
├── public/
│   ├── images/                  # Static visual assets (.webp, .avif, .png, .jpg)
│   └── data/
│       └── google-reviews.json  # Pre-synced Google Places reviews
├── scripts/
│   └── sync-google-reviews.mjs  # Node.js script to pull reviews from Google Places API
├── src/
│   ├── main.tsx                 # Entry point: smooth scroll + IntersectionObserver setup
│   ├── App.tsx                  # Root component: ReactLenis wrapper + section composition
│   ├── index.css                # Global styles, Tailwind directives, CSS variables
│   ├── sections/                # 13 full-width page sections
│   │   ├── Navigation.tsx       # Floating header with mobile sheet menu
│   │   ├── Hero.tsx             # Hero banner with doctor search + service FAB panel
│   │   ├── About.tsx            # Clinic overview
│   │   ├── Doctors.tsx          # Doctor profiles and schedules
│   │   ├── PatientFlow.tsx      # BPJS patient flow (Framer Motion animated)
│   │   ├── Diseases.tsx         # Disease information cards
│   │   ├── Services.tsx         # Healthcare services offered
│   │   ├── Facilities.tsx       # Facility showcase
│   │   ├── USG.tsx              # Ultrasound services
│   │   ├── Testimonials.tsx     # Google reviews integration
│   │   ├── Reservation.tsx      # WhatsApp booking form
│   │   ├── Location.tsx         # Maps and contact info
│   │   └── Footer.tsx           # Site footer
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── LuxuryChatbox.tsx    # ABBY AI chatbot
│   │   └── StoryScroll.tsx      # Right-side scroll progress indicator
│   ├── hooks/
│   │   ├── use-mobile.ts        # Mobile breakpoint detection
│   │   └── useSmoothImage.ts    # Image lazy-load + parallax + scale animations
│   └── lib/
│       └── utils.ts             # cn() utility (clsx + tailwind-merge)
├── docs/                        # Project documentation and architecture dossier
├── .env.example                 # Environment variable template
├── railway.toml                 # Railway deployment configuration
├── tailwind.config.js           # Tailwind configuration
├── vite.config.ts               # Vite + path alias configuration
└── CLAUDE.md                    # AI assistant context file
```

---

## Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm** 9+

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Drferdi/puskesmas-website.git
cd puskesmas-website
npm install
```

### Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `VITE_CREW_PORTAL_URL` | Optional | URL for the Crew Portal (internal staff dashboard) link in the navigation |
| `GOOGLE_MAPS_API_KEY` | For sync only | Google Places API key used by the review sync script |
| `GOOGLE_PLACE_QUERY` | Optional | Search query for the clinic (default: `"Puskesmas Balowerti Kediri"`) |
| `GOOGLE_REVIEW_PAGE_URL` | Optional | Override URL for the public Google review page |
| `GOOGLE_REVIEWS_OUTPUT` | Optional | Override output path for synced reviews (default: `public/data/google-reviews.json`) |

> **Note:** Only `VITE_`-prefixed variables are exposed to the browser bundle at build time. All other variables are used exclusively by Node.js scripts.

### Running Locally

```bash
npm run dev
```

The development server starts at **http://localhost:5173**

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check with `tsc -b`, then build for production |
| `npm run preview` | Serve the production build locally for inspection |
| `npm run lint` | Run ESLint across all `.ts` / `.tsx` files |
| `npm run sync:reviews` | Fetch latest reviews from Google Places API and write to `public/data/google-reviews.json` |

> **Important:** The `build` command runs `tsc -b && vite build`. TypeScript **must** compile cleanly before Vite will produce a production bundle.

---

## Architecture

### Single-Page Scroll Architecture

This project uses **no client-side router**. All navigation is powered by hash-based anchor links (`#hero`, `#services`, `#reservation`, etc.) with a `NAV_HEIGHT = 72px` offset for precise scroll targeting.

Lenis provides buttery-smooth global scroll behavior and exposes its instance via `window.__lenis` so the anchor click handler in `main.tsx` can programmatically scroll to any section.

### Section Reveal System

A global `IntersectionObserver` (initialized in `main.tsx`) watches all `[data-reveal]` elements. When a section enters the viewport at a threshold of `0.12`, the `.revealed` class is applied, triggering staggered entrance animations from left or right. The Hero section is always visible and does not participate in this system.

### State Management

There is no centralized state store. All state is component-local via React `useState`. Data sources include:

- **Hardcoded arrays** within section components (doctors, services, facilities)
- **Static JSON** fetched from `/public/data/google-reviews.json` (`cache: 'no-store'`)
- **Local form state** collected by React Hook Form and dispatched to WhatsApp

### External Integrations

- **WhatsApp Reservations** — Form submissions construct a `https://wa.me/{phone}?text={message}` URL
- **Google Places Reviews** — Pulled via `scripts/sync-google-reviews.mjs` and stored as static JSON; the component never calls Google at runtime
- **Crew Portal** — Configurable external link injected via `VITE_CREW_PORTAL_URL`

---

## ☁️ Deployment

The project is deployed to **Railway** using the configuration in `railway.toml`:

```toml
[build]
builder = "RAILPACK"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npx serve -s dist -l $PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

The output is a fully static site in `dist/`. No server-side rendering — just a lightweight `serve` process that handles SPA routing.

**Production URL:** [puskesmas-website-production.up.railway.app](https://puskesmas-website-production.up.railway.app)

---

## Design System

- **Color Palette:** Cream-based with primary accent `#C9A87C` (warm gold). All core colors are defined as HSL CSS variables in `:root` within `index.css`.
- **Custom Utility Classes:** `.neo-card`, `.neo-card-hover`, `.neo-control`, `.neo-inset`, `.neo-chip`, `.frosted-glass`, `.grain-overlay`
- **shadcn/ui Config:** `new-york` style, `slate` base color, Lucide icon library
- **Responsive Breakpoints:** Standard Tailwind (`sm:`, `md:`, `lg:`, `xl:`)
- **Image Formats:** `.webp` preferred for new assets; `.avif`, `.png`, `.jpg` also present

---

## Code Conventions

### File Naming

- Section & component files: `PascalCase` (e.g., `Hero.tsx`, `PatientFlow.tsx`)
- Hook files: `camelCase` with `use` prefix (e.g., `useSmoothImage.ts`, `use-mobile.ts`)
- Utility files: `lowercase` (e.g., `utils.ts`)

### Import Order

```typescript
// 1. React / third-party
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. UI components
import { Button } from '@/components/ui/button';

// 3. Custom hooks
import { useSmoothImage } from '@/hooks/useSmoothImage';

// 4. Utilities
import { cn } from '@/lib/utils';
```

### Path Aliases

`@/` maps to `./src/` — configured in both `vite.config.ts` and `tsconfig.json`. Always use `@/` for imports from within `src/`.

### Constants

- Module-level constants: `UPPER_CASE` (e.g., `NAV_HEIGHT`, `WA_NUMBER`)
- All variables and functions: `camelCase`

### Content Language

All user-facing text is in **Bahasa Indonesia**. Code comments mix Indonesian and English.

---

## Known Gotchas

- **Lenis Bridge Pattern** — `App.tsx` exposes the Lenis instance to `window.__lenis`. The `LenisBridge` component must not be removed, as the global anchor handler in `main.tsx` depends on it.
- **Reveal Animation Timing** — The `IntersectionObserver` in `main.tsx` initializes after a `requestAnimationFrame` + `setTimeout(100ms)` delay to ensure React's first render is complete before observing elements.
- **Google Reviews are Static** — Reviews are not fetched live from Google at runtime. Run `npm run sync:reviews` to update the cached data.
- **No Backend** — This is a purely static frontend. Form submissions route to WhatsApp; there is no server, database, or API.
- **No Test Framework** — There are currently no test files or testing dependencies configured in this project.

---

## Related Documentation

- [`SERVER_GUIDE.md`](./SERVER_GUIDE.md) — Server setup and deployment guide
- [`CLAUDE.md`](./CLAUDE.md) — AI assistant context file for codebase understanding
- [`docs/`](./docs/) — Complete project dossier including architecture and operations guides

---

## Prerequisites Summary

| Tool | Version |
|---|---|
| Node.js | 20.19+ or 22.12+ |
| npm | 9+ |
| Google Places API Key | Required only for `sync:reviews` |

---

<div align="center">

---

*Architect & Built by* **[Drferdi](https://github.com/Drferdi)**

*Serving the community of Kediri, East Java, Indonesia 🇮🇩*

</div>
