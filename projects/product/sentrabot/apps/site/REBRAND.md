# Rebrand log — Cora layout → Sentra Bot 2026

Design, CSS, class names, spacing, and assets stay original.
Only visible copy (and destination URLs) change, wave by wave.

## Wave 1 — Hero + Header + document meta (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| `<title>` | Give Cora your inbox. Take back your life. | Sentra Bot \| Agen Otonom untuk Indonesia |
| meta description | Cora is your $150,000 chief of staff… | Sentra Bot membantu Anda deploy agen AI otonom… |
| author link | darkroom.engineering | sentrahai.com |
| Logo `alt` | Cora logo | Logo Sentra Bot |
| Logo `aria-label` | Scroll to top | Kembali ke atas |
| Nav link | Log in → cora.computer/sign_in | Masuk → /workspace |
| Nav CTA | Start free trial → cora.computer/sign_up | Ajukan akses beta → /workspace |
| Hero H1 | Give Cora your inbox. / Take back your life. | Agen yang bekerja, / bukan sekadar chat. |
| Hero sub | Cora is the $150,000 chief of staff… | Sentra Bot — platform multi-agen local-first… |
| Hero CTA | Get Started → cora.computer/sign_up | Mulai → /workspace |

## Wave 2 — Testimonials marquee (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| 8 unique quotes (×10 each for marquee loop) | Cora / email / Every / cora.computer | Sentra Bot / agents / routines / Brief / sentrahai.com |
| Attribution names | Brett, Andrew, Mike, … | Raka Putra, Sari Wijaya, Andi Pratama, … (text only; photos unchanged until image wave) |
| Roles | Founder at / CPO at / … | Operator di / Lead produk di / … |

**Next wave:** Demo sections (`DemoDesktop` + `DemoMobile`) — still say “Cora screens your email”.

## Wave 3 — Demo desktop + mobile (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H3 #1 | Cora screens your email | Sentra Bot triages your work |
| Body #1 | …emails…inbox… | …tasks…human decision…in view… |
| CTA #1 | Start your free trial | Ajukan akses beta |
| H3 #2 | Cora drafts responses in your voice | Agents draft actions in your voice |
| Body #2 | …email history… | …history…next step… |
| CTA #2 | Get Started | Mulai |
| Mock label | Cora Draft | Agent Draft |
| Mock subject / body | DSA / DocuSign email | Permission card / sandbox Allow–Deny |
| Links | cora.computer/sign_up | /workspace |

**Next wave:** Brief section (`The rest gets Briefed`).

## Wave 4 — Brief (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Body | Twice a day, Cora… inbox… | Twice a day, Sentra Bot… agents handled… ops… |
| CTA | Get Started → cora.computer | Mulai → /workspace |
| Chip | All accounts | All agents |
| Image alts | /images/emails/N.png | Brief card N |
| Kept | “The rest gets *Briefed*”, “Today’s Brief”, Morning/Afternoon | Product vocabulary (Brief) |

**Next wave:** Features (`Cora learns you inside and out`).

## Wave 5 — Features (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H2 | Cora learns you inside and out | Sentra Bot learns you inside and out |
| Item 1 title | Cora gets to know you, automatically | Agents get to know you, automatically |
| Item 1 body | …email patterns… | …work patterns…ops… |
| Item 2 title | Shape Cora through conversation | Shape agents through conversation |
| Item 2 body | …chief of staff…email… | …teammates…tasks… |
| CTA | Get Started → cora.computer | Mulai → /workspace |

**Next wave:** Privacy (`Security and privacy are built in`).

## Wave 6 — Privacy (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Kept | Security and privacy are built in / We never train… / Top security standards | — |
| LLM line | …share your emails with LLMs… | …call LLMs with your BYOK keys… |
| Visibility | No one can see your emails | …transcripts / local data |
| Permissions | Cora can’t send or delete emails | Agents can’t act without permission / Allow–Deny card |
| Compliance | Google Verified / CASA Tier 2 | local-first, sandboxed, human-gated |

**Next wave:** Pricing.

## Wave 7 — Pricing (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| Kept | Pick a plan / Yearly–Monthly / Professional–Unlimited / $20–$39 | Price UI structure |
| Features | email accounts / AI Inbox / Pre-drafted… | agent seats / triage & routines / permission-gated drafts / Brief |
| Unlimited note | Everything in Basic | Everything in Professional |
| CTA | Start free trial → cora.computer | Ajukan akses beta → /workspace |
| Bundle | Every + Cora/Spiral/Sparkle | self-host full Sentra Bot stack… BYOK |
| Footer CTA | Subscribe to → every.to | Kunjungi → sentrahai.com |

**Next wave:** FAQ.

## Wave 8 — FAQ (2026-08-21)

