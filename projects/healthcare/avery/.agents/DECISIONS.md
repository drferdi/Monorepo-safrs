# DECISIONS — Avery

Append-only. Terbaru di atas.

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
