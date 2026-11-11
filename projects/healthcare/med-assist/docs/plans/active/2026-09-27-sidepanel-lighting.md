# Rencana Implementasi Pencahayaan dan Interaksi Panel Samping

> **Untuk agen pelaksana:** SUB-SKILL WAJIB: Gunakan `superpowers:subagent-driven-development` (direkomendasikan) atau `superpowers:executing-plans` untuk menjalankan rencana ini per tugas. Gunakan kotak centang (`- [ ]`) untuk mencatat progres setiap langkah.

**Tujuan:** Mewujudkan pencahayaan panel yang selaras, interaksi yang jelas, dan lampu konsol dekoratif yang berubah secara terbatasi sambil mempertahankan tata letak klinis yang telah disetujui.

**Arsitektur:** Perluas CSS panel samping yang aktif dengan variabel pencahayaan bersama, selektor berdasarkan status, dan aturan untuk lebar panel yang sempit. Tambahkan komponen kecil untuk tiga lampu dekoratif dengan waktu acak yang terbatasi; gunakan status ekstraksi pasien yang sudah ada untuk label `CEK ULANG`. Jangan ubah logika klinis.

**Teknologi:** WXT 0.20, React 18, TypeScript, CSS, Vitest, Testing Library, dan panel samping Chrome.

**Spesifikasi:** `docs/specs/2026-09-27-sidepanel-lighting-design.md` (baca terlebih dahulu).

**Status pelaksanaan:** Kode UI dan seluruh pemeriksaan CLI kapsul selesai pada branch `codex/sidepanel-lighting` di `D:\DEV\Monorepo.worktrees\codex\sidepanel-lighting`. Pemeriksaan visual interaktif di Chrome pada 320/360/440px masih tertunda karena browser Chromium Playwright tidak tersedia di lingkungan ini. Checkbox pemeriksaan browser tetap terbuka.

## Batasan Umum

- Chief mengarahkan pelaksanaan rencana UI di folder lain agar tidak bertabrakan dengan pekerjaan logic paralel. Perubahan dibatasi pada aturan baru di `entrypoints/sidepanel/style.css`, tiga tombol aksi pada `components/clinical/TTVInferenceUI.tsx`, serta lampu dekoratif dan label `CEK ULANG` pada `components/sidepanel/SidePanelHeader.tsx`.
- Periksa kembali branch aktif dan pekerjaan dalam `docs/plans/2026-09-27-sidepanel-ui-batch-plan.md` sebelum menyunting. Jangan menimpa perubahan yang sedang dikerjakan; pastikan kepemilikan penyuntingan `style.css` dan `TTVInferenceUI.tsx` terlebih dahulu.
- Pertahankan komposisi `clinical-trajectory-v2`, bilah aksi berisi tiga tombol, GCS di sisi kiri, serta SBP dan DBP dalam satu baris.
- Runtime yang aktif memakai `entrypoints/sidepanel/style.css`; jangan sunting `sentra-panel.css` atau `ApprovedSentraAssistApp.tsx` yang tidak dipasang pada runtime ini.
- Gunakan token palet Sentra yang sudah ada untuk nilai warna baru. Jangan tambahkan paket, data pasien, logika klinis, atau dependensi lintas kapsul.
- Jalankan pemeriksaan dari akar kapsul. Gunakan `node scripts/pnpm.mjs exec vitest run <test-file>` untuk pengujian terfokus, lalu jalankan `node scripts/pnpm.mjs run typecheck`, `lint`, `test`, `build`, `run:check`, dan `deploy:dry-run` pada tahap akhir. Hentikan setelah dua kegagalan berturut-turut; laporkan log kesalahan mentah dan satu baris dugaan penyebabnya.
- Perubahan yang sudah ada di worktree pada `entrypoints/background.ts`, `lib/clinical/tenaga-medis.ts`, `utils/types.ts`, dan berkas baru terkait merupakan bagian dari batch pekerjaan lain. Jangan masukkan ke staging, kembalikan, atau ubah berkas tersebut.

## Fokus Peninjauan

