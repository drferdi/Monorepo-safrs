# Solo-Developer DX Friction Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Kurangi 9 titik friksi DX yang diidentifikasi audit 2026-08-11 — sederhanakan command surface, tutup gap prerequisite, dan buat development loop lebih ringan tanpa melemahkan SAFRS governance.

**Architecture:** Modifikasi root package.json (command surface), scripts/setup.mjs (prerequisite detection), INSTALL.md (dokumentasi), .husky/pre-commit (Windows-native fallback), 	urbo.json (watch mode), scripts/safrs-verify.mjs (cross-platform), .env.example (template lengkap). Tidak ada perubahan pada SAFRS governance checks, shared packages, atau golden path. Semua perubahan R1 (reversible local change).

**Tech Stack:** Node.js 24, pnpm, TypeScript, Bash/PowerShell, Biome, Husky, Turborepo.

## Global Constraints

- Jangan melemahkan SAFRS governance checks — pnpm governance harus tetap berfungsi identik.
- Jangan ubah perilaku pnpm setup, pnpm dev, atau pnpm check yang sudah ada — hanya tambah, tidak ganti.
- Jangan tambah dependency npm baru — gunakan tooling yang sudah ada (Node.js built-in, Biome, Turbo, Husky).
- Diagnostik tetap Bahasa Indonesia. Nama command tetap English (konvensi npm).
- Tidak ada perubahan pada shared packages, golden path, atau database schema.
- Semua perubahan R1 — tidak menyentuh packages/, projects/, safrs/, atau .github/workflows/.
- Line endings: CRLF.
- Target OS: Windows dengan PowerShell. Bash diperbolehkan di hook dan script yang sudah bash.

---

### Task 1: Sederhanakan Command Surface — Tambahkan pnpm verify dan pnpm check:quick

**Files:**
- Modify: package.json:16-33 (scripts block)

**Interfaces:**
- Consumes: (none — extends existing scripts)
- Produces: pnpm verify (alias untuk pnpm check), pnpm check:quick (lint + typecheck + test tanpa governance/build)

- [ ] **Step 1: Tambahkan pnpm verify dan pnpm check:quick ke package.json**

Buka package.json. Di dalam blok scripts, tambahkan dua baris setelah check:

"verify": "pnpm check",
"check:quick": "pnpm lint && pnpm typecheck && pnpm test"

- [ ] **Step 2: Verifikasi pnpm verify berfungsi sebagai alias**

Jalankan: pnpm verify
Expected: output identik dengan pnpm check. Exit code 0.

- [ ] **Step 3: Verifikasi pnpm check:quick hanya menjalankan lint + typecheck + test**

Jalankan: pnpm check:quick
Expected: Biome lint, TypeScript typecheck, Vitest test. Governance dan build TIDAK dijalankan. Exit code 0.

- [ ] **Step 4: Commit**

git add package.json
git commit -m "feat: tambah pnpm verify dan pnpm check:quick untuk DX lebih ringan"

---

### Task 2: Dokumentasikan Semua Prerequisite di INSTALL.md

**Files:**
- Modify: INSTALL.md:1-42

**Interfaces:**
- Consumes: (none)
- Produces: INSTALL.md yang mencantumkan Node.js 24, pnpm, Git, Docker, Python 3, dan Bash/Git Bash sebagai prerequisite

- [ ] **Step 1: Tulis ulang INSTALL.md dengan daftar prerequisite lengkap**

Ganti seluruh konten INSTALL.md dengan tabel prerequisite yang mencakup:
- Node.js 24.18.0 (LTS) — dari nodejs.org
- pnpm 11.21.0 — corepack enable pnpm
- Git 2.x — dari git-scm.com
- Docker 24+ — dari docker.com (Docker Desktop)
- Python 3 3.9+ — dari python.org
- Bash (Windows) — bawaan Git for Windows

