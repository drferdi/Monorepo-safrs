Last updated: 2026-09-21 (Codex — internal capsule migrations)

## Capsule

`projects/internal/prompt` dan `projects/internal/unicom`

## Current state

Migrasi capsule sovereign internal selesai secara lokal untuk Prompt dan UNICOM.

- Source capsule mencakup desktop, library, Prisma schema serta migration, aset publik, skrip, tipe, test, dan data yang diperlukan.
- Tidak ada legacy `.env`, lockfile, `node_modules`, `.next`, atau `dist-electron` yang dipindahkan.
- `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `project.contract.json`, `AGENTS.md`, `README.md`, dan dokumentasi capsule tersedia.
- `db:generate` memakai fallback `DATABASE_URL` dan `DIRECT_URL` placeholder saat environment belum dikonfigurasi; tidak menjalankan migrasi maupun koneksi database.
- Kontrak lifecycle argv lengkap: install, lint, typecheck, test, build, run, dan deployDryRun.
- `projects/internal/unicom` juga memiliki workspace, lockfile, kontrak lifecycle, dokumentasi, dan bukti extraction yang berdiri sendiri.

## Verification evidence

- Gate S / structural verification: lulus.
- Lint dan typecheck: lulus.
- Test: lulus — 4 suite, 17 test.
- Build Electron, smoke runtime, dan deploy dry-run: lulus.
- Gate E / extraction: lulus dari direktori sementara baru, termasuk install frozen lockfile, seluruh gate, build, smoke, dan deploy dry-run.
- UNICOM: verifikasi capsule lokal dan Gate E extraction telah lulus pada sesi migrasi sebelumnya.

## Next action

1. Lakukan designated R2 review untuk perubahan boundary desktop Electron dan Prisma pada Prompt sebelum integrasi.
2. Catat defect tooling terpisah bila diprioritaskan: `pnpm capability:add` belum mendukung path capsule bertingkat `projects/internal/prompt`; `capabilities.json` dicatat lokal tanpa mengubah tooling root.
3. Lanjutkan roadmap migrasi capsule berikutnya setelah keputusan Chief.

## Owner collision

Tidak ada pada scope `projects/internal/prompt`.