- Jika status triase merah muncul saat Uplink berlangsung, tampilan peringatan tetap dominan, aksi tetap terlihat sedang diproses, dan lampu dekoratif berhenti berubah (pengujian status serta pemeriksaan browser pada Tugas 2 dan 4).
- Jika Uplink atau Doctor gagal, aksi tidak boleh terlihat selesai dan pesan kesalahannya harus tetap terlihat; `CEK ULANG` hanya boleh mengikuti kegagalan ekstraksi pasien yang nyata (pengujian interaksi pada Tugas 2 dan 4).
- Pada lebar panel 320px, ketiga aksi dan semua kolom tanda vital harus terlihat tanpa gulir horizontal (pemeriksaan browser pada Tugas 3).
- Dengan pengurangan gerakan aktif atau tab tersembunyi, lampu dekoratif harus berhenti berubah; warna status dan label tetap terlihat (pengujian Tugas 4 dan pemeriksaan browser pada Tugas 5).
- Dalam tema terang dan saat menggunakan papan ketik, teks harus tetap terbaca dan cincin fokus pada input tanda vital serta tombol aksi harus terlihat (pemeriksaan browser pada Tugas 1 dan 5).

---

### Tugas 1: Arah cahaya bersama dan kedalaman permukaan

**Berkas:**
- Ubah: `entrypoints/sidepanel/style.css:1977-2042` dengan menambahkan aturan pengganti yang terbatas di akhir berkas; jangan hapus aturan yang sudah ada.
- Ubah: `components/ui/ThemeToggle.tsx:10-31` (gunakan kembali variabel asal cahaya bersama dalam gradien yang sudah ada).
- Uji: `components/ui/ThemeToggle.test.tsx` (perilaku yang sudah ada); tinjau tampilan di Chrome.

**Antarmuka:**
- Hasilkan `--surface-light-x: 8%` dan `--surface-light-y: 6%` pada `:root` agar efek pada `#root` dan tombol tema berbagi asal cahaya. Hasilkan `--surface-shadow-shell: var(--neu-shadow-card-elevation)`, `--surface-shadow-control: var(--neu-shadow-chip)`, dan `--surface-shadow-inset: var(--neu-shadow-inset-bullet)` pada `.sentra-card`. Tugas 2 memakai properti ini; tidak ada API JavaScript baru.

- [ ] **Langkah 1: Catat kondisi awal** — Pada lebar 440px dalam kedua tema, catat arah cahaya pada kartu, input tanda vital, tombol, dan tombol tema. Tombol tema sebenarnya berada di kiri atas, sedangkan efek pergantian tema saat ini berasal dari titik 92% 6% di kanan atas; catat perbedaan tersebut.
- [ ] **Langkah 2: Tambahkan variabel permukaan bersama dan aturan CSS terbatas** — Tetapkan asal cahaya pada `:root` dan terapkan variabel bayangan pada `.sentra-card`, kontrol `.engine-btn`, serta bidang `.vital-item` yang cekung. Tambahkan aturan pengganti dan keyframe baru agar asal efek pergantian tema pada `#root` mengikuti kiri atas tanpa menghapus aturan lama. Bedakan ketiga tingkat permukaan dan batasi aturan baru pada runtime panel yang aktif.
- [ ] **Langkah 3: Perbarui `ThemeToggle.tsx`** — Ganti titik pusat gradien yang ditulis langsung dengan `var(--surface-light-x) var(--surface-light-y)` sambil mempertahankan semantik tombol dan perilaku tema saat ini.
- [ ] **Langkah 4: Verifikasi** — Jalankan `node scripts/pnpm.mjs exec vitest run components/ui/ThemeToggle.test.tsx` (kode keluar 0). Periksa tema gelap dan terang pada lebar 440px: arah sorotan konsisten, isi tidak tertutup cahaya berlebih, dan tidak ada halo dekoratif di luar bingkai panel.
- [ ] **Langkah 5: Buat commit hanya untuk berkas Tugas 1** dengan judul Conventional Commit dan trailer `Co-Authored-By` yang diwajibkan; jangan sertakan berkas dari batch pekerjaan lain.

### Tugas 2: Pencahayaan sesuai status dan umpan balik aksi

**Berkas:**
- Ubah: `components/clinical/TTVInferenceUI.tsx:3729-3801` (hanya tiga tombol aksi).
- Ubah: `entrypoints/sidepanel/style.css` (tambahkan aturan terbatas untuk aksi dan status bingkai panel).
- Uji: `components/clinical/TTVInferenceUI.forward-doctor.test.tsx`, `entrypoints/sidepanel/ui-authority.smoke.test.tsx`.