Tambahkan section opsional untuk capability pack (Stripe CLI, Electron toolchain).
Tambahkan section verifikasi cepat: jalankan pnpm run doctor.

- [ ] **Step 2: Verifikasi INSTALL.md terbaca dengan baik**

Preview file untuk memastikan tabel Markdown terformat dengan benar.

- [ ] **Step 3: Commit**

git add INSTALL.md
git commit -m "docs: lengkapi INSTALL.md dengan semua prerequisite"

---

### Task 3: Validasi Python 3 di setup.mjs

**Files:**
- Modify: scripts/setup.mjs:1-175

**Interfaces:**
- Consumes: unCommand dari ./lib/process.mjs
- Produces: setup sekarang memvalidasi Python 3 sebelum melanjutkan — gagal lebih awal dengan pesan jelas

- [ ] **Step 1: Tambahkan pemeriksaan Python 3 setelah pemeriksaan Git**

Cari blok pemeriksaan Git di setup.mjs. Sisipkan blok pemeriksaan Python 3 tepat setelahnya dan sebelum ensureEnvironmentFile:

Coba python3 --version, jika gagal coba python --version. Jika keduanya gagal, return setupFailure dengan pesan "Python 3 belum tersedia."

- [ ] **Step 2: Verifikasi setup mendeteksi Python hilang**

Jalankan: 
ode --check scripts/setup.mjs
Expected: tidak ada error sintaks.

- [ ] **Step 3: Verifikasi setup tetap berfungsi dengan Python tersedia**

Jalankan: pnpm run doctor
Expected: doctor tetap berfungsi normal, tidak ada regresi.

- [ ] **Step 4: Commit**

git add scripts/setup.mjs
git commit -m "feat: validasi Python 3 di setup.mjs sebelum governance check"

---

### Task 4: PowerShell Fallback untuk Pre-commit Hook

**Files:**
- Modify: .husky/pre-commit:1-35
- Create: .husky/pre-commit.ps1

**Interfaces:**
- Consumes: (none)
- Produces: .husky/pre-commit mendeteksi Windows tanpa Bash dan redirect ke .husky/pre-commit.ps1

- [ ] **Step 1: Buat file .husky/pre-commit.ps1**

Buat file PowerShell yang:
1. Deteksi staged files via git diff --cached --name-only
2. Deteksi partially staged files dengan membandingkan staged vs unstaged
3. Jalankan pnpm exec biome check --write --staged --no-errors-on-unmatched
4. Stage kembali file yang sudah diformat via git update-index --add

- [ ] **Step 2: Modifikasi .husky/pre-commit untuk redirect ke PowerShell**

Di awal bash script, tambahkan deteksi: jika bash tidak tersedia tapi PowerShell ada, redirect ke .husky/pre-commit.ps1.

- [ ] **Step 3: Verifikasi sintaks kedua file**

Verifikasi bash: ash -n .husky/pre-commit
Verifikasi PowerShell: tokenisasi dengan PSParser.

- [ ] **Step 4: Verifikasi Biome tetap berfungsi pada staged files**

Buat file test sementara dengan format salah, stage, jalankan Biome, bersihkan.

- [ ] **Step 5: Commit**

git add .husky/pre-commit .husky/pre-commit.ps1
git commit -m "feat: tambah PowerShell fallback untuk pre-commit hook di Windows"

---

### Task 5: Ubah Partially Staged Detection — Dari Tolak Jadi Peringatan

**Files:**
- Modify: .husky/pre-commit:43-51 (blok partially_staged di Bash path)
- Modify: .husky/pre-commit.ps1:13-22 (blok partially_staged di PowerShell path)

**Interfaces:**
- Consumes: (none — modifikasi perilaku existing)
- Produces: partially staged files hanya menghasilkan peringatan, tidak memblokir commit

- [ ] **Step 1: Ubah Bash path — dari exit 1 jadi peringatan**

