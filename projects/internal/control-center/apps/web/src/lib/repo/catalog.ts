import type { FeatureDefinition } from "./types.ts";

/**
 * The feature catalog.
 *
 * Each entry declares *what would prove the feature exists* (`evidence`). The
 * registry checks those paths at read time and computes the connection status
 * from the result. Nothing here asserts a status directly — an entry whose
 * evidence disappears turns red on its own, which is the whole point.
 *
 * User-facing strings are Indonesian; identifiers, paths, and commands stay in
 * their original form.
 */
export const FEATURE_CATALOG: FeatureDefinition[] = [
  // ─── Governance ────────────────────────────────────────────────────────────
  {
    id: "safrs-governance",
    name: "SAFRS Governance",
    area: "governance",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjalankan pemeriksaan aturan rumah secara otomatis — apakah kebijakan dan kepemilikan masih utuh.",
    userValue:
      "Satu perintah memberi tahu apakah aturan repository masih utuh atau ada yang dilanggar — tanpa perlu membaca kode.",
    whenToUse:
      "Sebelum meminta review, sebelum menggabungkan perubahan, dan setelah perubahan apa pun pada aturan.",
    entryPoint: "pnpm governance",
    evidence: [
      { path: "tools/safrs", proves: "Kumpulan pemeriksa Python" },
      { path: "scripts/safrs-verify.mjs", proves: "Titik masuk verifikasi" },
      { path: ".safrs/policy.json", proves: "Kebijakan risiko R0–R3" },
    ],
    risk: "R2",
    actionIds: ["governance"],
    docs: ["SAFRS_SPEC.md", "sentrawiki/tools/safrs.md"],
  },
  {
    id: "automation-control-plane",
    name: "Automation Control Plane",
    area: "automation",
    purpose:
      "Ini adalah feature di dalam Monorepo yang mengatur kontrak kerja agen: lease, gerbang PR, bukti, dan identitas publisher agar bisa diaudit.",
    userValue:
      "Membuat pekerjaan agen dapat diaudit: siapa mengerjakan apa, dengan otoritas apa, dan apa buktinya.",
    whenToUse:
      "Saat memeriksa status gerbang sebelum merge, atau menelusuri jejak pekerjaan agen.",
    entryPoint: "pnpm saf",
    evidence: [
      { path: "tools/automation/src/gates.mjs", proves: "Delapan gerbang PR" },
      { path: "tools/automation/src/leases.mjs", proves: "Rantai lease" },
      { path: "tools/automation/src/evidence.mjs", proves: "Manifest bukti" },
      { path: ".safrs/automation-policy.json", proves: "Kebijakan otomasi" },
    ],
    risk: "R2",
    actionIds: ["saf-gate-all"],
    docs: ["sentrawiki/features/automation-control-plane.md"],
    caveat:
      "Delapan gerbang sudah diterbitkan, tetapi branch `main` belum dilindungi — jadi gerbang belum diwajibkan oleh GitHub.",
  },
  {
    id: "task-registry",
    name: "Task Registry",
    area: "governance",
    purpose:
      "Ini adalah feature di dalam Monorepo yang mencatat siapa memegang pekerjaan pada cakupan mana, supaya tidak saling tabrak.",
    userValue:
      "Terlihat jelas pekerjaan apa yang sedang berjalan dan mana yang sudah selesai.",
    whenToUse: "Sebelum mulai mengubah kode, dan saat menutup pekerjaan.",
    entryPoint: "pnpm task",
    evidence: [
      { path: "tools/task/src/cli.mjs", proves: "CLI task" },
      { path: "tools/task/src/storage.mjs", proves: "Penyimpanan registry" },
    ],
    risk: "R2",
    actionIds: ["task-list"],
    docs: ["sentrawiki/tools/task.md"],
  },
  {
    id: "status-cli",
    name: "Status CLI",
    area: "governance",
    purpose:
      "Ini adalah feature di dalam Monorepo yang memberi laporan hanya-baca tentang task, git, dan tata kelola terkini.",
    userValue:
      "Satu tempat untuk melihat kondisi repository tanpa menjalankan banyak perintah.",
    whenToUse:
      "Di awal sesi kerja, atau saat ingin tahu apa yang sedang terjadi.",
    entryPoint: "pnpm saf:status --json",
    evidence: [
      {
        path: "tools/status/src/cli.mjs",
        proves: "CLI status dengan mode --json",
      },
    ],
    risk: "R2",
    actionIds: ["status-json"],
    docs: ["sentrawiki/tools/status.md"],
  },

  // ─── Tooling ───────────────────────────────────────────────────────────────
  {
    id: "doctor",
    name: "Doctor",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang memeriksa apakah komputer lokal siap menjalankan proyek, plus cara memperbaikinya.",
    userValue:
      "Menjawab pertanyaan “kenapa aplikasi tidak mau jalan?” dengan solusi konkret, dalam bahasa Indonesia.",
    whenToUse:
      "Paling awal — sebelum menyiapkan lingkungan atau menjalankan aplikasi.",
    entryPoint: "pnpm doctor",
    evidence: [{ path: "tools/doctor/src/cli.mjs", proves: "CLI doctor" }],
    risk: "R1",
    actionIds: ["doctor"],
    docs: ["sentrawiki/tools/doctor.md"],
  },
  {
    id: "project-wizard",
    name: "Project Wizard",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang membuat kapsul project baru dari template resmi agar langsung ikut aturan SAFRS.",
    userValue:
      "Project baru langsung mengikuti aturan repository, tanpa menyalin manual.",
    whenToUse: "Saat memulai produk atau layanan baru.",
    entryPoint: "pnpm project:new",
    evidence: [
      { path: "tools/project-wizard/src/cli.mjs", proves: "CLI wizard" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/tools/project-wizard.md"],
  },
  {
    id: "capabilities",
    name: "Capabilities",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyalakan kemampuan opsional per project (AI, email, Stripe, dll.) hanya saat dipilih.",
    userValue:
      "Fitur tambahan hanya menyala saat benar-benar dipilih, jadi repository tetap ringan.",
    whenToUse:
      "Saat sebuah project butuh pembayaran, email, atau kemampuan lain.",
    entryPoint: "pnpm capability:add",
    evidence: [
      { path: "tools/capabilities/src/cli.mjs", proves: "CLI kemampuan" },
      {
        path: "tools/capabilities/manifests/stripe.json",
        proves: "Manifest Stripe",
      },
      {
        path: "tools/capabilities/manifests/email.json",
        proves: "Manifest email",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/features/capability-packs.md"],
    caveat:
      "Mencatat sebuah kemampuan sebagai aktif bukan bukti bahwa layanannya sudah benar-benar terpasang dan berjalan.",
  },
  {
    id: "codegen",
    name: "Codegen",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menghasilkan OpenAPI, mock, dan klien bertipe dari kontrak Zod.",
    userValue:
      "Kontrak data dan kode selalu sinkron tanpa menulis ulang manual.",
    whenToUse: "Setelah kontrak data berubah.",
    entryPoint: "pnpm codegen",
    evidence: [{ path: "tools/codegen/src/cli.mjs", proves: "CLI codegen" }],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/tools/codegen.md"],
  },
  {
    id: "deps-graph",
    name: "Deps Graph",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menggambar hubungan antar paket supaya terlihat dampak perubahan.",
    userValue: "Terlihat paket mana yang terdampak jika satu paket diubah.",
    whenToUse: "Sebelum mengubah paket bersama.",
    entryPoint: "pnpm deps:graph",
    evidence: [
      {
        path: "tools/deps-graph/src/cli.mjs",
        proves: "CLI peta ketergantungan",
      },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["sentrawiki/tools/deps-graph.md"],
  },

  // ─── Packages ──────────────────────────────────────────────────────────────
  {
    id: "package-token",
    name: "Design Token",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi sumber tunggal warna dan radius Sentra, dengan cek kontras otomatis.",
    userValue:
      "Seluruh tampilan konsisten dan tetap terbaca, tanpa mengurus warna satu per satu.",
    whenToUse: "Setiap kali membangun tampilan apa pun.",
    entryPoint: "pnpm check:tokens",
    evidence: [
      { path: "packages/token/src/tokens.css", proves: "Nilai token" },
      {
        path: "scripts/check-tokens.mjs",
        proves: "Pemeriksa kontras dan nilai mentah",
      },
    ],
    risk: "R2",
    actionIds: ["check-tokens"],
    docs: [
      "sentrawiki/features/design-tokens.md",
      "packages/token/UI-RULES.md",
    ],
  },
  {
    id: "package-database",
    name: "Database",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyediakan basis data lokal (PostgreSQL + Prisma) untuk uji tanpa menyentuh produksi.",
    userValue:
      "Bisa mencoba aplikasi dengan data nyata tanpa menyentuh data produksi.",
    whenToUse: "Saat menjalankan aplikasi secara lokal.",
    entryPoint: "pnpm db:start",
    evidence: [{ path: "packages/database", proves: "Paket basis data" }],
    risk: "R2",
    actionIds: ["db-start", "db-migrate", "db-seed"],
    docs: ["sentrawiki/packages/database.md"],
    caveat: "Membutuhkan Docker Desktop berjalan.",
  },
  {
    id: "package-api",
    name: "API",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyediakan rute Hono bertipe dan klien terinferensi sebagai pintu data antar bagian.",
    userValue:
      "Perubahan kontrak langsung terdeteksi sebelum aplikasi dijalankan.",
    whenToUse: "Saat menambah atau mengubah endpoint.",
    entryPoint: "/api",
    evidence: [
      { path: "packages/api/src/app.ts", proves: "Definisi rute" },
      { path: "packages/api/src/openapi.ts", proves: "Dokumen OpenAPI" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/api/index.md", "sentrawiki/api/rest-endpoints.md"],
  },
  {
    id: "package-telemetry",
    name: "Telemetry",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang mengirim jejak OpenTelemetry ke Jaeger lokal untuk melihat lambat/gagal.",
    userValue: "Bisa melihat di bagian mana aplikasi melambat atau gagal.",
    whenToUse:
      "Saat menelusuri masalah performa atau error yang sulit ditangkap.",
    entryPoint: "compose.telemetry.yaml",
    evidence: [
      { path: "packages/telemetry", proves: "Paket telemetry" },
      { path: "compose.telemetry.yaml", proves: "Kolektor Jaeger lokal" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/how-to-monitor/index.md"],
    caveat: "Membutuhkan kolektor Jaeger lokal dijalankan lebih dulu.",
  },

  // ─── Apps ──────────────────────────────────────────────────────────────────
  {
    id: "golden-path",
    name: "Golden Path",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi aplikasi rujukan: membuktikan alur Database → API → Web berjalan utuh.",
    userValue:
      "Contoh hidup yang bisa ditiru saat membangun produk berikutnya.",
    whenToUse: "Saat ingin melihat pola resmi repository bekerja.",
    entryPoint: "pnpm dev",
    evidence: [
      {
        path: "projects/internal/golden-path/apps/web/src/app/page.tsx",
        proves: "Halaman utama",
      },
      {
        path: "projects/internal/golden-path/apps/web/e2e/golden-path.spec.ts",
        proves: "Uji ujung-ke-ujung",
      },
    ],
    risk: "R1",
    actionIds: ["dev"],
    docs: [
      "projects/internal/golden-path/README.md",
      "sentrawiki/apps/golden-path-web.md",
    ],
    caveat: "Membutuhkan Docker Desktop dan basis data lokal.",
  },
  {
    id: "control-center",
    name: "Control Center",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi papan kendali operator: membaca repository dan menampilkan keadaan setiap fitur.",
    userValue:
      "Satu layar untuk memahami dan menjalankan repository tanpa membuka kode.",
    whenToUse:
      "Setiap kali ingin tahu keadaan repository atau menjalankan sesuatu dengan aman.",
    entryPoint: "pnpm --filter @sentra/control-center dev",
    evidence: [
      {
        path: "projects/internal/control-center/apps/web/src/lib/repo/registry.ts",
        proves: "Registry fitur",
      },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["docs/dashboard-integration.md"],
  },

  // ─── Data ──────────────────────────────────────────────────────────────────
  {
    id: "corpus-engine",
    name: "Corpus Engine",
    area: "data",
    purpose:
      "Ini adalah feature di dalam Monorepo yang mengubah PDF medis menjadi basis pengetahuan yang bisa ditanya dengan sitasi.",
    userValue:
      "Ratusan dokumen pedoman klinis menjadi sumber jawaban yang dapat ditelusuri, bukan tumpukan PDF.",
    whenToUse:
      "Saat menambah dokumen baru ke korpus, atau menyiapkan agen pengetahuan.",
    entryPoint: "projects/corpus-engine",
    evidence: [
      {
        path: "projects/corpus-engine/src/corpus_engine/flow.py",
        proves: "Alur pipeline",
      },
      {
        path: "projects/corpus-engine/src/corpus_engine/parse.py",
        proves: "Pembaca PDF",
      },
      {
        path: "projects/corpus-engine/src/corpus_engine/query.py",
        proves: "Pencarian korpus",
      },
      {
        path: "database/canonical/manifest.jsonl",
        proves: "Daftar dokumen kanonik yang sudah diproses",
      },
    ],
    branch: "feat/corpus-engine-poc",
    risk: "R2",
    actionIds: [],
    docs: [
      "docs/superpowers/specs/2026-08-11-medical-pdf-rag-design.md",
      "docs/corpus/LIBRARIAN_PROTOCOL.md",
    ],
    caveat:
      "Kode sudah selesai dan teruji, tetapi masih berada di branch `feat/corpus-engine-poc` dan belum digabungkan ke `main`. Penggabungan adalah keputusan manusia (R2). Data korpus di `database/` tidak ikut git — cadangkan terpisah.",
  },

  // ─── Knowledge ─────────────────────────────────────────────────────────────
  {
    id: "wiki",
    name: "Wiki",
    area: "knowledge",
    purpose:
      "Ini adalah feature di dalam Monorepo yang berisi penjelasan manusia untuk control plane, kapsul, paket, tool, dan istilah.",
    userValue: "Penjelasan bahasa manusia untuk setiap bagian repository.",
    whenToUse: "Saat ingin memahami sesuatu sebelum menyentuhnya.",
    entryPoint: "sentrawiki/overview/index.md",
    evidence: [
      { path: "sentrawiki/overview/index.md", proves: "Halaman ringkasan" },
      {
        path: "sentrawiki/.wiki-meta.json",
        proves: "Metadata dan urutan halaman",
      },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["sentrawiki/overview/index.md"],
  },
  {
    id: "agent-adapters",
    name: "Agent Adapters",
    area: "knowledge",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyambungkan Claude, Cursor, dan Codex ke AGENTS.md tanpa menduplikasi aturan.",
    userValue: "Agen mana pun yang dipakai tetap tunduk pada aturan yang sama.",
    whenToUse: "Saat menyiapkan atau mengganti asisten AI.",
    entryPoint: "docs/bootstrap/CLAUDE_SETUP.md",
    evidence: [
      { path: "AGENTS.md", proves: "Aturan kanonik" },
      { path: ".claude/settings.json", proves: "Adapter Claude Code" },
      { path: ".cursor/mcp.json", proves: "Adapter Cursor" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["docs/bootstrap/CLAUDE_SETUP.md"],
  },

  // ─── Quality ───────────────────────────────────────────────────────────────
  {
    id: "test-suite",
    name: "Test Suite",
    area: "quality",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjalankan rangkaian uji sebagai bukti perubahan tidak merusak yang sudah bekerja.",
    userValue: "Bukti bahwa perubahan tidak merusak yang sudah bekerja.",
    whenToUse: "Sebelum menganggap perubahan aman.",
    entryPoint: "pnpm test",
    evidence: [
      { path: "tests/contracts", proves: "Uji kontrak" },
      { path: "tests/governance", proves: "Uji tata kelola" },
      { path: "tests/architecture", proves: "Uji topologi arsitektur" },
    ],
    risk: "R1",
    actionIds: ["test"],
    docs: ["sentrawiki/how-to-contribute/testing.md"],
    caveat:
      "Uji integrasi basis data gagal bila Docker tidak berjalan — itu keterbatasan lingkungan, bukan kerusakan kode.",
  },
  {
    id: "ci-workflows",
    name: "CI Workflows",
    area: "quality",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjalankan alur GitHub Actions pada pull request secara otomatis.",
    userValue:
      "Pemeriksaan otomatis berjalan pada setiap pull request tanpa diminta.",
    whenToUse: "Saat membuka atau meninjau pull request.",
    entryPoint: ".github/workflows/ci.yml",
    evidence: [
      { path: ".github/workflows/ci.yml", proves: "Alur verifikasi" },
      {
        path: ".github/workflows/safrs-governance.yml",
        proves: "Alur tata kelola",
      },
      {
        path: ".github/workflows/safrs-pr-gates.yml",
        proves: "Alur delapan gerbang",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/how-to-contribute/development-workflow.md"],
    caveat:
      "Alur `ci.yml` memverifikasi pull request dan push ke `main`. Ia membutuhkan Git LFS untuk snapshot visual dan PostgreSQL disposable di port 54329. Ia tidak men-deploy produksi.",
  },
  {
    id: "supply-chain",
    name: "Supply Chain Checker",
    area: "quality",
    purpose:
      "Ini adalah feature di dalam Monorepo yang memeriksa risiko rantai pasok pada ketergantungan pihak ketiga.",
    userValue:
      "Peringatan dini bila sebuah paket pihak ketiga menjadi berisiko.",
    whenToUse: "Sebelum menambah atau memperbarui ketergantungan.",
    entryPoint: "pnpm check:security",
    evidence: [
      { path: "scripts/check-supply-chain.mjs", proves: "Skrip pemeriksa" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["SECURITY.md"],
  },

  // ─── Gap fill (1): Gaffer ──────────────────────────────────────────────────
  {
    id: "gaffer-engine",
    name: "Gaffer Engine",
    area: "automation",
    purpose:
      "Ini adalah feature di dalam Monorepo yang mengubah niat bahasa biasa menjadi hasil kerja terverifikasi, dengan rute SOLO/DECOMPOSE dan pekerja termurah yang memenuhi syarat.",
    userValue:
      "Chief cukup bilang mau apa; Gaffer mengatur pembagian kerja, verifikasi SAFRS, dan jejak bukti — tanpa menebak otoritas.",
    whenToUse:
      "Saat ingin menjalankan intent end-to-end lewat orkestrasi, bukan mengedit katalog atau menjalankan satu perintah kecil.",
    entryPoint: "pnpm saf gaffer run",
    evidence: [
      {
        path: "tools/automation/src/gaffer",
        proves: "Runtime orkestrasi Gaffer",
      },
      {
        path: "tools/automation/src/gaffer/runner.mjs",
        proves: "Runner provider-neutral",
      },
      {
        path: ".agents/skills/gaffer-orchestration/SKILL.md",
        proves: "Skill /gaffer",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: [
      "sentrawiki/features/gaffer-orchestration.md",
      "docs/architecture/GAFFER_ORCHESTRATION_FRAMEWORK.md",
    ],
    caveat:
      "Provider Codex v0.1 masih punya callback tersimulasi; validasi ekonomi (Phase 4) belum selesai. Audit default belum setara review independen penuh.",
  },

  // ─── Gap fill (2): tujuh kapsul produk / internal ──────────────────────────
  {
    id: "capsule-sentrabot",
    name: "SentraBot",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi produk bot Sentra lintas web, desktop, dan mobile — dengan kontrak bersama dan adapter opsional.",
    userValue:
      "Satu produk bot yang bisa dirilis publik, tanpa mengikat runtime ke root Monorepo.",
    whenToUse: "Saat mengerjakan atau merilis SentraBot.",
    entryPoint: "projects/product/sentrabot",
    evidence: [
      { path: "projects/product/sentrabot/AGENTS.md", proves: "Router kapsul" },
      { path: "projects/product/sentrabot/README.md", proves: "README produk" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/product/sentrabot/AGENTS.md"],
  },
  {
    id: "capsule-kediri-history",
    name: "Kediri History",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi pengalaman web sejarah sinematik resmi untuk Pemerintah Kota Kediri.",
    userValue:
      "Kapsul produk berdaulat untuk situs sejarah Kediri — install/build/test mandiri.",
    whenToUse: "Saat mengerjakan situs Kediri History.",
    entryPoint: "projects/product/kediri-history",
    evidence: [
      {
        path: "projects/product/kediri-history/project.contract.json",
        proves: "Kontrak lifecycle kapsul",
      },
      {
        path: "projects/product/kediri-history",
        proves: "Direktori kapsul",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/product/kediri-history/project.contract.json"],
  },
  {
    id: "capsule-academic-smartboard",
    name: "Academic Smartboard",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi platform bimbingan belajar multi-tenant (penjadwalan, kurikulum, payroll tutor, agen Kayyisa).",
    userValue:
      "Kapsul akademik lengkap dengan site publik dan app web — berdiri sendiri dari root.",
    whenToUse: "Saat mengerjakan El-Kayyisa / Smartboard.",
    entryPoint: "projects/academic/academic-smartboard",
    evidence: [
      {
        path: "projects/academic/academic-smartboard/AGENTS.md",
        proves: "Router kapsul",
      },
      {
        path: "projects/academic/academic-smartboard/project.contract.json",
        proves: "Kontrak lifecycle",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/academic/academic-smartboard/AGENTS.md"],
  },
  {
    id: "capsule-portfolio-drnovia",
    name: "Portfolio Dr. Novia",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi situs portofolio dr. Novia (React + Lenis), kapsul statis tanpa lockfile root.",
    userValue:
      "Kehadiran publik klinik/portofolio yang bisa dijalankan mandiri.",
    whenToUse: "Saat mengubah situs portofolio Dr. Novia.",
    entryPoint: "projects/corporate/portfolio-drnovia",
    evidence: [
      {
        path: "projects/corporate/portfolio-drnovia/AGENTS.md",
        proves: "Router kapsul",
      },
      {
        path: "projects/corporate/portfolio-drnovia/project.contract.json",
        proves: "Kontrak lifecycle",
      },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["projects/corporate/portfolio-drnovia/AGENTS.md"],
  },
  {
    id: "capsule-avery",
    name: "Avery",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi konfigurasi terversi agen Hermes Avery — dari laptop sampai VPS — tanpa memasang ulang tiap agen baru.",
    userValue:
      "Agen WhatsApp/Hermes milik Sentra dikelola sebagai konfigurasi, bukan tebak-tebakan runtime.",
    whenToUse: "Saat merawat persona, skill, atau deploy Avery.",
    entryPoint: "projects/healthcare/avery",
    evidence: [
      {
        path: "projects/healthcare/avery/AGENTS.md",
        proves: "Router kapsul",
      },
      {
        path: "projects/healthcare/avery/README.md",
        proves: "README operasional",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/healthcare/avery/AGENTS.md"],
    caveat:
      "Kredensial, sesi WhatsApp, dan memories tidak boleh masuk git — hanya konfigurasi dan skrip yang tercatat.",
  },
  {
    id: "capsule-prompt",
    name: "Sentra Prompt",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi workspace desktop prompt-engineering (Electron) yang berdiri sendiri dari root SAFRS.",
    userValue:
      "Lingkungan prompt lokal dengan IPC dan data pengguna — tanpa bergantung workspace root.",
    whenToUse: "Saat mengerjakan aplikasi Prompt.",
    entryPoint: "projects/internal/prompt",
    evidence: [
      {
        path: "projects/internal/prompt/project.contract.json",
        proves: "Kontrak lifecycle",
      },
      {
        path: "projects/internal/prompt/AGENTS.md",
        proves: "Router kapsul",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/internal/prompt/AGENTS.md"],
  },
  {
    id: "capsule-unicom",
    name: "UNICOM",
    area: "apps",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi ruang komunikasi multi-agen warisan, sebagai kapsul Next.js mandiri.",
    userValue:
      "Ruang komunikasi agen lokal yang bisa dijalankan tanpa path root Monorepo.",
    whenToUse: "Saat mengerjakan atau memverifikasi UNICOM.",
    entryPoint: "projects/internal/unicom",
    evidence: [
      {
        path: "projects/internal/unicom/project.contract.json",
        proves: "Kontrak lifecycle",
      },
      {
        path: "projects/internal/unicom/AGENTS.md",
        proves: "Router kapsul",
      },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["projects/internal/unicom/AGENTS.md"],
  },

  // ─── Gap fill (3): paket bersama + standalone (+ template) ─────────────────
  {
    id: "package-schemas",
    name: "Schemas",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyimpan kontrak Zod bersama — sumber kebenaran skema untuk API dan codegen.",
    userValue:
      "Perubahan kontrak data terkumpul di satu tempat, bukan tersebar di tiap app.",
    whenToUse: "Saat menambah atau mengubah kontrak data bersama.",
    entryPoint: "packages/schemas",
    evidence: [
      { path: "packages/schemas/package.json", proves: "Paket @safrs/schemas" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/packages/schemas.md"],
  },
  {
    id: "package-env",
    name: "Env",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang memisahkan env server vs klien agar rahasia tidak bocor ke browser.",
    userValue:
      "Batas aman untuk variabel lingkungan — server-only tidak ikut ke client.",
    whenToUse: "Saat menambah variabel lingkungan atau mengaudit batas env.",
    entryPoint: "packages/env",
    evidence: [
      { path: "packages/env/package.json", proves: "Paket @safrs/env" },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/packages/env.md"],
  },
  {
    id: "package-ui",
    name: "UI",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menyediakan primitif tampilan bersama (mis. StatusCard) di atas design token Sentra.",
    userValue:
      "Komponen presentasi yang bisa dipakai ulang tanpa menduplikasi pola UI.",
    whenToUse: "Saat membangun permukaan UI yang memakai paket bersama root.",
    entryPoint: "packages/ui",
    evidence: [{ path: "packages/ui/package.json", proves: "Paket @safrs/ui" }],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/packages/ui.md"],
    caveat:
      "Saat ini masih tipis (StatusCard dan sejenisnya) — bukan design system kedua; token tetap di @sentra/token.",
  },
  {
    id: "package-config",
    name: "Config",
    area: "packages",
    purpose:
      "Ini adalah feature di dalam Monorepo yang membagikan konfigurasi TypeScript bersama antar paket root.",
    userValue:
      "Satu dasar tsconfig supaya paket tidak masing-masing mengarang aturan kompilasi.",
    whenToUse: "Saat menyelaraskan TypeScript antar paket @safrs/*.",
    entryPoint: "packages/config",
    evidence: [
      { path: "packages/config/package.json", proves: "Paket @safrs/config" },
    ],
    risk: "R1",
    actionIds: [],
    docs: ["sentrawiki/packages/config.md"],
  },
  {
    id: "project-standalone",
    name: "Project Standalone",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang membuktikan kapsul bisa berdiri sendiri: cek struktural dan ekstraksi empiris tanpa bergantung root.",
    userValue:
      "Chief mendapat bukti mesin bahwa kapsul portable — bukan hanya janji di dokumen.",
    whenToUse:
      "Sebelum mengklaim kapsul mandiri, atau setelah mengubah kontrak lifecycle.",
    entryPoint: "pnpm project:verify",
    evidence: [
      {
        path: "tools/project-standalone/src/cli.mjs",
        proves: "CLI verify/status",
      },
      {
        path: "tools/project-standalone/src/extraction.mjs",
        proves: "Verifier ekstraksi",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["sentrawiki/verification/standalone.md"],
  },
  {
    id: "capsule-template",
    name: "Capsule Template",
    area: "tooling",
    purpose:
      "Ini adalah feature di dalam Monorepo yang menjadi cetakan resmi untuk kapsul project baru (dipakai Project Wizard).",
    userValue:
      "Project baru mulai dari pola yang sudah disetujui, bukan disalin sembarangan.",
    whenToUse: "Saat membuat kapsul baru atau memperbaiki template.",
    entryPoint: "projects/_template",
    evidence: [
      {
        path: "projects/_template/AGENTS.md",
        proves: "Router template kapsul",
      },
    ],
    risk: "R2",
    actionIds: [],
    docs: ["projects/_template/AGENTS.md"],
  },
];
