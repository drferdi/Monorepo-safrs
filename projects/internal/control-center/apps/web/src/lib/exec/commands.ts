import type { RiskTier } from "../control-center.ts";

/**
 * The command allowlist.
 *
 * This is the security boundary of the whole dashboard. Two rules make it hold:
 *
 * 1. **Nothing is built from a string.** Every command is a fixed executable
 *    plus a fixed argument array. No shell, no interpolation, no user input
 *    reaching a command line — so there is nothing for an injection to inject
 *    into.
 * 2. **Only ids cross the wire.** The browser sends a command id; the server
 *    looks it up here. An id that is not in this table cannot run, whatever the
 *    request says.
 *
 * Adding an entry is a deliberate act. Anything that mutates the machine must
 * set `mutation: true` and carry a `confirmPhrase`, and R3 must never appear
 * here at all — production stays outside this board by construction.
 */
export type RunnableCommand = {
  /** Matches a ControlAction id in `lib/actions.ts` where one exists. */
  id: string;
  /** Indonesian, shown on the button. */
  label: string;
  file: string;
  args: string[];
  risk: Exclude<RiskTier, "R3">;
  /** True when running this changes the machine. */
  mutation: boolean;
  /** Indonesian: what will happen, shown before it runs. */
  effect: string;
  /** Exact phrase the operator must confirm. Required when mutation is true. */
  confirmPhrase?: string;
  /** Hard timeout in milliseconds. */
  timeoutMs: number;
  /**
   * True for long-running servers that never exit on their own. These are
   * deliberately excluded from this board — a dashboard request cannot own a
   * process that outlives it.
   */
  longRunning?: boolean;
};