**Antarmuka:**
- Gunakan: `--surface-light-x` dan `--surface-light-y` dari Tugas 1.
- Hasilkan: `data-action-state={uplinkState}` pada Uplink, `data-action-state={sendDoctorState}` pada Doctor, dan `data-action-state="idle"` pada Trajectory; gunakan `aria-busy` hanya selama salah satu aksi asinkron sedang diproses. Pertahankan `aria-label`, `aria-pressed`, handler, aturan tombol nonaktif, dan urutan ketiga tombol yang sudah ada.

- [ ] **Langkah 1: Tambahkan pengujian interaksi yang semula gagal** — Dalam `TTVInferenceUI.forward-doctor.test.tsx`, pastikan Uplink dan Doctor mula-mula memiliki `data-action-state="idle"`, berubah menjadi `processing` dengan `aria-busy="true"` saat aksi tiruan masih tertunda, lalu menjadi `completed` hanya setelah berhasil. Pastikan aksi yang ditolak tidak menjadi `completed` dan pesan kesalahannya tetap muncul. Gunakan fixture pasien rekaan yang sudah ada.
- [ ] **Langkah 2: Jalankan pengujian terfokus** — `node scripts/pnpm.mjs exec vitest run components/clinical/TTVInferenceUI.forward-doctor.test.tsx`; sebelum implementasi, pernyataan baru tentang status diharapkan gagal.
- [ ] **Langkah 3: Tambahkan atribut status pada ketiga tombol** — Ubah hanya JSX dalam rentang bilah aksi yang disebutkan. Tampilkan tanda centang visual dengan `aria-hidden` di sebelah Doctor setelah selesai; pertahankan kata Doctor yang terlihat dan label UPLINKED saat ini. Jangan ubah handler klinis atau perpindahan status yang sudah ada.
- [ ] **Langkah 4: Tambahkan gaya sesuai status** — Gunakan kelas `processing`/`completed` yang sudah ada dan atribut status baru agar tiap aksi memiliki tampilan yang jelas. Batasi sorotan tepi bersama dengan `.sentra-card:has([data-action-state='processing'])`, lalu beri `.sentra-card:has(.engine-btn--triage-merah)` prioritas CSS yang lebih tinggi. Jangan ubah tombol sinkronisasi pasien berdasarkan status Uplink. Pesan kesalahan tetap terlihat dan kegagalan tidak mewarisi gaya selesai.
- [ ] **Langkah 5: Verifikasi** — Jalankan pengujian terfokus dan `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel/ui-authority.smoke.test.tsx`; keduanya harus keluar dengan kode 0. Di Chrome, periksa status awal, pemrosesan, keberhasilan, kegagalan, dan triase merah yang terjadi bersamaan tanpa mengubah handler aksi.
- [ ] **Langkah 6: Buat commit hanya untuk berkas Tugas 2** dengan judul Conventional Commit dan trailer atribusi pendamping yang diwajibkan.

### Tugas 3: Tata letak panel samping yang sempit

**Berkas:**
- Ubah: `entrypoints/sidepanel/style.css:6476-6499,6745-6747` dengan menambahkan aturan container yang terbatas.
- Uji: pemeriksaan visual di browser pada lebar 320, 360, dan 440 piksel CSS; `entrypoints/sidepanel/ui-authority.smoke.test.tsx` yang sudah ada.

**Antarmuka:**
- Hasilkan container query bernama `clinical-form` dengan `inline-size` pada `.clinical-form-stack`; tidak ada perubahan pada props komponen atau handler.

- [ ] **Langkah 1: Catat kondisi awal pada lebar sempit** — Pada 320, 360, dan 440px, periksa gulir horizontal, baris tiga kolom Nadi/Suhu/Gula, label aksi, posisi GCS, dan tekanan darah gabungan. Catat bagian yang terpotong sebelum mengubah gaya.
- [ ] **Langkah 2: Tambahkan aturan container** — Pada `max-width: 340px`, tempatkan Nadi dan Suhu dalam dua kolom dan Gula melintasi kedua kolom, tanpa mengubah baris dua kolom GCS/T-D. Tetapkan tinggi minimum tombol aksi 40px dan pertahankan ketiga tombol dalam satu baris.
- [ ] **Langkah 3: Verifikasi** — Periksa kembali ketiga lebar tersebut di Chrome, termasuk label panjang berbahasa Indonesia dan tema terang. Jalankan `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel/ui-authority.smoke.test.tsx` (kode keluar 0). Panel tidak memiliki gulir horizontal, konten terpotong, atau kontrol yang hilang.
- [ ] **Langkah 4: Buat commit hanya untuk berkas CSS Tugas 3** dengan judul Conventional Commit dan trailer atribusi pendamping.

