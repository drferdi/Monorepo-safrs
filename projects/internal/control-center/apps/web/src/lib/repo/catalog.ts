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
    name: "Pemeriksa Tata Kelola SAFRS",
    area: "governance",
    purpose:
      "Menjalankan seluruh pemeriksaan tata kelola repository secara otomatis: kebijakan risiko, registry dokumen, inventaris tool, topologi, dan kepemilikan task.",
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
    name: "Bidang Kendali Otomasi",
    area: "automation",
    purpose:
      "Kontrak task, rantai lease, delapan gerbang pull request, buku anggaran, manifest bukti, verifikasi persetujuan, dan identitas publisher.",
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
    name: "Registry Task",
    area: "governance",
    purpose:
      "Mencatat siapa yang sedang memegang pekerjaan pada cakupan mana, agar dua pekerjaan tidak bertabrakan.",
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
    name: "Laporan Status Repository",
    area: "governance",
    purpose:
      "Laporan hanya-baca berisi registry task, lease, keadaan git, dan hasil tata kelola terkini.",
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
    name: "Pemeriksa Kesiapan Mesin",
    area: "tooling",
    purpose:
      "Memeriksa Node, pnpm, Git, Docker, file lingkungan, DATABASE_URL, PostgreSQL lokal, dan Prisma Client.",
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
    name: "Pembuat Project Baru",
    area: "tooling",
    purpose: "Membuat kapsul project SAFRS baru dari template resmi.",
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
    name: "Paket Kemampuan Opsional",
    area: "tooling",
    purpose:
      "Mengaktifkan kemampuan opsional per project: ai, electron, email, python, stripe, wxt.",
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
    name: "Pembuat Kode dari Skema",
    area: "tooling",
    purpose: "Menghasilkan OpenAPI, mock, dan klien bertipe dari kontrak Zod.",
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
    name: "Peta Ketergantungan Paket",
    area: "tooling",
    purpose: "Menggambarkan hubungan antar paket di dalam monorepo.",
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
    name: "Sistem Design Token",
    area: "packages",
    purpose:
      "Satu-satunya tempat nilai warna dan radius Sentra boleh ditulis, dengan pemeriksaan kontras WCAG 2.2 AA otomatis.",
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
    name: "Basis Data Lokal",
    area: "packages",
    purpose:
      "PostgreSQL lokal, Prisma, migrasi, data contoh, dan pengaman reset.",
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
    name: "API Bertipe",
    area: "packages",
    purpose:
      "Rute Hono bertipe, klien terinferensi, dan amplop error yang konsisten.",
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
    name: "Observabilitas",
    area: "packages",
    purpose: "Jejak OpenTelemetry yang dikirim ke Jaeger lokal.",
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
    name: "Golden Path (Aplikasi Rujukan)",
    area: "apps",
    purpose:
      "Satu aplikasi Next.js yang membuktikan alur Basis Data → API bertipe → Web bekerja utuh.",
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
    name: "Control Center (Dashboard Ini)",
    area: "apps",
    purpose:
      "Pusat kendali yang membaca repository secara langsung dan menampilkan seluruh fitur beserta status kejujurannya.",
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
    name: "Pustaka Medis (PDF → Basis Pengetahuan)",
    area: "data",
    purpose:
      "Mengubah korpus PDF medis terkurasi menjadi basis pengetahuan yang bisa ditanya dengan sitasi: Docling → JSON kanonik → gerbang mutu → potongan → embedding BGE-M3 → PostgreSQL/pgvector.",
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
    name: "Wiki Repository",
    area: "knowledge",
    purpose:
      "79 halaman penjelasan repository: control plane, kapsul, kedaulatan, paket, tool, fitur, keamanan, dan istilah.",
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
    name: "Adapter Agen AI",
    area: "knowledge",
    purpose:
      "Adapter netral-vendor untuk Claude Code, Cursor, dan Codex yang menunjuk ke AGENTS.md tanpa menduplikasi aturan.",
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
    name: "Rangkaian Uji",
    area: "quality",
    purpose:
      "Uji kontrak, uji perilaku repository, uji tata kelola Python, uji arsitektur, dan uji integrasi basis data.",
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
    name: "Alur CI GitHub",
    area: "quality",
    purpose:
      "Lima alur kerja: verifikasi umum, tata kelola, gerbang pull request, publikasi, dan kendali task.",
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
    name: "Pemeriksa Rantai Pasok",
    area: "quality",
    purpose: "Memeriksa ketergantungan terhadap risiko rantai pasok.",
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
];
