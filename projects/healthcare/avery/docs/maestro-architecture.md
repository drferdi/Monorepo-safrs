# Maestro — Rancangan Arsitektur

**Tanggal:** 2026-08-23
**Status:** rancangan, belum dibangun
**Dasar:** arsitektur Chief; keadaan sekarang dari `gate-0-reality-audit.md`

> Ini rancangan, bukan laporan. Setiap klaim "sudah ada" di dokumen ini dibuktikan
> di Gate 0. Setiap "belum ada" berarti belum ada, bukan belum sempat ditulis.

---

## 1. Bentuk yang dituju

```
WhatsApp  ──►  Maestro Gateway  ──►  Maestro Orchestrator
                                              │
                                        Task Contract
                                              │
                                           Hermes
                                              │
                                        Result/Action
                                              │
              WhatsApp  ◄──  Maestro Supervisor
```

Empat lapis dengan tanggung jawab terpisah:

| Lapis | Tanggung jawab |
|---|---|
| **Gateway** | siapa boleh bicara, dari mana, seberapa sering |
| **Orchestrator** | apa maksudnya, boleh sejauh mana, dengan anggaran berapa |
| **Hermes** | mengerjakan |
| **Supervisor** | apakah hasilnya layak keluar, tercatat, dan bisa dibatalkan |

Nilainya ada pada pemisahannya. Hari ini keempatnya bercampur di dalam satu proses Hermes, sehingga tidak ada titik tunggal untuk menahan, menilai, atau membatalkan sebuah tindakan.

---

## 2. Keadaan sekarang, per kotak

### Gateway — ada, tetapi menyatu di dalam Hermes

| Fungsi | Keadaan | Bukti |
|---|---|---|
| Mention filter | **ada** | `require_mention`, `mention_patterns`, `free_response_chats` per grup |
| Group policy | **ada** | `group_policy: allowlist` |
| Allowlist | **ada** | dua lapis — pengirim dan grup |
| Identity | **sebagian** | nama grup dan pemetaan LID↔telepon jalan; peta orang dan peran belum ada |
| Rate limit | **sebagian** | hanya untuk balasan pairing; tidak ada batas eksekusi per orang atau grup |
| DLP | **sebagian** | redaksi rahasia pada keluaran; tidak ada penyaring di jalur masuk |

### Orchestrator — paling kosong

| Fungsi | Keadaan |
|---|---|
| Context | **ada** — `channel_overrides` per grup, memori, skill |
| Execution budget | **sebagian** — `max_iterations=500`; tidak ada anggaran biaya atau waktu per tugas |
| Approval policy | **sebagian** — hanya untuk tulisan memori dan skill, bukan untuk tindakan |
| Authority | **sebagian** — otorisasi per pengirim, bukan per jenis tindakan |
| Intent | **tidak ada** — pesan langsung masuk ke model |
| CASE controls | **tidak ada** — definisinya menunggu Chief |

### Hermes — paling matang

Reasoning, planning, skills, tools, browser, subagents, code, research: semuanya hidup dan terbukti. `learning` setengah jalan — memori dan skill bisa ditulis lewat antrean persetujuan, tetapi belum ada putaran belajar dari hasil.

### Supervisor — baru sepertiga

| Fungsi | Keadaan |
|---|---|
| Audit | **ada** — kanban `runs`/`events` ber-run-ID, terbukti pada tugas `t_d24db445` |
| Memory candidate | **ada** — antrean `write_approval` |
| DLP | **sebagian** — redaksi pada balasan |
| Validate result | **tidak ada** |
| Approval gate | **tidak ada** untuk tindakan keluar |
| Rollback metadata | **tidak ada** |

---

## 3. Risiko arsitektural yang menentukan urutan

Hari ini Hermes gateway terhubung **langsung** ke bridge WhatsApp di port 3000.

Bila Maestro Gateway dipasang di depan sebagai proses terpisah tetapi jalur lama dibiarkan hidup, seluruh kontrol Maestro dapat dilewati — pesan tetap masuk lewat pintu belakang. Karena itu, begitu Maestro Gateway berdiri, jalur langsung Hermes↔bridge **harus ditutup**, bukan disimpan sebagai cadangan.

Konsekuensinya untuk urutan kerja: memisahkan Gateway adalah langkah paling berisiko dan paling sedikit menambah kemampuan baru. Ia dikerjakan terakhir.

---

## 4. Urutan pembangunan

Diurutkan berdasarkan nilai per risiko, bukan berdasarkan urutan aliran data.

### Tahap 1 — Supervisor

Gateway sudah berfungsi meski menyatu; Supervisor hampir tidak ada. Menambahkannya menaikkan keamanan tanpa menyentuh jalur pesan sama sekali.

Yang dibangun: validasi hasil sebelum keluar, gerbang persetujuan untuk tindakan berisiko, dan metadata pembatalan.

