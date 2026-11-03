# File: docs/TESTING.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Testing — Puskesmas Balowerti Website

## Commands

```bash
npm run lint     # ESLint (eslint-plugin-react-hooks + react-refresh)
npm run build    # TypeScript strict check via tsc -b (paling penting)
```

## TypeScript Config

Dua tsconfig terpisah:
- `tsconfig.app.json` — source code (strict mode)
- `tsconfig.node.json` — build tooling (vite.config.ts)
- `tsconfig.json` — root yang me-reference keduanya via `references`

## Apa yang Ditest Saat Build

`tsc -b` menjalankan TypeScript check strict sebelum Vite build.
Build akan gagal jika ada type error.

Termasuk:
- `getSafeCrewPortalUrl()` — URL validation logic
- Semua props di section components
- `SITE_INFO`, `OPERATIONAL_HOURS`, `QUEUE_INFO` constant types

## Manual Test Checklist

Sebelum setiap deploy, verifikasi:
- [ ] Form reservasi → WhatsApp link terbentuk dengan benar
- [ ] Mode Telemedicine → link berbeda dari Kunjungan
- [ ] Mode Darurat → tombol telepon / WhatsApp IGD aktif
- [ ] Navigation → crew portal link tidak render jika `VITE_CREW_PORTAL_URL` tidak di-set
- [ ] Semua sections lazy-load dengan reveal animation
- [ ] Mobile responsive (320px – 428px viewport)

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