export const RUNNABLE_COMMANDS: RunnableCommand[] = [
  {
    id: "doctor",
    label: "Periksa kesiapan mesin",
    file: "node",
    args: ["tools/doctor/src/cli.mjs"],
    risk: "R0",
    mutation: false,
    effect:
      "Hanya membaca. Memeriksa Node, pnpm, Git, Docker, file lingkungan, DATABASE_URL, PostgreSQL lokal, dan Prisma Client. Tidak mengubah apa pun.",
    timeoutMs: 90_000,
  },
  {
    id: "status",
    label: "Baca status tata kelola",
    file: "node",
    args: ["tools/status/src/cli.mjs", "--json"],
    risk: "R0",
    mutation: false,
    effect:
      "Hanya membaca. Menampilkan registry task, lease, keadaan git, dan hasil tata kelola terkini.",
    timeoutMs: 90_000,
  },
  {
    id: "task-list",
    label: "Lihat daftar task",
    file: "node",
    args: ["tools/task/src/cli.mjs", "list"],
    risk: "R0",
    mutation: false,
    effect:
      "Hanya membaca registry task. Tidak mengubah status pekerjaan siapa pun.",
    timeoutMs: 60_000,
  },
  {
    id: "deps-graph",
    label: "Gambar peta ketergantungan",
    file: "node",
    args: ["tools/deps-graph/src/cli.mjs"],
    risk: "R0",
    mutation: false,
    effect:
      "Hanya membaca manifest paket lalu menggambar hubungan antar paket.",
    timeoutMs: 60_000,
  },
  {
    id: "governance",
    label: "Verifikasi tata kelola",
    file: "node",
    args: ["scripts/safrs-verify.mjs"],
    risk: "R1",
    mutation: false,
    effect:
      "Menjalankan seluruh pemeriksa SAFRS. Hanya membaca dan menguji; tidak mengubah kebijakan maupun kode. Bisa memakan beberapa menit.",
    timeoutMs: 600_000,
  },
  {
    id: "check-tokens",
    label: "Periksa design token",
    file: "node",
    args: ["scripts/check-tokens.mjs"],
    risk: "R1",
    mutation: false,
    effect:
      "Memindai nilai warna mentah dan menghitung ulang kontras WCAG 2.2 AA. Hanya membaca.",
    timeoutMs: 120_000,
  },
  {
    id: "test",
    label: "Jalankan rangkaian uji",
    file: "node",
    args: ["scripts/test.mjs"],
    risk: "R1",
    mutation: false,
    effect:
      "Menjalankan uji repository. Tidak menyentuh data produksi. Uji integrasi basis data akan gagal bila Docker mati — itu keterbatasan lingkungan, bukan kerusakan kode.",
    timeoutMs: 900_000,
  },
  {
    id: "setup",
    label: "Siapkan lingkungan lokal",
    file: "pnpm",
    args: ["setup"],
    risk: "R1",
    mutation: true,
    effect:
      "Empat langkah berurutan: (1) membuat .env dari .env.example — berkas .env yang sudah ada tidak ditimpa; (2) menolak seluruh proses jika DATABASE_URL bukan PostgreSQL lokal sekali pakai; (3) menyalakan kontainer PostgreSQL lokal lewat Docker; (4) menjalankan generate, migrate, lalu seed sehingga tabel dan data contoh terisi. Membutuhkan Docker Desktop sudah berjalan — tanpa itu berhenti di langkah 3. Tidak menyentuh produksi.",
    confirmPhrase: "SIAPKAN LINGKUNGAN LOKAL",
    timeoutMs: 600_000,
  },
  {
    id: "db-generate",
    label: "Buat Prisma Client",
    file: "pnpm",
    args: ["db:generate"],
    risk: "R1",
    mutation: true,
    effect:
      "Menghasilkan Prisma Client dari skema Prisma. Hanya menulis berkas hasil generate di dalam packages/database; tidak menyentuh isi basis data dan tidak membutuhkan Docker.",
    confirmPhrase: "BUAT PRISMA CLIENT",
    timeoutMs: 300_000,
  },
  {
    id: "db-start",
    label: "Nyalakan basis data lokal",
    file: "pnpm",
    args: ["db:start"],
    risk: "R1",
    mutation: true,
    effect:
      "Menyalakan kontainer PostgreSQL lokal sekali pakai dan menunggu sampai siap menerima koneksi. Tidak membuat tabel dan tidak mengisi data — itu pekerjaan Siapkan lingkungan lokal. Membutuhkan Docker Desktop sudah berjalan.",
    confirmPhrase: "NYALAKAN BASIS DATA LOKAL",
    timeoutMs: 300_000,
  },
  {
    id: "db-stop",
    label: "Matikan basis data lokal",
    file: "pnpm",
    args: ["db:stop"],
    risk: "R1",
    mutation: true,
    effect:
      "Menghentikan kontainer PostgreSQL lokal. Volume tidak dihapus, jadi data lokal tetap ada saat dinyalakan kembali.",
    confirmPhrase: "MATIKAN BASIS DATA LOKAL",
    timeoutMs: 120_000,
  },
  {
    id: "lint",
    label: "Periksa gaya kode",
    file: "pnpm",
    args: ["lint"],
    risk: "R1",
    mutation: false,
    effect:
      "Hanya membaca. Menjalankan Biome atas seluruh repository dan melaporkan pelanggaran gaya tanpa mengubah berkas.",
    timeoutMs: 300_000,
  },
  {
    id: "typecheck",
    label: "Periksa tipe TypeScript",
    file: "pnpm",
    args: ["typecheck"],
    risk: "R1",
    mutation: false,
    effect:
      "Hanya membaca kode dan menulis cache compiler. Menjalankan tsc untuk setiap paket melalui turbo.",
    timeoutMs: 600_000,
  },
  {
    id: "build",
    label: "Bangun seluruh paket",
    file: "pnpm",
    args: ["build"],
    risk: "R1",
    mutation: false,
    effect:
      "Menjalankan build setiap paket melalui turbo. Hasilnya hanya artefak cache yang tidak dilacak git; tidak ada berkas sumber yang berubah.",
    timeoutMs: 1_200_000,
  },
  {
    id: "check",
    label: "Jalankan pemeriksaan mutu penuh",
    file: "pnpm",
    args: ["check"],
    risk: "R1",
    mutation: false,
    effect:
      "Rantai enam gerbang berurutan: governance, token, lint, typecheck, test, build. Berhenti pada gerbang pertama yang gagal. Bisa memakan waktu lama.",
    timeoutMs: 1_800_000,
  },
  {
    id: "supply-chain",
    label: "Periksa rantai pasok dependensi",
    file: "node",
    args: ["scripts/check-supply-chain.mjs"],
    risk: "R1",
    mutation: false,
    effect:
      "Hanya membaca. Memeriksa kebijakan dependensi dan rantai pasok tanpa memasang atau mengubah apa pun.",
    timeoutMs: 300_000,
  },
  {
    id: "saf-gate-all",
    label: "Jalankan delapan gerbang publikasi",
    file: "node",
    args: ["tools/automation/src/cli.mjs", "gate", "--all"],
    risk: "R0",
    mutation: false,
    effect:
      "Hanya membaca. Mengevaluasi kedelapan gerbang publikasi SAFRS terhadap keadaan repository saat ini dan melaporkan verdict per gerbang.",
    timeoutMs: 120_000,
  },
  {
    id: "db-migrate",
    label: "Terapkan skema basis data lokal",
    file: "pnpm",
    args: ["db:migrate"],
    risk: "R1",
    mutation: true,
    effect:
      "Menerapkan migrasi Prisma ke basis data PostgreSQL lokal sekali pakai. Membutuhkan Docker dan basis data lokal sudah menyala. Tidak menyentuh produksi.",
    confirmPhrase: "TERAPKAN SKEMA LOKAL",
    timeoutMs: 300_000,
  },
  {
    id: "db-seed",
    label: "Isi data contoh",
    file: "pnpm",
    args: ["db:seed"],
    risk: "R1",
    mutation: true,
    effect:
      "Menulis data contoh ke basis data lokal sekali pakai. Membutuhkan skema sudah diterapkan. Tidak menyentuh produksi.",
    confirmPhrase: "ISI DATA CONTOH",
    timeoutMs: 300_000,
  },
];

export function runnableById(id: string): RunnableCommand | undefined {
  return RUNNABLE_COMMANDS.find((command) => command.id === id);
}

/** Ids the board may render a live Run button for. */
export const RUNNABLE_IDS = new Set(RUNNABLE_COMMANDS.map((c) => c.id));

/**
 * Which allowlisted command repairs a given readiness check.
 *
 * A check with no entry here needs a human at the machine — starting Docker
 * Desktop is not something a web request can do, and pretending otherwise would
 * put a button on the page that cannot work.
 */
export const RECOVERY_COMMAND: Record<string, string> = {
  "environment-file": "setup",
  "database-url": "setup",
  "postgres-ready": "db-start",
  "prisma-client": "db-generate",
};
