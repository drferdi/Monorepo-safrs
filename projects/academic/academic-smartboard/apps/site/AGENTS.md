# apps/site — Website Publik El-Kayyisa

Static export Next.js 16 (`output: "export"`), tanpa server, tanpa env runtime.
Konten dari modul bertipe di `src/content/` — bukan scrape HTML.

## Aturan kerja
- Semua warna/radius via token `@sentra/token`; app ini dalam scope gate
  `scripts/check-tokens.mjs` (`packages/token/scope.txt`).
- Konten publik saja; nol data pribadi; foto orang butuh bukti lisensi/konsen
  tertulis sebelum masuk `public/`.
- Risk default R1; perubahan `package.json`/lock = R2 (sensitive paths).

## Perintah
- `pnpm --filter @sentra/smartboard-site dev|lint|typecheck|test|build|test:build`
