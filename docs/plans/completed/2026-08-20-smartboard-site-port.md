# Smartboard Site Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- **Status:** COMPLETED — seluruh 14 task dieksekusi dan di-merge ke main 2026-08-20; review R2 Chief in-chat; site masuk token gate scope
- **Owner:** Chief

**Goal:** Port website promo/publik El-Kayyisa dari `landing/` (React 19 SPA + Vite 8, repo arsip) menjadi `projects/academic-smartboard/apps/site` — Next.js 16 static export, patuh design token Sentra, lolos semua gate SAFRS; sekaligus kalibrasi token gate (fase 2 ADR 0003).

**Architecture:** Rewrite, bukan lift-and-shift. Konten 7 halaman hasil scrape template "Aeline" diekstrak menjadi modul konten TypeScript bertipe; 3 halaman native React di-port ke komponen berbasis token. Arsitektur injeksi HTML runtime (DOMParser + 239KB CSS vendor) TIDAK ikut — mati di arsip. Slug route diganti bahasa Indonesia. Template app terdekat: `projects/control-center/apps/web` (dep minimal, tanpa import env server).

**Tech Stack:** Next.js 16.3.0 (`output: "export"`), React 19.2.8, TypeScript 7.0.2, Tailwind 4.3.3, `@sentra/token`, Vitest — semua via `catalog:` (tanpa entri catalog baru).

**Spec:** `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md` (D2, D4/D5, baris 62: "Port apps/site — plan terpisah. Paling kecil; kalibrasi token gate.") + `docs/adrs/0003-smartboard-migration.md` (urutan site → web → api → demo).

**Sumber:** `D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/` (read-only; snapshot whitelist, tanpa graft riwayat git).

## Prasyarat (blocking — jangan mulai sebelum terpenuhi)

1. **`origin/main` harus memuat `cb1e5b7`** (evidence integrity review migrasi fondasi). Bukti evidence itu mem-fingerprint change set 66 file pada base `99d57f0` vs `origin/main`; commit APA PUN sebelum push (termasuk file plan ini) membuat evidence stale dan CI merah di `check_sensitive_changes`. Push = keputusan Chief.
   Verifikasi: `git fetch origin && git merge-base --is-ancestor cb1e5b7 origin/main && echo OK`
2. Chief menyetujui plan ini (status diganti ACTIVE).
3. Tree kerja bersih dari pekerjaan asing yang menabrak scope plan (lihat `pnpm task list --active`).

## Catatan eksekusi (2026-08-20)

- Prasyarat push dipenuhi: Chief memilih push via AskUserQuestion; origin/main = cb1e5b7 sebelum eksekusi.
- Task 1 dieksekusi controller inline (klaim dari tree utama — worktree_id CLI).
- Task 11: trailingSlash: true ditambahkan ke next.config.ts (export <route>/index.html, sesuai test); regex vendor-guard jadi /\b(?:temlis|aeline)/i (false positive "DataTransferItemList").
- Task 10: scope dipersempit ke 6 gambar artikel wawasan (konten tidak mereferensi gambar lain); Section diperluas field opsional image.
- Task 9: audit privasi menemukan nol klausul newsletter di sumber — premis plan keliru, teks legal utuh verbatim.
- Foto tutor-profile/mentor-berhijab: dihilangkan (tanpa placeholder) menunggu konfirmasi lisensi Chief.

## Global Constraints

- Semua versi dependensi via `catalog:` (`pnpm-workspace.yaml`); plan ini TIDAK menambah entri catalog baru (tanpa framer-motion, tanpa gsap — animasi CSS saja).
- Karantina permanen (TIDAK PERNAH disalin): `landing/.env`, `landing/.env.local`, semua `.env*`, `node_modules/`, `dist/`, `preview-{out,err}.txt`, `.vercel/`, `package-lock.json`, `source-pages/*.html` mentah (konten diekstrak jadi modul TS, HTML mentah tidak masuk repo).
- Aset vendor template Aeline TIDAK disalin: `public/source-assets/_astro/**` (CSS/JS/font vendor), font Inter/Plus Jakarta Sans. Font = Geist dari `@sentra/token` saja (UI-RULES).
- Warna/radius HANYA `var(--color-*)`, `var(--radius-structure|--radius-control)` — nol hex mentah (gate `scripts/check-tokens.mjs`).
- UI-RULES `packages/token/UI-RULES.md` wajib: grid 12 kolom (kolom 8 kosong), max-width 1440, body ≤68ch, radius 0/2px, ikon 20px stroke 1.5, warna tidak pernah sendirian.
- File kontrol verifikasi (`projects/**/AGENTS.md`, `packages/token/scope.txt` operasionalnya, `scripts/check-tokens.mjs`, `.github/workflows/**`) TIDAK boleh satu change set dengan implementasi — branch kontrol terpisah (Task 13).
- Kerja di worktree `../Monorepo.worktrees/<branch>`; commit Conventional Commits; `bash scripts/safrs-verify.sh` sebelum klaim selesai.
- Bahasa konten situs: Indonesia, verbatim dari sumber arsip (jangan tulis ulang copy tanpa arahan Chief).

