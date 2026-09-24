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

---

## ADR 0007 WP-E (2026-09-24, Claude Code, branch `fix/adr-0007-wp-e`)

- Scope: `packages/database/prisma/schema.prisma` only. Removed the six `SentraBot*` models
  (ADR 0007 decision 5: product models do not live in the root schema). `Demo`, `User`,
  `Session`, `Account` and `Verification` untouched; no migration added. `packages/token/scope.txt`
  still names the SentraBot capsule path; that belongs to the token-gate backlog, not WP-E.
- Grep: outside the schema, the only `sentrabot` reference in `packages`, golden-path, `tools`
  and `tests` is `packages/token/scope.txt:10`. `pnpm db:generate` exit 0.
- Drift: `prisma migrate diff --from-migrations` could not run (no `migration_lock.toml`, no
  `shadowDatabaseUrl` in `prisma.config.ts`, Docker daemon down; `pnpm db:start` exit 1).
  Substitute: schema-to-schema diff against `main` is exactly six `DROP TABLE "sentrabot_*"`,
  and no migration mentions them. Inherited drift remains: the migrations end at `demos` only,
  so `user`, `session`, `account` and `verification` have no migration.
- Next: independent review by Codex, then Claude. Do not merge before review.
