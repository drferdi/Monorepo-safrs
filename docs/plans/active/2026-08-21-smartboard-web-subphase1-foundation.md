# Smartboard `apps/web` Sub-fase 1: Fondasi (scaffold, auth, shell, vertical proof) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- **Status:** ACTIVE — Chief approve eksekusi via `/superpowers:subagent-driven-development` 2026-08-21
- **Owner:** Chief
- **Roadmap:** `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (baris 1/5)

**Goal:** Port fondasi `apps/web` (aplikasi smartboard utama) dari `frontend/` arsip (CRA + craco, 151 file, ~23,6k baris) ke `projects/academic-smartboard/apps/web` — Next.js 16 static export, patuh token Sentra, lolos gate SAFRS — sampai satu alur vertikal utuh jalan: login → shell ber-navigasi role-aware → satu halaman data nyata (Master › Murid) yang benar-benar memanggil backend FastAPI arsip.

**Architecture:** Rewrite arsitektur routing (react-router-dom 7 → Next.js App Router file-based), TAPI pola auth/tenancy DIPORT APA ADANYA secara perilaku dari arsip: client-side, cookie `session_token` httpOnly, `withCredentials`, proteksi route di komponen client (bukan middleware/server) — karena arsip sendiri adalah SPA murni tanpa server. Ini artinya `apps/web`, seperti `apps/site`, tetap `output: "export"` (statis, tanpa server Next.js); yang membedakan dari `site` hanyalah `apps/web` memanggil API eksternal saat runtime di browser. Backend selama sub-fase ini TETAP di arsip (FastAPI, dijalankan manual di luar monorepo untuk dev) — `apps/api` belum ada (fase terpisah, lihat roadmap keputusan #1). Template scaffold Next.js terdekat: `projects/academic-smartboard/apps/site` (sama-sama static export + `@sentra/token`).

**Tech Stack:** Next.js 16.3.0 (`output: "export"`), React 19.2.8, TypeScript, Tailwind 4, `@sentra/token`, Vitest, `@tanstack/react-query` 5.56.2, `axios` 1.18.0, `react-hook-form` 7.56.2 + `@hookform/resolvers` 5.0.1 + `zod` (versi catalog 4.4.3 — LIHAT Keputusan terbuka #2), `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.2.0, `lucide-react` 0.516.0, `dayjs` 1.11.13, `@radix-ui/react-slot` 1.2.0, `@radix-ui/react-label` 2.1.4, `@radix-ui/react-dropdown-menu` 2.1.12 — semua via `catalog:` (versi persis dari audit `frontend/package.json` arsip 2026-08-21, KECUALI zod).