All 12 Q&A rebranded to Sentra Bot (permission broker, BYOK, local-first, Brief, agent seats).  
“What is Every?” → “What is Sentra?” with sentrahai.com.  
Heading kept: Frequently asked questions.

**Next wave:** Footer.

## Wave 9 — Footer (2026-08-21)

| Surface | Before | After |
|---------|--------|--------|
| H3 | Free Yourself from Email | Free Yourself from Busywork |
| Body | Let Cora handle your emails… | Let Sentra Bot handle the busywork… |
| CTA | Start your free trial → cora.computer | Ajukan akses beta → /workspace |
| Nav | Log In / Privacy / Terms → cora/every | Masuk → /workspace; Privacy/Terms → sentrahai.com |

## End-to-end status (2026-08-21)

- Waves 1–9 complete on `src/html/**` + `index.html` meta.
- Verified: **0** matches for `Cora`, `cora.computer`, `Gmail`, `Get Started`, `Start free trial`, `Log in` under `src/` and root `index.html`.
- Left intentionally: `original/` archive, `content-clean.md` capture notes, unused root `assets/*.js` Next chunks (not loaded by Vite app).
- Images/logo PNG rebranded to Sentra Bot in waves 11-16 — see `IMAGE-SWAP.md`.

## Wave 10 — Bahasa Indonesia penuh (2026-08-21)

Seluruh copy visible di `src/html/**` + meta `index.html` dialihkan ke Bahasa Indonesia.
Istilah produk teknis yang dipertahankan: Sentra Bot, BYOK, Brief, LLM, sandbox, local-first, self-hosted, Professional/nama paket yang sudah diganti ke Profesional / Tanpa batas.
`lang="id"` pada dokumen.

## Wave 11 — Fitur 9 bot Sentra, fokus Indonesia (2026-09-01)

Instruksi Chief: landing page harus mencerminkan produk sebenarnya — 9 bot production-ready
(37 file, masing-masing dengan `SYSTEM_PROMPT.md`, `manifest.json`, contoh tugas nyata, alur
first-run terawasi, aturan memori, batas cakupan, gerbang verifikasi, rekomendasi integrasi,
kandidat rutinitas, dan profil izin) — dirancang untuk budaya dan kebutuhan orang Indonesia.
Hanya teks yang diubah; tidak ada elemen baru ditambahkan kecuali satu item FAQ baru (pola
`accordion-module` yang sudah berulang 12×, jadi 13× — bukan struktur baru).

| Surface | Sebelum | Sesudah |
|---|---|---|
| `index.html` title | Sentra Bot \| Agen Otonom untuk Indonesia | Sentra Bot \| 9 Bot Otonom untuk Indonesia |
| `index.html` meta description | …deploy agen AI otonom dengan BYOK… | AI yang memahami cara orang Indonesia belajar, berkarier, dan mengatur keuangan. Sembilan bot Sentra, jalan di komputer Anda sendiri dengan API key Anda. |
| Hero sub | Sentra Bot — platform multi-agen local-first… | AI yang memahami cara orang Indonesia belajar, berkarier, dan mengatur keuangan. Jalan di komputer Anda sendiri, bukan di server kami. |
| Features H2 | Sentra Bot mengenal Anda secara menyeluruh | 9 bot Sentra, dirancang untuk keseharian orang Indonesia |
| Features kartu 1 | Agen mengenal Anda, secara otomatis | 9 bot siap pakai, satu per kebutuhan — nama kesembilan bot disebutkan |
| Features kartu 2 | Bentuk agen lewat percakapan | Setiap bot lengkap, bukan prompt template — SYSTEM_PROMPT.md, manifest.json, dst. |
| Brief body | …ditangani agen… | …ditangani sembilan bot Anda… |
| Pricing bullet (Profesional) | Triage tugas AI & rutinitas | Akses ke 9 bot Sentra siap pakai |
| Pricing bundle subtext | …self-host seluruh stack Sentra Bot — agen, rutinitas… | …self-host seluruh stack Sentra Bot — sembilan bot, rutinitas… |
| FAQ "Apa itu Sentra?" | …platform multi-agen local-first dan self-hosted untuk operator… | …dirancang khusus untuk budaya dan kebutuhan orang Indonesia… |
| FAQ (baru) | — | "Bot apa saja yang tersedia di Sentra Bot?" — daftar 9 bot lengkap + rincian teknis per bot |
| Demo blok 1 H3 (desktop + mobile) | Sentra Bot memilah pekerjaan Anda | Agen memilah dulu, Anda yang memutuskan |
| Demo blok 1 body (desktop + mobile) | Sentra Bot tahu mana yang penting bagi Anda… Item itu tetap terlihat… | Agen tidak menebak mana yang penting. Ia belajar dari cara Anda menangani sesuatu selama ini. Yang butuh keputusan Anda tidak ikut tenggelam di tumpukan. |
| Demo blok 2 H3 (desktop + mobile) | Agen menyusun tindakan dengan gaya Anda | Agen menyiapkan hal yang benar-benar Anda butuhkan |
| Demo blok 2 body (desktop + mobile) | Begitu agen punya cukup konteks dari riwayat Anda… ia langsung menyusunnya. | Bukan sekadar memberi saran. Rangkuman materi sebelum ujian, agenda sebelum rapat, daftar belanja sebelum ke pasar. Sudah tersusun, tinggal Anda periksa. |

