# Smartboard Migration — Fase Fondasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- **Status:** ACTIVE — fase fondasi dieksekusi 2026-08-20; menunggu review integritas Chief
- **Owner:** Chief

**Goal:** Berdirikan capsule `projects/academic-smartboard/` yang lolos semua gate SAFRS, berisi aset statis (data kurikulum + knowledge package Kayyisa), siap menerima port `site`/`web`/`api`/`demo` di plan lanjutan.

**Architecture:** Snapshot whitelist-copy dari repo arsip ke capsule SAFRS baru. Tidak ada graft riwayat git. Setiap impor diikuti pemeriksaan negatif (tidak ada `.env*`, tidak ada file `raw_data/`). Scaffold lewat `pnpm project:new`, bukan salin manual `_template`.

**Tech Stack:** pnpm 11.21.0, Node >=24.18.0 <25, Python 3 (validasi manifest Kayyisa + safrs-verify), Git Bash di Windows.

**Spec:** `docs/superpowers/specs/2026-08-20-smartboard-migration-design.md`

## Global Constraints

- Sumber read-only: `D:\Devops\abyss-monorepo\apps\academic\smartboard` (Git Bash: `/d/Devops/abyss-monorepo/apps/academic/smartboard`). Tidak ada perintah tulis apa pun ke path ini.
- Karantina permanen (TIDAK PERNAH disalin): `raw_data/**`, semua `.env*` (termasuk `.env.bak`, `backend/scripts/cloud_tokens.env`, `demo/_keep/*.env`), `demo/app/.git/`, `demo/landing/.git/`, `backend/agent/`, `node_modules/`, `.venv/`, `__pycache__/`, `build/`, `dist/`, `_console_*.{out,err}`, `.uvicorn-*.log`, `preview-{out,err}.txt`, `agent/operations/`, `agent/docs/`.
- Metode salin: whitelist eksplisit per file/folder. Tidak ada `cp -r` terhadap root sumber.
- Setiap task diakhiri commit sendiri. Pesan commit Conventional Commits.
- Setelah task terakhir: `bash scripts/safrs-verify.sh` dan `pnpm check` wajib PASS.
- Kerja dilakukan di worktree `../Monorepo.worktrees/feat-smartboard-capsule` (AGENTS.md rule 8), branch `feat/smartboard-capsule`.
- Semua path pada task relatif terhadap root worktree.
- `SRC=/d/Devops/abyss-monorepo/apps/academic/smartboard` — setiap task yang menyalin mendefinisikan variabel ini di awal shell-nya.


## Catatan eksekusi (2026-08-20)

- Task 1: claim tanpa scope `.agents/` (lease aktif TASK-20260818-FAST-REHYDRATE); tidak ada commit (storage task di luar repo).
- Task 2: `docs/adrs/README.md` tidak punya tabel indeks — baris indeks tidak dibuat.
- Task 4: dieksekusi di branch terpisah `feat/safrs-ai-sensitive` — gate `check_sensitive_changes` menolak kontrol verifikasi + implementasi dalam satu change set.
- Task 6: `validate_agent_kayyisa.py` FAIL hanya pada entri `operations/*` + `docs/*` yang sengaja dikecualikan; fallback hash manual: 36/36 file cocok (HASH OK).
- Task 8: `safrs-verify` menunggu bukti independent review dari Chief (`.safrs/reviews/verification-integrity.json`) karena capsule baru membawa `AGENTS.md` (kontrol) + implementasi bersamaan.

---

### Task 1: Claim task SAFRS + worktree

**Files:**
- Modify: state task via `pnpm task` (storage dikelola CLI)

**Interfaces:**
- Produces: task id `TASK-20260820-SMARTBOARD-CAPSULE` state EXECUTING; worktree `../Monorepo.worktrees/feat-smartboard-capsule` di branch `feat/smartboard-capsule`. Semua task berikutnya berjalan di worktree ini.

