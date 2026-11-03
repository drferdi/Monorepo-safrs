# File: docs/SETUP.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Setup — Puskesmas Balowerti Website

## Prerequisites
- Node.js ≥ 20.19.0 atau ≥ 22.12.0 (sesuai `engines` di package.json)
- npm ≥ 10.x

## Install & Run

```bash
npm install
cp .env.example .env.local   # isi nilai yang diperlukan
npm run dev                  # → http://localhost:5173
```

## Environment Variables

```env
# URL Dashboard Crew (link di Navigation → tombol "Crew Portal")
VITE_DASHBOARD_URL=https://primary-healthcare-production.up.railway.app

# URL Crew Portal — divalidasi via getSafeCrewPortalUrl() sebelum dirender
# Localhost hanya diizinkan di development (import.meta.env.DEV)
VITE_CREW_PORTAL_URL=https://crew.puskesmasbalowerti.com

# Untuk sync Google Reviews (hanya dipakai saat npm run sync:reviews)
GOOGLE_MAPS_API_KEY=
GOOGLE_REVIEW_PAGE_URL=
GOOGLE_PLACE_QUERY=Puskesmas Balowerti Kediri
GOOGLE_REVIEWS_OUTPUT=public/data/google-reviews.json
```

## Build Production

```bash
npm run build    # TypeScript check (tsc -b) + Vite build → dist/
npm run preview  # Preview production build di http://localhost:4173
                 # (hanya allow host: puskesmas-website-production.up.railway.app)
```

## Sync Google Reviews

```bash
GOOGLE_MAPS_API_KEY=your_key npm run sync:reviews
# Output: public/data/google-reviews.json
# Commit hasilnya ke repo agar tersedia saat build
```

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
