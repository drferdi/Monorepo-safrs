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
- `apps/web` (`@sentra/smartboard-web`) sub-fase 1/5, dari
  `pnpm --filter @sentra/smartboard-web <script>`:
  - `test` — Vitest, unit logic murni, TANPA render DOM/React Testing
    Library: `cn.test.ts` (util merge class), `api.test.ts` (client axios,
    mock), `auth.test.ts` (reducer state machine `authReducer`),
    `nav.test.ts` (filter `filterByRole`). RTL + `jsdom` sengaja belum
    ditambah sub-fase ini (Keputusan terbuka #5, plan sub-fase 1) — kalau
    Chief mau rendering test, itu keputusan cross-cutting terpisah untuk
    semua app, bukan satu-off `apps/web`; sampai saat itu, rendering
    dicek manual lewat dev server.
  - `test:build` — `node --test tests/build-output.test.mjs`: assert 3
    route sub-fase 1 (`/`, `/login`, `/master/murid`) diekspor ke
    `out/<route>/index.html`. Jalankan build (`pnpm --filter
    @sentra/smartboard-web build`) dulu kalau `out/` belum ada.
  - `lint` — Biome (`biome check src`), sama seperti `apps/site`.
  - `typecheck` — `tsc --project tsconfig.json`, sama seperti `apps/site`.

## Rencana test fase port

- 26 file test Python backend repo arsip = spesifikasi perilaku untuk port
  Vitest pada fase api (jangan port test apa adanya; tulis ulang per modul).
- Standar repo berlaku untuk app yang sudah ada: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm test:e2e` (Playwright).
