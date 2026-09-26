# KB Repair List — `penyakit.json`

> **Tujuan:** memperbaiki gejala klinis yang rusak/terpotong akibat scraping PPK
> FKTP yang gagal. Gejala rusak ini adalah **akar kedua** masalah "diagnosis
> jauh dari keluhan" — matcher mencocokkan token keluhan ke `gejala_klinis`,
> jadi gejala yang cuma berisi potongan kalimat (`"jam)"`, `"minggu."`) tidak
> bisa dicocokkan dengan benar dan justru menimbulkan noise.
>
> **Peran Chief (dokter):** isi kolom "Perbaikan" dengan gejala klinis yang
> benar dari PPK FKTP / Panduan Praktik Klinis. Saya (Claude) **tidak mengarang
> gejala** — hanya menandai yang rusak dan mengusulkan perbaikan mekanis yang
> jelas aman (ditandai 💡). Setelah Chief setujui, saya terapkan ke JSON + tulis
> contract test agar tidak terulang.
>
> Total: **19 entri** (10 fragmen + 2 tipis + 1 nama + 6 grup duplikat).
> KB total 159 penyakit.
>
> **Status 2026-09-21:** Chief GO — perbaikan italic diterapkan ke
> `public/data/penyakit.json` (23 id). Changelog:
> [`docs/kb-repair-applied-2026-09-21.md`](./kb-repair-applied-2026-09-21.md).
> Contract: `lib/iskandar-diagnosis-engine/penyakit-kb.contract.test.ts`.

---

## Kategori A — Gejala fragmen terpotong (10 entri)

Gejala berisi potongan kalimat mid-sentence, bukan gejala utuh.

### A1. `G51` Bells' palsy

- **Sekarang:** `["jam)", "jam. Gejala", "Karena kondisi ini", "Kebanyakan", "Kebanyakan kasus paresis mulai terjadi selama"]`
- **Perbaikan (dokter):** _(mis. "Kelemahan/paralisis otot wajah satu sisi mendadak", "Mulut mencong", "Mata sulit menutup sisi terkena", "Hilangnya lipatan dahi", "Nyeri belakang telinga")_

### A2 & A3. `J30` Rhinitis akut **dan** `J30` Rhinitis vasomotor (identik, lihat juga Grup D2)

- **Sekarang:** campuran definisi 5 subtipe rhinitis + fragmen (`"ulang. Pasien"`, `"3 40"`)
- **Perbaikan (dokter):** _(pisahkan gejala inti: "Hidung tersumbat", "Ingus/rinore", "Bersin berulang", "Rasa panas/gatal di hidung"; untuk vasomotor tekankan pemicu non-alergi)_

### A4. `A37` Pertusis

- **Sekarang:** `["stadium yaitu:", "Stadium Kataralis...", "minggu. Gejalanya berupa...", ...]`
- **Perbaikan (dokter):** _(mis. "Batuk paroksismal berat", "Batuk diakhiri whoop/tarikan napas melengking", "Muntah setelah batuk", "Infeksi saluran napas atas ringan pada fase awal")_

### A5. `J20` Bronkitis akut

- **Sekarang:** 10 fragmen terpotong (`"minggu.Dahak dapat berwarna jernih,"`, dst.)
- **Perbaikan (dokter):** _(mis. "Batuk (awalnya kering lalu berdahak)", "Dahak jernih/putih/kuning/hijau", "Demam ringan", "Rasa tidak nyaman di dada", "Sesak ringan")_

### A6. `T47` Keracunan makanan

- **Sekarang:** `["Diare akut...", "- Nyeri perut.", "Nyeri kram otot perut...", "- Kembung."]`
- **Perbaikan (dokter):** 💡 relatif utuh — cukup rapikan bullet `-` dan pecah kalimat panjang. _(Diare akut, Nyeri perut, Kram perut, Kembung, Mual/muntah)_

### A7. `B65` Skistosomiasis

- **Sekarang:** 10 fragmen (`"hematobium."`, `"Japonicum."`, dst.)
- **Perbaikan (dokter):** _(fase akut: demam, nyeri kepala, nyeri otot; fase kronis: hematuria, nyeri berkemih, nyeri abdomen, diare berdarah, hepatosplenomegali)_

### A8. `D50` Anemia defisiensi besi

- **Sekarang:** `["kunang, pusing, telinga berdenging dan penurunan konsentrasi."]` (satu fragmen)
- **Perbaikan (dokter):** 💡 KB sudah punya versi lengkap di `D52` (lihat Grup D4). _(Badan lemah/lesu, Mudah lelah, Mata berkunang-kunang, Tampak pucat, Telinga berdenging, Penurunan konsentrasi)_

### A9. `B00` Herpes simpleks tanpa komplikasi

- **Sekarang:** 6 fragmen naratif terpotong
- **Perbaikan (dokter):** _(Vesikel berkelompok di atas dasar eritema, Nyeri/rasa terbakar/gatal lokal, Gejala prodromal sebelum lesi, Gingivostomatitis pada anak, Lesi genital pada dewasa)_

### A10. `L22` Napkin eczema

