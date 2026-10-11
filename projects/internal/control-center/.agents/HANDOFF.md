# HANDOFF — Control Center

## 2026-10-11 - Prompt catalog path relocation (Codex)

- Updated only Prompt entry-point, evidence, and documentation paths in `apps/web/src/lib/repo/catalog.ts` from `projects/internal/prompt` to `tools/prompt`, following Gaffer's relocation order.
- Focused repo-root and library tests: PASS, 8/8, exit 0. Root diff check: PASS, exit 0. Lint: unavailable for this file under the inherited root Biome exclusions; invocation processed zero files and exited 1. Control Center typecheck was not run after the root circuit breaker; Prompt typechecks and desktop smoke passed.
- Risks / next: root governance failed on missing active ownership for `docs/features-named.md`; record ownership before rerunning. No runtime logic changed, no publication.

Migrated from root `.agents/HANDOFF.md` by ADR 0007 WP-G on 2026-09-25; content unchanged.

Last updated: 2026-09-21 (Papan pekerjaan — FAIL → WARN end-to-end)

## Capsule

`projects/internal/control-center` + gate `check_sensitive_changes`

## Current state

### Papan (verified)
- topology OK · ownership OK · sensitive **approved**
- `pnpm status` → **WARN** (governance PASS; peringatan inventori tool lama)
- Bukan FAIL — UI Situasi harus **Perlu dilihat**, bukan Rusak

### Perbaikan inti
1. Fallback diff base lokal ke `main` bila `origin/main` bukan ancestor
2. Graft lokal parent hilang pasca rewrite origin
3. Segel integrity (Chief) untuk change set vs `main`
4. Fingerprint **mengabaikan** berkas memori sesi (HANDOFF dkk.) supaya edit HANDOFF tidak merusak segel
5. Situasi: plane WARN ≠ Rusak

### Tasks
- `TASK-20260921-CONTROL-CENTER-BOARD`
- `TASK-20260921-SENSITIVE-PLANE-FIX`
- `TASK-20260921-SENSITIVE-TEST`

## Next action

1. Chief: **hard refresh** Control Center (Ctrl+Shift+R) → cek “Keadaan sekarang”
2. Harapan: **Perlu dilihat** + teks peringatan papan, bukan Rusak
3. Commit bila disetujui

## Owner collision

Tidak ada.