Catatan penyuntingan blok demo 2: versi pertama menyebut ketiga persona secara eksplisit
("Mahasiswa dapat… Profesional dapat… Ibu rumah tangga dapat…"). Bentuk itu dibuang karena
menjadi daftar yang dipaksa jadi paragraf — pola "X dapat A dan B" tiga kali berturut-turut,
dan pembaca harus melewati dua kalimat yang bukan untuknya. Versi final mengganti label
persona dengan **situasi** (ujian, rapat, pasar), sehingga pembaca mengenali dirinya sendiri
tanpa diberi cap. Rincian per persona tetap tersedia di tiga item FAQ.
| FAQ (3 item baru) | — | "Untuk mahasiswa…", "Untuk profesional yang bekerja…", "Untuk ibu rumah tangga…" — rincian per persona |

## Wave 12 — UI demo dibangun ulang: iPad + antarmuka gelap (2026-09-01)

**Ini perubahan design pertama yang disetujui Chief secara eksplisit.** Aturan "jangan ubah
design" masih berlaku untuk seluruh halaman lain; izin ini terbatas pada satu elemen: kartu
putih berisi 7 baris gambar di seksi demo.

| | Sebelum | Sesudah |
|---|---|---|
| Desktop (`DemoDesktop.html`) | Kartu putih + 7 gambar baris (`dr-h-47`) + overlay tersembunyi `opacity:0` | Mockup iPad lanskap (rasio 1.415) berisi UI gelap: sidebar 9 bot, percakapan, kartu izin, kolom input |
| Mobile (`DemoMobile.html`) kartu 1 | Kartu putih + 7 gambar baris (`dr-h-66`) | iPad potret (rasio 0.74): strip chip 9 bot, percakapan, kartu izin |
| Mobile kartu 2 | Draf email — **berisi teks Inggris & nama asing yang tampil nyata** | iPad potret: panel "Draf Agen" berbahasa Indonesia |

### Animasi digerakkan gulir (2026-09-01)

Percakapan tidak muncul sekaligus. Pesan tersingkap satu per satu mengikuti posisi gulir
pembaca — bukan timer — sehingga adegannya tidak pernah berjalan mendahului yang membaca.

Alur delapan langkah di desktop, memperagakan satu siklus kerja utuh:

| Langkah | Yang muncul |
|---|---|
| 1 | Pesan pengguna: "Ujian proposal minggu depan. Bantu rangkum bab 2 dari PDF di folder Skripsi." |
| 2 | Indikator sedang mengetik (tiga titik) |
| 3 | Balasan agen: "Ada 12 berkas di folder itu. Saya perlu izin Anda untuk membacanya dulu." |
| 4 | **Kartu izin** — Baca 12 berkas PDF · Dokumen/Skripsi · hanya baca · [Izinkan] [Tolak] |
| 5 | Kartu izin **berubah** jadi status hijau: "Diizinkan · 12 berkas dibaca" |
| 6 | Indikator mengetik kedua |
| 7 | "Sembilan dari dua belas berkas relevan. Ini drafnya." |
| 8 | Panel **Draf Agen** — Bab 2 Landasan Teori, 3 sub-bagian, [Simpan] [Ubah dulu] |

Mobile memakai runway terpisah per iPad: kartu 1 menjalankan langkah 1–5, kartu 2 langkah 1–3
(mengetik → balasan → draf).

**Kontrak markup** (`src/hooks/useDemoSequence.js`):

- `[data-seq-runway]` — elemen yang rentang gulirnya menggerakkan satu iPad. Di desktop
  dipasang pada `<section>`; di mobile pada tiap blok `h-[1200px]`.
- `[data-seq="N"]` — tersingkap saat langkah >= N.
- `[data-seq-until="M"]` — dikeluarkan dari layout (`display:none`) saat langkah >= M. Inilah
  yang membuat indikator mengetik hilang dan kartu izin berganti jadi status "Diizinkan",
  bukan menumpuk.

**Keputusan teknis:**

- Digerakkan `requestAnimationFrame` pada listener scroll pasif, dengan cache `lastStep`
  sehingga tidak ada penulisan DOM saat langkah tidak berubah.
- **`prefers-reduced-motion` dihormati**: pembaca yang mematikan animasi langsung melihat
  keadaan akhir, tanpa transisi maupun titik berkedip.
