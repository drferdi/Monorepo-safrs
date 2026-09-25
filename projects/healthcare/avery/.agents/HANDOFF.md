# HANDOFF — Avery (WhatsApp Home Agent)

Last updated: 2026-09-25

Baca ini di setiap sesi Avery. **Ditimpa**, bukan ditambah. Keputusan durable: `DECISIONS.md`.

## Standalone contract (branch `feat/avery-standalone`, task `TASK-20260925-AVERY-STANDALONE`, BLOCKED)

Kontrak `project.contract.json` + pnpm lokal + `scripts/run_tests.py` / `deploy_dry_run.py` / `pnpm.mjs` + mode `--smoke` di `console/main.js`. Entri known-nonconformance avery dihapus; `check_project_independence.py` OK. Di ekstraksi verifier: install, build lolos; test lolos bila `APPDATA` ada.

Blocker tersisa (bukan di kapsul):

1. Verifier root (`tools/project-standalone`) tidak memberi `APPDATA`/`LOCALAPPDATA`. Test gagal (`%APPDATA%\hermes-studio` tidak terekspansi). Electron crash `0xC0000005` bila `USERPROFILE` terisolasi tanpa folder `AppData\Roaming` dan `AppData\Local` yang **ada**; lolos bila folder dibuat dan dua variabel diarahkan ke sana. Menunggu perbaikan root (keputusan Chief: `root_fix`).

Diperbaiki atas izin Chief (2026-09-25): `deploy/Dockerfile.avery` sebelumnya membaca `manifest["patch"]`/`["files"]` padahal manifest memakai `patches:[5 entri]` (build image akan gagal). Sekarang menerapkan `patches[]` berurutan (fallback skema lama), diuji dengan simulasi patch berantai + `patch.exe`; **belum** diuji `docker build` nyata, belum dideploy. Deploy dry-run lolos.

Berikutnya: setelah perbaikan verifier root masuk, rebase ke `main`, hapus `node_modules`, `node tools/project-standalone/src/cli.mjs verify healthcare/avery`, `pnpm governance`, task → VERIFYING.

## Keadaan sekarang

Gateway Hermes 0.20.4, profil `avery`, model `openai/gpt-5.6-luna` via OpenRouter (fallback Gemini 2.5 Flash). WhatsApp Baileys hidup. Desktop: klik **Avery.lnk** → `scripts/start-avery.bat`.

Junction `Hermes Studio` di abyss **bukan junction** (hasil installer). Start **tidak** boleh berhenti karena itu. Exe cadangan: lokasi installer native. Perbaikan penuh: `verify-runtime-junctions.ps1 -Fix` hanya saat gateway dan Studio mati.

`restart-gateway.ps1 -Execute` **jangan** memanggil junction `-Fix` setiap start.

## Pagar yang mengikat (2026-08-27/28)

- `memory.write_approval: true` dan `skills.write_approval: true`. Memori tidak tertulis sendiri.
- Grup: **baca tanpa balas**. `require_mention: true` harus di `platforms.whatsapp.extra` (kalau hanya di blok `whatsapp:` tingkat atas, Hermes bisa jatuh ke default `false` dan memproses semua pesan grup). `free_response_chats` **kosong**. Pesan allowlist tanpa sebut nama → log `OBSERVED_SILENT` + `state/group-observe.jsonl`, tanpa giliran model, tanpa balasan.
- Suara WhatsApp: 1–4 kalimat. Panjang hanya untuk analisis/keputusan/risiko/laporan yang diminta.
- Envelope keselamatan outbound (patch 0002): jangan kirim thinking-only, empty model, retrying, fallback provider, jejak tool, job_id, traceback, instruksi internal, kosong/separator.
- `display.tool_progress: off` wajib. Gelembung pendek "Reading skill …" / "Listing skills" di-drop di `send()` (patch 0005), termasuk dengan emoji di depan.
- Envelope `INTERNAL_INSTRUCTION` jangan cocokkan `require_mention` / `skills_list` / `soul.md`. Insiden 2026-08-28 01:36: jawaban 1003 karakter ke Chief di-drop, chat tampak stuck. Patch 0004.
- Cron `member-watch` (id `8523297c2bd4`): pin model Luna/OpenRouter. **Mode laporan ke Chief saja. Dilarang kirim ke grup.** Sambutan grup hanya jika Chief bilang "sambut".
- DM anggota Founding Core: otorisasi memakai `WHATSAPP_ALLOWED_USERS` di `.env` (menimpa YAML). Env harus memuat **nomor dan LID**. YAML `allow_from` saja tidak cukup. Jangan cetak nilainya.

## Insiden yang tidak boleh diulang

1. **2026-08-28 00:18** — setelah pin cron, `member-watch` menyambut `<member>` di 4 grup karena snapshot menganggapnya baru. Skill/prompt lama memerintahkan sambut di grup.
2. Dua anggota (`<member>`) **DM ditolak** `Unauthorized user`: `.env` hanya 2 nomor Chief, chat masuk sebagai LID. Diperbaiki dengan menggabungkan `allow_from` ke env (8 identitas). Jangan dump ID di git/chat.
3. Laporan Avery bahwa lima grup ada di `free_response_chats` **salah** terhadap config hidup (daftar kosong). Percayai YAML+log, bukan klaim agen.

## Jangan

- Isi `free_response_chats` dengan grup kerja (setiap obrolan = giliran model + risiko auto-reply).
- Biarkan `write_approval: false`.
- Minta Avery mengedit `config.yaml` WhatsApp-nya sendiri.
- Commit `.env`, sesi WhatsApp, JID, nomor.
- Klaim Avery mendengar pesan grup yang tidak ada di `group-observe.jsonl`.