- [x] **Step 1: Buat worktree**

```bash
git -C /d/DEV/Monorepo worktree add ../Monorepo.worktrees/feat-smartboard-capsule -b feat/smartboard-capsule
cd /d/DEV/Monorepo.worktrees/feat-smartboard-capsule
```

Expected: worktree dibuat, branch `feat/smartboard-capsule` aktif.

- [x] **Step 2: Claim task**

```bash
pnpm task claim \
  --id TASK-20260820-SMARTBOARD-CAPSULE \
  --title "Smartboard migration phase 1: capsule foundation" \
  --owner-id agent:claude:main \
  --owner-label "Claude migration executor" \
  --risk R2 \
  --scope projects/academic-smartboard/ \
  --scope docs/adrs/ \
  --scope docs/plans/active/ \
  --scope docs/superpowers/specs/ \
  --scope .safrs/sensitive-paths.json \
  --scope .agents/ \
  --state EXECUTING \
  --yes
```

Expected: task tercatat, state EXECUTING. Risiko R2 karena menyentuh `.safrs/**` dan `.agents/**` (keduanya pola sensitif).

- [x] **Step 3: Verifikasi claim**

```bash
pnpm task list --active
```

Expected: `TASK-20260820-SMARTBOARD-CAPSULE` muncul dengan state EXECUTING.

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(task): claim TASK-20260820-SMARTBOARD-CAPSULE"
```

---

### Task 2: ADR 0003 — keputusan migrasi smartboard

**Files:**
- Create: `docs/adrs/0003-smartboard-migration.md`
- Modify: `docs/adrs/README.md` (tambah baris indeks, ikuti format baris ADR 0001/0002 yang ada)

**Interfaces:**
- Consumes: keputusan D1–D8 dari spec
- Produces: ADR yang dirujuk `docs/architecture.md` capsule di Task 7

- [x] **Step 1: Tulis ADR**

Isi lengkap `docs/adrs/0003-smartboard-migration.md`:

```markdown
# 0003 — Migrasi Smartboard sebagai Capsule Tunggal dengan Port Bertahap

- Status: Accepted
- Tanggal: 2026-08-20
- Spec: docs/superpowers/specs/2026-08-20-smartboard-migration-design.md

## Konteks

Produk smartboard hidup di repo arsip `abyss-monorepo` dengan empat permukaan:
aplikasi utama (CRA + craco + yarn, ~50 pin `resolutions` CVE manual), backend
(FastAPI + MongoDB), website promo (Vite 8), dan dua fork demo dengan repo git
tersarang yang dipublikasikan ke GitHub. Monorepo SAFRS ini menegakkan satu
lockfile pnpm, katalog versi terpusat, `minimumReleaseAge`, gate design token,
dan kontrak capsule.

## Keputusan

1. Satu capsule `projects/academic-smartboard/` — domain sebagai prefix nama.
   Folder domain perantara ditolak karena memaksa edit serentak pada
   `pnpm-workspace.yaml`, `tools/safrs/check_topology.py`, dan
   `scripts/check-tokens.mjs`.
2. Empat app dalam capsule: `web` (produk utama), `site` (promo/publik),
   `api` (backend), `demo` (konfigurasi environment demo — bukan fork kode).
3. Knowledge package Kayyisa di `ai/kayyisa/` dalam capsule; naik ke
   `packages/` hanya setelah ada konsumen kedua nyata (Rule 3 kontrak capsule).
4. Port bertahap ke stack golden-path (Next.js 16, Hono 4, Prisma 7 +
   Postgres). Lift-and-shift ditolak: yarn/CRA dan pip/MongoDB membuka dua
   supply chain di luar jangkauan `pnpm check` dan gate token.
5. Migrasi adalah snapshot whitelist — riwayat git repo lama tidak di-graft
   karena berpotensi membawa secret lama secara permanen.
