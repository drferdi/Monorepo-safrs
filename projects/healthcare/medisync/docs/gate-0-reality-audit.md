# Gate 0 — Reality Audit

**Tanggal:** 2026-08-23
**Dasar:** `HERMES_AUTONOMY_DIRECTIVE.md` v1.0 §14 — "The next implementation task is Gate 0 - Reality Audit."
**Sifat:** berbasis bukti, read-only. Setiap kapabilitas yang diklaim di bawah ini dibuktikan dengan pemanggilan tool nyata, atau ditandai tidak tersedia.

> Dokumen ini tidak memuat nomor telepon, JID grup, atau pengenal pribadi. Repositori ini publik. Nilai sebenarnya ada di `config.yaml` runtime yang tidak pernah masuk git.

---

## 1. Codebase dan lokasi deployment

| Komponen | Nilai | Bukti |
|---|---|---|
| Agent | Hermes Agent 0.20.4 | `hermes doctor` — "Version files consistent (0.20.4)" |
| Sumber | `NousResearch/hermes-agent` v2026.8.3, commit `3c27eb6` | `resources/build/runtime-release.json` |
| Desktop | Hermes Studio 0.6.46 (Electron) | `Hermes Studio.exe` ProductVersion |
| Python | 3.12.13, SQLite 3.53.1 | `hermes doctor` |
| Lokasi fisik | `projects/healthcare/medisync/runtime/` (3,6 GB) | migrasi 2026-08-23, lihat `whatsapp-group-fix.md` |
| `HERMES_HOME` | `~/.hermes/profiles/avery` (junction ke `runtime/hermes-home`) | `gateway.log` — "Active profile: avery" |

Lokasi lama di `C:` dan di `abyss-monorepo` adalah *directory junction*. Seluruh path absolut lama tetap bekerja.

## 2. Model dan runtime orkestrasi

| Aspek | Nilai |
|---|---|
| Model utama | `google/gemini-2.5-flash` via OpenRouter |
| Auxiliary | fallback OpenRouter, `free_only: false` |
| Loop eksekusi | `hermes gateway run`, dijalankan Hermes Studio lewat login-item `.vbs` |
| Anggaran | `max_iterations=500` per giliran |
| Redaksi | aktif — keluaran tool, log, dan balasan disaring |

Terbukti hidup: `hermes -z` menjawab, dan pesan WhatsApp nyata dijawab dalam 3–28 detik.

SKU `:free` tidak dapat dipakai — `z-ai/glm-5.2:free`, `gemma-4-31b-it:free` menolak 429 dari shared pool, `inkling:free` menolak 403. Ini dibuktikan, bukan dugaan.

## 3. Tool yang tersedia dan operasinya

**Aktif (20), terbukti lewat `hermes doctor`:** `a2a`, `browser-use`, `clarify`, `code_execution`, `cronjob`, `delegation`, `desktop_ui`, `feishu_doc`, `feishu_drive`, `file`, `memory`, `project`, `session_search`, `skills`, `terminal`, `todo`, `tts`, `video`, `vision`, `web search (parallel)`, `web extract (parallel)`, dan `kanban` (runtime-gated).

**Tidak tersedia (12), dengan sebab spesifik:**

| Tool | Sebab |
|---|---|
| `browser`, `browser-cdp`, `computer_use` | **Bukan kekurangan** — `check_browser_requirements()` mengembalikan `False` karena `_is_browser_use_cli_mode()` aktif; `browser-use` menggantikan seluruh permukaan `browser_*` |
| `bfl`, `image_gen`, `video_gen` | butuh `FAL_API_KEY` atau backend gambar lain yang dikonfigurasi |
| `x_search` | butuh `XAI_API_KEY` |
| `discord`, `discord_admin` | butuh `DISCORD_BOT_TOKEN` |
| `hermes-yuanbao`, `homeassistant`, `spotify` | dependensi sistem, tidak relevan untuk cakupan ini |

Catatan penting: `send_message` **sengaja tidak didaftarkan** sebagai tool agen (`tools/send_message_tool.py`) — Hermes tidak ingin agen memutuskan sendiri mengirim pesan lintas platform. Mesin kirim yang sama dipakai cron delivery, CLI `hermes send`, dan surface MCP `hermes mcp serve`.

## 4. Integrasi WhatsApp dan jenis akun

| Aspek | Nilai |
|---|---|
| Transport | Baileys via bridge Node lokal (`whatsapp-bridge/bridge.js`), **bukan** Cloud API |
| Mode | `bot` — nomor terpisah khusus agen, bukan self-chat |
| Kebijakan DM | `pairing`; DM tak dikenal diabaikan (`unauthorized_dm_behavior: ignore`) |
| Kebijakan grup | `allowlist` — lima grup terdaftar |
| Gerbang mention | aktif; lima grup kerja dibebaskan lewat `free_response_chats` |
| Sesi | `platforms/whatsapp/session/` — `creds.json` setara kunci akses nomor |
| Kesehatan | `GET :3000/health` → `{"status":"connected"}` |

Bridge tidak dilahirkan ulang oleh gateway bila mati. Pemulihan hanya lewat restart gateway (`scripts/restart-gateway.bat`).