Lulus bila: sebuah tindakan berisiko tertahan menunggu persetujuan Chief, dan tindakan yang sudah berjalan dapat ditelusuri beserta cara membatalkannya.

### Tahap 2 — Task Contract

Bentuk kontrak antara Orchestrator dan Hermes. Penyimpannya sudah ada — kanban, terbukti menyimpan ID, peristiwa bertimestamp, dan hasil. Yang kurang skema tugasnya: hasil yang dituju, kewenangan yang diberikan, anggaran, kriteria selesai, dan bukti yang harus dilampirkan.

Lulus bila: satu pekerjaan nyata berjalan penuh sebagai kontrak, dari pembuatan sampai penutupan, dengan bukti yang bisa diperiksa.

### Tahap 3 — Orchestrator

Klasifikasi maksud, kewenangan per jenis tindakan, anggaran eksekusi. Ini yang mengubah Avery dari penjawab menjadi pengeksekusi.

Lulus bila: pesan yang sama dari dua orang berbeda menghasilkan kewenangan berbeda, dan pekerjaan berhenti sendiri saat anggarannya habis.

### Tahap 4 — Gateway dipisah

Terakhir. Paling berisiko memutus layanan, paling sedikit menambah kemampuan.

Lulus bila: seluruh pesan masuk melewati Maestro, dan jalur langsung ke bridge sudah ditutup — dibuktikan dengan mencoba menembusnya, bukan dengan mengasumsikan.

---

## 5. Kesiapan untuk grup komunitas

**Bagian ini mendesak.** Aktivasi Avery di grup komunitas Sentra direncanakan hari ini, sementara arsitektur di atas belum dibangun.

Sampai sekarang kelima grup berisi dua orang: Chief dan Avery. Grup komunitas mengubah asumsi itu sepenuhnya, dan dua setelan yang aman untuk grup berdua menjadi berbahaya untuk grup ramai.

### Yang berubah bila anggota bertambah

**`free_response_chats`** — grup yang terdaftar di sini dibalas **setiap pesannya**, tanpa perlu menyebut nama. Di grup berdua itu wajar. Di grup komunitas artinya Avery menyahut setiap obrolan antarwarga: berisik, boros, dan cepat membuat orang berhenti memakai grupnya.

**`group_allowed_chats`** — mengotorisasi **seluruh anggota** grup terdaftar, tanpa memandang nomor. Siapa pun yang masuk grup langsung memperoleh akses penuh ke agen, termasuk kemampuan menyuruhnya bekerja. Di grup komunitas, keanggotaan biasanya lebih longgar daripada kepercayaan.

**Tidak ada rate limit dan tidak ada gerbang persetujuan tindakan.** Sepuluh orang bertanya bersamaan menghasilkan sepuluh pemanggilan model. Tidak ada yang menahan.

### Setelan yang disarankan untuk grup komunitas

| Setelan | Nilai | Alasan |
|---|---|---|
| `group_allow_from` | **tambahkan** JID grup komunitas | tanpa ini Avery diam total di sana |
| `free_response_chats` | **jangan tambahkan** | wajibkan menyebut nama; Avery bicara saat dipanggil, bukan sepanjang waktu |
| `group_allowed_chats` | **keputusan Chief** | tambahkan bila semua anggota komunitas boleh menyuruh Avery; kosongkan bila hanya nomor di `WHATSAPP_ALLOWED_USERS` yang boleh |
| `channel_overrides` | **tambahkan** | lingkup topik dan nada khusus komunitas — berbeda dari grup kerja internal |

Perbedaan intinya: di grup kerja Avery adalah rekan yang selalu menyimak; di grup komunitas ia narasumber yang menjawab saat dipanggil.

### Yang belum terlindungi, apa pun setelannya

Sampai Tahap 1 dan 3 selesai, hal-hal berikut belum punya pengaman dan hanya bergantung pada instruksi di persona:

- tidak ada batas berapa banyak permintaan yang dilayani per orang per jam;
- tidak ada gerbang persetujuan sebelum Avery melakukan tindakan atas permintaan orang selain Chief;
- tidak ada validasi hasil sebelum balasan keluar ke ruang publik.

Karena itu, untuk aktivasi hari ini disarankan: **wajib sebut nama, dan jangan berikan akses tindakan kepada anggota umum.** Percakapan dan tanya-jawab aman; eksekusi pekerjaan belum.

---

## 6. Yang perlu Chief tetapkan

1. **CASE controls** — kepanjangan dan cakupannya. Istilah ini ada di rancangan Chief dan belum didefinisikan di mana pun.
2. **Akses anggota komunitas** — boleh menyuruh Avery bekerja, atau hanya bertanya.
3. **Anggaran** — batas biaya atau jumlah pemanggilan per grup per hari, sebagai dasar Tahap 3.