6. `raw_data/**` repo lama (data pribadi siswa/tentor/gaji) diklasifikasi R3
   dan dikarantina permanen; tidak masuk repo ini dalam bentuk apa pun tanpa
   konfirmasi tertulis Chief.

## Konsekuensi

- Selama transisi, produk berjalan dari repo arsip; capsule ini menerima port
  per plan terpisah (site, web, api, demo) sampai paritas tercapai.
- 26 file test Python backend menjadi spesifikasi perilaku untuk port Vitest.
- Repo publik `smartboard-demo` dan `smartboard-landing` berhenti menjadi
  sumber; postur lanjutannya diputuskan pada plan fase demo.
```

- [x] **Step 2: Tambah baris indeks di `docs/adrs/README.md`**

Ikuti format baris yang dipakai ADR 0001 dan 0002 di file itu (baca dulu, samakan bentuknya), rujuk `0003-smartboard-migration.md`.

- [x] **Step 3: Commit**

```bash
git add docs/adrs/
git commit -m "docs(adr): record smartboard migration decisions (0003)"
```

---

### Task 3: Scaffold capsule via project wizard

**Files:**
- Create: `projects/academic-smartboard/{AGENTS.md,README.md,docs/architecture.md,docs/data.md,docs/testing.md,src/README.md,tests/README.md}` (via wizard)
- Create: input wizard di scratchpad (di luar repo)

**Interfaces:**
- Consumes: slug `academic-smartboard`
- Produces: capsule yang lolos `check_topology.py`; Task 5–7 menulis ke dalamnya

- [x] **Step 1: Tulis input wizard** (file di scratchpad, JANGAN di dalam repo)

```json
{
  "name": "Academic Smartboard",
  "slug": "academic-smartboard",
  "problem": "Platform bimbingan belajar multi-tenant: penjadwalan sesi, kurikulum, evaluasi, payroll tutor, dan agen AI Kayyisa untuk Kurikulum Merdeka.",
  "kind": "web",
  "capabilities": ["ai"],
  "sensitiveDomains": ["education"]
}
```

- [x] **Step 2: Preview**

```bash
pnpm project:new -- --input <path-scratchpad>/academic-smartboard.json --preview
```

Expected: daftar file yang akan dibuat di `projects/academic-smartboard/`, tanpa error.

- [x] **Step 3: Apply**

```bash
pnpm project:new -- --input <path-scratchpad>/academic-smartboard.json --apply --confirm "CREATE academic-smartboard"
```

Expected: capsule dibuat.

- [x] **Step 4: Verifikasi topology + placeholder**

```bash
python tools/safrs/check_topology.py
grep -rn "<replace-" projects/academic-smartboard/ || echo "BERSIH"
```

Expected: `SAFRS repository topology: OK` dan `BERSIH`. Kalau ada placeholder tersisa di AGENTS.md/README.md, isi sesuai konteks capsule (deskripsi produk, boundary) sebelum lanjut.

- [x] **Step 5: Commit**

```bash
git add projects/academic-smartboard/
git commit -m "feat(smartboard): scaffold academic-smartboard capsule"
```

---

### Task 4: Registrasi sensitive paths untuk aset AI

**Files:**
- Modify: `.safrs/sensitive-paths.json` (tambah satu pola ke array `patterns`)

**Interfaces:**
- Produces: perubahan pada `projects/academic-smartboard/ai/**` selalu terklasifikasi minimum R2 (integritas persona + knowledge Kayyisa)

- [x] **Step 1: Tambah pola**

Di `.safrs/sensitive-paths.json`, array `patterns`, tambahkan satu entri (pertahankan urutan/format entri lain):

```json
"projects/**/ai/**",
```

- [x] **Step 2: Verifikasi governance masih hijau**

```bash
python tools/safrs/check_sensitive_changes.py
python tests/governance/test_sensitive_classification.py
```

Expected: keduanya PASS (exit 0).

- [x] **Step 3: Commit**

```bash
git add .safrs/sensitive-paths.json
git commit -m "chore(safrs): classify project ai assets as sensitive"
```

---

### Task 5: Impor data kurikulum + referensi

**Files:**
- Create: `projects/academic-smartboard/data/curriculum/` (6 file), `data/reference/` (4 file), `data/synthetic/README.md`

**Interfaces:**
- Consumes: `$SRC/data/`
- Produces: path data yang dirujuk `docs/data.md` di Task 7 dan plan fase demo

- [x] **Step 1: Salin whitelist**

```bash
SRC=/d/Devops/abyss-monorepo/apps/academic/smartboard
DST=projects/academic-smartboard/data
mkdir -p $DST/curriculum $DST/reference $DST/synthetic
cp "$SRC/data/curriculum_master.csv" "$SRC/data/curriculum_master.json" \
   "$SRC/data/curriculum_hierarchy.json" "$SRC/data/learning_objectives.csv" \
   "$SRC/data/learning_outcomes.csv" "$SRC/data/subject_matrix.csv" $DST/curriculum/
cp "$SRC/data/license_registry.csv" "$SRC/data/source_registry.csv" \
   "$SRC/data/source_registry.json" "$SRC/data/document_relationships.csv" $DST/reference/
```

Catatan: `$SRC/data/pipeline/` sengaja TIDAK disalin — itu artefak proses ingesti repo lama, bukan aset runtime.

- [x] **Step 2: Tulis `data/synthetic/README.md`**

```markdown
# Data Sintetis

Seed dummy untuk environment demo. Aturan:

1. Semua isi folder ini digenerate (faker/skrip), bukan disalin dari data nyata.
2. Nama orang, email, nominal gaji, dan identitas sekolah nyata dilarang masuk —
   sumber data pribadi repo lama (`raw_data/`) berstatus R3 dan dikarantina
   permanen (ADR 0003).
3. Skrip generator akan ditambahkan pada plan fase demo.
```

- [x] **Step 3: Pemeriksaan negatif**

```bash
find projects/academic-smartboard -name "*.env*" -o -name "*.docx" -o -name "*.xlsx" | grep -v "Kurikulum_Merdeka" ; echo "exit=$?"
```

Expected: tidak ada output file, `exit=1` (grep tidak menemukan apa pun).

- [x] **Step 4: Commit**

```bash
git add projects/academic-smartboard/data/
git commit -m "feat(smartboard): import curriculum and reference data"
```

---

### Task 6: Impor knowledge package Kayyisa

**Files:**
- Create: `projects/academic-smartboard/ai/kayyisa/` (whitelist dari `$SRC/agent/`)

**Interfaces:**
- Consumes: `$SRC/agent/` (BUKAN `$SRC/backend/agent/` — itu duplikat)
- Produces: `ai/kayyisa/manifest.json` + `runtime/knowledge/**/*.jsonl` yang dirujuk plan fase api

- [x] **Step 1: Salin whitelist**

```bash
SRC=/d/Devops/abyss-monorepo/apps/academic/smartboard
DST=projects/academic-smartboard/ai/kayyisa
mkdir -p $DST
cp "$SRC/agent/manifest.json" "$SRC/agent/.agent-ingest.json" \
   "$SRC/agent/CHANGELOG.md" "$SRC/agent/README.md" $DST/
