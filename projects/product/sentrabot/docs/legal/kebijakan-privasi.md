# Kebijakan Privasi Sentra Bot

**Status: DRAF — belum ditinjau penasihat hukum. Jangan tayangkan apa adanya.**
Versi 0.1 · Disusun 1 September 2026

---

## Ringkasan singkat

Sentra Bot dirancang agar data Anda tinggal di tempat Anda. Berkas, percakapan, dan
kredensial tersimpan di komputer atau server yang Anda kendalikan sendiri. Yang keluar dari
mesin Anda hanya potongan yang memang perlu dibaca model AI agar agen bisa bekerja — dan
kalau Anda memakai kunci AI sendiri (BYOK), potongan itu pun tidak melewati kami.

Setiap tindakan yang tidak bisa dibatalkan — mengirim pesan, membayar, menghapus, mengubah
izin — berhenti dan menunggu persetujuan Anda.

---

## 1. Siapa kami

**Sentra Artificial Intelligence** adalah program pengembangan teknologi, kecerdasan buatan,
dan inovasi digital **RSIA Melinda DHAI**, yang diselenggarakan oleh **PT Adianda Putri
Iskandar**. **SentraBot** merupakan salah satu produk yang dikembangkan melalui program
tersebut.

Dalam kebijakan ini, "kami" merujuk pada PT Adianda Putri Iskandar sebagai pengendali data;
"Anda" merujuk pada pengguna SentraBot.

### SentraBot terpisah dari sistem rumah sakit

Meskipun berada di bawah satu badan hukum, **data dan operasional SentraBot tidak dicampur
dengan sistem informasi RSIA Melinda DHAI**. Akun, langganan, pemakaian AI, penagihan, dan
infrastruktur produk berjalan pada basis data, kredensial, dan kendali akses yang terpisah.

Menjadi pengguna SentraBot tidak menjadikan seseorang bagian dari sistem informasi rumah
sakit, dan data pasien maupun rekam medis tidak bersinggungan dengan SentraBot.

**[ISI: alamat terdaftar dan alamat surel kontak privasi.]**

*(Identitas dikonfirmasi Chief, 1 September 2026.)*

---

## 2. Dua mode penyimpanan, dua tanggung jawab berbeda

Ini pembeda utama Sentra Bot dan menentukan sisa kebijakan ini.

| Mode | Jalur panggilan model | Peran kami |
|---|---|---|
| **Sentra Managed AI** (paket berbayar) | Potongan konteks dikirim dari mesin Anda ke **Sentra AI Gateway**, lalu kami teruskan ke penyedia model | Kami memroses potongan itu sebagai pemroses data |
| **BYOK** (kunci Anda sendiri) | Runtime di mesin Anda memanggil penyedia model **langsung** | Tidak ada. Potongan itu tidak pernah melewati kami |

Dalam kedua mode, berkas, riwayat percakapan, memori agen, dan kredensial tetap tersimpan di
mesin Anda. Yang berbeda hanya jalur panggilan model.

Pada **Sentra Managed AI**, kami memroses potongan konteks semata untuk meneruskan permintaan
dan menghitung kuota — tidak untuk keperluan lain, dan tidak untuk melatih model. Pada
**BYOK**, jalur itu tidak ada sama sekali.

*(Dikonfirmasi Chief, 1 September 2026.)*

---

## 3. Data yang tersimpan di mesin Anda

Berdasarkan skema basis data Sentra Bot (`packages/db/prisma/schema.prisma`), instalasi Anda
menyimpan antara lain:

- **Akun dan sesi** — surel, status verifikasi, token sesi, keanggotaan organisasi
- **Percakapan** — utas, pesan, kelompok obrolan, dan artefak yang dihasilkan agen
- **Memori agen** — dokumen memori beserta riwayat revisinya, catatan scratchpad,
  keterampilan yang Anda ajarkan
- **Pekerjaan agen** — tugas, eksekusi, percobaan ulang, rutinitas terjadwal
- **Jejak tindakan keluar** — catatan setiap efek eksternal yang dilakukan agen
- **Aturan izin** — aturan persetujuan dan preferensi tinjauan otomatis yang Anda tetapkan
- **Kredensial** — kunci model AI, kunci suara, dan rahasia lain, **tersimpan terenkripsi**
  memakai kunci enkripsi milik instalasi Anda (`ENCRYPTION_KEY`)
- **Identitas telepon** — bila Anda menyambungkan WhatsApp atau kanal telepon: identitas,
  pemasangan perangkat, kanal, dan riwayat pesan keluar
- **Catatan pemakaian** — untuk menghitung kuota AI

Kami tidak memiliki pintu belakang ke basis data instalasi Anda.

---

## 4. Layanan pihak ketiga

Sentra Bot dapat menghubungi layanan berikut, tergantung fitur yang Anda aktifkan dan kunci
yang Anda pasang. Daftar ini diambil dari konfigurasi produk (`.env.example`):

| Layanan | Untuk apa | Kapan aktif |
|---|---|---|
| OpenRouter, Anthropic | Model AI | Saat agen berpikir |
| PostHog | Analitik produk | **Mati secara bawaan.** Hanya berjalan bila pengguna menyalakannya sendiri — lihat bagian 4a |
| OpenTelemetry | Telemetri teknis | Hanya bila endpoint diisi |
| Composio, Pipedream | Integrasi aplikasi pihak ketiga | Saat Anda menyambungkan aplikasi |
| WhatsApp (Meta) | Kanal pesan bisnis | Saat Anda menyambungkan WhatsApp |
| Sendblue | Kanal pesan | Saat dikonfigurasi |
| Supermemory | Layanan memori eksternal | Saat dikonfigurasi |
| SMTP | Pengiriman surel | Saat dikonfigurasi |
| Web Push (VAPID) | Notifikasi peramban | Saat Anda mengizinkan notifikasi |
| Docker, E2B, Daytona | Sandbox tempat agen menjalankan tugas | Saat agen menjalankan perintah |