Cari blok if [ "" = true ] di .husky/pre-commit. Hapus exit 1, ganti pesan dari "Commit dihentikan" menjadi "Perhatian: ada file yang di-stage sebagian..."

- [ ] **Step 2: Verifikasi PowerShell path sudah benar**

PowerShell path (dibuat di Task 4) sudah menggunakan Write-Warning tanpa exit 1. Verifikasi saja.

- [ ] **Step 3: Verifikasi sintaks**

ash -n .husky/pre-commit
Tokenisasi .husky/pre-commit.ps1.

- [ ] **Step 4: Commit**

git add .husky/pre-commit .husky/pre-commit.ps1
git commit -m "fix: ganti partially-staged dari blokir commit jadi peringatan"

---

### Task 6: Tambahkan Watch Mode untuk TypeScript Type Checking

**Files:**
- Modify: package.json:16-33 (scripts block)

**Interfaces:**
- Consumes: Turborepo (sudah ada)
- Produces: pnpm typecheck:watch — continuous type checking via 	urbo watch typecheck

- [ ] **Step 1: Tambahkan pnpm typecheck:watch ke package.json**

Tambahkan setelah baris 	ypecheck:
"typecheck:watch": "turbo watch typecheck"

- [ ] **Step 2: Verifikasi command tersedia**

Jalankan pnpm typecheck:watch, biarkan beberapa detik, Ctrl+C.
Expected: Turbo memulai watch mode, tidak crash.

- [ ] **Step 3: Commit**

git add package.json
git commit -m "feat: tambah pnpm typecheck:watch untuk continuous type checking"

---

### Task 7: Governance Cross-Platform — PowerShell Tanpa Bergantung Bash

**Files:**
- Modify: scripts/safrs-verify.mjs:1-17
- Modify: package.json:16-33 (scripts block)

**Interfaces:**
- Consumes: scripts/safrs-verify.ps1 (sudah ada)
- Produces: scripts/safrs-verify.mjs selalu pakai PowerShell di Windows. pnpm governance:ps sebagai explicit PowerShell entry point.

- [ ] **Step 1: Ubah safrs-verify.mjs untuk selalu pakai PowerShell di Windows**

Ganti logika deteksi: di Windows (process.platform === 'win32'), langsung spawn PowerShell tanpa deteksi Bash. Di Unix, tetap pakai bash.

- [ ] **Step 2: Tambahkan governance:ps ke package.json**

"governance:ps": "powershell -ExecutionPolicy Bypass -File scripts/safrs-verify.ps1"

- [ ] **Step 3: Verifikasi pnpm governance tetap berfungsi**

Jalankan pnpm governance. Expected: exit code 0.

- [ ] **Step 4: Verifikasi pnpm governance:ps berfungsi**

Jalankan pnpm governance:ps. Expected: output identik. Exit code 0.

- [ ] **Step 5: Commit**

git add scripts/safrs-verify.mjs package.json
git commit -m "feat: governance selalu pakai PowerShell di Windows, tambah governance:ps"

---

### Task 8: Dokumentasikan Konvensi Bahasa di README.md

**Files:**
- Modify: README.md (menyisipkan section baru)

**Interfaces:**
- Consumes: (none)
- Produces: Section "Konvensi Bahasa" di README yang menjelaskan kapan Bahasa Indonesia dan English digunakan

- [ ] **Step 1: Sisipkan section Konvensi Bahasa**

Cari posisi setelah setup instructions di README. Sisipkan section dengan tabel:

| Konteks | Bahasa | Alasan |
|---|---|---|
| Diagnostik command | Bahasa Indonesia | Chief penutur Bahasa Indonesia |
| UI golden path | Bahasa Indonesia | Target non-coding |
| Nama npm script | English | Konvensi npm/Node.js |
| Nama file dan kode | English | Konvensi teknis universal |
| CI/CD output | English | Kompatibilitas GitHub Actions |
| Dokumentasi teknis | English | Aksesibilitas agent AI |

