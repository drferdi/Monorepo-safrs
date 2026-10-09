# Sentrapedia UI

The Indonesian interface preserves English medical and technical terminology. Existing workspace records and saved output-language choices are kept intact; new workspaces default to Bahasa Indonesia. Styling stays in plain CSS, with no Tailwind or animation dependencies added.

## Changed files

- `app/globals.css`: Tosca semantic colors, accessible foregrounds, brand shadow, submenu transitions, pixel styling, and responsive/reduced-motion rules.
- `app/layout.tsx`, `app/loading.tsx`: Indonesian metadata/document language and route loading UI.
- `components/brand.tsx`: Sentrapedia wordmark, original inherited font family, accessible brand label.
- `components/sidebar-submenu.tsx`, `components/sidebar.tsx`: one expanded section, active branch, localized navigation, and inert collapsed panels.
- `components/pixel-loader.tsx`: reusable pixel status indicator and completion check.
- `components/composer.tsx`, `components/forms.tsx`, `components/dialog.tsx`, `components/scribe.tsx`, `components/message-card.tsx`, `components/workspace.tsx`: localized controls, errors, accessibility labels, and process status integration.
- `lib/drafts.ts`, `lib/workspace.ts`: localized template instructions, preserved English medical headings, and Indonesian defaults.
- `tests/workspace.test.ts`: language/default/persistence regression checks.
- `README.md`, `CONTEXT.md`, `.agents/HANDOFF.md`: current identity, implementation notes, and verification evidence.
- `docs/verification/sentrapedia-*.png`: desktop, mobile, submenu, and pending clipboard evidence.

## Global palette and brand

Product overrides live after the capsule-owned token snapshot. Components consume semantic variables, and the source token snapshot is unchanged.

```css
:root {
  --color-action-primary: #40e0d0;
  --color-action-primary-hover: #2dccbd;
  --workspace-on-accent: #073b36;
  --workspace-accent-ink: #086b61;
  --workspace-accent-soft: #e8faf7;
  --workspace-focus: #08786c;
  --workspace-brand-shadow: 0 1px 0 #fff, 0 2px 5px #08786c40;
}

/* Keep the original font; apply this class only to the wordmark text. */
.brand-wordmark {
  font-family: inherit;
  text-shadow: var(--workspace-brand-shadow);
  letter-spacing: -.45px;
}
```

`Brand` applies `brand-wordmark` to the Sentrapedia text automatically. Adjust only `--workspace-brand-shadow` to change the effect globally. The body still uses Arial, Helvetica, sans-serif. Bright Tosca is a fill; foreground text uses a dark contrasting shade.

## Sidebar motion

