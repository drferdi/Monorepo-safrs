# File: DECISION_LOG.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Decision Log — Puskesmas Balowerti Website

## [2026-03-16] — Vite SPA vs Next.js
**Status:** Decided
**Konteks:** Website publik statis — tidak butuh SSR atau API routes
**Keputusan:** Vite 7 + React 19 SPA
**Rationale:** Build lebih cepat, output murni static, tidak butuh Node.js runtime di production. `npx serve -s dist` cukup. Next.js overhead tidak perlu untuk website profil.

## [2026-03-16] — Form Reservasi → WhatsApp (bukan server)
**Status:** Decided
**Konteks:** Puskesmas tidak memiliki sistem booking online resmi
**Keputusan:** Form mengformat data menjadi WhatsApp deep link (`wa.me/...?text=...`)
**Rationale:** Tidak butuh backend/database. Petugas menerima via WhatsApp yang sudah dipakai sehari-hari. Zero infra cost.

## [2026-03-16] — Lenis untuk Smooth Scroll
**Status:** Decided
**Keputusan:** Lenis 1.3 sebagai smooth scroll library
**Rationale:** Native CSS `scroll-behavior: smooth` tidak cukup untuk offset anchor. Lenis terintegrasi dengan Framer Motion dan expose instance ke `window.__lenis` untuk anchor intercept di `main.tsx`.

## [2026-03-16] — Manual Code Splitting
**Status:** Decided
**Keputusan:** `manualChunks` di vite.config.ts: vendor-react, vendor-ui, vendor-animation, vendor-icons
**Rationale:** Cegah semua vendor masuk satu chunk besar. Cache-bust lebih granular — update animasi tidak invalidate react chunk.

## [2026-03-16] — Railway RAILPACK vs Nixpacks
**Status:** Decided
**Keputusan:** RAILPACK builder (bukan Nixpacks yang dipakai dashboard)
**Rationale:** RAILPACK lebih baru dan optimal untuk static site. Build `npm run build`, serve `npx serve -s dist`.

## [2026-03-16] — Google Reviews Static JSON
**Status:** Decided
**Konteks:** Google Places API berbayar — tidak mau runtime API calls
**Keputusan:** Script manual `sync:reviews` → output `public/data/google-reviews.json` → commit ke repo
**Rationale:** Zero runtime cost. Reviews tidak berubah menit-per-menit. Sync manual atau dijadwalkan di CI.

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