cp -r "$SRC/agent/config" "$SRC/agent/runtime" "$SRC/agent/sources" \
      "$SRC/agent/tests" "$SRC/agent/tools" $DST/
```

Catatan: `agent/operations/` dan `agent/docs/` sengaja TIDAK disalin — artefak proses repo lama (handoff, backlog ingesti, folder tree). Kalau Chief mau arsip xlsx knowledge pack ikut, tambah eksplisit belakangan.

- [x] **Step 2: Validasi integritas manifest**

```bash
python projects/academic-smartboard/ai/kayyisa/tools/validate_agent_kayyisa.py
```

Expected: PASS. Kalau skrip memakai path relatif ke root lama dan gagal, jalankan dari dalam `$DST` (`cd` dulu); kalau tetap gagal karena file yang memang dikecualikan (operations/docs), catat di commit message file mana yang hilang dan pastikan hash file `runtime/knowledge/**` cocok dengan `manifest.json` secara manual:

```bash
cd projects/academic-smartboard/ai/kayyisa && python - <<'EOF'
import hashlib, json, pathlib
m = json.load(open('manifest.json'))
bad = [f['path'] for f in m.get('files', [])
       if pathlib.Path(f['path']).exists()
       and hashlib.sha256(pathlib.Path(f['path']).read_bytes()).hexdigest() != f['sha256']]
print('MISMATCH:', bad) if bad else print('HASH OK')
EOF
```

Expected: `HASH OK`.

- [x] **Step 3: Pemeriksaan negatif**

```bash
find projects/academic-smartboard/ai -name "*.env*" -o -name "cloud_tokens*"; echo "kosong=$?"
find projects/academic-smartboard/ai -name "*.git" -type d; echo "kosong=$?"
```

Expected: tidak ada output file pada keduanya.

- [x] **Step 4: Commit**

```bash
git add projects/academic-smartboard/ai/
git commit -m "feat(smartboard): import kayyisa knowledge package v3.0.0"
```

---

### Task 7: Isi dokumen capsule dengan konten nyata

**Files:**
- Modify: `projects/academic-smartboard/docs/architecture.md`
- Modify: `projects/academic-smartboard/docs/data.md`
- Modify: `projects/academic-smartboard/docs/testing.md`
- Modify: `projects/academic-smartboard/README.md`

**Interfaces:**
- Consumes: ADR 0003 (Task 2), struktur hasil Task 3/5/6
- Produces: dokumen yang dibaca eksekutor plan fase site/web/api/demo

- [x] **Step 1: `docs/architecture.md`** — pertahankan struktur heading hasil wizard, isi dengan:

Inti yang wajib termuat (tulis sebagai prosa/daftar di bawah heading yang cocok):

```markdown
Empat app dalam capsule ini (target akhir; lihat ADR 0003):

| App | Peran | Status | Asal |
| --- | --- | --- | --- |
| apps/web | Aplikasi bimbel multi-tenant (37 halaman) | belum di-port | frontend/ CRA di repo arsip |
| apps/site | Website promo/publik el-Kayyisa (7 halaman) | belum di-port | landing/ Vite di repo arsip |
| apps/api | Backend (24 modul route) | belum di-port | backend/ FastAPI+Mongo di repo arsip |
| apps/demo | Konfigurasi environment demo: seed sintetis + config deploy, tanpa kode | belum dibuat | menggantikan fork demo/ di repo arsip |

Aset yang sudah bermigrasi: `ai/kayyisa/` (knowledge package v3.0.0),
`data/curriculum/`, `data/reference/`.

Urutan port: site → web → api (per modul di belakang facade) → demo.
Sumber arsip read-only: D:\Devops\abyss-monorepo\apps\academic\smartboard.
```

- [x] **Step 2: `docs/data.md`** — inti yang wajib termuat:

```markdown
## Data yang ada di capsule

- data/curriculum/: master kurikulum + hierarki + capaian pembelajaran (publik, R1)
- data/reference/: registri lisensi dan sumber (publik, R1)
- data/synthetic/: seed demo — HANYA data generate, lihat data/synthetic/README.md
- ai/kayyisa/runtime/knowledge/: JSONL knowledge pack, integritas dijaga
  manifest.json (sha256); perubahan terklasifikasi R2 via .safrs/sensitive-paths.json

## Data yang DILARANG masuk

raw_data/ repo arsip (nama siswa, email tentor, gaji, pembagian tim) — R3,
karantina permanen per ADR 0003. Semua .env* repo arsip juga dikarantina.

## Penyimpanan runtime (target port)

Postgres via Prisma 7 (packages/database) — menggantikan MongoDB multi-tenant
repo arsip. Skema per modul dirancang di plan fase api.
```

- [x] **Step 3: `docs/testing.md`** — inti yang wajib termuat:

```markdown
- Validasi knowledge pack: python ai/kayyisa/tools/validate_agent_kayyisa.py
- 26 file test Python backend repo arsip = spesifikasi perilaku untuk port
  Vitest pada fase api (jangan port test apa adanya; tulis ulang per modul).
- Standar repo berlaku: pnpm lint, pnpm typecheck, pnpm test, pnpm test:e2e
  (Playwright) untuk app yang sudah ada.
```

- [x] **Step 4: `README.md`** — pastikan memuat: deskripsi produk satu paragraf, tabel app (sama dengan architecture.md), pointer ke ADR 0003 dan spec migrasi.

- [x] **Step 5: Commit**

```bash
git add projects/academic-smartboard/
git commit -m "docs(smartboard): fill capsule docs with migration state"
```

---

### Task 8: Verifikasi penuh + handoff + lifecycle

**Files:**
- Modify: `.agents/HANDOFF.md`, `.agents/PROGRESS.md`
- Modify: `docs/plans/active/README.md` (baris status plan ini)
- Modify: state task via `pnpm task`

**Interfaces:**
- Consumes: semua task sebelumnya
- Produces: branch siap review; task state REVIEW

- [x] **Step 1: Jalankan verifikasi**

```bash
bash scripts/safrs-verify.sh
pnpm check
```

Expected: keduanya PASS. Kalau gagal: baca error, perbaiki penyebabnya di task terkait, JANGAN melemahkan gate.

- [x] **Step 2: Pemeriksaan negatif final**

```bash
find projects/academic-smartboard -name "*.env*"
git log --oneline main..HEAD
git diff main..HEAD --stat | tail -5
```

Expected: find kosong; commit hanya dari task plan ini; tidak ada file di luar scope task.

- [x] **Step 3: Update `.agents/PROGRESS.md` + `.agents/HANDOFF.md`**

PROGRESS: tambah baris fase fondasi smartboard = selesai, fase site/web/api/demo = belum. HANDOFF: state terkini, path capsule, plan lanjutan berikutnya (`apps/site`).

- [x] **Step 4: Update tabel `docs/plans/active/README.md`**

Baris plan ini: status `ACTIVE — fase fondasi selesai, menunggu plan fase site`.

- [x] **Step 5: Lifecycle ke REVIEW**

```bash
pnpm task state --id TASK-20260820-SMARTBOARD-CAPSULE --to VERIFYING --yes
pnpm task state --id TASK-20260820-SMARTBOARD-CAPSULE --to REVIEW --yes
```

- [x] **Step 6: Commit + serahkan ke Chief**

```bash
git add .agents/ docs/plans/active/README.md
git commit -m "chore(smartboard): close out capsule foundation phase"
```

Laporkan ke Chief: branch `feat/smartboard-capsule` siap review. Merge ke `main` = wewenang Chief. Setelah merge: `pnpm task state --to MERGED` lalu `pnpm task close`, dan hapus worktree.

---

## Plan lanjutan (di luar dokumen ini, satu plan per fase)

1. `2026-XX-XX-smartboard-site-port.md` — port `landing/` (Vite) ke `apps/site` Next.js 16 static export; kalibrasi token gate.
2. `2026-XX-XX-smartboard-web-port.md` — port `frontend/` (CRA, 37 halaman) ke `apps/web`.
3. `2026-XX-XX-smartboard-api-port.md` — port `backend/` (24 modul) ke `apps/api` Hono + Prisma, per modul di belakang facade.
4. `2026-XX-XX-smartboard-demo-env.md` — `apps/demo` (seed + config), keputusan postur repo publik, realihkan `smartboard-demo`/`smartboard-landing` jadi output CI.
