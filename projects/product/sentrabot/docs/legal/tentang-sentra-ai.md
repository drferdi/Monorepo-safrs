# Mengenai Sentra Artificial Intelligence

Versi 0.1 · Disusun 1 September 2026

---

## Apa yang kami bangun

Sentra Artificial Intelligence membangun **Sentra Bot** — perangkat lunak agen yang berjalan
di komputer atau server Anda sendiri, bukan di server kami.

Kebanyakan asisten AI adalah satu kotak obrolan serba bisa yang menyimpan percakapan Anda di
pusat data milik vendor. Sentra Bot mengambil dua keputusan yang berbeda:

**Pertama, data tinggal di tempat Anda.** Berkas, riwayat percakapan, memori agen, dan
kredensial tersimpan di mesin yang Anda kendalikan, terenkripsi dengan kunci milik instalasi
Anda. Kami tidak punya pintu belakang ke sana.

**Kedua, agen berhenti sebelum melangkah.** Mengirim pesan, membayar, menghapus, mengubah
izin — semuanya berhenti dan menunggu Anda menekan Izinkan atau Tolak. Ini bukan sekadar
kalimat di dalam prompt. Kebijakan internal produk menyatakannya tegas: *"Susunan kata prompt
bukan mekanisme kendali akses. Penegakan berada di lapisan kapabilitas, konektor, kredensial,
kebijakan, dan eksekusi alat."*

---

## Untuk siapa

Sentra Bot dibangun untuk cara orang Indonesia belajar, berkarier, dan mengatur keuangan —
bukan diterjemahkan dari produk yang dirancang untuk kantor di tempat lain.

- **Mahasiswa** — rangkuman materi, rencana belajar menjelang ujian, daftar tugas berdasarkan
  tenggat, persiapan magang dan wawancara
- **Pekerja** — agenda rapat, rangkuman dokumen, laporan, prioritas pekerjaan berikutnya
- **Ibu rumah tangga** — menu dan daftar belanja, jadwal keluarga, keperluan sekolah anak,
  rencana pengeluaran bulanan
- **Pemilik usaha kecil** — membalas calon pembeli lewat WhatsApp, menyusun promosi,
  mengingatkan pesanan, merapikan laporan penjualan

---

## Bagaimana cara kerjanya

1. **Pasang** Sentra Bot di komputer atau server Anda
2. **Pilih bot** yang sesuai kebutuhan
3. **Sambungkan** aplikasi yang sudah Anda pakai — WhatsApp, surel, penyimpanan berkas
4. **Tinjau dan setujui** — agen menyiapkan, Anda memutuskan

Dua kali sehari, **Brief** merangkum apa yang sudah beres dan apa yang masih menunggu
keputusan Anda. Dibaca 30 detik, bukan ditelusuri satu per satu.

---

## Prinsip yang kami pegang

**Data Anda bukan bahan latihan.** Isi percakapan, berkas, dan memori Anda tidak dipakai
melatih model.

**Bawa kunci sendiri kalau mau.** Paket berbayar sudah menyertakan kuota AI supaya bisa
langsung dipakai. Kalau Anda punya kunci model sendiri, pasang BYOK — panggilan model tidak
melewati kami sama sekali.

**Agen dikurung dalam sandbox.** Perintah dan otomasi peramban berjalan di lingkungan
terisolasi, bukan langsung di sistem Anda.

**Bisa dimatikan.** Hentikan agen kapan saja, atau matikan kemampuan tertentu di pengaturan.

---

## Kontak

**[ISI: nama badan hukum, alamat, surel umum, dan tautan ke kanal resmi.]**

Situs: [sentrahai.com](https://sentrahai.com)

---

## Catatan penyusunan — dibaca tim, jangan tayangkan

Dokumen ini disusun dari bukti di dalam repositori. Bagian yang **terverifikasi di kode**:

| Klaim | Bukti |
|---|---|
| Data lokal & terenkripsi | `packages/db/prisma/schema.prisma` (48 model), `ENCRYPTION_KEY`, model `Secret` |
| Izin ditegakkan di lapisan sistem | `packages/bot-templates/source/core/30_APPROVAL_POLICY.md` |
| Jejak tindakan keluar tercatat | model `ExternalEffect`, `ActionApprovalRule` |
| Sandbox | `infra/sandboxes/`, dukungan Docker / E2B / Daytona |
| WhatsApp | `WHATSAPP_*` di `.env.example`, termasuk `WHATSAPP_TEMPLATE_LANGUAGE=id` |
| BYOK | `UserModelCredential`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY` |
| Brief dua kali sehari | dipakai konsisten di seluruh materi produk |

### Yang TIDAK terverifikasi — perlu keputusan sebelum dipakai publik

**1. Kesembilan bot Indonesia tidak ada di repositori ini.**
Halaman pemasaran menyebut sembilan bot — Sentra Study, Work, Rumah, Uang, UMKM, Warga, Aman,
Creator, Care — dengan total 37 berkas. Yang ada di `packages/bot-templates` adalah **sekitar
50 template korporat** dengan struktur berbeda: `customer-success`, `growth-marketing`,
`treasury`, `internal-audit`, `legal-affairs`, `privacy-data-governance`,
`clinical-operations`, dan seterusnya. Masing-masing berisi `ROLE.md`, `template.json`, dan
`evals.json` — **bukan** `SYSTEM_PROMPT.md` dan `manifest.json` seperti yang diklaim halaman.

Artinya salah satu dari tiga hal berikut benar, dan Chief perlu memastikan yang mana:
- kesembilan bot itu ada di repositori lain yang belum disambungkan ke sesi ini;
- kesembilan bot itu masih dalam rencana, sehingga halaman pemasaran mendahului produk;
- kesembilan bot itu adalah nama baru bagi sebagian template korporat yang sudah ada.

Bila jawabannya nomor dua, klaim "9 bot production-ready" dan "37 file" **harus dicabut atau
diubah jadi rencana** sebelum tayang.

**2. Testimoni di halaman pemasaran masih fiktif.** Nama, kutipan, kampus, dan kota — semuanya
karangan. Ganti dengan pengguna nyata berikut izin tertulis, atau nonaktifkan seksinya.

**3. Klaim "hanya potongan yang dikirim ke model"** perlu dipastikan ke tim teknik. Ini klaim
privasi teknis, bukan bahasa pemasaran.

**4. Analitik PostHog** (`PUBLIC_POSTHOG_KEY`) berpotensi bertentangan dengan pesan
"local-first" bila aktif secara bawaan. Perlu diperiksa dan diungkap di Kebijakan Privasi.