- Seksi desktop dan mobile saling menggantikan lewat media query, jadi salah satunya selalu
  berukuran nol. Runway berketinggian nol sengaja diparkir di langkah 1 — tanpa ini, seksi
  yang tersembunyi akan tampil sudah selesai seluruhnya begitu pembaca mengubah ukuran jendela.
- Satu file hook baru; `App.jsx` bertambah dua baris. Tidak ada dependensi baru.

Diverifikasi dengan menggulir bertahap di 1440×900 (8 langkah) dan 375×812 (5 + 3 langkah).

### Yang ikut terbersihkan

Kartu kedua di mobile ternyata masih menampilkan sisa konten Cora yang **tidak pernah
diterjemahkan dan terlihat pengunjung**: "Dr. Lila Mensah", `lila.mensah@medinsight.ai`,
`samira@insightpeak.co`, `naveen@monologue.to`, dan satu paragraf email berbahasa Inggris
penuh ("Loved the deck and the way Monologue personalizes your responses…"). Semuanya hilang.
Overlay tersembunyi di desktop yang memuat teks sama juga ikut dibuang.

### Keputusan teknis

- **Satuan `cqw` (container query units)**, bukan px maupun `dr-*`. Alasan: stylesheet situs
  sudah dikompilasi statis dari capture asli, jadi kelas `dr-*` bernilai baru tidak tersedia;
  sementara px tidak ikut menskala dengan sistem viewport-relative halaman. `cqw` menskala
  proporsional terhadap lebar kontainer induk — yang tetap memakai `dr-w-644` / `dr-w-357` asli.
- **Nol CSS baru.** Seluruh gaya inline; tidak ada file stylesheet yang disentuh.
- **Warna resmi brand dipakai penuh** untuk pertama kalinya di halaman ini: `#0D1117`
  (dasar), `#121821`, `#18212C`, `#263241` (garis), `#F5F7FA` / `#A8B3C2` / `#8B96A5` (teks),
  `#5B8CFF` (aksen). Sesuai `docs/brand/10-BRAND-GUIDELINES/sentra-color-specification.md`.
- **Logomark resmi** dipakai apa adanya lewat `assets/favicon-180.png` (logomark putih di atas
  `#0D1117`) — tidak digambar ulang, sesuai aturan brand.
- Font memakai kelas `font-switzer` milik situs. Tanpa ini, UI mewarisi serif dari `<body>`
  dan terbaca seperti dokumen, bukan aplikasi.

### Isi yang ditampilkan

Sidebar/chip memuat kesembilan bot. Percakapannya memakai persona mahasiswa — sejalan dengan
teks blok demo ("Rangkuman materi sebelum ujian") — dan sengaja menampilkan **kartu izin
Izinkan/Tolak**, karena permission broker adalah pembeda produk dan menjadi bukti visual bagi
klaim blok pertama ("Agen memilah dulu, Anda yang memutuskan").

Diverifikasi di browser pada viewport 1440×900 dan 375×812; tag seimbang di kedua file.

### Testimoni ditulis ulang ke tiga persona (2026-09-01)

Nama tetap (placeholder lama), isi kutipan dan jabatan diganti agar mewakili pembaca sasaran.
Berlaku di `Testimonials.html` (8 kartu × 5 salinan marquee = 80 titik) dan 1 kartu di
`Pricing.html`.

| Nama | Jabatan baru | Isi kutipan |
|---|---|---|
| Raka Putra | Mahasiswa di | Bab 2 skripsi mandek, kerangka dari catatan bacaan |
| Sari Wijaya | Ibu rumah tangga di | Menu mingguan & daftar belanja |
| Andi Pratama | Staf keuangan di | Laporan mingguan Jumat sore |
| Maya Kusuma | Ibu rumah tangga di | Jadwal les anak, bayaran sekolah, kontrol dokter |
| Bima Santoso | Pemilik warung di | Catatan penjualan warung dirapikan tiap malam |
| Dewi Lestari | Ibu rumah tangga di | Kebocoran pengeluaran bulanan |
| Farhan Akbar | Mahasiswa tingkat akhir di | Lamar magang 11 tempat, CV & latihan wawancara |
| Nina Rahayu | Staf kantor di | Agenda rapat & rangkuman dokumen |

Kedelapan wordmark mungil di sebelah nama sudah diganti jadi kampus/kota agar nyambung dengan
jabatan baru — lihat **Wave 20** di `IMAGE-SWAP.md`. Hasilnya kini terbaca "Mahasiswa di
Universitas Nusantara", "Ibu rumah tangga di Solo", dan seterusnya.

**Risiko yang masih terbuka:** kedelapan testimoni tetap **fiktif**. Sebelum tayang, ganti
dengan pengguna nyata berikut izin tertulis, atau nonaktifkan seksi ini. Menayangkan
endorsement fiktif adalah risiko hukum dan reputasi — lihat juga catatan risiko di
`IMAGE-SWAP.md`.

