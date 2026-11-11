# apps/web — Aplikasi Smartboard Utama (sub-fase 1/5)

Static export Next.js 16 (`output: "export"`), client-only — tanpa server Next.js,
tanpa env runtime. Auth cookie-session (`session_token` httpOnly, `withCredentials`)
langsung ke backend FastAPI arsip; role-gating dilakukan di komponen client
(`ProtectedRoute`), bukan middleware.

Sub-fase 1 baru mencakup: login, shell ber-navigasi role-aware, satu halaman data
(Master › Murid). 4 sub-fase lain (penjadwalan/akademik, payroll/finance,
komunikasi/operasional, admin platform + Kayyisa AI) belum ditulis — lihat
`docs/plans/active/2026-08-21-smartboard-web-roadmap.md`.

## Aturan kerja

- `NEXT_PUBLIC_BACKEND_URL` WAJIB di-set (env, build-time public) supaya `dev`/`build`
  benar-benar bisa memanggil backend arsip; `NEXT_PUBLIC_DEV_TENANT_SLUG` opsional
  (dev-only, header `X-Tenant-Slug`).
- Semua warna/radius via token `@sentra/token`; app ini dalam scope gate
  `scripts/check-tokens.mjs` (`packages/token/scope.txt`).
- Session `session_token` di-set BACKEND (`Set-Cookie`) — frontend TIDAK PERNAH
  membaca/menyimpan token secara eksplisit (tidak ada `localStorage`, tidak ada
  header `Authorization` manual).
- Risk default R1; perubahan `package.json`/lock/`pnpm-workspace.yaml` = R2
  (sensitive paths).

## Batas keamanan (WAJIB dibaca sebelum deploy ke host mana pun)

App ini adalah bundel statis: **tidak ada satu pun kontrol keamanan yang bisa
ditegakkan olehnya sendiri.** Empat kewajiban berikut ada di luar kode app dan
harus dipenuhi lapisan lain. Deploy tanpa keempatnya = celah nyata, bukan
kekurangan teoretis.

1. **`ProtectedRoute` bukan otorisasi.** Ia berjalan di browser dan hanya
   menyembunyikan UI. Siapa pun bisa memanggil endpoint backend langsung dan
   melewatinya. Otorisasi sebenarnya 100% milik backend — setiap endpoint baru
   yang dipanggil app ini WAJIB punya pemeriksaan role di sisi server.
2. **Security header dipasang di host, bukan di sini.** `output: "export"` tidak
   bisa mengirim header. Host WAJIB mengirim minimal `Content-Security-Policy`,
   `X-Frame-Options: DENY` (atau `frame-ancestors 'none'`),
   `Referrer-Policy: strict-origin-when-cross-origin`, dan HSTS. Tanpa itu app
   berlogin ini bisa di-iframe pihak lain (clickjacking).
3. **Cookie sesi backend fail-open secara default.** `COOKIE_SECURE` default
   `false` dan `COOKIE_SAMESITE` default `lax` (`backend/auth.py:_cookie_flags`).
   Produksi WAJIB `COOKIE_SECURE=true`. `COOKIE_SAMESITE=none` HANYA boleh
   dipakai bila frontend benar-benar beda site — dan itu menghapus satu-satunya
   pertahanan CSRF yang ada, karena backend tidak punya CSRF token. Pilihan itu
   butuh keputusan tertulis, bukan diambil diam-diam supaya dev jalan.
4. **`CORS_ORIGINS` wajib eksplisit di produksi.** Backend memakai
   `allow_credentials=True` dan membuang `*`, dengan default dev
   `http://127.0.0.1:3000`. Origin produksi harus didaftarkan; jangan pernah
   melebarkannya menjadi wildcard.

Verifikasi berkala yang murah: `pnpm audit --prod` (nol vulnerability per
2026-08-22, 270 paket) dan grep nol-hasil untuk `localStorage`, `document.cookie`,
`dangerouslySetInnerHTML`, `eval(` di `src/`.

## Perintah

- `pnpm --filter @sentra/smartboard-web dev|lint|typecheck|test|build|test:build`
