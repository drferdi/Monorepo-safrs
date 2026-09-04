# Spesifikasi Build: Sentra Bot via WhatsApp (MVP)

**Status:** Draft untuk implementasi
**Disiapkan oleh:** Claude (Chief Research, Diligence & Knowledge Architect) — spesifikasi ini adalah brief/prompt untuk dieksekusi oleh Claude Code atau tim engineering
**Untuk:** dr Ferdi Iskandar, Sentra Artificial Intelligence
**Tanggal:** 2026-09-01
**Terkait:** `docs/plans/plans.md` (strategi Indonesia), `CLAUDE.md` (prinsip arsitektur Sentra Bot)

---

## 1. Keputusan yang Sudah Disepakati (jangan didesain ulang)

| Keputusan | Nilai |
|---|---|
| Koneksi WhatsApp | **WhatsApp Cloud API resmi (Meta)** — bukan library tidak resmi (Baileys/whatsapp-web.js) |
| Hosting bridge | **Server/cloud**, bukan local-first murni di mesin user — pengecualian eksplisit terhadap prinsip local-first Sentrabot untuk komponen ini saja |
| Eksekusi implementasi | Dilakukan oleh Claude Code / engineer, bukan oleh dokumen ini |
| Lingkup fitur MVP | Chat teks, voice note → transkrip, foto/dokumen → pemahaman, approval card sederhana |

**Implikasi arsitektural yang perlu dicatat secara eksplisit:** karena bridge berjalan di server dan menyimpan kredensial WhatsApp Business Account (WABA token, phone number ID), prinsip *"Private credentials, transcripts, and API keys must reside on the user's machine"* dari `CLAUDE.md` **tidak berlaku untuk komponen `whatsapp-bridge`**. Ini harus didokumentasikan sebagai pengecualian yang disengaja, dengan kompensasi keamanan (lihat Bagian 7), agar tidak dianggap penyimpangan arsitektur yang tidak disadari saat code review.

---

## 2. Tujuan Produk

Membuat WhatsApp menjadi kanal masuk utama ke Sentra agent, tanpa user membuka aplikasi desktop/mobile. Alur target:

```
User (WhatsApp)
   → pesan teks / voice note / foto
   → Sentra WhatsApp Bridge (server)
   → Harness Server (127.0.0.1:8799 pada instance milik user, atau tenant terkelola)
   → Agent memproses (LLM + tools)
   → [jika perlu izin] kirim Approval Card ke WhatsApp
   → Balasan dikirim kembali ke WhatsApp user
```

"Simple" di sini berarti: **user tidak perlu tahu ada agent, harness, sandbox, atau approval broker.** Yang mereka lihat hanya percakapan WhatsApp biasa yang terasa responsif dan bisa dipercaya.

---

## 3. Cakupan MVP (in-scope)

1. **Chat teks dasar** — pesan masuk diteruskan ke agent, balasan dikirim kembali.
2. **Voice note → transkrip → agent** — audio diunduh, ditranskripsi, transkrip diperlakukan sebagai perintah teks biasa.
3. **Foto/dokumen → pemahaman** — gambar/PDF diunduh, dianalisis (vision/document understanding), hasil ekstraksi diteruskan ke agent sebagai konteks.
4. **Approval card sederhana** — sebelum agent melakukan tindakan sensitif (kirim pesan, jalankan perintah, mutasi data), user diminta konfirmasi via WhatsApp Interactive Reply Buttons.

### Eksplisit di luar cakupan MVP (jangan dikerjakan dulu)

- WhatsApp Group Agent (poin 4 di `plans.md`) — kompleksitas consent & privasi grup lebih tinggi, ditunda ke fase berikutnya.
- Regional language intelligence.
- Pembayaran QRIS in-chat.
- Multi-tenant billing/plan enforcement — asumsikan single-tenant atau beta tertutup dulu.

---

## 4. Arsitektur Teknis

### 4.1 Komponen baru

Mengikuti struktur monorepo yang ada (`apps/`, `packages/`, `infra/`):

```
apps/
  whatsapp-bridge/          # Service baru (Hono), menerima webhook Meta, memanggil Graph API
packages/
  adapters/
    whatsapp/               # Client Graph API: kirim pesan, upload/download media, verifikasi signature
  contracts/
    whatsapp/               # Skema Zod/TS untuk payload webhook & pesan keluar
  domain/
    conversation/           # Mapping nomor WA -> user/tenant, state percakapan, session window
infra/
  docker-compose.whatsapp.yml   # Service bridge + reverse proxy untuk webhook publik (HTTPS wajib)
```