**Spec:** `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md` (D2, D4, D5 — struktur target baris 27: "`apps/web/` Next.js 16 + catalog: ← port dari `frontend/`") + `docs/adrs/0003-smartboard-migration.md` (urutan site → web → api → demo) + `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (keputusan lintas sub-fase 1-6).

**Sumber:** `D:/Devops/abyss-monorepo/apps/academic/smartboard/frontend/` (read-only; snapshot whitelist, tanpa graft riwayat git). Referensi backend (read-only, TIDAK di-port sub-fase ini): `.../backend/auth.py`, `.../backend/routes_master.py`, `.../backend/models.py`.

## Catatan eksekusi (2026-08-21)

- Task 1–9 dieksekusi via subagent-driven-development (implementer + task reviewer per task); Task 1 (klaim + worktree + commit plan) dieksekusi controller inline, pola sama seperti plan `apps/site`.
- Task 4: 1 fix round — varian `size="sm"` tombol awalnya `min-h-[var(--space-6)]` (32px), melanggar `packages/token/UI-RULES.md` (44px minimum target, build condition). Diperbaiki ke `var(--target-min)`.
- Task 6: 2 ruling controller — bump katalog `@hookform/resolvers` 5.0.1→5.9.1 (zod v4 di catalog butuh `.issues` bukan `.errors`, konsumen tunggal diverifikasi); sentuhan `vitest.config.ts` (fix `oxc.jsx.runtime`, konsisten dengan 3 app lain) diratifikasi eksplisit.
- Task 9: ruling controller — finding "urutan import beda dari brief" ditolak; itu hasil auto-sort biome pre-commit hook, bukan pilihan implementer (preseden sama di Task 3).
- Di antara Task 7 dan Task 8: ditemukan bug drive-letter case di `.claude/hooks/guard-sensitive-paths.mjs` yang menolak Write/Edit sah di git worktree manapun di mesin ini (dikonfirmasi 3 subagent independen). Diperbaiki + di-merge ke main terpisah (commit `3272ed3`, `87e61cf` di branch `fix/guard-hook-worktree-case`, TASK-20260821-GUARD-HOOK-WORKTREE-CASE-FIX) sebelum Task 8 lanjut. Root cause: `git rev-parse --git-common-dir` asimetris (relatif dari toplevel repo, absolut-canonical dari worktree tertaut) — lihat commit `87e61cf` untuk detail lengkap.
- Task 10: `pnpm-workspace.yaml`/`turbo.json` Task 3 menambah 2 env var baru, membuat `tests/repository/operator-commands.test.mjs` gagal (assert array env lama) — diperbaiki via task terpisah TASK-20260821-SMARTBOARD-WEB-TURBOENV-TEST-FIX (commit `eb1c641`, branch sama). Sitasi checkbox Task 3–8 (nama file bare/app-relative, mis. `` `nav.ts` ``) gagal `check_status_claims.py` (path harus repo-root-relative) — diperbaiki ke path penuh; checkbox Task 1–9 dicentang sekaligus di Task 10 (belum dicentang progresif per-commit — catatan proses untuk sub-fase berikutnya: centang box di commit yang sama dengan task-nya, bukan ditunda).

## Prasyarat (blocking — jangan mulai sebelum terpenuhi)

1. Roadmap dan plan ini disetujui Chief (status ACTIVE).
2. `pnpm task list --active` bersih dari overlap scope `projects/academic-smartboard/`. Verifikasi ulang di Task 1 — per audit 2026-08-21 tidak ada lease di scope ini (lease aktif lain: `TASK-20260821-SENTRABOT-*` dan seri `TASK-20260820-KILO-*`/`REMOVE-CLINE*`, semua di luar `projects/academic-smartboard/`).
3. Tree kerja bersih dari pekerjaan asing yang menabrak scope plan.
4. Backend arsip TIDAK perlu jalan untuk Task 1–7 (build-time only). Baru dibutuhkan (dijalankan manual, di luar monorepo) untuk verifikasi manual Task 8 (Chief menjalankan `uvicorn` dari `D:\Devops\abyss-monorepo\...\backend` sendiri, di luar scope plan ini — bukan tugas agent).

## Global Constraints

- Semua versi dependensi baru via `catalog:` (`pnpm-workspace.yaml`) — Task 2 menambah entri persis seperti tabel Tech Stack di atas, TANPA menambah `react-router-dom`, `swr`, `date-fns`, `framer-motion`, `react-scripts`, `craco`, `cra-template` (lihat roadmap keputusan #4 — redundan/tidak cocok stack target).
- Warna/radius HANYA `var(--color-*)`, `var(--radius-structure|--radius-control)` dari `@sentra/token` — nol hex mentah (gate `scripts/check-tokens.mjs`). Komponen shadcn-style (Button, Label, dst.) ditulis ulang memakai token, BUKAN disalin dari `frontend/src/components/ui/*` (yang pakai Tailwind config classes arsip, bukan token Sentra).
- Karantina permanen (TIDAK PERNAH disalin/dibaca isinya): `raw_data/**` (di level `smartboard/`, di luar `frontend/`), semua `.env*` termasuk `frontend/.env`, `backend/scripts/cloud_tokens.env` (nama file TIDAK cocok glob `.env*` — grep eksplisit), `node_modules/`, `build/`, `.eslintcache`.
- Auth: `session_token` adalah cookie httpOnly yang di-set BACKEND (`Set-Cookie` dari `POST /api/auth/login`) — frontend TIDAK PERNAH membaca/menyimpan token secara eksplisit (tidak ada `localStorage.setItem`, tidak ada header `Authorization` manual untuk sub-fase ini). Endpoint yang dipakai: `POST /api/auth/login` (`{email, password}` → set cookie + `{user, session_token}`), `GET /api/auth/me` (→ `{user}` atau 401), `POST /api/auth/logout`.
- `axios` instance WAJIB `withCredentials: true` (port `frontend/src/lib/api.js:1-11` apa adanya secara perilaku) — tanpa ini cookie cross-origin tidak terkirim.
- Base URL backend dari `process.env.NEXT_PUBLIC_BACKEND_URL` (build-time, public — setara `REACT_APP_BACKEND_URL` arsip). WAJIB didaftarkan di `turbo.json` array `env` task `build`/`dev` (Task 3) supaya cache key benar.
- File kontrol verifikasi (`projects/academic-smartboard/AGENTS.md`, `packages/token/scope.txt`, `.github/workflows/**`) TIDAK boleh satu change set dengan implementasi — branch kontrol terpisah (Task 11), SETELAH implementasi merged + pushed.
- Kerja di worktree `../Monorepo.worktrees/<branch>`; commit Conventional Commits; `bash scripts/safrs-verify.sh` sebelum klaim selesai.
- Bahasa UI: Indonesia, label/copy dari arsip (login form, nav, kolom tabel) diambil verbatim dari `frontend/src/pages/**` — jangan tulis ulang copy tanpa arahan Chief.
- Role yang ADA di sistem (dari `auth.py`/`App.js`, verbatim): `owner`, `admin_akademik`, `tentor`, `murid_ortu`, `finance`, `content_manager`, plus `platform_admin` (boundary terpisah, `is_platform_admin_user`). Sub-fase 1 mengimplementasikan mekanisme role-gating generik + hanya menerapkannya ke 1 halaman data (Master › Murid); halaman lain menyusul sub-fase 2-5.

## Keputusan terbuka (milik Chief — default plan berjalan tanpa memblokir)

| # | Keputusan | Default plan ini |
| --- | --- | --- |
| 1 | `apps/web` server-rendered (butuh `@safrs/env/server`, cookie forwarding server-side) vs static export client-only (setara arsitektur arsip) | Static export client-only (Architecture di atas) — arsip sendiri SPA murni, tidak ada alasan menambah kompleksitas server sebelum ada kebutuhan nyata (SSR/SEO tidak relevan untuk app internal berlogin) |
| 2 | Validasi `react-hook-form` arsip pakai `zod` 3.24.4; catalog monorepo sudah punya `zod` 4.4.3 (breaking changes v3→v4: `.error` API, `z.string().email()` dipindah ke `z.email()`, dll.) | Pakai `zod` 4.4.3 dari catalog (jangan tambah entri v3 kedua); skema validasi Task 6 ditulis native v4, bukan salin-tempel v3 arsip |
| 3 | Backend dev selama sub-fase 1 — siapa yang menjalankan FastAPI arsip untuk verifikasi manual E2E | Di luar scope agent; Task 8 verifikasi manual didelegasikan ke Chief (agent hanya menyiapkan instruksi `README` singkat di pesan commit, bukan menjalankan backend) |
| 4 | Nama tenant/subdomain dev (`X-Tenant-Slug` header, `tenancy.py:62-90` dev-only) — apakah `apps/web` butuh UI pemilih tenant di sub-fase 1 | TIDAK — tenant di dev diasumsikan default tunggal via env `NEXT_PUBLIC_DEV_TENANT_SLUG` opsional (dibaca `lib/api.ts`, dikirim sebagai header HANYA kalau env di-set); UI tenant-switcher menyusul kalau Chief minta |
| 5 | Testing komponen React (perlu `@testing-library/react` + `jsdom` — belum ada preseden di monorepo, catalog baru) | SKIP untuk sub-fase 1 — test dibatasi unit murni (logic tanpa render DOM: `lib/api.ts`, `lib/auth.ts` reducer, `lib/nav.ts` filter role, util `cn()`) + build-output existence test (pola sama seperti `apps/site`); rendering di-cover manual (Task 8) dan dev server. Kalau Chief mau RTL, itu keputusan cross-cutting terpisah (semua app), bukan satu-off sub-fase ini |

## Peta halaman sub-fase 1 (dari 37 total arsip)

| Arsip | Route baru | Sumber |
| --- | --- | --- |
| `Login.jsx` | `/login` | `frontend/src/pages/Login.jsx` |
| (shell, bukan halaman tersendiri) | layout semua route terproteksi | `frontend/src/components/**Layout**`, `frontend/src/App.js:48-348` (struktur `ProtectedRoute` + nav) |
| `master/Murid.jsx` (atau nama setara — verifikasi nama file persis di Task 8 Step 1) | `/master/murid` | `frontend/src/pages/master/` |

`TutorActivation.jsx`, `OwnerActivation.jsx` (2 halaman aktivasi) DITUNDA ke sub-fase 4 (grup admin/onboarding) — bukan jalur kritis vertical-proof; dicatat di roadmap kalau ternyata lebih pas gabung sub-fase 1, itu perubahan kecil terisolasi.

## Struktur file target

```
projects/academic-smartboard/apps/web/
├── package.json                  @sentra/smartboard-web
├── next.config.ts                output: "export"
├── tsconfig.json                 extends packages/config/tsconfig/nextjs.json
├── postcss.config.mjs
├── vitest.config.ts
├── tests/build-output.test.mjs   assert out/ berisi route sub-fase 1
└── src/
    ├── app/
    │   ├── layout.tsx            font Geist, QueryClientProvider, AuthProvider
    │   ├── globals.css
    │   ├── page.tsx              redirect "/" -> "/login" atau "/master/murid" (client, tergantung auth)
    │   ├── login/page.tsx
    │   └── master/murid/page.tsx
    ├── components/
    │   ├── ui/{button.tsx,label.tsx,input.tsx}   primitif token-based
    │   ├── ProtectedRoute.tsx
    │   ├── AppShell.tsx           sidebar nav role-aware + header (dropdown user + logout)
    │   └── DataTable.tsx          tabel generik minimal (dipakai Master Murid, dipakai ulang sub-fase 2-5)
    └── lib/
        ├── api.ts                axios instance + typed request helpers
        ├── api.test.ts
        ├── auth.tsx               AuthProvider, useAuth()
        ├── auth.test.ts
        ├── nav.ts                 NAV_ITEMS + filterByRole()
        ├── nav.test.ts
        ├── cn.ts
        └── cn.test.ts
```

Branch: `feat/smartboard-web-foundation` (Task 2–10) lalu `feat/smartboard-web-foundation-control` (Task 11, SETELAH implementasi merged + pushed).

---

### Task 1: Prasyarat, commit plan, klaim task, worktree

**Files:**
- Commit: `docs/plans/active/2026-08-21-smartboard-web-roadmap.md`, `docs/plans/active/2026-08-21-smartboard-web-subphase1-foundation.md`, baris di `docs/plans/active/README.md`

- [x] **Step 1: Cek lease aktif, klaim task** — jalankan dari tree utama `d:\DEV\Monorepo` (CLI mencap `worktree_id` saat klaim; semua transisi state berikutnya WAJIB dari tree yang sama)

```bash
pnpm task list --active
```
Pastikan tidak ada lease baru yang menabrak `projects/academic-smartboard/` sejak audit 2026-08-21 di atas.

```bash
pnpm task claim --id TASK-20260821-SMARTBOARD-WEB-FOUNDATION \
  --title "Port fondasi apps/web: scaffold, auth, shell, Master Murid" \
  --owner-id agent:claude --owner-label "Claude Code" --risk R2 \
  --scope projects/academic-smartboard/ \
  --scope docs/plans/ \
  --scope turbo.json \
  --scope pnpm-lock.yaml \
  --scope pnpm-workspace.yaml \
  --state EXECUTING --yes
```
(R2: menyentuh `pnpm-workspace.yaml` (katalog baru) + `**/package.json` + `pnpm-lock.yaml` = sensitive paths, floor R2.)

- [x] **Step 2: Worktree**

```bash
git worktree add ../Monorepo.worktrees/feat-smartboard-web-foundation -b feat/smartboard-web-foundation
cd ../Monorepo.worktrees/feat-smartboard-web-foundation && pnpm install
```

- [x] **Step 3: Commit plan doc** (salin dari tree utama, commit pertama branch)

```bash
cp d:/DEV/Monorepo/docs/plans/active/2026-08-21-smartboard-web-roadmap.md docs/plans/active/
cp d:/DEV/Monorepo/docs/plans/active/2026-08-21-smartboard-web-subphase1-foundation.md docs/plans/active/
git add docs/plans/active/2026-08-21-smartboard-web-roadmap.md docs/plans/active/2026-08-21-smartboard-web-subphase1-foundation.md
git commit -m "docs(plan): add smartboard web foundation sub-phase plan"
```

Buang salinan uncommitted di tree utama setelahnya (gate ownership tree utama bersih).

### Task 2: Catalog entries

**Files:**
- Modify: `pnpm-workspace.yaml`

- [x] **Step 1**: Tambah ke blok `catalog:` (urut alfabetis mengikuti gaya file, versi PERSIS sesuai audit arsip di atas):

```yaml
  "@hookform/resolvers": 5.0.1
  "@radix-ui/react-dropdown-menu": 2.1.12
  "@radix-ui/react-label": 2.1.4
  "@radix-ui/react-slot": 1.2.0
  "@tanstack/react-query": 5.56.2
  axios: 1.18.0
  class-variance-authority: 0.7.1
  clsx: 2.1.1
  dayjs: 1.11.13
  lucide-react: 0.516.0
  react-hook-form: 7.56.2
  tailwind-merge: 3.2.0
