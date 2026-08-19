# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-20 (smartboard capsule foundation executed)

## Current state

- Branch `feat/smartboard-capsule`: capsule `projects/academic-smartboard/` berdiri —
  scaffold wizard, ADR 0003, spec + plan migrasi, data kurikulum/referensi,
  knowledge package Kayyisa v3.0.0 (hash 36/36 verified).
- Branch `feat/safrs-ai-sensitive`: pola `projects/**/ai/**` masuk sensitive paths
  (dipisah karena gate melarang kontrol + implementasi satu change set).
- Task: TASK-20260820-SMARTBOARD-CAPSULE (REVIEW), TASK-20260820-SMARTBOARD-MIGRATION-PLAN (R1).
- Favicon note lama: sumber di `docs/brand/04-favicon-browser/`; salinan uncommitted
  di main working tree milik sesi sebelumnya.

## Waiting on Chief

1. Independent review `feat/smartboard-capsule`: isi `.safrs/reviews/verification-integrity.json`
   (base_sha + change_set_sha256 disiapkan di laporan sesi) — tanpa ini `safrs-verify` merah.
2. Merge order: `feat/safrs-ai-sensitive` dulu, lalu `feat/smartboard-capsule`.

## Next actions

1. Setelah merge: task state MERGED lalu CLOSED; hapus worktrees.
2. Plan berikutnya: port `apps/site` (landing Vite → Next.js static export).
