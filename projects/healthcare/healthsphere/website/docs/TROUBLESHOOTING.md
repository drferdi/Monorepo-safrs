# File: docs/TROUBLESHOOTING.md | Repo: puskesmas-website | Updated: 2026-03-16
# Architected and built by Drferdi.

# Troubleshooting — Puskesmas Balowerti Website

## Build Errors

### TypeScript error saat `npm run build`
`tsc -b` dijalankan sebelum Vite — fix semua type errors dulu.
```bash
npx tsc -b --noEmit   # lihat semua errors tanpa build
```

### Chunk size warning
Vite warning jika chunk > 400KB (sesuai `chunkSizeWarningLimit: 400`).
Solusi: tambah entry baru ke `manualChunks` di `vite.config.ts`.

---

## Dev Server

### Smooth scroll tidak bekerja di dev
Lenis membutuhkan React StrictMode — sudah aktif di `main.tsx` (`<StrictMode>`).
Jika ada masalah, cek `window.__lenis` di console browser.

### Section reveal tidak muncul
- Cek `data-reveal` attribute ada di wrapper div di `App.tsx`
- `MutationObserver` di `main.tsx` harus sudah init (delay 100ms setelah render)
- Cek CSS class `reveal-in-view` dan `revealed` di `index.css`

---

## Konten

### Mengubah nomor WhatsApp / telepon
Edit `src/config/site.ts`:
```typescript
export const SITE_INFO = {
  whatsappDisplay: '0823-xxxx-xxxx',
  whatsappInternational: '628xxxxxxxxx',  // format internasional tanpa +
  phoneTel: '0354xxxxxx',
  // ...
}
```

### Mengubah jam operasional
Edit `OPERATIONAL_HOURS` di `src/config/site.ts`.
Perubahan otomatis reflect di Hero, Reservation, Location, Footer.

### Crew portal link tidak muncul di Navigation
Pastikan `VITE_CREW_PORTAL_URL` di-set di `.env.local`.
Link tidak dirender jika URL tidak valid atau kosong (by design — `getSafeCrewPortalUrl` return null).

---

## Google Reviews

### `sync:reviews` gagal
```
GOOGLE_MAPS_API_KEY belum diset
```
Set env var dulu:
```bash
GOOGLE_MAPS_API_KEY=your_key npm run sync:reviews
```

### Reviews tidak update di production
Reviews disimpan sebagai static JSON di `public/data/google-reviews.json`.
Jalankan `sync:reviews` lokal → commit file JSON → push.

---

## Deploy

### Railway build gagal
Cek bahwa `dist/` tidak di-gitignore — Railway butuh build output.
Atau pastikan `buildCommand = "npm run build"` berhasil lokal dulu.

### Preview not allowed host
```
Error: Host not allowed
```
`vite.config.ts` hanya allow `puskesmas-website-production.up.railway.app` di preview mode.
Untuk lokal: gunakan `npm run dev`, bukan `npm run preview`.

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