```

(`zod` SUDAH ada di catalog di `4.4.3` — TIDAK ditambah ulang, lihat Keputusan terbuka #2.)

- [x] **Step 2**: `pnpm install` dari root — verifikasi `pnpm-lock.yaml` update tanpa error, tidak ada workspace lain terpengaruh (belum ada consumer, jadi lockfile diff harus HANYA metadata catalog).
- [x] **Step 3**: Commit

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(catalog): add smartboard web foundation dependencies"
```

### Task 3: Scaffold app + static export build hijau

**Files:**
- Create: `projects/academic-smartboard/apps/web/{package.json,next.config.ts,tsconfig.json,postcss.config.mjs}`
- Create: `projects/academic-smartboard/apps/web/src/app/{layout.tsx,page.tsx,globals.css}`
- Modify: `turbo.json` (tambah `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_DEV_TENANT_SLUG` ke array `env` task `build` dan `dev`)

**Interfaces:**
- Produces: package `@sentra/smartboard-web`; `pnpm --filter @sentra/smartboard-web build` menghasilkan `apps/web/out/`

- [x] **Step 1: package.json**

```json
{
  "name": "@sentra/smartboard-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -H 127.0.0.1 -p 3201",
    "build": "next build",
    "lint": "biome check src",
    "typecheck": "tsc --project tsconfig.json",
    "test": "vitest run",
    "test:build": "node --test tests/build-output.test.mjs"
  },
  "dependencies": {
    "@hookform/resolvers": "catalog:",
    "@radix-ui/react-dropdown-menu": "catalog:",
    "@radix-ui/react-label": "catalog:",
    "@radix-ui/react-slot": "catalog:",
    "@sentra/token": "workspace:*",
    "@tanstack/react-query": "catalog:",
    "axios": "catalog:",
    "class-variance-authority": "catalog:",
    "clsx": "catalog:",
    "dayjs": "catalog:",
    "lucide-react": "catalog:",
    "next": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "react-hook-form": "catalog:",
    "tailwind-merge": "catalog:",
    "zod": "catalog:"
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

// Sengaja TANPA import "@safrs/env/server": static export tidak punya env
// server (Keputusan terbuka #1 — arsip adalah SPA client-only, apps/web
// mengikuti pola sama seperti apps/site).
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@sentra/token"],
  typedRoutes: true,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

- [x] **Step 3: tsconfig.json** — identik `projects/academic-smartboard/apps/site/tsconfig.json` (extends `packages/config/tsconfig/nextjs.json`).
- [x] **Step 4: postcss.config.mjs** — identik `apps/site`.
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
  title: { default: "Sentra Smartboard", template: "%s | Sentra Smartboard" },
  description: "Platform bimbingan belajar multi-tenant El-Kayyisa",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` sementara (diganti Task 7 dengan redirect berbasis auth):
