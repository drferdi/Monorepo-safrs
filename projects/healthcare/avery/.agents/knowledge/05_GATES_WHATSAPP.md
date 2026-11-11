# Gerbang WhatsApp Avery — yang sudah menggigit

Dua gerbang terpisah. Keduanya harus lolos agar Avery membalas.

1. **Intake (grup/DM policy, mention)** — `whatsapp_common._should_process_message_inner`
   - Grup tidak di allowlist → `GROUP_NOT_ALLOWED`
   - Unmentioned + require_mention → `OBSERVED_SILENT` (catat, tidak ke model)
   - `require_mention` harus ada di `platforms.whatsapp.extra`. Default Hermes bila absen: **false** (semua pesan grup diproses).
   - `free_response_chats` tidak kosong = giliran model tiap pesan. Jangan.

2. **Otorisasi pengirim** — `WHATSAPP_ALLOWED_USERS` di `.env` menang atas YAML `allow_from`.
   - Chat WhatsApp sering datang sebagai `@lid`. Env yang hanya nomor 62… menolak member.
   - Gejala: `ingress accept PASSED` lalu `Unauthorized user: …@lid`.

Cron `member-watch` bukan gerbang. Ia agen terjadwal yang **bisa mengirim ke grup** jika prompt/skill menyuruh sambut. Prompt harus laporan-only.

Jangan simpan JID/nomor di berkas ini.
