# Security Policy — MedBoard

---

## Melaporkan Vulnerability

Laporkan secara privat kepada pemilik proyek, dr. Ferdi Iskandar, melalui https://ferdiiskandar.com.
**Jangan buka GitHub issue publik** untuk celah keamanan, dan jangan sertakan data pasien,
kredensial, atau tangkapan layar rekam medis dalam laporan.

Sertakan apa yang ditemukan, lokasinya (file, halaman, atau endpoint), langkah reproduksi, dan
dampak yang diperkirakan. Laporan akan dikonfirmasi dan ditangani secara rahasia.

### Versi yang didukung

Hanya versi terbaru di branch `main` yang menerima perbaikan keamanan.

---

## Implementasi Keamanan yang Ada

### Authentication — Crew Access
- **Cookie:** `puskesmas_crew_session` — HMAC-signed, TTL 12 jam
- **Password hashing:** scrypt (N=16384, r=8, p=1, keylen=64 bytes)
- **Session payload:** `{ v:1, username, displayName, email, institution, profession, role, issuedAt, expiresAt }`
- **Middleware Socket.IO:** semua koneksi Socket.IO di-verify cookie session sebelum join
- **Credential priority:** env vars → `runtime/crew-access-users.json` → compiled defaults

### Authorization — CDSS Endpoint
- `POST /api/cdss/diagnose` — requires valid crew session
- Role check: ✅ Implemented — `isClinicalCrewRole` check di route handler, returns 403 for non-clinical roles
- Semua request dicatat ke Security Audit Log

### Security Baseline Gate
- Repo baseline security checks dijalankan lewat `pnpm run security:baseline`
- Baseline saat ini mencakup:
  - `test:auth-hardening`
  - `test:cdss:protected`
- CI baseline memakai install non-interaktif tanpa lifecycle side effects lewat `npm ci --ignore-scripts`
- Setelah install non-interaktif, repo menjalankan `prisma generate` dengan `DATABASE_URL` placeholder lokal untuk membentuk Prisma Client tanpa menyentuh database nyata
- `test:cdss:protected` dijalankan lewat `node --import ./node_modules/tsx/dist/loader.mjs ...` agar runner TypeScript stabil di Node 24 tanpa bergantung ke loader lama

### Security Audit Log
- File: `src/lib/server/security-audit.ts`
- Setiap request ke `/api/cdss/*` dan `/api/auth/*` dicatat ke database
- Fields: endpoint, action, result, userId (SHA-256 hashed), role, IP, metadata
- IP detection: `x-forwarded-for` header (diaktifkan otomatis jika `RAILWAY_ENVIRONMENT_ID` ada)
- PHI tidak pernah masuk ke audit log — userId di-hash, bukan plain text

### PHI Protection — Sentry
- File: `src/lib/intelligence/sentry.config.ts`
- `beforeSend` hook: scrub PHI sebelum setiap event dikirim ke Sentry
- Field patterns yang di-scrub: `patientId`, `patientName`, `patientLabel`, `fullName`, `displayName`, `medicalRecordNumber`, `mrn`, `nik`
- Value patterns: NIK 16-digit → `[REDACTED-NIK]`, MRN → `[REDACTED-MRN]`
- **Session replay dinonaktifkan**: `replaysSessionSampleRate = 0`, `replaysOnErrorSampleRate = 0`

### PHI Protection — CDSS
- `CDSSEngineInput` tidak memiliki field nama pasien atau identifier
- Audit entry CDSS: hanya summary numerik (jumlah suggestion, red flag count) — bukan konten klinis
- `session_id` bersifat opsional dan tidak diikat ke identitas pasien

### Input Validation
- CDSS request body: diparse via `parseDiagnoseRequestBody()` dengan validasi ketat
- Socket.IO message: max 5.000 karakter, room ID max 200 karakter
- Server-side identity: semua socket events menggunakan identity dari session cookie — tidak dari client payload
- Message ID + timestamp: server-generated, tidak dipercaya dari client

### CORS
Production whitelist:
```
https://puskesmasbalowerti.com
https://www.puskesmasbalowerti.com
https://medboard.sentrahai.com
https://intelligenceboard-production.up.railway.app
```

---

## Known Issues / TODOs Security

- Role-based authorization di `/api/cdss/diagnose`: implementasi dasar tersedia (`isClinicalCrewRole`); RBAC matrix produksi lengkap masih perlu audit terpisah
- Dependency graph masih memiliki audit findings bawaan; triage dan remediation version upgrade perlu batch terpisah
- Surface Prisma readiness untuk lint/CI sudah dipulihkan lewat explicit generate step; lint sekarang kembali hijau
- Debt berikutnya berpindah ke hardening auth/RBAC dan audit package upgrades

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