```tsx
export default function Page() {
  return <main>Sentra Smartboard</main>;
}
```

- [x] **Step 6: turbo.json** — di array `env` task `build` dan `dev`, tambah `"NEXT_PUBLIC_BACKEND_URL"` dan `"NEXT_PUBLIC_DEV_TENANT_SLUG"` setelah `"APP_URL"`.
- [x] **Step 7: Install + build**

```bash
pnpm install
pnpm --filter @sentra/smartboard-web typecheck
pnpm --filter @sentra/smartboard-web build
ls projects/academic-smartboard/apps/web/out/index.html
```
Expected: exit 0, `out/index.html` ada.

- [x] **Step 8: Commit**

```bash
git add projects/academic-smartboard/apps/web turbo.json pnpm-lock.yaml
git commit -m "feat(web): scaffold apps/web next static export"
```

### Task 4: Primitif UI token-based (TDD util `cn`)

**Files:**
- Create: `src/lib/{cn.ts,cn.test.ts}`, `src/components/ui/{button.tsx,label.tsx,input.tsx}`

**Interfaces:**
- Produces: `cn(...classes)`, `<Button variant="default"|"outline"|"ghost" size="default"|"sm">`, `<Label>`, `<Input>` — dipakai semua task berikutnya

- [x] **Step 1: Test gagal** — `projects/academic-smartboard/apps/web/src/lib/cn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("menggabung class dan buang duplikat tailwind", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
  it("mengabaikan value falsy", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
```