- **Sekarang:** `["kadang membasah dan membentuk luka."]` (satu fragmen)
- **Perbaikan (dokter):** _(Ruam eritema di area popok, Kulit lecet/membasah, Bisa membentuk luka, Rewel pada bayi)_

---

## Kategori B — Gejala tipis / tidak bermakna (2 entri)

### B1. `L21` Dermatitis seboroik

- **Sekarang:** `["Kelainan awal hanya"]`
- **Perbaikan (dokter):** _(Skuama berminyak kekuningan, Eritema di area seboroik: kulit kepala/alis/lipat nasolabial, Gatal, Ketombe)_

### B2. `L30` Dermatitis perioral

- **Sekarang:** `["Kelainan awal hanya"]` (identik B1, lihat Grup D6)
- **Perbaikan (dokter):** _(Papul/pustul eritematosa di sekitar mulut, Rasa terbakar/gatal ringan, Menyisakan zona bebas lesi di tepi bibir)_

---

## Kategori C — Nama entri terpotong (1 entri)

### C1. `A54` `"nongonore)"`

- **Gejala (sudah benar):** `["Sekret uretra encer atau mukoid", "Disuria ringan hingga sedang", "Frekuensi kencing meningkat", "Kemerahan pada meatus uretra"]`
- **Perbaikan nama (dokter):** 💡 kemungkinan besar `"Uretritis gonore dan nongonore"` — mohon konfirmasi. _(catatan: ICD `A54` = infeksi gonokokus)_

---

## Kategori D — Gejala duplikat antar entri berbeda (6 grup)

Beberapa penyakit **berbagi array gejala yang sama persis** — jelas salah copy.

### D1. `H52` Miopia · `B35` Kandidosis mukokutan · `L70` Akne vulgaris

- **Sekarang (ketiganya):** `["Tidak terdapat riwayat kelainan sistemik seperti;"]`
- **Perbaikan (dokter):** ketiganya beda total → butuh gejala masing-masing:
  - `H52` Miopia: _(Penglihatan jauh kabur, Menyipitkan mata, Sakit kepala)_
  - `B35` Kandidosis: _(Bercak putih di mukosa, Eritema, Gatal, Maserasi lipatan kulit)_
  - `L70` Akne: _(Komedo, Papul/pustul di wajah, Kulit berminyak)_

### D2. `J30` Rhinitis akut · `J30` Rhinitis vasomotor

→ lihat **A2 & A3** di atas.

### D3. `P38` Infeksi umbilikus · `N39` ISK · `N39` ISK bagian bawah ⚠️ **PALING BERBAHAYA**

- **Sekarang (ketiganya):** `["anyangan, nyeri pinggang dan nyeri suprapubik."]`
- **Masalah:** `P38` (infeksi tali pusat neonatus) berisi gejala **ISK** — tertukar total.
- **Perbaikan (dokter):**
  - `P38` Infeksi umbilikus: _(Kemerahan/edema sekitar umbilikus neonatus, Sekret purulen/berbau, Demam, Rewel)_
  - `N39` ISK (kedua entri): _(Disuria/anyang-anyangan, Frekuensi berkemih meningkat, Urgensi, Nyeri suprapubik, Nyeri pinggang bila naik ke atas, Urin keruh/berbau)_

### D4. `D52` Anemia besi (kehamilan) · `E56` Defisiensi vitamin · `E63` Defisiensi mineral

- **Sekarang (ketiganya):** `["Badan lemah, lesu", "Mudah lelah", "Mata berkunang-kunang", "Tampak pucat", "Telinga mendenging", "Pica..."]`
- **Perbaikan (dokter):** gejala anemia dipakai untuk ketiganya. `E56`/`E63` perlu gejala spesifik defisiensi masing-masing (mis. E56 vit A: rabun senja; vit C: gusi berdarah).

### D5. `B35` Tinea kapitis · `B35` Tinea korporis

- **Sekarang (keduanya):** `["Adanya riwayat kontak dengan orang yang mengalami dermatofitosis."]`
- **Perbaikan (dokter):**
  - Tinea kapitis: _(Bercak botak dengan skuama di kulit kepala, Gatal, Rambut mudah patah)_
  - Tinea korporis: _(Lesi anular tepi aktif meninggi, Central healing, Gatal)_

### D6. `L21` Dermatitis seboroik · `L30` Dermatitis perioral

→ lihat **B1 & B2** di atas.

---

## Setelah Chief mengisi

1. Chief isi kolom perbaikan (boleh langsung di file ini atau balas di chat).
2. Saya terapkan ke `public/data/penyakit.json` — **hanya field `gejala_klinis`
   dan `nama` yang disebut**, tidak menyentuh ICD/kompetensi/terapi.
3. Saya tulis **contract test** (`penyakit-kb.contract.test.ts`): setiap entri
   wajib ≥ N gejala, tidak ada fragmen mid-sentence, tidak ada array gejala
   duplikat antar ICD berbeda → korupsi seperti ini gagal di CI, tidak terulang.
4. Re-run probe ketajaman untuk konfirmasi perbaikan.