## Keputusan terbuka (milik Chief — default plan berjalan tanpa memblokir)

| # | Keputusan | Default plan ini |
| --- | --- | --- |
| 1 | Palet brand: token Sentra existing vs lime El-Kayyisa `#d6fd70` masuk `tokens.json` (perubahan nilai token = R2 + wajib lolos rekomputasi kontras 16 pasangan; lime-di-putih hampir pasti gagal 4.5:1 — paling banter accent/mark 3.0:1) | Pakai token Sentra existing; halaman hanya referensi token semantik, jadi keputusan ini mengubah 1 task (Task 4), bukan seluruh plan |
| 2 | Komposisi landing: 6 referensi `docs/design-system/reference/` (design-system, patterns, brand-mark, runs-index, run-detail, button-lab) tidak memuat komposisi marketing-landing | Pakai `01-design-system.html` + `02-patterns.html` sebagai basis; komposisi hero/section landing = kalibrasi yang dimaksud spec, divalidasi Chief saat review Task 5 |
| 3 | 2 foto orang (`tutor-profile.png`, `mentor-berhijab.png`) — konsen/lisensi tak terverifikasi | DIKECUALIKAN; posisi diisi placeholder berbasis token sampai Chief konfirmasi tertulis |
| 4 | Redirect slug Inggris lama (`/pricing`, `/services/*`) — static export tidak bisa redirect server | Mati; kalau perlu, jadi konfigurasi host saat deploy target diputuskan |
| 5 | Deploy target/hosting output `out/` | Di luar plan; build lokal + CI saja |
| 6 | E2E Playwright untuk site | SKIP — path artefak CI hardcoded golden-path; edit `.github/workflows/**` = kontrol verifikasi, tidak sepadan |
| 7 | "ESA" — recon tidak menemukan brand ESA di sumber (hanya El-Kayyisa × Sentra) | Plan pakai fakta recon; kalau ESA = rebrand, Chief nyatakan eksplisit |
| 8 | Form newsletter footer (mati di sumber: `preventDefault`, tanpa backend) | TIDAK di-port — kontrol mati menipu pengguna |

## Peta route (slug lama → baru)

| Lama (SPA) | Baru (static export) | Sumber konten |
| --- | --- | --- |
| `/services` | `/` | `source-pages/beranda.html` |
| `/pricing` | `/cara-belajar` | `source-pages/cara-belajar.html` |
| `/about` | `/tentang` | `source-pages/tentang.html` |
| `/blog` | `/wawasan` | `source-pages/wawasan.html` |
| `/services/ai-strategy` | `/program/pemetaan-belajar` | `source-pages/program-pemetaan-belajar.html` |
| `/services/business-consulting` | `/program/pendampingan-personal` | `source-pages/program-pendampingan-personal.html` |
| `/services/data-insights` | `/program/pemantauan-perkembangan` | `source-pages/program-pemantauan-perkembangan.html` |
| `/smartboard` | `/smartboard` | `src/components/SmartboardPage.tsx` (517 baris) |
| `/kebijakan-privasi` | `/kebijakan-privasi` | `src/components/PrivacyPolicyPage.tsx` |
| `/ketentuan-layanan` | `/ketentuan-layanan` | `src/components/TermsOfServicePage.tsx` |