- [x] **Step 2**: `pnpm --filter @sentra/smartboard-web test` → FAIL (`cn` belum ada).
- [x] **Step 3: Implementasi**

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [x] **Step 4**: Test PASS.
- [x] **Step 5**: `projects/academic-smartboard/apps/web/src/components/ui/button.tsx` (varian via `class-variance-authority`, warna via token semantik `var(--color-*)` — bukan Tailwind palette default), `projects/academic-smartboard/apps/web/src/components/ui/label.tsx` (bungkus `@radix-ui/react-label`), `projects/academic-smartboard/apps/web/src/components/ui/input.tsx` (native `<input>` + kelas token border/radius). Semua tanpa hex mentah.
- [x] **Step 6**: `pnpm --filter @sentra/smartboard-web lint && pnpm --filter @sentra/smartboard-web typecheck && pnpm --filter @sentra/smartboard-web build` → hijau. Grep bukti nol hex: `grep -rnE "#[0-9a-fA-F]{3,8}\b" projects/academic-smartboard/apps/web/src` → kosong.
- [x] **Step 7**: Commit `feat(web): token-based ui primitives (button, label, input)`.

### Task 5: API client (TDD)

**Files:**
- Create: `src/lib/{api.ts,api.test.ts}`

**Interfaces:**
- Produces: `apiClient` (axios instance), `type User = { user_id, tenant_id, email, name, role, tutor_id, student_ids, parent_id, active }`, `login(email, password): Promise<{user: User}>`, `getMe(): Promise<User>`, `logout(): Promise<void>`

- [x] **Step 1: Test gagal** — `projects/academic-smartboard/apps/web/src/lib/api.test.ts` (unit murni, mock axios, tanpa network/DOM):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { getMe, login, logout } from "./api";

vi.mock("axios", () => {
  const instance = { get: vi.fn(), post: vi.fn(), defaults: {} };
  return { default: { create: vi.fn(() => instance) } };
});

const mockedInstance = (axios.create as unknown as () => {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
}) ();

describe("api client", () => {
  beforeEach(() => {
    mockedInstance.get.mockReset();
    mockedInstance.post.mockReset();
  });

  it("login mengirim POST /auth/login dan mengembalikan user", async () => {
    mockedInstance.post.mockResolvedValueOnce({ data: { user: { user_id: "u1", role: "owner" } } });
    const result = await login("a@b.com", "secret");
    expect(mockedInstance.post).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "secret" });
    expect(result.user.role).toBe("owner");
  });

  it("getMe mengirim GET /auth/me", async () => {
    mockedInstance.get.mockResolvedValueOnce({ data: { user: { user_id: "u1", role: "tentor" } } });
    const user = await getMe();
    expect(mockedInstance.get).toHaveBeenCalledWith("/auth/me");
    expect(user.role).toBe("tentor");
  });

  it("logout mengirim POST /auth/logout", async () => {
    mockedInstance.post.mockResolvedValueOnce({ data: {} });
    await logout();
    expect(mockedInstance.post).toHaveBeenCalledWith("/auth/logout");
  });
});
```

- [x] **Step 2**: `pnpm --filter @sentra/smartboard-web test` → FAIL (modul api belum ada).
- [x] **Step 3: Implementasi** — `projects/academic-smartboard/apps/web/src/lib/api.ts`:

```ts
import axios from "axios";

export type User = {
  user_id: string;
  tenant_id: string | null;
  email: string;
  name: string;
  role: "owner" | "admin_akademik" | "tentor" | "murid_ortu" | "finance" | "content_manager";
  tutor_id: string | null;
  student_ids: string[];
  parent_id: string | null;
  active: boolean;
};