`whatsapp-bridge` **tidak menjalankan agent sendiri** — ia adalah adapter tipis yang menerjemahkan protokol WhatsApp ke/dari kontrak HTTP + SSE yang sudah ada di harness server. Ini menjaga prinsip *"Harness Server owns agent processes"* tetap utuh.

### 4.2 Alur pesan masuk (inbound)

1. Meta mengirim POST ke `apps/whatsapp-bridge/webhook` (endpoint publik, HTTPS, terverifikasi via `hub.verify_token` saat setup, dan setiap request divalidasi dengan header `X-Hub-Signature-256` terhadap App Secret).
2. Bridge menormalkan payload sesuai tipe pesan (`text`, `audio`, `image`, `document`, `button_reply`).
3. Bridge me-resolve nomor WhatsApp pengirim ke `userId`/`tenantId` internal (lihat 4.4 — provisioning).
4. Untuk `audio`: unduh media via `media_id` → Graph Media API → file `.ogg/OPUS` → kirim ke speech-to-text provider yang sudah didukung Sentra (reuse konfigurasi voice provider yang ada, ElevenLabs/Cartesia/OpenAI, pilih salah satu yang mendukung STT; jika provider saat ini TTS-only, tambahkan provider STT terpisah — **tandai sebagai open question, lihat Bagian 8**).
5. Untuk `image`/`document`: unduh media, kirim ke tool vision/document understanding yang sudah ada di harness (jangan bangun ulang — reuse pipeline computer/vision existing bila ada).
6. Bridge memanggil harness via HTTP command (format sesuai kontrak oRPC/Hono yang sudah didefinisikan di `packages/contracts`), menyertakan teks final (pesan asli atau hasil transkrip/ekstraksi) sebagai satu "turn" percakapan, dengan `conversationId` = mapping dari nomor WA.
7. Bridge subscribe ke SSE stream harness untuk turn tersebut, mengumpulkan output final agent (buffer sampai selesai — WhatsApp tidak mendukung streaming token-by-token secara native ke chat bubble tunggal; kirim sebagai satu pesan setelah selesai, atau kirim update bertahap sebagai pesan-pesan terpisah jika proses lama).

### 4.3 Alur keluar (outbound) & Approval Card

- **Dalam 24-jam customer service window** (window dimulai/direset setiap kali user mengirim pesan): bridge boleh mengirim pesan bebas — teks biasa atau **Interactive Reply Buttons** (maksimum 3 tombol per Meta API) untuk approval card, contoh:
  - Body: `Avery ingin mengirim WhatsApp ke Pak Budi:\n"Pak Budi, rapat besok..."`
  - Tombol: `Kirim` / `Jangan Kirim` / `Edit dulu`
- **Di luar 24-jam window** (mis. hasil pekerjaan async selesai setelah user offline lama, atau notifikasi routine terjadwal): Meta **mewajibkan pesan template pra-approved** (business-initiated message). Ini berarti Sentra harus:
  1. Mendaftarkan template pesan ke Meta (mis. `job_completed_notification`, `routine_reminder`) melalui WhatsApp Manager, menunggu approval Meta (bisa memakan waktu jam-hari).
  2. Bridge memilih: kirim template jika di luar window, kirim pesan bebas jika masih dalam window.
- Respons tombol (`button_reply` webhook) dipetakan kembali ke keputusan approval (Allow/Deny) dan dikirim ke harness sebagai jawaban atas permintaan permission broker yang tertunda.

### 4.4 Provisioning & identitas user