## 5. Penyimpanan tugas dan penjadwal

| Komponen | Status | Bukti |
|---|---|---|
| Task store | **ADA, KOSONG** — SQLite `kanban.db`, papan `default`, 0 tugas | `hermes kanban list` → "(no matching tasks)" |
| Scheduler | **ADA, KOSONG** — 0 job terjadwal | `hermes cron list` → "No scheduled jobs." |
| Riwayat eksekusi | `cron/executions.db` (20 KB) | ada di disk |
| State | `state.db` (5,1 MB), `projects.db` | `hermes doctor` |

Keduanya terpasang dan berfungsi, tetapi **belum dipakai sama sekali**. Ini gap terbesar menuju Gate 1.

## 6. Autentikasi dan desain otorisasi

Dua lapisan, keduanya diverifikasi lewat pemanggilan fungsi langsung:

1. **Intake** (`_should_process_message`) — menyaring berdasarkan grup dan penyebutan nama.
2. **Otorisasi** (`_is_user_authorized`) — menyaring berdasarkan pengirim.

| Kontrol | Nilai |
|---|---|
| `WHATSAPP_ALLOWED_USERS` | satu nomor (Chief) |
| `group_allowed_chats` | lima grup — mengotorisasi **seluruh anggotanya**, kontrol per grup bukan per orang |
| DM tak dikenal | diabaikan, tidak dibalas kode pairing |
| Tulisan memori dan skill | `write_approval: true` — masuk antrean persetujuan Chief |

Konsekuensi yang perlu disadari: siapa pun yang ditambahkan ke salah satu dari lima grup itu langsung punya akses penuh ke agen.

## 7. Persistensi, retry, dan idempotensi

| Mekanisme | Status |
|---|---|
| Dedup echo pesan keluar | ada — `recentlySentIds` di bridge |
| Delivery ledger | ada — terlihat di `state.db (delivery_ledger)` |
| Batching pesan masuk | ada — `text_batch_delay_seconds: 5` |
| Retry panggilan model | ada — 3 kali sebelum menyerah (terbukti saat 429) |
| Idempotensi tugas | **tidak dapat diuji** — task store kosong |

## 8. Observabilitas dan bukti

| Sumber | Isi |
|---|---|
| `logs/gateway.log` | pesan masuk, `response ready` beserta durasi dan `api_calls`, pengiriman |
| `logs/errors.log` | peringatan dan galat penyedia model |
| `logs/gateway-exit-diag.log` | siklus hidup proses, deteksi keluar tidak bersih |
| `platforms/whatsapp/bridge.log` | peristiwa Baileys |
| `cron/executions.db` | riwayat eksekusi terjadwal |

**Tidak ada** log audit terstruktur dengan `run ID` dan rangkaian peristiwa per-eksekusi seperti yang dituntut directive §5.2. Yang ada adalah log baris-per-baris, bukan peristiwa yang bisa ditelusuri per-run.

## 9. Gap menuju Gate 1

Directive §5.2 menuntut enam kapabilitas tool dengan bukti verifikasi. Keadaan sebenarnya:

| Kapabilitas | Status | Yang kurang |
|---|---|---|
| Messaging | **sebagian** | Membaca dan membalas: ada. Mengirim proaktif: hanya lewat cron `deliver`, karena `send_message` bukan tool agen. Surface MCP `hermes mcp serve` adalah jalur resmi untuk membukanya, belum diaktifkan |
| Task store | **kosong** | Belum ada satu pun tugas. Tidak ada skema action item, tidak ada bukti read-back |
| Scheduler | **kosong** | Belum ada satu pun job. Pola pengingat dan pemantauan belum ada |
| Identity directory | **sebagian** | Enam target terdaftar, tetapi nama grup tidak ter-resolve — hanya ID mentah. Tidak ada peta orang, peran, atau alias |
| Knowledge retrieval | **ada** | `memory`, `skills`, `session_search` aktif; 102 skill terpasang |
| Audit log | **tidak ada** | Tidak ada peristiwa eksekusi ber-`run ID` yang bisa dilampirkan sebagai bukti |

### Backlog yang dihasilkan audit ini

Urut berdasarkan yang memblokir Gate 1:

1. **Audit log ber-run-ID** — tanpa ini, tidak ada kapabilitas yang bisa dibuktikan sesuai standar directive §4.4 ("Verification is mandatory").
2. **Skema action item di kanban** — tetapkan bentuk minimal task record (§5.3), lalu buktikan create/read/update/complete dengan ID dan read-back.
3. **Pola scheduler** — pengingat, pemantauan overdue, ringkasan status. Buktikan dengan schedule ID dan waktu eksekusi ternormalisasi.
4. **Identity directory yang sesungguhnya** — resolusi nama grup, peta orang dan peran. Saat ini nama grup hanya ID.
5. **Keputusan messaging proaktif** — biarkan lewat cron, atau aktifkan `hermes mcp serve`. Yang kedua memberi `messages_send` langsung tetapi tanpa allowlist tujuan.

Sesuai directive §4.1, tidak ada persona, karakter, atau dokumen arsitektur baru yang dibuat sebelum backlog di atas dikerjakan.