const devTenantSlug = process.env.NEXT_PUBLIC_DEV_TENANT_SLUG;

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api`,
  withCredentials: true,
  headers: devTenantSlug ? { "X-Tenant-Slug": devTenantSlug } : undefined,
});

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<{ user: User }>("/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>("/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export type Student = {
  student_id: string;
  name: string;
  nis?: string;
  gender: "L" | "P";
  school_id: string | null;
  grade_id: string | null;
  active: boolean;
};

export async function listStudents(): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>("/students");
  return data;
}
```

- [x] **Step 4**: Test PASS.
- [x] **Step 5**: Commit `feat(web): typed api client for auth and students`.

### Task 6: Auth context + halaman login (TDD logic, UI manual-verified)

**Files:**
- Create: `src/lib/{auth.tsx,auth.test.ts}`, `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `login`, `getMe`, `logout`, `User` dari Task 5
- Produces: `<AuthProvider>`, `useAuth(): { user: User | null, status: "loading"|"authenticated"|"unauthenticated", login, logout }` — dipakai `ProtectedRoute` (Task 7) dan semua halaman terproteksi

- [x] **Step 1: Test gagal** — `projects/academic-smartboard/apps/web/src/lib/auth.test.ts` (test reducer/state machine murni, tanpa render React):

```ts
import { describe, expect, it } from "vitest";
import { authReducer, initialAuthState } from "./auth";

describe("authReducer", () => {
  it("mulai loading", () => {
    expect(initialAuthState.status).toBe("loading");
  });
  it("SESSION_RESOLVED dengan user -> authenticated", () => {
    const user = { user_id: "u1", role: "owner" } as never;
    const next = authReducer(initialAuthState, { type: "SESSION_RESOLVED", user });
    expect(next.status).toBe("authenticated");
    expect(next.user).toBe(user);
  });
  it("SESSION_RESOLVED tanpa user -> unauthenticated", () => {
    const next = authReducer(initialAuthState, { type: "SESSION_RESOLVED", user: null });
    expect(next.status).toBe("unauthenticated");
    expect(next.user).toBeNull();
  });
  it("LOGOUT -> unauthenticated, user null", () => {
    const authed = { status: "authenticated" as const, user: { user_id: "u1" } as never };
    expect(authReducer(authed, { type: "LOGOUT" })).toEqual({ status: "unauthenticated", user: null });
  });
});
```

- [x] **Step 2**: `pnpm --filter @sentra/smartboard-web test` → FAIL.
- [x] **Step 3: Implementasi** — `projects/academic-smartboard/apps/web/src/lib/auth.tsx`:

```tsx
"use client";
import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, type User } from "./api";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated"; user: null };

type AuthAction = { type: "SESSION_RESOLVED"; user: User | null } | { type: "LOGOUT" };

export const initialAuthState: AuthState = { status: "loading", user: null };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SESSION_RESOLVED":
      return action.user ? { status: "authenticated", user: action.user } : { status: "unauthenticated", user: null };
    case "LOGOUT":
      return { status: "unauthenticated", user: null };
  }
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  useEffect(() => {
    getMe()
      .then((user) => dispatch({ type: "SESSION_RESOLVED", user }))
      .catch(() => dispatch({ type: "SESSION_RESOLVED", user: null }));
  }, []);

  async function login(email: string, password: string) {
    const { user } = await apiLogin(email, password);
    dispatch({ type: "SESSION_RESOLVED", user });
  }

  async function logout() {
    await apiLogout();
    dispatch({ type: "LOGOUT" });
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth dipanggil di luar AuthProvider");
  return ctx;
}
```

- [x] **Step 4**: Test PASS.
- [x] **Step 5**: `projects/academic-smartboard/apps/web/src/app/login/page.tsx` — form `react-hook-form` + `zod` (skema v4: `z.object({ email: z.email(), password: z.string().min(1) })`), pesan error Bahasa Indonesia verbatim dari `frontend/src/pages/Login.jsx` ("Email atau kata sandi salah" cocok balasan backend 401). Sukses login → `router.push("/master/murid")`.
- [x] **Step 6**: `pnpm --filter @sentra/smartboard-web build` → hijau. Verifikasi manual dev server (`pnpm --filter @sentra/smartboard-web dev`, buka `/login`, cek form render — TANPA backend hidup, cukup pastikan tidak crash).
- [x] **Step 7**: Commit `feat(web): auth context and login page`.

### Task 7: Shell (nav role-aware) + ProtectedRoute

**Files:**
- Create: `src/lib/{nav.ts,nav.test.ts}`, `src/components/{ProtectedRoute.tsx,AppShell.tsx}`
- Modify: `src/app/layout.tsx` (pasang `AuthProvider` + `QueryClientProvider`), `src/app/page.tsx` (redirect client berbasis auth)

**Interfaces:**
- Consumes: `useAuth()` dari Task 6
- Produces: `NAV_ITEMS: {label, href, roles}[]`, `filterByRole(items, role)`, `<ProtectedRoute roles={[...]}>`, `<AppShell>`

- [x] **Step 1: Test gagal** — `projects/academic-smartboard/apps/web/src/lib/nav.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterByRole, NAV_ITEMS } from "./nav";