### Pergeseran audiens (keputusan Chief, 2026-09-01)

Audit kosakata seluruh halaman menemukan ketimpangan: bahasa korporat/B2B warisan layout
aslinya (Pendiri 30×, rutinitas 25×, workspace 15×, infra 13×, operasional 11×, "Lead produk"
/ "GM di" / "Peneliti di" 30×) versus kosakata kehidupan nyata pembaca sasaran (mahasiswa 0×,
skripsi 0×, ibu 0×, anak 0×, sekolah 0×, tagihan 0×, BPJS 0×, gaji 0×). Nama kesembilan bot
menyasar mahasiswa, pekerja, dan ibu rumah tangga; seluruh teks lain masih bersuara asisten
eksekutif Amerika.

Wave ini mulai menutup jarak itu pada blok demo kedua dan FAQ. ### Penyisiran tuntas (2026-09-01)

Seluruh seksi sudah disisir. Hasil audit ulang pada teks tampil (URL dikecualikan):

| Kosakata korporat | Sebelum | Sesudah |
|---|---|---|
| Pendiri / Lead produk / GM di / Peneliti di | 80 | **0** |
| operasional | 11 | **0** |
| infra | 13 | **0** |
| operator, backlog, stack Anda, eskalasi, tools, kursi agen, transkrip | 20+ | **0** |
| rutinitas | 25 | 3 (dipertahankan — istilah produk, bukan jargon korporat) |

| Kosakata hidup nyata | Sebelum | Sesudah |
|---|---|---|
| ibu rumah tangga | 0 | 31 |
| mahasiswa | 0 | 21 |
| warung | 0 | 20 |
| menu / belanja | 1 | 34 |
| skripsi | 0 | 14 |
| anak / sekolah | 0 | 26 |
| magang | 0 | 11 |

Perubahan per seksi pada penyisiran terakhir:

- **FAQ** — 7 butir ditulis ulang. "eskalasi/tools" → "mana yang selalu Anda dahulukan";
  "log rutinitas dan transkrip" → "riwayat lengkapnya"; "backlog" → "tumpukan yang sudah
  menunggu"; "stack Anda" → "aplikasi yang sudah Anda pakai"; "kursi agen" → "berapa agen
  yang bisa saya jalankan sekaligus"; pertanyaan "workspace saya" → "berkas saya".
- **Pricing** — butir paket dibuat berbunyi manfaat, bukan fitur: "Termasuk 2 kursi agen" →
  "2 agen berjalan bersamaan"; "Draf agen berpagar izin" → "Tidak ada tindakan tanpa izin
  Anda"; "Dukungan teknis" → "Bantuan lewat email". Subteks self-host dilepas dari "stack"
  dan "infra".
- **Privacy** — "transkrip" → "percakapan"; "local-first, tersandbox, digate oleh manusia" →
  "berjalan di mesin Anda sendiri, terkurung dalam sandbox, setiap tindakan penting menunggu
  persetujuan Anda".
- **Brief** — judul "Sisanya mendapat *Brief*" dibuang. Itu pun bukan kalimat Indonesia,
  melainkan sisa permainan kata Inggris "The rest gets *Briefed*" yang patah saat
  diterjemahkan. Diganti "Satu *Brief*, dua kali sehari". Isinya kini memakai contoh nyata
  lintas persona (draf tugas, tagihan jatuh tempo, jadwal sekolah anak) dan melepas frasa
  "Pindai operasional dalam 30 detik".

## Wave 16 — Halaman Privasi & Ketentuan (2026-09-01)

Dua halaman statis baru, disambungkan dari footer. Tautan "Privasi" dan "Ketentuan" yang
sebelumnya mengarah ke `https://sentrahai.com` kini menunjuk halaman sendiri.

| Berkas | URL | Isi |
|---|---|---|
| `public/privasi.html` | `/privasi.html` | Kebijakan Privasi, 10 bagian |
| `public/ketentuan.html` | `/ketentuan.html` | Ketentuan Layanan, 10 bagian |

Draf sumber dalam Markdown tersimpan di `docs/legal/` berikut catatan penyusunan yang lebih
panjang (`kebijakan-privasi.md`, `ketentuan-layanan.md`, `tentang-sentra-ai.md`).

### Kenapa berkas datar, bukan folder

Percobaan pertama memakai `public/privasi/index.html` dengan URL `/privasi/`. **Gagal:** Vite
tidak melakukan resolusi indeks direktori untuk berkas di `public/`, sehingga URL itu jatuh ke
SPA fallback dan menyajikan halaman utama. Lebih buruk lagi, karena seluruh `<img>` di halaman
utama memakai path **relatif** (`assets/...`), di URL `/privasi/` semuanya menunjuk
`/privasi/assets/...` — **185 dari 261 gambar gagal dimuat**. Diganti berkas datar
`privasi.html` dan `ketentuan.html`, yang bekerja sama baiknya di dev maupun hasil build.

