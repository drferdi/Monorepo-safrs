# HANDOFF — Current State and Next Action

> Baca pertama setiap sesi. Jaga di bawah ~1k token.
> Detail durable: `DECISIONS.md`. Tracker area: `PROGRESS.md`. Sejarah keputusan: `docs/adrs/`.
> Aturan: **overwrite** tiap pergantian sesi — file ini state terkini, bukan log.

Last updated: 2026-08-11 (Claude — integrasi lima file memori ke routing + enforcement HANDOFF)

## State saat ini

- Re-routing KB **sudah commit & push** (`de1410f` governance, `28da52b` design tokens) ke `origin/main`.
- Lima file memori (CONTEXT/DECISIONS/HANDOFF/PROGRESS/12_LESSONS) **terdaftar di registry** dengan normativity+scope; blok Read order `AGENTS.md` ter-generate dari registry.
- Duplikasi router dihapus: `00_READ_FIRST` dan `CONTEXT.md` kini menunjuk ke `AGENTS.md`, bukan mendefinisikan urutan sendiri.
- `check_handoff.py` aktif di `safrs-verify.sh`: change set non-trivial tanpa update `HANDOFF.md` = FAIL.
- `SAFRS_SPEC.md` diturunkan MUST→SHOULD di routing (alasan token; aturan operatifnya dicermin `AGENTS.md`). **Revert satu baris di registry jika Chief tidak setuju.**

## Pekerjaan yang sedang berjalan (jangan ditabrak)

- **Claude lain sedang mengerjakan** DX friction fixes (`docs/superpowers/plans/2026-08-11-solo-dev-dx-friction-fixes.md`): `pnpm verify`, `check:quick`, deteksi Python, INSTALL.md, husky Windows-native, `.env.example`. Jangan sentuh `package.json`/`scripts/` terkait sampai selesai.

## Blockers

- Tidak ada.

## Next actions

| Area | Aksi |
| --- | --- |
| Integrasi memori | Commit + push perubahan sesi ini (slice governance saja, jangan `git add -A`) |
| DX friction fixes | Tunggu selesai; verifikasi `pnpm check` |
| Migrasi project | Pilot `ferdiiskandar` → `projects/` (salin selektif) |
| SAFRS_SPEC routing | Chief konfirmasi demosi MUST→SHOULD atau revert |

## Guardrails sesi ini

- Jangan baca `.env` `D:\Devops\abyss-monorepo`; jangan salin `node_modules`/`.env`/`.next`/lockfile lama.
- `.agents/knowledge/` jangan diubah tanpa persetujuan Chief.
- PowerShell untuk perintah; diagnostik Bahasa Indonesia; kode English.