describe("filterByRole", () => {
  it("owner melihat semua item sub-fase 1", () => {
    expect(filterByRole(NAV_ITEMS, "owner")).toHaveLength(NAV_ITEMS.length);
  });
  it("murid_ortu tidak melihat item tanpa role murid_ortu", () => {
    const visible = filterByRole(NAV_ITEMS, "murid_ortu");
    expect(visible.every((item) => item.roles.includes("murid_ortu"))).toBe(true);
  });
});
```

- [x] **Step 2**: FAIL → implementasi `projects/academic-smartboard/apps/web/src/lib/nav.ts`:

```ts
export type Role = "owner" | "admin_akademik" | "tentor" | "murid_ortu" | "finance" | "content_manager";
export type NavItem = { label: string; href: string; roles: Role[] };

export const NAV_ITEMS: NavItem[] = [
  { label: "Murid", href: "/master/murid", roles: ["owner", "admin_akademik", "tentor", "murid_ortu"] },
];

export function filterByRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => item.roles.includes(role));
}
```

- [x] **Step 3**: Test PASS.
- [x] **Step 4**: `projects/academic-smartboard/apps/web/src/components/ProtectedRoute.tsx` — client component, port perilaku frontend/src/App.js `<ProtectedRoute roles={[...]}>` (referensi arsip, baris 139/171/267, di luar repo ini) (baris 139/171/267 arsip): saat `status === "loading"` render skeleton/null; `"unauthenticated"` → `router.replace("/login")`; `"authenticated"` dengan `role` tidak termasuk `roles` prop → render pesan "Akses ditolak" (bukan redirect diam-diam, sesuai backend yang juga balas 403 eksplisit).
- [x] **Step 5**: `projects/academic-smartboard/apps/web/src/components/AppShell.tsx` — sidebar dari `filterByRole(NAV_ITEMS, user.role)`, header dengan `DropdownMenu` (nama user + tombol logout memanggil `useAuth().logout()` lalu redirect `/login`).
- [x] **Step 6**: `projects/academic-smartboard/apps/web/src/app/layout.tsx` bungkus `children` dengan `QueryClientProvider` (instance `new QueryClient()` di client component terpisah `projects/academic-smartboard/apps/web/src/app/providers.tsx`) lalu `AuthProvider`. `projects/academic-smartboard/apps/web/src/app/page.tsx` (`"/"`): client component, `useAuth()`, redirect ke `/master/murid` kalau authenticated, ke `/login` kalau tidak.
- [x] **Step 7**: `pnpm --filter @sentra/smartboard-web typecheck && build` → hijau.
- [x] **Step 8**: Commit `feat(web): role-aware shell and protected route`.

### Task 8: Halaman Master › Murid (vertical proof)

**Files:**
- Create: `src/components/DataTable.tsx`, `src/app/master/murid/page.tsx`

**Interfaces:**
- Consumes: `listStudents`, `Student` (Task 5), `ProtectedRoute`, `AppShell` (Task 7), `@tanstack/react-query`

- [x] **Step 1**: Baca `frontend/src/pages/master/` di arsip, konfirmasi nama file persis halaman daftar murid dan kolom yang ditampilkan (referensi model `Student` sudah dikonfirmasi: `student_id, name, nis, gender, school_id, grade_id, active`).
- [x] **Step 2**: `projects/academic-smartboard/apps/web/src/components/DataTable.tsx` — tabel generik minimal (`columns: {key, header}[]`, `rows: Record<string, unknown>[]`), token-styled (`var(--color-border)`, dst.), TANPA fitur sort/filter/paginasi (YAGNI — nambah kalau halaman sub-fase 2-5 butuh).
- [x] **Step 3**: `projects/academic-smartboard/apps/web/src/app/master/murid/page.tsx` — client component: `<ProtectedRoute roles={["owner","admin_akademik","tentor","murid_ortu"]}>`, `useQuery({ queryKey: ["students"], queryFn: listStudents })`, render `<AppShell>` + `<DataTable columns=... rows=data ?? []>` kolom: Nama, NIS, Jenis Kelamin, Status. Loading state dan error state (pesan "Gagal memuat data murid" + tombol retry `refetch()`).
- [x] **Step 4**: `pnpm --filter @sentra/smartboard-web typecheck && build` → hijau.
- [x] **Step 5**: Commit `feat(web): master murid list page (vertical proof)`.

### Task 9: Test output build

**Files:**
- Create: `tests/build-output.test.mjs`

- [x] **Step 1: Tulis test** (pola sama `apps/site`, route sub-fase 1 saja):

```js
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const ROUTES = ["", "login", "master/murid"];