**Sisa yang perlu dibersihkan manual:** folder `public/privasi/` dan `public/ketentuan/` dari
percobaan pertama masih ada — mount tidak mengizinkan saya menghapus direktori. Mohon Chief
hapus keduanya agar tidak membingungkan.

### Isi halaman

Disusun dari bukti di repositori: skema basis data (48 model), daftar layanan di
`.env.example`, dan `packages/bot-templates/source/core/30_APPROVAL_POLICY.md`. Bagian
"Agen bertindak atas perintah Anda" mengikuti daftar tindakan yang menurut kebijakan itu wajib
disetujui manusia.

Setiap fakta yang **tidak bisa dipastikan dari kode** ditandai kotak kuning "Perlu dilengkapi"
di halaman — 10 di Privasi, 6 di Ketentuan. Kedua halaman diberi `<meta name="robots"
content="noindex">` agar tidak terindeks mesin pencari selama masih berstatus draf.

**Sebelum tayang:** cabut `noindex`, isi seluruh kotak kuning, dan mintakan tinjauan advokat.
Kedua dokumen mengikat secara hukum dan menyangkut uang, tanggung jawab, serta hak konsumen.

Diverifikasi: `/privasi.html` dan `/ketentuan.html` merespons 200 dan render benar; halaman
utama tetap **0 gambar gagal** dari 261, tautan footer mengarah benar.

## Wave 14 — Seksi Fitur: alur nyata + animasi, video rusak diganti (2026-09-01)

Judul lama "9 bot Sentra, dirancang untuk keseharian orang Indonesia" dibuang: "dirancang
untuk" adalah bahasa desainer, dan "keseharian orang Indonesia" hanya *mengatakan* apa yang
sudah *dibuktikan* seluruh isi halaman. Diganti alurnya sendiri — **"Pasang, pilih bot,
sambungkan. Setelah itu ia bekerja."**

| | Sebelum | Sesudah |
|---|---|---|
| Kartu 1 visual | Gambar folder ter-fan (3 webp) | Panel gelap animasi: 3 langkah bernomor → pemisah → 4 chip hasil |
| Kartu 1 teks | "9 bot siap pakai, satu per kebutuhan" + daftar 9 nama | "Contohnya, pemilik warung" + alur UMKM/WhatsApp |
| Kartu 2 visual | **`<video src="/videos/demo.mp4">` — berkas tidak pernah ada, kotak kosong** | Panel gelap animasi: daftar isi satu bot |
| Kartu 2 teks | "Setiap bot lengkap, bukan prompt template" | "Isinya serius, bukan prompt tempelan" |

**Video rusak.** `public/videos/` tidak pernah ada di repo — sudah tercatat sebagai request
gagal di `IMAGE-SWAP.md`, tapi belum pernah diperbaiki. Pengunjung melihat kotak kosong di
salah satu dari hanya dua kartu fitur. Kini diganti visual yang berfungsi.

