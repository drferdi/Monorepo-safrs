# File: docs/TROUBLESHOOTING.md | App: intelligenceBoard | Repo: abyss-monorepo | Updated: 2026-03-16
# Architected and built by Drferdi.

# Troubleshooting — IntelligenceBoard

---

## Dev Server

### Port 7000 sudah dipakai
Server otomatis fallback ke 7001. Cek log:
```
⚠ Port 7000 in use, trying 7001...
```
Atur manual: `PORT=7002 pnpm dev`

### `.next/dev/lock` conflict
```bash
pnpm --filter @drferdi/intelligenceboard dev:clean
# Ini otomatis hapus .next/dev/lock sebelum start
```

### Turbopack error
App ini non-aktifkan Turbopack (`turbopack: false` di `next.config.ts`). Jangan enable — incompatible dengan custom server.

---

## Authentication

### Crew session expired / invalid
- Semua Socket.IO connections di-reject jika cookie session tidak valid
- Browser: clear cookie `puskesmas_crew_session`, login ulang
- Error di terminal: `[Auth] Socket connection rejected — invalid or missing session cookie`

### Login gagal — "kredensial salah"
Priority lookup credentials:
1. Env var `CREW_USERS` / `CREW_ACCESS_SECRET`
2. File `runtime/crew-access-users.json`
3. Compiled defaults di `CREW_USERS`

Pastikan salah satu sumber di atas mengandung user yang benar.

---

## CDSS / Iskandar Engine

### IDE-V2 return empty suggestions
Kemungkinan:
- `DEEPSEEK_API_KEY` tidak di-set → engine masuk ke safe fallback result
- Knowledge base tidak bisa dimuat → cek `penyakit.json` ada di `src/lib/cdss/`
- Response: `source: "error"`, `model_version: "IDE-V2-FALLBACK"`

### DeepSeek timeout (30 detik)
Engine otomatis fallback ke hasil deterministik lokal. Lihat log:
```
[IDE-V2] DeepSeek gagal, fallback ke local safety path: ...
```

### Kedua LLM gagal
Cek `DEEPSEEK_API_KEY` + koneksi internet. Engine return fallback result dengan alert `"Engine AI Tidak Tersedia"`.

### Autocomplete tidak muncul untuk kata non-alias
**Known bug** — sedang dalam perbaikan. Workaround: ketik nama diagnosis lengkap secara manual.

### Confidence semua rendah (< 0.3)
Alert `low_confidence` akan otomatis muncul. Tambahkan data klinis:
- Isi `vital_signs` (minimal sistolik, HR, SpO2)
- Tambah `keluhan_tambahan`
- Isi `assessment_conclusion` (sintesis dokter)

---

## Audrey Voice

### Voice route return `503`
Saat ini expected behavior. Voice chat, token, dan TTS memang dinonaktifkan selama exit Google total.

### Audio lag / choppy
- Tidak relevan untuk branch saat ini karena stack voice sedang dimatikan.

### Voice session tidak aktif
Tidak ada session live yang harus ditutup selama mode disabled aktif.

---

## EMR Auto-Fill

### Transfer gagal — "Login ePuskesmas gagal"
- Cek `EPUSKESMAS_USERNAME` dan `EPUSKESMAS_PASSWORD` di env
- Session cache di `storage/` mungkin expired — hapus file `.json` di folder storage

### Playwright error — elemen tidak ditemukan
ePuskesmas mungkin update UI. Perlu update field selectors di `src/lib/emr/field-selectors.ts`.

### Progress tidak muncul di UI
Pastikan socket event `emr:progress` diterima. Cek `setSocketIO(io)` dipanggil sebelum server listen.

---

## Intelligence Dashboard

### Dashboard tidak connect ke `/intelligence` namespace
- Pastikan crew session cookie valid
- Error: `[Intelligence] Socket rejected — invalid session`
- Solusi: login ulang

### Event tidak muncul di dashboard
Pastikan `setIntelligenceNamespace(intelligenceNS)` sudah dipanggil di `server.ts` sebelum `httpServer.listen`.

---

## Database / Prisma

### Migration error
```bash
pnpm --filter @drferdi/intelligenceboard db:migrate
# Jika schema conflict:
npx prisma migrate reset  # ⚠️ HAPUS SEMUA DATA
```

### Prisma Studio tidak bisa akses
```bash
pnpm --filter @drferdi/intelligenceboard db:studio
# Buka http://localhost:5555
```

---

## Build

### TypeScript errors
```bash
pnpm --filter @drferdi/intelligenceboard lint
# = tsc --noEmit --incremental false
```
Semua errors harus fix sebelum commit. `strict: true` aktif.

### Build gagal: `Cannot find module @abyss/...`
```bash
# Build platform/packages dulu dari root
pnpm build
```

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