Masing-masing memiliki kebijakan privasinya sendiri. Untuk layanan yang Anda konfigurasi
dengan kunci milik Anda, hubungan hukum atas data berada antara Anda dan penyedia tersebut.

**[ISI: tautan ke kebijakan privasi masing-masing pemroses, bila diperlukan oleh UU PDP.]**

---

## 4a. Analitik produk — mati secara bawaan

Analitik produk **tidak aktif** saat Sentra Bot dipasang. Ia hanya berjalan bila pengguna
menyalakannya sendiri di *Pengaturan › Privasi*, dan dapat dimatikan kembali kapan saja.

Bila dinyalakan, yang dikirim **hanya metadata**:

- versi aplikasi
- sistem operasi dan platform
- peristiwa pemakaian fitur (`bot_created`, `schedule_created`, `upgrade_clicked`)
- kategori galat dan crash
- metrik performa dan latensi
- ID instalasi dan sesi yang anonim

Yang **tidak pernah** dikumpulkan, dinyalakan atau tidak:

- isi percakapan, prompt, maupun jawaban model
- nama bot yang dibuat pengguna
- isi dokumen dan berkas
- memori agen
- isi Gmail, Slack, atau aplikasi lain yang disambungkan
- kredensial OAuth dan kunci API
- riwayat peramban
- data medis dan data pribadi sensitif lainnya

*(Keputusan produk Chief, 1 September 2026. Opsi lanjutan: menjalankan PostHog self-hosted
sebagai pilihan deployment — tidak menjadi penghambat peluncuran.)*

**[VERIFIKASI TEKNIK: pastikan implementasi benar-benar mati secara bawaan dan daftar
"tidak pernah dikumpulkan" ditegakkan di kode, bukan hanya kebijakan tertulis. Kebijakan ini
kini menjadi janji publik yang dapat diuji siapa pun.]**

---

## 5. Data Anda tidak dipakai melatih model

Kami tidak memakai isi percakapan, berkas, maupun memori Anda untuk melatih model AI.
Penyedia model pihak ketiga memiliki kebijakannya sendiri; bila Anda memakai kunci sendiri,
ketentuan penyedia itulah yang berlaku atas panggilan Anda.

---

## 6. Kendali Anda

- **Menghentikan agen** kapan saja
- **Menonaktifkan kemampuan tertentu** — draf, rutinitas terjadwal, kanal tertentu
- **Menyetujui atau menolak** setiap tindakan yang tidak bisa dibatalkan
- **Membaca riwayat lengkap** — seluruh utas dan jejak tindakan tersimpan di instalasi Anda
- **Menghapus** — bot, dokumen memori, dan percakapan dapat dihapus dari instalasi Anda

Karena data berada di mesin Anda, hak akses, koreksi, dan penghapusan Anda jalankan langsung
di instalasi Anda sendiri, bukan melalui permintaan kepada kami.

---

## 7. Retensi

**[ISI: berapa lama kami menyimpan data akun, catatan pemakaian, dan log pada layanan
berbayar. Untuk instalasi self-hosted, retensi sepenuhnya di tangan pengguna.]**

---

## 8. Anak di bawah umur

**[ISI: batas usia minimum. Perlu diputuskan — Sentra Study menyasar mahasiswa, sebagian
di antaranya mungkin di bawah 18 tahun, dan UU PDP mengatur persetujuan orang tua bagi anak.]**

---

## 9. Dasar hukum

Kebijakan ini disusun dengan merujuk pada **Undang-Undang No. 27 Tahun 2022 tentang
Pelindungan Data Pribadi (UU PDP)**.

**[VERIFIKASI HUKUM: penasihat hukum perlu memastikan pemenuhan kewajiban UU PDP —
antara lain dasar pemrosesan, pemberitahuan, penunjukan pejabat pelindungan data bila
diwajibkan, prosedur pemberitahuan kebocoran, dan ketentuan transfer data lintas negara,
mengingat sebagian pemroses di atas berada di luar Indonesia.]**

---

## 10. Perubahan kebijakan

**[ISI: bagaimana perubahan diberitahukan dan sejak kapan berlaku.]**

---

## 11. Menghubungi kami

**[ISI: surel, alamat surat, dan — bila diwajibkan — kontak pejabat pelindungan data.]**

---

## Catatan penyusunan

Dokumen ini disusun berdasarkan bukti di dalam repositori: skema basis data
(`packages/db/prisma/schema.prisma`, 48 model), konfigurasi layanan (`.env.example`), dan
kebijakan persetujuan produk (`packages/bot-templates/source/core/30_APPROVAL_POLICY.md`).

**Yang belum bisa dipastikan dari kode dan wajib dijawab manusia sebelum tayang:**

1. Apakah panggilan model pada paket berbayar melewati server Sentra (bagian 2)
2. Apakah PostHog aktif secara bawaan dan apa isinya (bagian 4)
3. Periode retensi (bagian 7)
4. Batas usia minimum (bagian 8)
5. Seluruh identitas badan hukum dan kontak (bagian 1, 11)

Dokumen ini **bukan nasihat hukum**. Kami bukan penasihat hukum. Sebelum tayang, dokumen ini
harus ditinjau advokat yang memahami UU PDP.
