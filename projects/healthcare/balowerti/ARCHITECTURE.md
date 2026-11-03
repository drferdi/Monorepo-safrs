Architected and built by the one and only Drferdi.
# Architecture — Puskesmas Balowerti Website

**Version:** 1.1.0
**Last Updated:** 2026-03-04
**Status:** Production

---

## System Overview

The Puskesmas Balowerti Website is a **static single-page application (SPA)** serving as the public-facing digital presence for UPTD Puskesmas Poned Balowerti, Kediri, Indonesia.

```
[Browser] → [Railway CDN/Static Server] → [dist/ (Vite build)]
                                               ↓
                                        [Google Places API] (review sync at build time)
                                        [WhatsApp] (appointment links — client-side only)

```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.x |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Vite | ^7.x |
| Styling | Tailwind CSS | ^3.4 |
| UI Components | shadcn/ui (new-york) | Latest |
| Animation | Framer Motion | ^12.x |
| Smooth Scroll | Lenis | ^1.3 |
| Forms | React Hook Form + Zod | ^7.x + ^4.x |
| Icons | Lucide React | ^0.562 |
| Deployment | Railway (nixpacks) | Static serve |

---

## Directory Structure

```
website/
├── src/
│   ├── main.tsx              # Entry: smooth scroll + IntersectionObserver setup
│   ├── App.tsx               # Root: ReactLenis wrapper + section composition
│   ├── index.css             # Global styles, Tailwind directives, CSS variables
│   ├── config/
│   │   └── site.ts           # Site-wide constants (clinic name, phone, address)
│   ├── sections/             # 13 full-width page sections
│   │   ├── Navigation.tsx    # Floating header + mobile sheet menu
│   │   ├── Hero.tsx          # Hero banner + doctor search + service FAB
│   │   ├── About.tsx         # Clinic overview
│   │   ├── Doctors.tsx       # Doctor profiles and schedules
│   │   ├── PatientFlow.tsx   # BPJS flow diagrams (Framer Motion)
│   │   ├── Diseases.tsx      # Disease information cards
│   │   ├── Services.tsx      # Healthcare services
│   │   ├── Facilities.tsx    # Facility showcase
│   │   ├── USG.tsx           # Ultrasound services
│   │   ├── Testimonials.tsx  # Google reviews
│   │   ├── Reservation.tsx   # WhatsApp booking form
│   │   ├── Location.tsx      # Maps + contact
│   │   └── Footer.tsx        # Site footer
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── LuxuryChatbox.tsx # ABBY AI chatbot
│   │   └── StoryScroll.tsx   # Scroll progress indicator
│   ├── hooks/
│   │   ├── use-mobile.ts     # Mobile breakpoint detection
│   │   └── useSmoothImage.ts # Image lazy-load + parallax hooks
│   └── lib/
│       └── utils.ts          # cn() utility (clsx + tailwind-merge)
├── public/
│   └── data/
│       └── google-reviews.json  # Static review data (synced via script)
├── scripts/
│   └── sync-google-reviews.mjs # Google Places API sync script
├── dist/                     # Vite production build output (gitignored)
└── backups/                  # Local backup snapshots (gitignored)
```

---

## Key Design Decisions

### ADR-001 — Static SPA (No Backend)

**Decision:** Build as purely static frontend with no server-side rendering.

**Rationale:** The website is informational only. No authentication, no dynamic data retrieval at runtime, no database needed. Eliminates attack surface, simplifies deployment, reduces cost.

**Consequences:** Content updates require redeployment. Appointment booking uses WhatsApp redirect (no server-side form processing).

---

### ADR-002 — Section-Based Single-Page Architecture

**Decision:** No client-side router. Navigation uses hash-based anchor links.

**Rationale:** Single-page scroll is idiomatic for clinic landing pages. Simplifies codebase — no route configuration, no code splitting needed.

**Consequences:** Deep-linking to specific sections works via URL hash (`#services`, `#reservation`).

---

### ADR-003 — Tailwind CSS + shadcn/ui

**Decision:** Tailwind CSS for utilities, shadcn/ui for accessible component primitives.

**Rationale:** Rapid development with design consistency. shadcn/ui provides accessible Radix UI components without runtime overhead.

**Consequences:** CSS bundle managed via Tailwind purging. Custom brand colors defined as CSS variables in `:root`.

---

### ADR-004 — Google Reviews as Static JSON

**Decision:** Reviews are fetched once via `npm run sync:reviews`, stored as `public/data/google-reviews.json`.

**Rationale:** Avoids exposing Google API key to browser. Reduces latency. Removes runtime API dependency.

**Consequences:** Reviews require manual sync and redeployment to update.

---

## Data Flow

```
Reservation Flow:
[User fills form] → [Zod validation] → [WhatsApp URL constructed] → [wa.me redirect]

Reviews Flow (build-time):
[npm run sync:reviews] → [Google Places API] → [public/data/google-reviews.json]
[Component mounts] → [fetch /data/google-reviews.json] → [render testimonials]

Navigation Flow:
[User clicks anchor] → [Lenis smooth scroll] → [window.__lenis.scrollTo(target)]
```

---

## Security Architecture

- **No PHI/PII stored** — static site, no backend
- **No authentication** — public information only
- **API keys** — `GOOGLE_MAPS_API_KEY` used only in build-time script, never bundled
- **WhatsApp links** — phone number is public clinic contact
- **CSP** — enforced by Railway static serve headers

---

## Performance Considerations

- Vite build with tree-shaking and code splitting by default
- Images: prefer `.webp` format, lazy-loaded via `useSmoothImage` hook
- Lenis smooth scroll uses `requestAnimationFrame` — minimal CPU overhead
- IntersectionObserver for section reveals — no polling

---

## Known Limitations

1. Google reviews require manual sync — not real-time
2. `backups/` and `runtime/` folders contain development artifacts not cleaned up
3. 26 ESLint errors in `src/` files (primarily `no-explicit-any` in shadcn/ui generated code and `setState-in-effect` in `LuxuryChatbox.tsx`)
4. No test suite configured
5. `website` name in `package.json` is set to `my-app` (Vite default) — should be updated
