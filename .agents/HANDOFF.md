# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-20 (smartboard capsule merged to main)

## Current state

- Capsule `projects/academic-smartboard/` MERGED ke main (ADR 0003): scaffold,
  data kurikulum/referensi, knowledge package Kayyisa v3.0.0 (hash 36/36 verified).
- `projects/**/ai/**` masuk sensitive paths (merge `feat/safrs-ai-sensitive`).
- Plan `2026-08-20-smartboard-migration.md` COMPLETED → `docs/plans/completed/`.
- Evidence integrity review dicatat di `.safrs/reviews/verification-integrity.json`
  (persetujuan Chief in-chat atas fingerprint change set merge).
- Task TASK-20260820-SMARTBOARD-CAPSULE + TASK-20260820-SMARTBOARD-MIGRATION-PLAN:
  lifecycle menuju CLOSED; worktrees smartboard dihapus setelahnya.
- Stash utama menyimpan pekerjaan asing sesi lain (favicon copies, HANDOFF mod,
  `.agents/tmp_*.py`) — pop kembali setelah verifikasi; lihat catatan sesi.
- Favicon note lama: sumber di `docs/brand/04-favicon-browser/`.

## Next actions

1. Plan berikutnya: port `apps/site` (landing Vite → Next.js static export,
   kalibrasi token gate). Lalu `web`, `api` (per modul di belakang facade), `demo`.
2. Push ke origin = keputusan Chief (CI checker menilai tree committed; evidence ikut).