### Tugas 4: Lampu konsol dekoratif dan label cek ulang berdasarkan status nyata

**Berkas:**
- Buat: `entrypoints/sidepanel/components/ConsoleAmbientLights.tsx` (pola lampu, penjadwalan, dan tampilan dekoratif).
- Buat: `entrypoints/sidepanel/components/ConsoleAmbientLights.test.tsx`.
- Ubah: `components/sidepanel/SidePanelHeader.tsx:193-205,247-265` (pasang lampu di kanan atas header dan ubah teks tombol sinkronisasi ketika ekstraksi gagal).
- Ubah: `components/sidepanel/SidePanelHeader.test.tsx` (status sinkronisasi dan interaksi cek ulang).
- Ubah: `entrypoints/sidepanel/style.css` (tambahkan aturan terbatas untuk tiga lampu netral dan teks status).

**Antarmuka:**
- Hasilkan `type AmbientPattern = 0 | 1 | 2 | 3 | 4`, dengan pola lampu `000`, `100`, `010`, `001`, dan `101` secara berurutan.
- Hasilkan `chooseAmbientPattern(previous: AmbientPattern, sample: number): AmbientPattern` yang memilih salah satu dari empat pola lain berdasarkan sampel acak `[0, 1)`, serta `chooseAmbientDelay(sample: number): number` yang menghasilkan waktu tahan 4000–9000 milidetik.
- Hasilkan `ConsoleAmbientLights({ suspended }: { suspended: boolean }): JSX.Element`. `SidePanelHeader` memberi `suspended={triageZone === 'merah'}`. Komponen mengelola timer dan visibilitas tabnya sendiri; tidak menerima data pasien.

- [ ] **Langkah 1: Tulis pengujian yang semula gagal** — Dalam `ConsoleAmbientLights.test.tsx`, pastikan pemilihan pola tidak mengulang pola sebelumnya, sampel batas menghasilkan waktu 4000 dan paling lama 9000ms, perubahan berhenti ketika `document.hidden`, `suspended` aktif, atau `prefers-reduced-motion: reduce`, serta ketiga lampu berada di dalam `aria-hidden="true"`.
- [ ] **Langkah 2: Jalankan pengujian komponen** — `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel/components/ConsoleAmbientLights.test.tsx`; modul yang belum dibuat diharapkan menyebabkan kegagalan.
- [ ] **Langkah 3: Buat `ConsoleAmbientLights.tsx`** — Pakai `window.setTimeout` dengan waktu tahan 4–9 detik dan transisi CSS paling lama 180ms. Pilih pola baru yang berbeda dari sebelumnya; bersihkan timer pada unmount dan saat tab tersembunyi. Saat gerakan dikurangi atau triase merah, tampilkan pola `000` statis. Gunakan warna netral dari token yang sudah ada, tanpa merah, kuning, hijau status, suara, atau teks status acak.
- [ ] **Langkah 4: Tulis pengujian header yang semula gagal** — Dalam `SidePanelHeader.test.tsx`, pastikan `demographicStatus="insufficient"` menampilkan `CEK ULANG` pada tombol sinkronisasi dan kliknya tetap memanggil `onRefreshPatient`; `standby`, `syncing`, dan `ready` tetap menampilkan `SYN PATIENT`. Pastikan tiga tombol pada bilah status tetap ada dan lampu dekoratif tidak memengaruhi kelas triase.
- [ ] **Langkah 5: Pasang komponen dan label status** — Pasang lampu sebagai elemen dekoratif di ruang kanan atas `.header-top`, tanpa memindahkan judul atau tombol tema. Ubah hanya teks dan label aksesibilitas tombol sinkronisasi untuk `demographicStatus === 'insufficient'`; jangan ubah sumber status atau handler. Tambahkan aturan CSS agar lampu tidak menutupi judul pada lebar 320px.
- [ ] **Langkah 6: Verifikasi** — Jalankan kedua pengujian Tugas 4 hingga keluar dengan kode 0. Di Chrome, amati pola lampu selama beberapa pergantian tanpa kedipan cepat; periksa tab tersembunyi, gerakan dikurangi, triase merah, kegagalan ekstraksi pasien, dan header selebar 320px. Pastikan `CEK ULANG` tidak pernah muncul akibat pola lampu.
- [ ] **Langkah 7: Buat commit hanya untuk berkas Tugas 4** dengan judul Conventional Commit dan trailer `Co-Authored-By` yang diwajibkan.

