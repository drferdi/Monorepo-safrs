# Fitur Monorepo — nama asli + arti

Sumber: katalog Control Center (`projects/internal/control-center/apps/web/src/lib/repo/catalog.ts`).  
21 fitur. Nama di bawah = identitas resmi di Monorepo.

---

## SAFRS Governance

Ini adalah feature di dalam Monorepo yang menjalankan pemeriksaan aturan rumah secara otomatis: kebijakan risiko, daftar dokumen, inventaris tool, dan kepemilikan pekerjaan. Satu perintah (`pnpm governance`) menjawab apakah aturan masih utuh atau ada yang dilanggar.

- Id: `safrs-governance`
- Lokasi: `tools/safrs`

---

## Automation Control Plane

Ini adalah feature di dalam Monorepo yang mengatur kontrak kerja agen: lease, delapan gerbang pull request, bukti, persetujuan, dan identitas publisher. Tujuannya agar kerja agen bisa diaudit — siapa mengerjakan apa, dengan otoritas apa.

- Id: `automation-control-plane`
- Lokasi: `tools/automation`
- Perintah: `pnpm saf`

---

## Task Registry

Ini adalah feature di dalam Monorepo yang mencatat siapa sedang memegang pekerjaan pada cakupan mana, supaya dua pekerjaan tidak bertabrakan.

- Id: `task-registry`
- Lokasi: `tools/task`
- Perintah: `pnpm task`

---

## Status CLI

Ini adalah feature di dalam Monorepo yang memberi laporan hanya-baca: task, lease, keadaan git, dan hasil tata kelola terkini — satu tempat untuk melihat kondisi rumah proyek.

- Id: `status-cli`
- Lokasi: `tools/status`
- Perintah: `pnpm saf:status`

---

## Doctor

Ini adalah feature di dalam Monorepo yang memeriksa kesiapan komputer lokal: Node, pnpm, Git, Docker, file lingkungan, basis data, dan Prisma — lalu bilang apa yang belum oke dan cara memperbaikinya.

- Id: `doctor`
- Lokasi: `tools/doctor`
- Perintah: `pnpm doctor`

---

## Project Wizard

Ini adalah feature di dalam Monorepo yang membuat kapsul project baru dari template resmi, supaya project baru langsung mengikuti aturan SAFRS tanpa disalin manual.

- Id: `project-wizard`
- Lokasi: `tools/project-wizard`
- Perintah: `pnpm project:new`

---

## Capabilities

Ini adalah feature di dalam Monorepo yang mengaktifkan kemampuan opsional per project (AI, Electron, email, Python, Stripe, WXT) hanya saat dipilih — supaya rumah proyek tetap ringan.

- Id: `capabilities`
- Lokasi: `tools/capabilities`
- Perintah: `pnpm capability:add`

---

## Codegen

Ini adalah feature di dalam Monorepo yang menghasilkan OpenAPI, mock, dan klien bertipe dari kontrak Zod, supaya kontrak data dan kode tetap sinkron.

- Id: `codegen`
- Lokasi: `tools/codegen`
- Perintah: `pnpm codegen`

---

## Deps Graph

Ini adalah feature di dalam Monorepo yang menggambar hubungan antar paket, supaya terlihat paket mana yang terdampak jika satu paket diubah.

- Id: `deps-graph`
- Lokasi: `tools/deps-graph`
- Perintah: `pnpm deps:graph`

---

## Design Token (`packages/token`)

Ini adalah feature di dalam Monorepo yang menjadi satu-satunya tempat nilai warna dan radius Sentra ditulis, dengan pemeriksaan kontras otomatis — supaya seluruh tampilan konsisten.

- Id: `package-token`
- Lokasi: `packages/token`
- Perintah: `pnpm check:tokens`

---

## Database (`packages/database`)

Ini adalah feature di dalam Monorepo yang menyediakan basis data lokal (PostgreSQL + Prisma), migrasi, data contoh, dan pengaman reset — untuk mencoba aplikasi tanpa menyentuh produksi.

- Id: `package-database`
- Lokasi: `packages/database`
- Perintah: `pnpm db:start`

---

## API (`packages/api`)

Ini adalah feature di dalam Monorepo yang menyediakan rute Hono bertipe, klien terinferensi, dan amplop error yang konsisten — pintu data antar bagian aplikasi.

- Id: `package-api`
- Lokasi: `packages/api`
- Entry: `/api`

---

## Telemetry (`packages/telemetry`)

Ini adalah feature di dalam Monorepo yang mengirim jejak OpenTelemetry ke Jaeger lokal, supaya terlihat di mana aplikasi melambat atau gagal.

- Id: `package-telemetry`
- Lokasi: `packages/telemetry`
- Entry: `compose.telemetry.yaml`

---

## Golden Path

Ini adalah feature di dalam Monorepo yang menjadi aplikasi rujukan: membuktikan alur Basis Data → API bertipe → Web berjalan utuh, sebagai pola yang boleh ditiru.

- Id: `golden-path`
- Lokasi: `projects/internal/golden-path`
- Perintah: `pnpm dev`

---

## Control Center

Ini adalah feature di dalam Monorepo yang menjadi papan kendali operator: membaca repository langsung dan menampilkan seluruh fitur beserta keadaannya yang jujur.