Redirect lama `/contact` → beranda: mati (keputusan terbuka #4).

## Struktur file target

```
projects/academic-smartboard/apps/site/
├── package.json                  @sentra/smartboard-site
├── next.config.ts                output: "export"
├── tsconfig.json                 extends packages/config/tsconfig/nextjs.json
├── postcss.config.mjs
├── vitest.config.ts
├── tests/build-output.test.mjs   assert out/ berisi semua route
├── public/images/                webp hasil optimasi (Task 10)
└── src/
    ├── app/
    │   ├── layout.tsx            font Geist + chrome
    │   ├── globals.css           import token css
    │   ├── page.tsx              beranda
    │   ├── cara-belajar/page.tsx
    │   ├── tentang/page.tsx
    │   ├── wawasan/page.tsx
    │   ├── program/[3 slug]/page.tsx
    │   ├── smartboard/page.tsx
    │   ├── kebijakan-privasi/page.tsx
    │   └── ketentuan-layanan/page.tsx
    ├── components/
    │   ├── SiteHeader.tsx  SiteFooter.tsx
    │   ├── Hero.tsx  SectionBlock.tsx
    │   ├── ProgramPage.tsx       template 3 halaman program
    │   └── PolicyPage.tsx        template 2 halaman legal
    └── content/
        ├── types.ts  index.ts  content.test.ts
        ├── beranda.ts  cara-belajar.ts  tentang.ts  wawasan.ts
        ├── program-pemetaan-belajar.ts
        ├── program-pendampingan-personal.ts
        ├── program-pemantauan-perkembangan.ts
        ├── smartboard.ts
        └── legal.ts              privasi + ketentuan
```

Branch: `feat/smartboard-site` (implementasi, Task 2–12) lalu `feat/smartboard-site-control` (kontrol, Task 13, SETELAH implementasi merged + pushed).

---

### Task 1: Prasyarat, commit plan, klaim task, worktree

**Files:**
- Commit: `docs/plans/active/2026-08-20-smartboard-site-port.md` (file ini) + baris di `docs/plans/active/README.md`

- [x] **Step 1: Verifikasi prasyarat push**

```bash
git fetch origin && git merge-base --is-ancestor cb1e5b7 origin/main && echo PRASYARAT-OK
```
Expected: `PRASYARAT-OK`. Kalau tidak: STOP — minta Chief push main dulu.

- [x] **Step 2: Cek lease aktif, klaim task** — jalankan dari tree utama `d:\DEV\Monorepo` (CLI mencap `worktree_id` saat klaim; semua transisi state berikutnya WAJIB dari tree yang sama)

```bash
pnpm task list --active
```
Hindari overlap dengan lease hidup (per 2026-08-20: `TASK-20260818-FAST-REHYDRATE` memegang `AGENTS.md`, `.cursor/`, `.agents/` — JANGAN klaim scope itu; sesuaikan kalau lease sudah berubah).

```bash
pnpm task claim --id TASK-20260820-SMARTBOARD-SITE \
  --title "Port landing arsip ke apps/site Next.js static export" \
  --owner-id agent:claude --owner-label "Claude Code" --risk R2 \
  --scope projects/academic-smartboard/ \
  --scope docs/plans/ \
  --scope turbo.json \
  --scope pnpm-lock.yaml \
  --scope packages/token/scope.txt \
  --state EXECUTING --yes
```
(R2: change set menyentuh `**/package.json` + `pnpm-lock.yaml` = sensitive paths, floor R2.)

- [x] **Step 3: Worktree**

```bash
git worktree add ../Monorepo.worktrees/feat-smartboard-site -b feat/smartboard-site
cd ../Monorepo.worktrees/feat-smartboard-site && pnpm install
```

- [x] **Step 4: Commit plan doc (commit pertama branch, SETELAH klaim — path `docs/plans/` kini punya owner)**

File plan + baris README masih uncommitted di tree utama `d:\DEV\Monorepo` — salin dulu ke worktree:

```bash
cp d:/DEV/Monorepo/docs/plans/active/2026-08-20-smartboard-site-port.md docs/plans/active/
cp d:/DEV/Monorepo/docs/plans/active/README.md docs/plans/active/README.md
git add docs/plans/active/2026-08-20-smartboard-site-port.md docs/plans/active/README.md
git commit -m "docs(plan): add smartboard site port plan"
```

Lalu buang salinan uncommitted di tree utama (`git checkout -- docs/plans/active/README.md` dan hapus file plan di sana) supaya gate ownership tree utama bersih.

### Task 2: Scaffold app + static export build hijau

**Files:**
- Create: `projects/academic-smartboard/apps/site/{package.json,next.config.ts,tsconfig.json,postcss.config.mjs}`
- Create: `projects/academic-smartboard/apps/site/src/app/{layout.tsx,page.tsx,globals.css}`
- Modify: `turbo.json` (outputs + `out/**`)

**Interfaces:**
- Produces: package `@sentra/smartboard-site`; perintah `pnpm --filter @sentra/smartboard-site build` menghasilkan `apps/site/out/`

- [x] **Step 1: package.json**

```json
{
  "name": "@sentra/smartboard-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -H 127.0.0.1 -p 3200",
    "build": "next build",
    "lint": "biome check src",
    "typecheck": "tsc --project tsconfig.json",
    "test": "vitest run",
    "test:build": "node --test tests/build-output.test.mjs"
  },
  "dependencies": {
    "@sentra/token": "workspace:*",
    "next": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "tailwindcss": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [x] **Step 2: next.config.ts**

```ts
import type { NextConfig } from "next";

// Sengaja TANPA import "@safrs/env/server": static export tidak punya env server
// (rasional sama dengan projects/control-center/apps/web/next.config.ts).
// TANPA cacheComponents: fitur server-side, salah untuk output "export".
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@sentra/token"],
  typedRoutes: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

- [x] **Step 3: tsconfig.json** — salin verbatim dari `projects/control-center/apps/web/tsconfig.json` (extends `packages/config/tsconfig/nextjs.json`; includes next-env.d.ts, `.next/types/**/*.ts`, `src/**/*.{ts,tsx}`).

- [x] **Step 4: postcss.config.mjs**

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

- [x] **Step 5: globals.css + layout.tsx + page.tsx minimal**

`src/app/globals.css`:
```css
@import "tailwindcss";
@import "@sentra/token/tokens.css";
@import "@sentra/token/tailwind.css";
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontMono, fontSans } from "@sentra/token/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "El-Kayyisa — Sentra Smartboard System", template: "%s | El-Kayyisa" },
  description: "Bimbingan belajar personal dan terarah",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` sementara:
```tsx
export default function Page() {
  return <main>El-Kayyisa</main>;
}
```

- [x] **Step 6: turbo.json** — di array `outputs` task `build`, tambah `"out/**"` setelah `"build/**"`. (Sensitive R2, BUKAN kontrol verifikasi — boleh satu branch dengan implementasi.)

- [x] **Step 7: Install + build**

```bash
pnpm install
pnpm --filter @sentra/smartboard-site typecheck
pnpm --filter @sentra/smartboard-site build
ls projects/academic-smartboard/apps/site/out/index.html
```
Expected: build exit 0, `out/index.html` ada.

- [x] **Step 8: Commit**

```bash
git add projects/academic-smartboard/apps/site turbo.json pnpm-lock.yaml
git commit -m "feat(site): scaffold apps/site next static export"
```

### Task 3: Infrastruktur konten (TDD)

**Files:**
- Create: `src/content/{types.ts,index.ts,content.test.ts}`, `vitest.config.ts`

**Interfaces:**
- Produces: `PageContent`, `ProgramContent`, `allPages: PageContent[]`, `NAV_ITEMS` — dipakai semua task halaman

- [x] **Step 1: Tulis test gagal** — `projects/academic-smartboard/apps/site/src/content/content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { allPages, NAV_ITEMS } from "./index.ts";

const routes = () => new Set(allPages.map((p) => (p.slug === "" ? "/" : `/${p.slug}`)));

describe("modul konten", () => {
  it("10 halaman, slug unik, field wajib terisi", () => {
    expect(allPages).toHaveLength(10);
    expect(new Set(allPages.map((p) => p.slug)).size).toBe(10);
    for (const p of allPages) {
      expect(p.title.length, p.slug).toBeGreaterThan(0);
      expect(p.description.length, p.slug).toBeGreaterThan(0);
      expect(p.hero.heading.length, p.slug).toBeGreaterThan(0);
    }
  });
  it("semua href internal (nav + cta) menunjuk route yang ada", () => {
    const known = routes();
    const hrefs = [
      ...NAV_ITEMS.map((n) => n.href),
      ...allPages.flatMap((p) => (p.hero.cta ? [p.hero.cta.href] : [])),
    ].filter((h) => h.startsWith("/"));
    for (const h of hrefs) expect(known.has(h), h).toBe(true);
  });
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
```

- [x] **Step 2: Jalankan, pastikan GAGAL** — `pnpm --filter @sentra/smartboard-site test` → FAIL (index.ts belum ada).

- [x] **Step 3: Implementasi minimal** — `projects/academic-smartboard/apps/site/src/content/types.ts`:

```ts
export type Cta = { label: string; href: string };
export type NavItem = { label: string; href: string };
export type Section = {
  id: string;
  heading: string;
  body: string[];
  bullets?: string[];
};
export type PageContent = {
  slug: string; // "" = beranda
  title: string;
  description: string;
  hero: { eyebrow?: string; heading: string; sub: string; cta?: Cta };
  sections: Section[];
};
export type ProgramContent = PageContent & {
  programName: string;
  benefits: string[];
  steps: { name: string; detail: string }[];
};
```

`src/content/index.ts` — mulai dengan 10 stub bertipe (slug + title + description + hero minimal, sections kosong; teks stub diganti verbatim per task berikutnya):

```ts
import type { NavItem, PageContent } from "./types.ts";

export const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Cara Belajar", href: "/cara-belajar" },
  { label: "Wawasan", href: "/wawasan" },
  { label: "Tentang", href: "/tentang" },
  { label: "Smartboard", href: "/smartboard" },
];

// 10 stub — teks diganti verbatim per Task 5-9. Contoh bentuk (beranda):
const beranda: PageContent = {
  slug: "",
  title: "El-Kayyisa | Bimbingan Belajar Personal dan Terarah",
  description: "Stub — diganti Task 5",
  hero: { heading: "Stub beranda", sub: "Stub — diganti Task 5" },
  sections: [],
};

// 9 entri lain (cara-belajar, tentang, wawasan, 3 program, smartboard,
// kebijakan-privasi, ketentuan-layanan) mengikuti bentuk sama, slug sesuai
// peta route, teks stub sementara.
export const allPages: PageContent[] = [beranda /* + 9 stub lain */];
```

- [x] **Step 4: Test hijau** — `pnpm --filter @sentra/smartboard-site test` → PASS.

- [x] **Step 5: Commit** — `git commit -m "feat(site): content module types and integrity tests"`

### Task 4: Chrome situs (header, footer, primitif section)

**Files:**
- Create: `src/components/{SiteHeader.tsx,SiteFooter.tsx,Hero.tsx,SectionBlock.tsx}`
- Modify: `src/app/layout.tsx` (pasang header/footer)

**Interfaces:**
- Consumes: `NAV_ITEMS` dari Task 3
- Produces: `<Hero content={page.hero} />`, `<SectionBlock section={s} />` — dipakai semua halaman

Aturan (referensi `01-design-system.html` + `02-patterns.html`):
- Semua warna via `var(--color-*)`; radius via token; font var Geist. NOL hex.
- Header: logo teks "El-Kayyisa" + nav `NAV_ITEMS`. Logo gambar lama (`logo.png` vendor) TIDAK disalin; identitas visual = teks + token (keputusan terbuka #1 kalau Chief mau logo).
- Footer: wordmark El-Kayyisa, pernyataan kolaborasi Sentra (teks verbatim dari `SiteChrome.tsx:104-123` arsip), copyright `© {tahun} El-Kayyisa`, link `/kebijakan-privasi` + `/ketentuan-layanan`. TANPA form newsletter (keputusan #8), TANPA link sosial vendor.
- Layout: max-width 1440, gutter `var(--page-gutter, 24px)` versi token, body ≤68ch di blok teks.

- [x] Step 1: Tulis komponen (ikuti struktur referensi; teks footer verbatim arsip).
- [x] Step 2: `pnpm --filter @sentra/smartboard-site lint && pnpm --filter @sentra/smartboard-site typecheck && pnpm --filter @sentra/smartboard-site build` → hijau.
- [x] Step 3: Grep bukti nol warna mentah: `grep -rnE "#[0-9a-fA-F]{3,8}\b" projects/academic-smartboard/apps/site/src` → kosong.
- [x] Step 4: Commit `feat(site): site chrome with token-based header and footer`.

### Task 5: Beranda

**Files:**
- Modify: `src/content/index.ts` (entri beranda penuh → `src/content/beranda.ts`), `src/app/page.tsx`

- [x] Step 1: Baca `D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/beranda.html`. Ekstrak VERBATIM: heading hero, subcopy, CTA, tiap section (heading + paragraf + bullet) ke `projects/academic-smartboard/apps/site/src/content/beranda.ts` sebagai `PageContent` (`slug: ""`). Abaikan markup vendor, footer scrape, form.
- [x] Step 2: `projects/academic-smartboard/apps/site/src/app/page.tsx` render `Hero` + map `SectionBlock`; export `metadata` dari `title`/`description` konten.
- [x] Step 3: `pnpm --filter @sentra/smartboard-site test && pnpm --filter @sentra/smartboard-site build` → hijau; buka `out/index.html`, cek heading hero muncul.
- [x] Step 4: Commit `feat(site): beranda page from extracted content`.
- [x] Step 5: **Checkpoint Chief** — screenshot/preview beranda = validasi kalibrasi komposisi landing (keputusan terbuka #2). Lanjut task berikut sambil menunggu; revisi komposisi masuk sebagai perubahan terisolasi.

### Task 6: Template program + 3 halaman program

**Files:**
- Create: `src/components/ProgramPage.tsx`, `src/content/program-{pemetaan-belajar,pendampingan-personal,pemantauan-perkembangan}.ts`, `src/app/program/{pemetaan-belajar,pendampingan-personal,pemantauan-perkembangan}/page.tsx`

**Interfaces:**
- Consumes: `ProgramContent`, `Hero`, `SectionBlock`
- Produces: `<ProgramPage content={ProgramContent} />`

- [x] Step 1: `projects/academic-smartboard/apps/site/src/components/ProgramPage.tsx` — hero + daftar `benefits` (list token-styled) + `steps` (urutan bernomor) + sections. Satu komponen, tiga halaman datanya.
- [x] Step 2: Ekstrak verbatim tiap `source-pages/program-*.html` ke modul `ProgramContent` masing-masing. Testimoni placeholder ("Testimoni menunggu persetujuan") TIDAK di-port — bagian testimoni dihilangkan sampai ada testimoni riil disetujui.
- [x] Step 3: 3 file page.tsx tipis: import konten, render `ProgramPage`, export `metadata`.
- [x] Step 4: `test` + `build` hijau (test link-integrity kini memvalidasi CTA program).
- [x] Step 5: Commit `feat(site): three program pages via shared template`.

### Task 7: Cara Belajar, Tentang, Wawasan

**Files:**
- Create: `src/content/{cara-belajar,tentang,wawasan}.ts`, `src/app/{cara-belajar,tentang,wawasan}/page.tsx`

- [x] Step 1: Ekstrak verbatim `cara-belajar.html`, `tentang.html`, `wawasan.html` → `PageContent`. Halaman wawasan: daftar artikel jadi `sections` (satu section per artikel: judul + ringkasan); gambar artikel menunggu Task 10.
- [x] Step 2: 3 page.tsx render `Hero` + `SectionBlock`.
- [x] Step 3: `test` + `build` hijau.
- [x] Step 4: Commit `feat(site): cara-belajar, tentang, wawasan pages`.

### Task 8: Halaman Smartboard (flagship)

**Files:**
- Create: `src/content/smartboard.ts`, `src/app/smartboard/page.tsx`, (opsional) `src/components/SmartboardShowcase.tsx`

- [x] Step 1: Baca landing/src/components/SmartboardPage.tsx (517 baris) di arsip. Ekstrak seluruh copy (Sentra AI, Sentra Smartboard System, Sentra Artificial Intelligence) ke `projects/academic-smartboard/apps/site/src/content/smartboard.ts`.
- [x] Step 2: Port visual TANPA framer-motion/gsap: transisi CSS + `@media (prefers-reduced-motion)` saja. Interpolasi warna JS dari palette.ts arsip TIDAK di-port (hex mentah, kalah lawan token gate). Grafik SVG inline boleh, warna via `var(--color-data-1..3)` (maks 4 seri, UI-RULES).
- [x] Step 3: `test` + `build` + grep hex kosong.
- [x] Step 4: Commit `feat(site): smartboard flagship page, css-only motion`.

### Task 9: Halaman legal

**Files:**
- Create: `src/components/PolicyPage.tsx`, `src/content/legal.ts`, `src/app/{kebijakan-privasi,ketentuan-layanan}/page.tsx`

- [x] Step 1: Ekstrak verbatim PrivacyPolicyPage.tsx (126 baris) + TermsOfServicePage.tsx (142 baris) arsip → `projects/academic-smartboard/apps/site/src/content/legal.ts` (dua `PageContent`).
- [x] Step 2: **Audit isi privasi vs realita:** sumber menyebut pengumpulan newsletter yang tidak pernah terjadi; form tidak di-port (keputusan #8), jadi hapus klausul pengumpulan email newsletter kalau ada — catat penghapusan di pesan commit untuk review Chief.
- [x] Step 3: `PolicyPage` = layout prosa ≤68ch. `test` + `build` hijau.
- [x] Step 4: Commit `feat(site): privacy and terms pages`.

### Task 10: Aset gambar

**Files:**
- Create: `public/images/*.webp` (hasil optimasi)
- Modify: modul konten yang mereferensi gambar

- [x] Step 1: Inventaris gambar yang benar-benar direferensi halaman baru (subset `public/source-assets/images/elkayyisa/**` arsip). **KECUALIKAN `tutor-profile.png` + `mentor-berhijab.png`** (keputusan terbuka #3) — posisinya placeholder token-styled (blok `var(--color-surface-*)` + label).
- [x] Step 2: Konversi di scratchpad (bukan repo): script sharp/squoosh sekali-pakai, target webp ≤200KB per file lebar maks 1600px. Output ke `public/images/`.
- [x] Step 3: **Hapus script + file kerja scratchpad, verifikasi kosong** (`ls` direktori scratch). Perintah hapus gagal = task belum selesai.
- [x] Step 4: Total `public/` baru < 3MB: `du -sh projects/academic-smartboard/apps/site/public`.
- [x] Step 5: `build` hijau; commit `feat(site): optimized webp assets, licensed-photo placeholders`.

### Task 11: Test output build + audit token

**Files:**
- Create: `tests/build-output.test.mjs`

- [x] Step 1: Tulis test:

```js
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROUTES = [
  "", "cara-belajar", "tentang", "wawasan",
  "program/pemetaan-belajar", "program/pendampingan-personal",
  "program/pemantauan-perkembangan", "smartboard",
  "kebijakan-privasi", "ketentuan-layanan",
];
for (const route of ROUTES) {
  test(`route /${route} diekspor`, () => {
    assert.ok(existsSync(join(out, route, "index.html")), `hilang: ${route}/index.html`);
  });
}
test("tidak ada referensi vendor aeline/temlis di output", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const walk = (d) => readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const offenders = walk(out)
    .filter((f) => /\.(html|js|css|txt)$/.test(f))
    .filter((f) => /temlis|aeline/i.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});
```

- [x] Step 2: Hapus `out/`, jalankan `pnpm --filter @sentra/smartboard-site build && pnpm --filter @sentra/smartboard-site test:build` → 11 test PASS. (Verifikasi merah: rename sementara satu folder route, test harus FAIL, kembalikan.)
- [x] Step 3: Audit token pra-scope: `node scripts/check-tokens.mjs --audit` → nol pelanggaran pada path `projects/academic-smartboard/apps/site`.
- [x] Step 4: Commit `test(site): build output and vendor-reference guards`.

### Task 12: Dokumen capsule + verifikasi penuh + merge implementasi

**Files:**
- Modify: `projects/academic-smartboard/{README.md,docs/architecture.md,docs/data.md,docs/testing.md}` (tambah baris/section apps/site; JANGAN sentuh AGENTS.md — itu Task 13)
- Modify: `docs/plans/active/2026-08-20-smartboard-site-port.md` (centang task; catatan eksekusi)

- [x] Step 1: Update 4 dokumen capsule: arsitektur app site (static export, tanpa server), data (konten publik, nol data pribadi, 2 foto dikecualikan), testing (vitest + test:build).
- [x] Step 2: Verifikasi penuh di worktree: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` lalu `bash scripts/safrs-verify.sh`. Semua PASS — tunjukkan output.
- [x] Step 3: Commit `docs(smartboard): document apps/site in capsule docs`.
- [x] Step 4: Review Chief (R2 designated review) atas branch `feat/smartboard-site`; merge no-ff ke main; `bash scripts/safrs-verify.sh` di main.
- [x] Step 5: **Chief push main.** Blocking untuk Task 13 — tanpa push, branch kontrol berikutnya menyatu dengan implementasi dalam satu change set vs origin/main dan gate coupling menolak.

### Task 13: Branch kontrol (AGENTS.md + scope token)

**Files (SEMUA kontrol verifikasi — change set ini tidak boleh berisi implementasi):**
- Modify: `projects/academic-smartboard/AGENTS.md` (baris 30-33: ganti `not applicable: governance capsule only` → perintah riil)
- Create: `projects/academic-smartboard/apps/site/AGENTS.md`
- Modify: `packages/token/scope.txt` (+ `projects/academic-smartboard/apps/site/src`)

- [ ] Step 1: Prasyarat: `git merge-base --is-ancestor <sha-merge-task12> origin/main` → OK.
- [ ] Step 2: Branch `feat/smartboard-site-control` dari main. Edit capsule AGENTS.md — perintah:

```
- Lint: `pnpm --filter @sentra/smartboard-site lint`
- Typecheck: `pnpm --filter @sentra/smartboard-site typecheck`
- Test: `pnpm --filter @sentra/smartboard-site test`
- Build: `pnpm --filter @sentra/smartboard-site build` (static export ke `apps/site/out/`)
```

- [ ] Step 3: `apps/site/AGENTS.md` baru:

```markdown
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
```

- [ ] Step 4: Tambah baris `projects/academic-smartboard/apps/site/src` ke `packages/token/scope.txt`.
- [ ] Step 5: `node scripts/check-tokens.mjs` (mode penuh, site kini dalam scope) → PASS. `bash scripts/safrs-verify.sh` → PASS (change set kontrol-saja, tanpa coupling).
- [ ] Step 6: Commit `chore(safrs): enroll apps/site in token gate and agent contracts`; review Chief; merge no-ff; push (Chief).

### Task 14: Tutup lifecycle

- [ ] Step 1: `pnpm task state --id TASK-20260820-SMARTBOARD-SITE --to VERIFYING --yes` lalu `--to REVIEW --yes` lalu `--to MERGED --yes` lalu `--to CLOSED --yes` — **dari tree utama `d:\DEV\Monorepo`** (worktree pengklaim = tree utama, lihat Task 1 Step 2; CLI menolak transisi dari worktree lain). Jalankan bertahap sesuai fase riil, jangan borong di akhir.
- [ ] Step 2: `git mv docs/plans/active/2026-08-20-smartboard-site-port.md docs/plans/completed/`; status header → COMPLETED; hapus baris dari `docs/plans/active/README.md`; update `.agents/PROGRESS.md` + `.agents/HANDOFF.md` (fase site selesai; berikutnya plan web) — **satu commit** dengan penutupan (aturan close-the-loop).
- [ ] Step 3: Hapus worktree: `git worktree remove ../Monorepo.worktrees/feat-smartboard-site` (kalau "Filename too long": `rm -rf` + `git worktree prune`). Hapus branch. Verifikasi scratchpad kosong.
- [ ] Step 4: Lapor Chief: commit list, output verifikasi, keputusan terbuka yang masih menggantung (deploy target, foto, brand token).

## Verifikasi akhir (bukti wajib sebelum klaim selesai)

```bash
pnpm --filter @sentra/smartboard-site test        # unit konten PASS
pnpm --filter @sentra/smartboard-site build       # export 10 route
pnpm --filter @sentra/smartboard-site test:build  # 11 assert output PASS
node scripts/check-tokens.mjs                     # site dalam scope, PASS
bash scripts/safrs-verify.sh                      # SAFRS PASS
pnpm check                                        # gate penuh root
```

Catatan: `pnpm check` butuh tree utama bersih dari kerja asing uncommitted (per 2026-08-20 ada penghapusan `.cline/**` + `.kilo/` tanpa owner task — gagal ownership bukan karena plan ini).