for (const route of ROUTES) {
  test(`route /${route} diekspor`, () => {
    assert.ok(existsSync(join(out, route, "index.html")), `hilang: ${route}/index.html`);
  });
}
```

- [x] **Step 2**: Hapus `out/`, jalankan `pnpm --filter @sentra/smartboard-web build && pnpm --filter @sentra/smartboard-web test:build` → 3 test PASS. Verifikasi merah: rename sementara satu folder route, test harus FAIL, kembalikan.
- [x] **Step 3**: Audit token: `node scripts/check-tokens.mjs --audit` → nol pelanggaran pada `projects/academic-smartboard/apps/web`.
- [x] **Step 4**: Commit `test(web): build output guard for sub-phase 1 routes`.

### Task 10: Dokumen capsule + verifikasi penuh + merge implementasi

**Files:**
- Modify: `projects/academic-smartboard/{README.md,docs/architecture.md,docs/data.md,docs/testing.md}` (status `apps/web`: `di-port (sub-fase 1/5)`; JANGAN sentuh `AGENTS.md` — itu Task 11)
- Modify: `docs/plans/active/2026-08-21-smartboard-web-subphase1-foundation.md` (centang task; catatan eksekusi), `docs/plans/active/2026-08-21-smartboard-web-roadmap.md` (baris 1 status → COMPLETED sub-fase)

- [x] **Step 1**: Update 4 dokumen capsule — arsitektur (static export client-only, alasan Keputusan terbuka #1), data (apps/web sub-fase 1 belum menyentuh data pribadi nyata; panggil backend arsip dev-only), testing (vitest unit-logic + test:build; RTL belum ada, lihat Keputusan terbuka #5).
- [x] **Step 2**: Verifikasi penuh di worktree: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` lalu `bash scripts/safrs-verify.sh`. Semua PASS — tunjukkan output.
- [x] **Step 3**: Commit `docs(smartboard): document apps/web foundation in capsule docs`.
- [ ] **Step 4**: Review Chief (R2 designated review) atas branch `feat/smartboard-web-foundation`; merge no-ff ke main; `bash scripts/safrs-verify.sh` di main.
- [ ] **Step 5**: **Chief push main.** Blocking untuk Task 11.

### Task 11: Branch kontrol (AGENTS.md + scope token)

**Files (SEMUA kontrol verifikasi):**
- Modify: `projects/academic-smartboard/AGENTS.md` (tambah perintah `apps/web` di section Commands, di samping `apps/site` yang sudah ada)
- Create: `projects/academic-smartboard/apps/web/AGENTS.md`
- Modify: `packages/token/scope.txt` (+ `projects/academic-smartboard/apps/web/src`)

- [ ] **Step 1**: Prasyarat: merge Task 10 sudah di `origin/main`.
- [ ] **Step 2**: Branch `feat/smartboard-web-foundation-control` dari main. Tambah ke capsule `AGENTS.md`:

```
- Lint (web): `pnpm --filter @sentra/smartboard-web lint`
- Typecheck (web): `pnpm --filter @sentra/smartboard-web typecheck`
- Test (web): `pnpm --filter @sentra/smartboard-web test`
- Build (web): `pnpm --filter @sentra/smartboard-web build` (static export ke `apps/web/out/`)
```

- [ ] **Step 3**: `apps/web/AGENTS.md` baru (pola sama `apps/site/AGENTS.md`, tambah catatan): auth cookie-based ke backend arsip dev-only, `NEXT_PUBLIC_BACKEND_URL` wajib di-set untuk `dev`/`build` fungsional, risk default R1, perubahan `package.json`/lock/`pnpm-workspace.yaml` = R2.
- [ ] **Step 4**: Tambah baris `projects/academic-smartboard/apps/web/src` ke `packages/token/scope.txt`.
- [ ] **Step 5**: `node scripts/check-tokens.mjs` (mode penuh) → PASS. `bash scripts/safrs-verify.sh` → PASS.
- [ ] **Step 6**: Commit `chore(safrs): enroll apps/web foundation in token gate and agent contracts`; review Chief; merge no-ff; push (Chief).

### Task 12: Tutup lifecycle

- [ ] **Step 1**: `pnpm task state --id TASK-20260821-SMARTBOARD-WEB-FOUNDATION --to VERIFYING --yes` lalu `--to REVIEW --yes` lalu `--to MERGED --yes` lalu `--to CLOSED --yes` — dari tree utama `d:\DEV\Monorepo`. Bertahap sesuai fase riil.
- [ ] **Step 2**: `git mv docs/plans/active/2026-08-21-smartboard-web-subphase1-foundation.md docs/plans/completed/`; status header → COMPLETED; update baris roadmap (sub-fase 1 COMPLETED, sub-fase 2 jadi kandidat berikut); hapus baris dari `docs/plans/active/README.md`; update `.agents/PROGRESS.md` + `.agents/HANDOFF.md` — **satu commit** dengan penutupan.
- [ ] **Step 3**: Hapus worktree: `git worktree remove ../Monorepo.worktrees/feat-smartboard-web-foundation` (kalau gagal: `rm -rf` + `git worktree prune`). Hapus branch. Verifikasi scratchpad kosong.
- [ ] **Step 4**: Lapor Chief: commit list, output verifikasi, keputusan terbuka yang masih menggantung (RTL testing, tenant switcher UI, 2 halaman aktivasi ditunda), dan reminder `backend/scripts/cloud_tokens.env` untuk karantina di fase `api`.

## Verifikasi akhir (bukti wajib sebelum klaim selesai)

```bash
pnpm --filter @sentra/smartboard-web test        # unit logic PASS
pnpm --filter @sentra/smartboard-web build        # export 3 route
pnpm --filter @sentra/smartboard-web test:build   # 3 assert output PASS
node scripts/check-tokens.mjs                     # web dalam scope, PASS
bash scripts/safrs-verify.sh                       # SAFRS PASS
pnpm check                                         # gate penuh root
```