**Klaim WhatsApp diverifikasi**, bukan diarang: `.env.example` memuat `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, dan
`WHATSAPP_TEMPLATE_LANGUAGE=id`. Integrasinya nyata di kode.

Daftar sembilan nama bot hilang dari kartu ini, tapi tetap tampil di sidebar iPad (seksi demo)
dan satu butir FAQ khusus — berpindah, bukan hilang.

### Revisi: iPad besar tiga tahap (permintaan Chief)

Dua panel kecil di dalam kartu diganti **satu iPad lebar** (`dt:dr-w-915`, 915×644 px pada
viewport 1440) yang berganti tahap sendiri:

| Tahap | Isi | Langkah |
|---|---|---|
| 1 · Pilih bot | Kisi 3×3 kesembilan bot, Sentra UMKM tersorot | 1–2 |
| 2 · Sambungkan | Kartu WhatsApp Business, "Menyambungkan…" → "Tersambung · token disimpan di mesin Anda" | 3–4 |
| 3 · Jalankan | 4 baris aktivitas + kartu izin Izinkan/Tolak + strip "Brief sore siap dibaca · 17.20" | 5–9 |

Indikator langkah di kepala layar ikut berubah (angka → ✓) tiap tahap. Tahap saling
menggantikan lewat `data-seq-until`, bukan menumpuk. Dua paragraf penjelas dipindah ke bawah
iPad dalam dua kolom.

### Hook diperluas: mode `enter`

Seksi Fitur hanya setinggi satu layar, jadi tidak ada jarak gulir untuk dipetakan.
`useDemoSequence` kini punya dua mode:

- **scroll** (default) — untuk seksi sticky yang tinggi; langkah mengikuti posisi gulir dan
  bisa mundur saat digulir balik.
- **enter** (`data-seq-mode="enter"`) — untuk seksi setinggi satu layar; langkah mengalir
  sekali lewat `IntersectionObserver` (ambang 0,35) dengan jeda 480 ms.

### Empat bug yang ditemukan saat verifikasi

1. **`container-type` di elemen yang sama dengan pengguna `cqw`.** Sebuah elemen tidak bisa
   menanyai dirinya sendiri sebagai container, jadi `6cqw` jatuh ke *viewport*: **86px**, bukan
   19px. Padding raksasa itu menyusutkan kotak langkah jadi 142px dan memotong seluruh baris
   chip. Diperbaiki dengan memindahkan `container-type:inline-size` ke `<picture>` induk.
2. **Hook menghapus `display` dari style inline.** `paint()` menulis `el.style.display = ""`
   untuk memunculkan elemen — dan itu ikut menghapus `display:flex` yang tertulis di atribut
   `style` elemen itu sendiri. Layout iPad selamat hanya karena kebetulan anak-anaknya
   elemen inline. Diperbaiki: pensiun kini memakai atribut `data-seq-out` + aturan CSS,
   bukan menyentuh style inline.
3. **`IntersectionObserver` tidak pernah menyala di bawah emulasi viewport.** IO mengukur
   terhadap *visual viewport* yang sebenarnya, sehingga di panel pratinjau responsif — dan di
   devtools device mode — ia diam meski elemen jelas terlihat. Diverifikasi dengan membuat IO
   manual pada elemen yang sama: tidak pernah memanggil callback. Diganti pengukuran
   `getBoundingClientRect`, jalur yang sama dengan mode scroll, jadi kedua mode tidak mungkin
   berbeda pendapat.
4. **Halaman ini tidak memicu event `scroll` sama sekali.** Diverifikasi: `scrollY` berubah
   dari 0 ke 3034 sementara listener `scroll` di `window` menghitung **nol** kejadian. Seluruh
   animasi yang digantung pada event itu diam-diam tidak akan pernah berjalan. Pemicu utama
   kini rAF, dengan `scroll`, `resize`, dan `visibilitychange` sebagai jaring pengaman.

### Catatan verifikasi

Panel pratinjau melaporkan `document.hidden === true`, sehingga **rAF dijeda dan event scroll
tidak dikirim** — animasi tidak bisa diamati secara langsung di sana. Kedua mode akhirnya
diverifikasi lewat jalur yang tidak bergantung pada rAF: gulir ke posisi target, muat ulang
halaman (posisi gulir dipertahankan), lalu baca keadaan yang dihasilkan `measure()` sinkron
saat efek dipasang.

- **Mode scroll:** progres 0,620 → langkah seharusnya 7 → tampil `[1, 3, 5, 7]`. Cocok
  (2, 4, 6 adalah indikator mengetik dan kartu izin yang memang sudah pensiun).
- **Mode enter:** rasio terlihat 1,00 → kaskade berjalan sampai tahap 3 lengkap.

Pengamatan "berhasil" pada wave sebelumnya ternyata **menyesatkan**: yang tampak seperti
animasi mengikuti gulir sebenarnya `measure()` yang kebetulan dijalankan ulang oleh
StrictMode. Itulah yang menutupi bug 3 dan 4 sampai iPad besar ini dibuat.

Diverifikasi di 1440×900: kedua panel 315×337 tanpa terpotong, padding 15,75px (bukan 86px),
8 langkah tersingkap di masing-masing kartu, dan urutan iPad tetap utuh dengan `display:flex`
yang terjaga.

## Wave 13 — Harga Rupiah empat paket + posisi Managed AI (2026-09-01)

Harga dolar diganti struktur Rupiah dari Chief. **Perubahan design kedua yang disetujui
Chief secara eksplisit** (empat kartu sejajar).

| Paket | Bulanan | Tahunan (−20%) |
|---|---|---|
| Free | Rp0 | Rp0 |
| Plus | Rp79.000 | Rp63.000/bln · Rp756.000/thn |
| Pro | Rp199.000 | Rp159.000/bln · Rp1.908.000/thn |
| Business | Rp499.000 | Rp399.000/bln · Rp4.788.000/thn |
| Top-up | Rp25rb–250rb | disebut di subteks |

**Harga tahunan diturunkan, bukan diberikan Chief.** Tab-nya sendiri sudah berbunyi "Tahunan
(hemat 20%)", jadi angka tahunan = harga bulanan dikurangi 20%, dibulatkan ke ribuan terdekat,
dengan total setahun ditulis lengkap agar diskonnya bisa diperiksa pembaca, bukan sekadar
diklaim. **Mohon Chief konfirmasi angka ini sebelum tayang.**

### Perubahan design

- Lebar seksi `dt:dr-w-604` → `sb-pricing-w` (1040 unit), didefinisikan lewat satu blok
  `<style>` di dalam `Pricing.html` memakai rumus yang sama persis dengan kelas `dr-*` asli:
  `min(calc((N*100)/var(--device-width)*1vw), calc(N*1px))`, di breakpoint `(width >= 800px)`.
  Nilai `dr-w-*` di atas 600 tidak tersedia di stylesheet terkompilasi, sehingga tidak bisa
  memakai kelas yang sudah ada.
- Empat kartu × 249 unit. Ukuran huruf harga diturunkan 36px → 30px, butir 16px → 14px,
  catatan 18px → 13px agar "Rp199.000" muat tanpa terpotong.
- Mobile tidak berubah perilakunya: `dr-w-357` tetap berlaku, kartu bertumpuk vertikal.
- `usePricingTabs.js` — `PLANS` diperluas dari 2 ke 4 entri. Hook-nya sendiri sudah generik
  (memetakan `PLANS[index]` ke `cards[index]`), jadi tidak ada perubahan logika.

### Posisi Managed AI vs BYOK (keputusan Chief)

Tabel Chief mencantumkan "Managed AI: Included", sementara seluruh halaman menjanjikan
"jalan di komputer Anda sendiri, bukan di server kami" dan BYOK. Itu kontradiksi yang akan
tertangkap pembaca tepat di bagian harga.

Keputusan Chief: **Managed AI jadi default, BYOK jadi opsi.** Garis ceritanya sekarang —
*berkas dan riwayat tetap lokal; yang dikirim keluar hanya potongan yang perlu dibaca model;
kuota AI sudah termasuk, atau pakai kunci sendiri lewat BYOK agar panggilan model pun tidak
lewat Sentra.*

| Tempat | Sebelum | Sesudah |
|---|---|---|
| Hero | "Jalan di komputer Anda sendiri, bukan di server kami." | "Berkas Anda tetap di komputer sendiri, AI-nya sudah termasuk." |
| FAQ "Apakah ini hanya cloud?" | murni BYOK | berkas lokal + kuota AI termasuk + BYOK opsional |
| FAQ keamanan | "kunci milik Anda sendiri" | berkas lokal, potongan dikirim ke model, BYOK opsional |
| Privacy butir 1 | "kunci BYOK Anda" | "Baik memakai kuota AI dari kami maupun kunci Anda sendiri" |
| Privacy butir 4 | "local-first, tersandbox" | "Berkas Anda tersimpan di mesin sendiri, agen terkurung dalam sandbox" |
| Badge iPad | "Lokal · BYOK" | "Lokal · AI Sentra" |

Diverifikasi di 1440×900 (4 kartu × 249 unit, harga tidak meluap, tombol tahunan/bulanan
berfungsi) dan 375×812 (bertumpuk, tanpa luapan horizontal).

**Masih terbuka:** klaim "yang dikirim keluar hanya potongan yang perlu dibaca model" harus
diverifikasi terhadap implementasi sebenarnya sebelum tayang — ini klaim privasi, bukan
sekadar copy.

**Batasan struktur yang dipatuhi:** rincian per persona ditempatkan di FAQ, bukan sebagai
seksi kartu tersendiri di tengah halaman, karena seksi demo hanya menyediakan 2 slot teks
sticky yang masing-masing terikat pada satu visual. Menambah slot ketiga akan membuat teks
bergulir tanpa visual pasangan — itu perubahan design, yang di luar remit. Secara editorial
seksi persona tersendiri lebih tepat; ini kompromi sadar, bukan pilihan terbaik.

**Istilah pelaku yang dibakukan (keputusan Chief, 2026-09-01):** gunakan **"agen"** (ejaan
Indonesia), bukan "bot" maupun "Agent". "Sentra Bot" tetap dipakai sebagai nama produk, dan
"9 bot" / "sembilan bot" tetap dipakai sebagai hitungan kesembilan bot — keduanya bukan
istilah pelaku, jadi tidak terkena aturan ini.

Alasan revisi blok demo: versi lama mengklaim "Sentra Bot tahu mana yang penting bagi Anda"
tanpa menjelaskan dari mana ia tahu — klaim tak berdasar yang memicu skeptisisme. Versi baru
memindahkan penjelasan yang sudah ada di FAQ ("agen belajar dari pola kerja Anda") ke titik
di mana pembaca membutuhkannya. Bukan klaim baru, hanya penempatan ulang.

**Tidak diubah:** Testimonials.html dan Privacy.html (di luar cakupan permintaan ini; testimoni
tetap berisi data fiktif per catatan risiko di `IMAGE-SWAP.md`, belum diperbarui untuk
menyebut bot tertentu). Nama 9 bot belum muncul di kartu demo (`Brief.html`,
`DemoDesktop.html`/`DemoMobile.html`) karena kontennya berupa gambar raster (PNG/WebP), bukan
teks — mengubahnya berarti membuat ulang aset gambar, di luar remit "ganti teks saja".
