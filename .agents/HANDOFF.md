# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-20 (Kilo performance configuration)

## Current state

- Capsule `projects/academic-smartboard/` MERGED ke main (ADR 0003): scaffold,
  data kurikulum/referensi, knowledge package Kayyisa v3.0.0 (hash 36/36 verified).
- `projects/**/ai/**` masuk sensitive paths (merge `feat/safrs-ai-sensitive`).
- Plan `2026-08-20-smartboard-migration.md` COMPLETED → `docs/plans/completed/`.
- Evidence integrity review dicatat di `.safrs/reviews/verification-integrity.json`
  (persetujuan Chief in-chat atas fingerprint change set merge).
- Task TASK-20260820-SMARTBOARD-CAPSULE + TASK-20260820-SMARTBOARD-MIGRATION-PLAN
  sudah CLOSED; worktree smartboard sudah dihapus.
- Stash utama menyimpan pekerjaan asing sesi lain (favicon copies, HANDOFF mod,
  `.agents/tmp_*.py`) — pop kembali setelah verifikasi; lihat catatan sesi.
- Favicon note lama: sumber di `docs/brand/04-favicon-browser/`.
- Root `README.md` diaudit terhadap manifest, plan automation, dan GitHub live state:
  status Renovate, GitHub security, serta parkir Phase 6–8 diperbarui; branch
  protection tetap belum aktif dan conformance tetap SAFRS Core.
- Integrasi Cline tidak lagi didukung: `.cline/**`, `.clinerules`, handbook QRH,
  adapter automation, parity cases, capability declaration, sensitive-path entries,
  dokumentasi aktif, skrip diagnostik lokal, dan local checkpoint refs dihapus.
- Removal dimiliki TASK-20260820-REMOVE-CLINE (R2); perubahan implementation dan
  verification control dalam satu change set memerlukan elevated review.
- Konfigurasi project-level `.kilo/kilo.jsonc` kini mendefinisikan agent `brainstorm`
  read-only dengan `kilo/openai/gpt-5.6-sol-discounted` varian `high`, serta override
  agent bawaan `code` ke `kilo/openai/gpt-5.6-luna`. Perubahan konfigurasi agent ini
  R2 dan memerlukan review.
- Proposal peningkatan Kilo diterapkan: least-privilege permissions, auto-compaction,
  reusable `.agents/skills`, read-only reviewer/security subagents, lima slash command
  (`verify-change`, `investigate-bug`, `prepare-pr`, `sync-parent`, `indexing-readiness`),
  skill lifecycle SAFRS, dan Agent Manager setup/run scripts dengan port bebas yang
  dialokasikan OS untuk menghindari collision antar-worktree.
  Semantic indexing belum diaktifkan karena Ollama/approved embedding provider absent;
  `/indexing-readiness` menyimpan placeholder eksplisit untuk approval tersebut.
- Verifikasi Kilo: schema JSONC, PowerShell parser, diff whitespace, token gate, lint,
  typecheck, dan adapter parity PASS; independent reviewer final tidak menemukan
  finding actionable. Governance tetap terblokir artefak paralel unowned
  `docs/template/repo-readme-example.md`, bukan konfigurasi Kilo.
- Verifikasi removal: active-surface Cline search bersih; `.cline`, `.clinerules`,
  dan `refs/cline/**` absent; adapter parity 3/3, automation policy, token gate,
  lint, typecheck, dan Control Center build PASS. Governance melewati scope removal
  lalu terblokir artefak paralel unowned `docs/template/repo-readme-example.md`.
  Test 66/67: parser EOL tidak menerima tracked-deleted `.cline/**` sebelum commit.
  Full build terblokir `APP_URL`/`DATABASE_URL` golden-path yang tidak tersedia.

## Next actions

1. Plan berikutnya: port `apps/site` (landing Vite → Next.js static export,
   kalibrasi token gate). Lalu `web`, `api` (per modul di belakang facade), `demo`.
2. Push ke origin = keputusan Chief (CI checker menilai tree committed; evidence ikut).
3. Reload Kilo atau mulai sesi baru, lalu reset pilihan model per-agent yang tersimpan
   bila override project belum terlihat di model picker.
4. Review independen wajib untuk removal Cline karena menyentuh verification control.
5. Review konfigurasi Kilo dan reload extension/sesi agar agents, commands, dan skills
   project-level dimuat.