### Tugas 5: Gerakan, fokus, dan pemeriksaan visual akhir

**Berkas:**
- Ubah: `entrypoints/sidepanel/style.css:418-429,4274-4282,7146-7166` dengan menambahkan aturan pengganti yang terbatas.
- Uji: tinjauan pengurangan gerakan dan papan ketik di browser; seluruh pemeriksaan mutu kapsul pada tahap akhir.

**Antarmuka:**
- Gunakan nilai `data-action-state` dari Tugas 2 dan keadaan lampu dari Tugas 4. Tidak ada antarmuka publik baru.

- [ ] **Langkah 1: Catat kondisi awal gerakan dan fokus** — Di Chrome, aktifkan pengurangan gerakan, arahkan fokus ke input tanda vital dan tiap aksi dengan tombol Tab, lalu catat denyut dekoratif yang masih muncul atau penanda fokus yang tidak terlihat.
- [ ] **Langkah 2: Tambahkan aturan gerakan dan fokus** — Batasi transisi cahaya aksi hingga kurang dari 250ms dan picu hanya saat ada kejadian. Dalam `prefers-reduced-motion: reduce`, hentikan animasi dekoratif pada `.sentra-uplink--processing`, `.vital-item--ghost-active`, `.alert-timeline-preview__label--pulse`, dan lampu konsol sambil mempertahankan batas dan teks status. Pulihkan garis tepi `:focus-visible` setebal 2px pada `.vital-input` dan setiap `.action-bar--tri-tabs .engine-btn` dengan token `--text-input-focus` yang sudah ada.
- [ ] **Langkah 3: Verifikasi di Chrome** — Ulangi pemeriksaan pengurangan gerakan dan papan ketik pada kedua tema; periksa tata letak 320px dan 440px dengan data sintetis saja. Pastikan tanda kegawatdaruratan tetap terbaca saat gerakan dimatikan.
- [ ] **Langkah 4: Jalankan pemeriksaan akhir** — Jalankan typecheck, lint, pengujian UI terfokus termasuk `ConsoleAmbientLights.test.tsx` dan `SidePanelHeader.test.tsx`, seluruh rangkaian pengujian, build, pemeriksaan hasil build, dan simulasi deploy menggunakan perintah pada Batasan Umum. Catat kode keluar yang tepat dan kegagalan yang sudah ada sebelumnya; jangan nyatakan lulus untuk pemeriksaan yang belum dijalankan.
- [ ] **Langkah 5: Perbarui `.agents/HANDOFF.md`** — Timpa handoff kapsul dengan perubahan yang telah diterapkan, hasil verifikasi yang tepat, risiko desain yang tersisa, dan tugas berikutnya sesuai instruksi kapsul.
- [ ] **Langkah 6: Buat commit untuk Tugas 5 dan handoff** dengan judul Conventional Commit serta trailer atribusi pendamping yang diwajibkan. Jangan lakukan push tanpa permintaan eksplisit.

## Tinjauan Mandiri

- Cakupan spesifikasi: Tugas 1–5 mencakup kedelapan kebutuhan; tiap tugas hanya mengubah runtime yang aktif.
- Batas persetujuan: arahan Chief untuk bekerja di folder lain diterapkan hanya pada perubahan UI dalam rencana ini; pekerjaan logic dan berkas klinis tidak disentuh.
- Pekerjaan paralel: perubahan dari batch UI panel samping yang sudah ada tetap tidak disentuh; kepemilikan jalur berkas bersama diperiksa sebelum Tugas 1.