**Ini adalah gap desain yang harus diputuskan sebelum coding dimulai** (lihat Bagian 8, pertanyaan #1): bagaimana nomor WhatsApp pertama kali dikaitkan ke akun/harness Sentra milik user? Opsi umum:
- Onboarding via link (user daftar di web/app dulu, dapat kode OTP untuk verifikasi WA), atau
- User mengirim pesan pertama ke nomor bisnis Sentra, bridge membuat akun baru otomatis (frictionless tapi berisiko abuse/spam tanpa rate limiting).

### 4.5 Skema data minimal (`packages/domain/conversation`)

```typescript
interface WhatsAppUserMapping {
  waPhoneNumber: string;      // E.164 format
  userId: string;             // internal Sentra user id
  tenantHarnessUrl: string;   // endpoint harness milik user (jika per-tenant harness)
  sessionWindowExpiresAt: Date | null;
  createdAt: Date;
}

interface WhatsAppConversationTurn {
  waMessageId: string;        // idempotency key — Meta bisa retry delivery
  waPhoneNumber: string;
  direction: "inbound" | "outbound";
  type: "text" | "audio" | "image" | "document" | "button_reply" | "template";
  rawPayload: unknown;        // simpan payload asli untuk audit/debug
  normalizedText: string | null;
  harnessConversationId: string;
  createdAt: Date;
}
```

`waMessageId` wajib dipakai sebagai idempotency key — Meta akan retry webhook hingga 7 hari jika endpoint tidak merespons 200, sehingga tanpa deduplikasi, satu pesan bisa diproses agent berkali-kali.

---

## 5. Kontrak API (ringkas)

### 5.1 Endpoint yang harus dibuat di `whatsapp-bridge`

| Method | Path | Fungsi |
|---|---|---|
| GET | `/webhook` | Verifikasi webhook Meta (echo `hub.challenge`) |
| POST | `/webhook` | Terima event pesan masuk/status dari Meta |
| POST | `/internal/send` | (opsional, dipanggil harness) kirim pesan keluar ke nomor WA tertentu, dipicu dari sisi agent (mis. hasil async selesai) |

### 5.2 Dependensi ke harness yang sudah ada

Spesifikasi endpoint harness (HTTP command + SSE) **tidak didefinisikan ulang di sini** — bridge harus memakai kontrak yang sudah ada di `packages/contracts`. Jika kontrak saat ini belum mendukung "kirim turn atas nama user tertentu dari kanal eksternal", ini perlu ditambahkan sebagai perubahan kontrak, bukan jalur pintas ad-hoc.

---

## 6. Prinsip Implementasi (wajib dipatuhi Claude Code)

Sesuai `CLAUDE.md` proyek ini:

- TypeScript strict, tanpa `any`, tanpa stub/placeholder — kode production-ready dengan error handling lengkap.
- Semua tindakan sensitif (kirim pesan atas nama user, jalankan tool) **tetap wajib melalui Permission Broker** — approval card WhatsApp adalah *presentation layer* baru untuk broker yang sama, bukan jalur bypass baru.
- Retry/backoff untuk pemanggilan Graph API (rate limit Meta berlaku per WABA).
- Verifikasi signature webhook wajib, tolak request tanpa signature valid (fail-closed, sesuai prinsip *"fail-closed under security checks"*).
- Tulis integration test (Vitest) untuk: parsing webhook payload per tipe pesan, idempotency dedup, dan alur approval button round-trip.

---

## 7. Keamanan & Privasi (kompensasi atas pengecualian local-first)

Karena kredensial WABA dan sebagian data percakapan transit melalui server:

1. Enkripsi kredensial WABA at-rest (secrets manager, bukan `.env` plaintext di server produksi).
2. Retensi `rawPayload` dibatasi (mis. auto-purge setelah N hari) — jangan simpan transkrip WA selamanya tanpa kebijakan retensi eksplisit.
3. Update copy privasi Sentra: klaim *"Data Anda tetap milik Anda"* dari `plans.md` poin 13 perlu disesuaikan kalimatnya khusus untuk kanal WhatsApp, karena secara teknis pesan transit melalui Meta dan server bridge Sentra — jangan biarkan copy marketing menjanjikan sesuatu yang tidak akurat secara teknis.

---

## 8. Pertanyaan Terbuka (perlu keputusan Chief sebelum/selama implementasi)

1. **Provisioning identitas** — onboarding link+OTP, atau auto-create saat pesan pertama masuk?
2. **Provider Speech-to-Text** — apakah provider voice existing (ElevenLabs/Cartesia/OpenAI) sudah mencakup STT, atau perlu tambahan provider baru khusus transkripsi?
3. **Model harness per-tenant** — apakah setiap user WhatsApp punya harness terpisah (butuh service discovery per tenant), atau satu harness bersama untuk fase beta?
4. **Template message** — siapa yang mengajukan template ke Meta Business Manager dan menunggu approval (bisa jadi bottleneck jalur kritis sebelum fitur "notifikasi setelah selesai" bisa live)?
5. **Verifikasi nomor bisnis Meta** — sudah punya WABA + nomor terverifikasi, atau perlu proses onboarding Meta Business Verification terlebih dahulu (bisa memakan waktu)?

---

## 9. Definition of Done (MVP)

- [ ] User mengirim teks ke nomor WA Sentra → menerima balasan agent dalam <10 detik untuk perintah sederhana.
- [ ] User mengirim voice note → menerima balasan yang menunjukkan pemahaman isi transkrip.
- [ ] User mengirim foto invoice → agent mengekstrak & merespons info relevan (mis. jatuh tempo).
- [ ] Sebelum agent mengirim pesan/tindakan sensitif atas nama user, user menerima approval card dengan tombol Kirim/Jangan Kirim, dan keputusan dihormati.
- [ ] Retry webhook Meta tidak menyebabkan duplikasi pemrosesan (idempotency teruji).
- [ ] Signature webhook tidak valid → request ditolak (fail-closed teruji).
