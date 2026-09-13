# Testing

Record the exact build, lint, type-check, unit, integration, and end-to-end commands that exist. Describe isolated test resources and known limitations.

## Generated capsule context

- Capsule topology: `python tools/safrs/check_topology.py` from the repository root.
- No app-specific test command exists until authorized implementation is added.

## Verifikasi yang ada sekarang

- Validasi knowledge pack (dari folder `ai/kayyisa/`):
  `python tools/validate_agent_kayyisa.py` — catatan: entri manifest untuk
  `operations/*` dan `docs/*` sengaja dikecualikan dari migrasi (ADR 0003),
  jadi validator melaporkan file itu hilang; hash 36 file yang ada sudah
  diverifikasi cocok.
- `apps/site` (`@sentra/smartboard-site`), dari
  `pnpm --filter @sentra/smartboard-site <script>`:
  - `test` — Vitest content-integrity (`src/content/content.test.ts`): 10
    halaman, slug unik, field wajib terisi, semua href internal (nav + CTA)
    menunjuk route yang ada.
  - `test:build` — `node --test tests/build-output.test.mjs`: 10 route
    diekspor ke `out/<route>/index.html`, plus guard vendor-reference (tidak
    ada sisa string `temlis`/`aeline` dari arsip di output build). Jalankan
    build (`pnpm --filter @sentra/smartboard-site build`) dulu kalau `out/`
    belum ada.
  - `lint` — Biome (`biome check src`).
  - `typecheck` — `tsc --project tsconfig.json`.
- `apps/web` (`@sentra/smartboard-web`) sub-fase 1–2/5, dari
  `pnpm --filter @sentra/smartboard-web <script>` (atau dari capsule root
  setelah isolasi):
  - `test` — Vitest, unit logic murni, TANPA React Testing Library: labels,
    week, curriculum phase/alignment/coverage/structure/reading, progression,
    sessionDetail, api `buildQuery`, nav, auth reducer, cn. RTL + `jsdom`
    sengaja belum ditambah (Keputusan terbuka plan — rendering dicek manual /
    E2E Chief terhadap backend arsip).
  - `test:build` — `node --test tests/build-output.test.mjs`: assert **12**
    route sub-fase 1+2 diekspor ke `out/<route>/index.html` (termasuk
    `/sesi/placeholder`, `/akademik/perkembangan/placeholder`). Jalankan
    `build` dulu kalau `out/` belum ada.
  - `lint` — Biome (`biome check src`), sama seperti `apps/site`.
  - `typecheck` — `tsc --project tsconfig.json`.
  - Verifikasi terakhir (2026-09-13): unit **59 PASS**, typecheck PASS,
    build PASS, `test:build` **12 PASS**. Audit grep: tidak ada
    `dangerouslySetInnerHTML` / `localStorage` / `eval`; `process.env` hanya
    `NEXT_PUBLIC_BACKEND_URL` + `NEXT_PUBLIC_DEV_TENANT_SLUG`.

## Rencana test fase port

- 26 file test Python backend repo arsip = spesifikasi perilaku untuk port
  Vitest pada fase api (jangan port test apa adanya; tulis ulang per modul).
- Standar repo berlaku untuk app yang sudah ada: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm test:e2e` (Playwright).