- Id: `control-center`
- Lokasi: `projects/internal/control-center`
- Paket: `@sentra/control-center`

---

## Corpus Engine

Ini adalah feature di dalam Monorepo yang mengubah korpus PDF medis menjadi basis pengetahuan yang bisa ditanya dengan sitasi. Kode sudah ada di branch `feat/corpus-engine-poc` dan belum digabung ke `main` — penggabungan adalah keputusan manusia.

- Id: `corpus-engine`
- Lokasi: `projects/corpus-engine`

---

## Wiki (`sentrawiki`)

Ini adalah feature di dalam Monorepo yang berisi penjelasan manusia untuk control plane, kapsul, paket, tool, fitur, keamanan, dan istilah.

- Id: `wiki`
- Lokasi: `sentrawiki/`

---

## Agent Adapters

Ini adalah feature di dalam Monorepo yang menyambungkan Claude Code, Cursor, dan Codex ke `AGENTS.md` tanpa menduplikasi aturan — supaya agen mana pun tunduk pada aturan yang sama.

- Id: `agent-adapters`
- Lokasi: `AGENTS.md`, `.claude/`, `.cursor/`

---

## Test Suite

Ini adalah feature di dalam Monorepo yang menjalankan rangkaian uji (kontrak, tata kelola, arsitektur, integrasi) sebagai bukti bahwa perubahan tidak merusak yang sudah bekerja.

- Id: `test-suite`
- Lokasi: `tests/`
- Perintah: `pnpm test`

---

## CI Workflows

Ini adalah feature di dalam Monorepo yang menjalankan alur GitHub Actions (verifikasi, tata kelola, gerbang PR, publikasi, kendali task) pada setiap pull request — pemeriksaan otomatis tanpa diminta manual.

- Id: `ci-workflows`
- Lokasi: `.github/workflows/`

---

## Supply Chain Checker

Ini adalah feature di dalam Monorepo yang memeriksa ketergantungan pihak ketiga terhadap risiko rantai pasok, sebagai peringatan dini sebelum paket luar ditambah atau diperbarui.

- Id: `supply-chain`
- Lokasi: `scripts/check-supply-chain.mjs`
- Perintah: `pnpm check:security`

---

## Gaffer Engine

Ini adalah feature di dalam Monorepo yang mengubah niat bahasa biasa menjadi hasil kerja terverifikasi, dengan rute SOLO/DECOMPOSE dan pekerja termurah yang memenuhi syarat.

- Id: `gaffer-engine`
- Lokasi: `tools/automation/src/gaffer/`
- Perintah: `pnpm saf gaffer run`

---

## SentraBot

Ini adalah feature di dalam Monorepo yang menjadi produk bot Sentra lintas web, desktop, dan mobile.

- Id: `capsule-sentrabot`
- Lokasi: `projects/product/sentrabot`

---

## Kediri History

Ini adalah feature di dalam Monorepo yang menjadi pengalaman web sejarah sinematik resmi untuk Pemerintah Kota Kediri.

- Id: `capsule-kediri-history`
- Lokasi: `projects/product/kediri-history`

---

## Academic Smartboard

Ini adalah feature di dalam Monorepo yang menjadi platform bimbingan belajar multi-tenant.

- Id: `capsule-academic-smartboard`
- Lokasi: `projects/academic/academic-smartboard`

---

## Portfolio Dr. Novia

Ini adalah feature di dalam Monorepo yang menjadi situs portofolio dr. Novia.

- Id: `capsule-portfolio-drnovia`
- Lokasi: `projects/corporate/portfolio-drnovia`

---

## Avery

Ini adalah feature di dalam Monorepo yang menjadi konfigurasi terversi agen Hermes Avery.

- Id: `capsule-avery`
- Lokasi: `projects/healthcare/avery`

---

## Sentra Prompt

Ini adalah feature di dalam Monorepo yang menjadi workspace desktop prompt-engineering.

- Id: `capsule-prompt`
- Lokasi: `projects/internal/prompt`

---

## UNICOM

Ini adalah feature di dalam Monorepo yang menjadi ruang komunikasi multi-agen warisan.

- Id: `capsule-unicom`
- Lokasi: `projects/internal/unicom`

---

## Schemas

Ini adalah feature di dalam Monorepo yang menyimpan kontrak Zod bersama.

- Id: `package-schemas`
- Lokasi: `packages/schemas`

---

## Env

Ini adalah feature di dalam Monorepo yang memisahkan env server vs klien.

- Id: `package-env`
- Lokasi: `packages/env`

---

## UI

Ini adalah feature di dalam Monorepo yang menyediakan primitif tampilan bersama.

- Id: `package-ui`
- Lokasi: `packages/ui`

---

## Config

Ini adalah feature di dalam Monorepo yang membagikan konfigurasi TypeScript bersama.

- Id: `package-config`
- Lokasi: `packages/config`

---

## Project Standalone

Ini adalah feature di dalam Monorepo yang membuktikan kapsul bisa berdiri sendiri.

- Id: `project-standalone`
- Lokasi: `tools/project-standalone`
- Perintah: `pnpm project:verify`

---

## Capsule Template

Ini adalah feature di dalam Monorepo yang menjadi cetakan resmi untuk kapsul project baru.

- Id: `capsule-template`
- Lokasi: `projects/_template`
