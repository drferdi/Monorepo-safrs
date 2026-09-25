# DECISIONS — Avery

Append-only. Terbaru di atas.

## 2026-09-25 — Kontrak standalone kapsul (packaging saja)

Avery punya `project.contract.json` sendiri: pnpm lokal (`package.json` + `pnpm-workspace.yaml` + lockfile, Electron dipin `43.4.1`, tanpa `catalog:`), test Python stdlib lewat `scripts/run_tests.py`, build `compileall`, run = konsol Electron `--smoke` (keluar 0 setelah renderer termuat), deploy dry-run offline `scripts/deploy_dry_run.py`. Perilaku klinis/agen tidak diubah. Deploy dry-run sengaja memeriksa kecocokan skema `patches/hermes-0.20.5/manifest.json` dengan `deploy/Dockerfile.avery`.

## 2026-08-28 — DM Founding Core lewat LID

Chief: anggota boleh **DM** Avery. Otorisasi Hermes memakai `.env` `WHATSAPP_ALLOWED_USERS` (bukan hanya YAML `allow_from`). Env harus berisi nomor **dan** LID. Daftar yang sama juga mengizinkan sebut nama di grup; bila grup harus Chief-only, itu keputusan terpisah yang belum diambil.

## 2026-08-28 — Cron member-watch tidak boleh posting grup

Setelah insiden sambutan 4 grup, putaran terjadwal hanya deteksi + snapshot + laporan Chief atau `[SILENT]`. Sambutan di grup hanya atas perintah eksplisit Chief.

## 2026-08-28 — Grup: baca tanpa balas

Bukan diam buta, bukan `free_response`. `require_mention` true di extra. Unmentioned allowlist dicatat `OBSERVED_SILENT` / `group-observe.jsonl`, tanpa model. Patch 0003.

## 2026-08-28 — write_approval on

`memory.write_approval` dan `skills.write_approval` true. FULL AUTO write memori (2026-08-24) dibatalkan.

## 2026-08-28 — Start Avery tidak memperbaiki junction

`start-avery.bat` / `restart-gateway.ps1` tidak menjalankan `verify-runtime-junctions -Fix`. Junction Studio rusak adalah peringatan, bukan blocker. Cadangan: buka `Hermes Studio.exe` dari path installer.

## 2026-08-27 — Suara pendek

Default 1–4 kalimat. Panjang hanya serius: analisis, diagnosis, keputusan, risiko, uang/hukum/klinis, atau laporan yang diminta.

## 2026-08-27 — Envelope keselamatan outbound

Patch 0002: drop diam sebelum send/edit WhatsApp untuk kebocoran runtime.

## 2026-08-24 — Avery FIX-01…06 and FULL AUTO target

Migrated from root .agents/DECISIONS.md (original date kept).

- Hermes core is patched only where a native switch does not exist (WhatsApp ingress reason codes);
  every vendored patch lives in `projects/healthcare/avery/patches/` with SHA-256 manifest and an
  idempotent apply/revert script. Prose in `SOUL.md` is the last resort, after config and patch.
- `agent.verify_on_stop` stays `false` for Avery: the nudge drives `hermes verify`, which walks to the
  monorepo git root through the runtime junction and runs `pnpm install`. Mutation read-back is covered
  by `agent.execution_guidance` (forced `true` — Hermes `auto` excludes gemini) and the SOUL Execution rule.
- Target is FULL AUTO (Chief): learning loop at Hermes defaults (`write_approval` off, guard off);
  freedom is reduced by Chief afterwards, not pre-emptively by agents. Group-wide response requires
  `WHATSAPP_ALLOW_ALL_USERS`, which also opens DMs — decision reserved for Chief.
- Subagent lanes are one-way pipes treated as the worst model in the world: 6-part spec, explicit
  prohibitions, 10-minute budget, reports never trusted without the architect re-running verification.
  Incidents and the fixes applied to lane definitions are tracked in Claude's memory ledger.