Behavior reference: [Sidebar sub-menu by xevrion, inspired by Pranav Patel](https://lab.xevrion.dev/lab/sidebar-submenu).

React stores one `openId`. Header buttons expose `aria-expanded` and `aria-controls`. Each hidden region is `inert` and `aria-hidden`, preventing its controls from entering the keyboard sequence. The parent drawer's focus trap filters inert descendants.

```tsx
// Data and callbacks belong to the caller; the component owns the folding state.
<SidebarSubmenu initialSection="encounters" sections={[
  {
    id: "encounters",
    title: "Semua Encounter",
    selectedId: activeEncounterId,
    items: encounters.map((encounter) => ({
      id: encounter.id,
      label: encounter.title,
      onSelect: () => selectEncounter(encounter.id),
    })),
  },
]}/>
```

CSS interpolates `grid-template-rows` from `0fr` to `1fr` in 320 ms. Rows settle with a short stagger; the highlighted tree branch changes height to meet the selected row. Reduced motion removes the branch animation and row delays. JavaScript action-rail and message scrolling also use `auto` when reduced motion is requested.

## Pixel loading and completion

Behavior reference: [Pixel loader by xevrion](https://lab.xevrion.dev/lab/pixel-loader).

```tsx
// Tie visibility and completion to actual operation state, never a display delay.
{reading && <PixelLoader label="Sedang membaca berkas…"/>}
{copied && <PixelLoader done label="Sedang menyalin…" doneLabel="Tersalin"/>}
```

The component uses a 4×4 grid, cycling spiral, snake, pulse, and checker frames at 110 ms per step. Each pattern finishes its loop before switching. Fast illumination and a slower fade leave a pixel trail. `done` renders a check and stops the timer. A `role="status"` label communicates the operation without announcing individual frames.

The timer pauses when the tab is hidden, stops for reduced motion, and is cleaned up on unmount. Reduced motion leaves a static indicator. Route/startup, file reading, clipboard, microphone startup, and composer busy UI share the component. Local document formatting remains synchronous, so no fake waiting is introduced.

## Verification scope

See `.agents/HANDOFF.md` for executed commands and browser checks. Native microphone permission/hardware, OS reduced-motion switching, and successful clipboard permission resolution require environment-specific checks. No remote deployment is implied by a local build or deployment dry run.

## Perapian desain — 9 Oktober 2026

Gaffer mengalihkan pekerjaan PNPK ke perapian tampilan yang ada. Perubahan produk hanya pada `app/globals.css`; templat, alur kerja, data sumber, serta arsip PNPK tidak diubah.

- Lebar composer dan panel promosi diselaraskan, maksimum 720px. Judul memakai ukuran responsif dan pembagian baris yang seimbang. Padding sidebar, navigasi, header, dan composer dirapikan.
- Teks sekunder lebih kontras; label sidebar dan footer lebih terbaca. Isi draf memakai ukuran 14px dan jarak antarbagian yang lebih longgar. Wordmark, Arial/Helvetica, Tosca, submenu, dan pixel loader dipertahankan.
- Pada lebar maksimal 600px, toolbar memakai dua baris dengan kontrol utama setinggi 40px. Input ponsel memakai ukuran huruf 16px. Beranda dapat digulir pada layar pendek sehingga konten tidak terpotong oleh batas tinggi aplikasi.

Bukti terbaru: `docs/verification/sentrapedia-polish-desktop.png`, `sentrapedia-polish-mobile.png`, `sentrapedia-polish-chat-desktop.png`, `sentrapedia-polish-chat-mobile.png`, dan `sentrapedia-polish-responsive.json`.

Verifikasi dijalankan pada salinan kapsul mandiri dengan dependensi yang sudah tersedia dan lockfile identik. Tidak ada instalasi baru. Preview build produksi tersedia sementara di http://127.0.0.1:3104; aplikasi utama di port 3101 menghasilkan Internal Server Error pada awal pemeriksaan dan belum diperbaiki dalam lingkup desain ini. Lihat HANDOFF untuk hasil dan batas pemeriksaan.

## Clinical Cockpit — 9 Oktober 2026

Kelima konsep yang disetujui Gaffer sudah tersedia dalam alur lokal:

1. **Clinical Cockpit:** navigasi, canvas, serta panel konteks/Timeline. Panel samping tersedia di atas 1200px; layar lebih kecil memakai dialog. Nilai konteks berasal dari label yang diberikan, dengan sumber terpisah dan status belum tersedia.
2. **Encounter Timeline:** urutan waktu WIB dari data tersimpan, jumlah dokumen dan statusnya, serta pemilihan Encounter. Filter mengikuti Patient aktif; Encounter tanpa Patient tidak digabung.
3. **Intent Composer:** Tanya, Dokumentasikan, Rencanakan, Komunikasikan mencakup seluruh 14 template. Ketik `/` atau `/clinic`, gunakan panah dan Enter untuk memilih template. Pemilihan tidak membuat dokumen; teks biasa tetap dikirim dengan Enter atau tombol kirim.
4. **Document Studio:** navigasi/edit per bagian, editor dokumen penuh, sumber saat dibuat, dan perbandingan isi sebelum/sesudah. Draf → Ditinjau → Final adalah metadata lokal pengguna. Edit isi mengembalikan Draf; sumber asli tetap. Dokumen lama tidak diberi sumber buatan.
5. **Focus Mode & Command Center:** tombol Focus menyembunyikan panel/promosi. Ctrl/Cmd+J membuka pencarian aksi, template, Patient, dan Encounter. Ctrl/Cmd+K untuk Encounter baru serta Ctrl/Cmd+/ untuk pencarian lama tetap tersedia. Shortcut global berhenti saat dialog/drawer terbuka.

Komponen baru: `clinical-panel.tsx`, `document-studio.tsx`, `command-palette.tsx`; helper presentasi `lib/studio.ts`. Persistensi tetap `sentrapedia-workspace-v1`. Tidak ada dependensi atau integrasi baru. Kontrak test kapsul juga mencakup `tests/studio.test.ts`.

Bukti: `docs/verification/sentrapedia-advanced-{desktop,home,mobile,commands,focus}.png`, `sentrapedia-advanced-responsive.json`. Lihat HANDOFF untuk pemeriksaan dan batas verifikasi. Preview mandiri: http://127.0.0.1:3104.

## Tata letak ringkas dan headline dinamis

Beranda kini menempatkan tab Tanya, Dokumentasi, Rencana, Komunikasi di atas headline, dengan composer dan promosi sejajar hingga 780px. Ruang atas, sidebar/panel, dan pilihan templat dirapatkan. Label antarmuka mengikuti daftar Gaffer, termasuk Layanan Primer, Standar, Mulai Transkripsi, Tambah Konteks, Diagnosis Banding, dan “Ketik / untuk templat”. Nilai pengaturan lama tetap kompatibel.

Headline berubah hanya ketika kelompok tujuan berganti, melalui transisi CSS 180ms; aturan reduced motion tetap berlaku. Area headline mempertahankan tinggi sehingga input tidak bergeser. Teks awal: “Kasus kompleks. Analisis lebih tajam.”; tiap tab lain memiliki headline dan kalimat pendamping sendiri. Input yang belum dikirim tetap utuh.

Bukti terbaru: `docs/verification/sentrapedia-density-{desktop,mobile,headline}.png` dan `sentrapedia-density-responsive.json`. Verifikasi dan batas runtime tetap dicatat di HANDOFF.

## Diagnosis: tujuh bagian dan navigasi motion (2026-10-09)

Gaffer memilih perapian tampilan dengan penanda untuk isi yang belum tersedia. Alur Med Assist dipelajari dari DiagnosisStepFlow, DiagnosisStep, TatalaksanaStep dan diagnosisSteps: temuan, diagnosis/alasan, lalu tatalaksana/edukasi. Sentrapedia mengadaptasi organisasi presentasinya secara lokal, tanpa impor lintas kapsul, aturan diagnosis, pemilihan obat, atau transfer RME.

Draf analisis sekarang berurutan: Ringkasan Kasus, Gejala, Diagnosis Banding, Diagnosis, Penunjang, Terapi, Edukasi. Data masukan dipisahkan dari usulan pemeriksaan; alasan mendukung/menyangkal dan kandidat jangan-terlewat tetap utuh. Terapi/Edukasi yang tidak ada pada kontrak ditandai Belum tersedia. Referensi/jejak tersedia dalam disclosure; sumber JSON asli dan baseline tetap utuh. Draf lama yang belum diedit dinormalisasi hanya untuk tampilan; draf yang sudah diedit dipertahankan. Salin, Unduh dan editor memakai isi yang ditampilkan.

DiagnosisDocument memakai navigasi klik/fokus dengan rail putus-putus Tosca dan transisi ringan, terinspirasi [RareUI HookSidebar](https://www.rareui.com/components/hooksidebar). Implementasi React/CSS lokal ditulis untuk kapsul ini; tidak menyalin komponen registry atau menambah dependency. Pilihan aktif mengikuti klik/dropdown, bukan scroll manual. Pada lebar <=900px navigasi menjadi dua kolom. CSS dan scroll menghormati prefers-reduced-motion. Pergantian preferensi OS belum diuji.

Berkas implementasi: components/diagnosis-document.tsx, components/document-studio.tsx, components/message-card.tsx, components/mira-case-form.tsx, lib/mira/presentation.ts, app/globals.css. Test: tests/diagnosis-presentation.test.ts. Browser QA memakai komponen asli dalam harness sintetis terpisah, tanpa inference/persistensi workspace; bukti sentrapedia-diagnosis-seven-{desktop,mobile}.png. Tidak ada modifikasi Med Assist atau restart 8787/8791.

## Koreksi pemakaian database (2026-10-09 07:55)

Pernyataan Terapi/Edukasi kosong pada bagian sebelumnya digantikan oleh pemetaan database: definisi, gejala referensi, kriteria diagnosis, terapi dan kriteria rujukan asli kini tampil per kandidat diagnosis beserta file/record/kode sumber. Kode rentang, kategori dan daftar berkoma ditangani sebagai cakupan referensi yang diberi label; kode keluaran AI tidak diganti. Data kasus dan gejala referensi dipisahkan. Database tidak mempunyai kolom edukasi/penunjang tersendiri; uraian pemeriksaan berada di kriteria diagnosis, informasi perawatan tetap utuh dalam narasi Terapi.

Jika AI tidak menghasilkan kandidat, dokumen menjelaskan bahwa referensi belum dapat dihubungkan ke hasil kasus itu. Ini berbeda dari database kosong. Katalog tetap tersedia lewat Referensi. Koreksi ini belum mengimplementasikan mesin diagnosis berbasisKB atau fallback MedAssist. Draf yang belum diedit beradaptasi saat dibaca; sumber dan edit klinisi dipertahankan.

Verifikasi:93tes, typecheck, lint, build dan deploy dry run lulus di ekstraksi independen. Browser komponen asli dengan fixture sintetis membuktikan terapiJ00 danJ02.9/sourceJ02-J03, serta tampilan390px tanpa overflow. Bukti: docs/verification/sentrapedia-database-therapy-desktop.png dan sentrapedia-database-therapy-mobile.png. Tidak ada inference baru; contoh QA bukan hasil kasus yang sedang terbuka. Detail masalah kandidat kosong dan batas verifikasi terdapat pada HANDOFF.

## Diagnosis: enam bagian, jawaban diketik, tanpa penafian (2026-10-09)

Menggantikan susunan tujuh bagian di atas. Draf analisis: Ringkasan Gejala, Differential Diagnosis, Diagnosis, Penunjang (Perlu / Tidak perlu saat ini), Terapi Farmakologi, Edukasi. Hanya data yang ada yang tampil; referensi, record, SHA, bidang belum terisi dan trace berada di "Referensi dan jejak analisis". Jawaban baru (< 20 s) diketik bagian demi bagian selama 1,2-3 s (`lib/typing.ts`); rail aksen HookSidebar berpindah ke bagian yang sedang diketik, item yang belum diketik redup, kursor berkedip lewat opacity, dan reduced motion menampilkan teks penuh seketika. Klik navigasi melewati animasi. Berkas: `lib/mira/presentation.ts`, `lib/typing.ts`, `components/diagnosis-document.tsx`, `components/document-studio.tsx`, `components/message-card.tsx`, `components/clinical-panel.tsx`, `components/workspace.tsx`, `app/globals.css`.

## Perilaku chat, motion submenu, dan terapi per kasus (2026-10-09)

Menggantikan rail HookSidebar di atas. Enter langsung menampilkan pertanyaan sebagai gelembung dan kartu "Analisis kasus" berisi langkah berurutan: Permintaan klinis diterima, Intensi klinis teridentifikasi, Sentra Oracle aktif, Konteks klinis pasien dihimpun, Dokumen medis ditelaah, Literatur dan pedoman klinis ditelusuri, Temuan klinis dikorelasikan, Bukti ilmiah sedang disintesis (340 ms per langkah; langkah terakhir bertahan sampai jawaban tiba). Kolom teks langsung kosong dan tetap bisa diketik; tombol kirim menjadi tombol berhenti. Textarea tumbuh mengikuti isi sampai 180 px.

Jawaban baru: judul diketik, lalu tiap bagian membuka dengan motion [sidebar-submenu](https://lab.xevrion.dev/lab/sidebar-submenu) (judul turun dari -4px, garis cabang digambar dari atas, 320 ms, cubic-bezier(.23,1,.32,1)) sebelum teksnya diketik. Navigasi "Alur kasus" berupa pohon: item muncul satu per satu dan cabang aktif menyala dari judul ke bagian yang sedang ditulis atau dibaca. Percakapan mengikuti teks ke bawah kecuali pembaca menggulir ke atas. Reduced motion: teks penuh seketika, tanpa animasi.

Terapi Farmakologi: "Untuk <diagnosis> (<kode>)", satu obat per baris dengan dosis frekuensi x kekuatan tanpa spasi (Ceftriaxone 1x500mg IM dosis tunggal (1g bila >=150kg)), lalu DDI dan Kontraindikasi. Narasi terapi Oracle pindah ke "Terapi referensi" di dalam Referensi; bila model tidak memberi regimen, bagian ini memakai narasi Oracle. Bullet hanya bila poinnya lebih dari satu. Dokumen memakai `font-variant-ligatures: no-contextual` agar "1x500mg" tidak dirender sebagai tanda kali. Berkas: `lib/typing.ts`, `lib/mira/presentation.ts`, `components/diagnosis-document.tsx`, `components/thinking-card.tsx`, `components/workspace.tsx`, `components/composer.tsx`, `components/document-studio.tsx`, `app/globals.css`.