- [ ] **Step 2: Verifikasi section terbaca**

Preview README, pastikan tabel Markdown terformat dengan benar.

- [ ] **Step 3: Commit**

git add README.md
git commit -m "docs: tambah konvensi bahasa di README"

---

### Task 9: Perluas .env.example dengan Variabel Capability Pack

**Files:**
- Modify: .env.example:1-3

**Interfaces:**
- Consumes: capability manifests di 	ools/capabilities/manifests/
- Produces: .env.example mendokumentasikan variabel baseline + variabel opsional per capability pack

- [ ] **Step 1: Tulis ulang .env.example dengan section yang jelas**

Struktur:
- Section BASELINE: DATABASE_URL, APP_URL, NODE_ENV (uncommented)
- Section CAPABILITY Email: RESEND_API_KEY, EMAIL_FROM (commented)
- Section CAPABILITY Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (commented)
- Section CAPABILITY AI: OPENAI_API_KEY, AI_MODEL (commented)
- Section CAPABILITY Electron/WXT/Python: tidak ada variabel tambahan (commented note)

- [ ] **Step 2: Verifikasi hanya 3 variabel tidak di-comment**

Get-Content .env.example — pastikan hanya baseline yang aktif.

- [ ] **Step 3: Verifikasi setup tetap kompatibel**


ode --check scripts/setup.mjs — pastikan tidak ada error.

- [ ] **Step 4: Commit**

git add .env.example
git commit -m "docs: perluas .env.example dengan variabel per capability pack"

---

### Task 10: Verifikasi Akhir — Jalankan Seluruh Gate

**Files:**
- (none — verification only)

**Interfaces:**
- Consumes: seluruh perubahan dari Task 1–9
- Produces: konfirmasi bahwa tidak ada regresi

- [ ] **Step 1: Jalankan governance**

pnpm governance — expected semua 9 check lulus, exit code 0.

- [ ] **Step 2: Jalankan full check**

pnpm check — expected governance → lint → typecheck → test → build semua PASS.

- [ ] **Step 3: Jalankan quick check**

pnpm check:quick — expected hanya lint → typecheck → test, exit code 0.

- [ ] **Step 4: Verifikasi verify sebagai alias**

pnpm verify — expected output identik dengan pnpm check.

- [ ] **Step 5: Verifikasi operator commands test**


ode --test tests/repository/operator-commands.test.mjs — expected test existing tetap lulus.

- [ ] **Step 6: Commit**

git add -A
git commit -m "chore: verifikasi akhir semua DX friction fixes"

---

## Self-Review

### Spec coverage

| Friction point | Task |
|---|---|
| 1. Terlalu banyak command | Task 1 (verify, check:quick) |
| 2. Python tidak divalidasi | Task 3 (validasi di setup.mjs) |
| 3. Docker tidak terdokumentasi | Task 2 (INSTALL.md) |
| 4. Husky bash-only | Task 4 (PowerShell fallback) |
| 5. Partially staged ditolak | Task 5 (ubah jadi peringatan) |
| 6. Tidak ada watch mode | Task 6 (typecheck:watch) |
| 7. Governance terlalu berat | Task 1 (check:quick) + Task 7 (cross-platform) |
| 8. Mixed language surface | Task 8 (dokumentasi di README) |
| 9. .env.example tidak lengkap | Task 9 (perluas template) |
| Verifikasi akhir | Task 10 (full gate) |

### Placeholder scan

Tidak ada TBD, TODO, "implement later", atau placeholder. Setiap step berisi instruksi konkret.

### Type consistency

- package.json scripts: nama konsisten antara Task 1, 6, dan 7.
- .husky/pre-commit dan .husky/pre-commit.ps1: perilaku konsisten (peringatan) antara Task 4 dan 5.
- scripts/setup.mjs: tidak ada perubahan interface — tetap export runSetup.
- scripts/safrs-verify.mjs: tetap spawn process, exit code identik.
