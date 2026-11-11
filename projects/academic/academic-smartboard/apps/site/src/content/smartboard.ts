import type { PageContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/src/components/SmartboardPage.tsx
// (517 baris, React + framer-motion + gsap + interpolasi warna JS dari palette.ts).
// Konten Indonesia diekstrak verbatim dari JSX; motion (framer-motion/gsap),
// interpolasi warna JS, aset gambar (icon SVG per kartu, foto tutor, logomark
// Sentra), dan markup React (SiteHeader/SiteFooter sumber — layout.tsx situs
// ini sudah merender header/footer secara global) TIDAK di-port.
//
// Section.heading wajib diisi (lihat types.ts); satu blok sumber (hero-stats)
// bersifat aria-hidden="true" di sumber (dekoratif, tanpa heading sendiri).
// Mengikuti pola ProgramPage.tsx yang memakai label tetap ("Manfaat") untuk
// blok tanpa heading sumber, section "ringkasan-produk" di bawah memakai
// heading sintesis "Ringkasan produk" (bukan dari sumber).
//
// Konvensi encoding tambahan (di luar colon-join dua-bagian "Judul: teks" di
// program-pemetaan-belajar.ts), didokumentasikan di sini karena dipakai di
// beberapa section:
// - "Eyebrow: <teks>" — nomor urut section sumber ("01".."04 · Untuk setiap
//   siswa", elemen <span> sebelum <h2> tiap section) — SELALU bullet
//   pertama pada section bernomor.
// - Section "sentra-artificial-intelligence" menampung 4 kelompok data dari
//   satu komponen sumber (AiDashboardVisual): label tunggal berprefiks
//   "Judul:"/"Subjudul:"/"Status:"/"Grafik:"/"Daftar:" (masing-masing sekali),
//   lalu daftar berulang berprefiks "Stat:"/"Insight:"/"Tag:". Semua diambil
//   verbatim dari AI_STATS/AI_INSIGHTS/AI_TAGS dan JSX AiDashboardVisual.
//
// Dijatuhkan (didokumentasikan, bukan hilang tanpa jejak):
// - Icon per program-card (mis. mingcute_ai-fill.svg) dan buttonLabel
//   ("Lihat Student 360°" dst., semuanya menunjuk /contact — route yang
//   tidak ada di situs ini) — kartu di sini tidak punya CTA per item.
// - Foto tutor (tutor-profile.png) dan logomark Sentra (alt "Sentra
//   Artificial Intelligence") — aset biner tidak tersedia untuk di-port.
// - Mockup visual vcard/pcard/bcard/ecard/gcard/scard (data placeholder "—",
//   BAR_HEIGHTS dekoratif tanpa nilai nyata) — diganti satu dashboard AI
//   ringkas di SmartboardShowcase.tsx yang memakai copy AI_STATS/INSIGHTS/TAGS
//   yang sesungguhnya (bukan placeholder).
// - Panah unicode "↗" pada label CTA — dekorasi ikon, bukan teks salinan.
export const smartboard: PageContent = {
  slug: "smartboard",
  // Tanpa sufiks "| El-Kayyisa": /smartboard adalah segmen bersarang di
  // bawah RootLayout (sama seperti program-pemetaan-belajar.ts), jadi
  // title.template layout ("%s | El-Kayyisa") otomatis menambahkannya.
  title: "Sentra Smartboard System",
  description:
    "Sentra Smartboard System membantu siswa melihat kelas, target belajar, dan capaian mereka di El-Kayyisa.",
  hero: {
    eyebrow: "Ruang belajar siswa",
    heading: "Smartboard yang tumbuh bersama siswa.",
    sub: "Setiap siswa melihat kelas hari ini, target materi, dan capaian belajarnya dalam satu pengalaman yang sederhana dan menyenangkan.",
    // CTA sumber menunjuk route React Router "/contact" (bukan domain
    // template vendor mati seperti di beranda.ts/program-*.ts, tapi route
    // internal yang tidak ada di situs Next ini). Diarahkan ke /cara-belajar
    // mengikuti pola CTA konsultasi di seluruh situs.
    cta: { label: "Konsultasi penerapan", href: "/cara-belajar" },
  },
  sections: [
    {
      id: "ringkasan-produk",
      heading: "Ringkasan produk",
      body: [],
      // "N: label" — tiga angka dekoratif (aria-hidden di sumber) yang
      // menjelaskan struktur halaman ini sendiri, bukan metrik adopsi.
      bullets: [
        "1: Profil belajar utuh",
        "3: Tampilan inti siswa",
        "6: Tahap sesi terarah",
      ],
    },
    {
      id: "tiga-tampilan-siswa",
      heading:
        "Siswa tahu apa yang dipelajari, mengapa penting, dan langkah berikutnya.",
      body: ["Tiga tampilan yang membuat belajar lebih bermakna."],
      bullets: [
        "Eyebrow: 01",
        "Student 360°: Satu profil belajar yang menghubungkan kehadiran, sesi, evaluasi tutor, dan hal yang perlu ditindaklanjuti.",
        "Perkembangan Anak: Tutor menyusun catatan bermakna setelah kelas agar orang tua memahami kemajuan dan fokus belajar berikutnya.",
        "Kurikulum Nasional: Materi, target kelas, dan evaluasi disusun dalam jalur yang selaras dengan kebutuhan akademik anak.",
      ],
    },
    {
      id: "alur-sesi-belajar",
      heading:
        "Setiap sesi mengajak siswa bergerak dari tujuan hingga capaian.",
      body: ["Perjalanan belajar yang terlihat, bukan sekadar jadwal kelas."],
      bullets: [
        "Eyebrow: 02",
        "Masuk kelas: terarah",
        "Target materi: terarah",
        "Aktivitas: terarah",
        "Cek pemahaman: terarah",
        "Refleksi: terarah",
        "Capaian: tersimpan",
      ],
    },
    {
      id: "sentra-artificial-intelligence",
      heading:
        "Sentra Artificial Intelligence menjaga setiap siswa tidak tertinggal.",
      body: [
        "Sentra AI adalah lapisan kecerdasan di balik Smartboard: merangkum aktivitas belajar, menandai pola yang perlu diperhatikan, dan menyiapkan rekomendasi langkah berikutnya untuk tutor dan orang tua — tanpa perlu membaca satu per satu laporan sesi.",
      ],
      bullets: [
        "Eyebrow: 03",
        "Judul: Sentra AI",
        "Subjudul: Ringkasan mingguan · Kelas Bahasa Inggris",
        "Status: Aktif",
        "Grafik: Pemahaman meningkat 4 minggu terakhir",
        "Daftar: Rekomendasi AI",
        "Stat: 128 · Siswa dipantau",
        "Stat: 12 · Insight baru",
        "Stat: 4 · Perlu tindak lanjut",
        "Insight: Tambahkan latihan pemahaman bacaan untuk kelas sore",
        "Insight: Fokus siswa menurun pada sesi setelah jam 4",
        "Insight: Jadwalkan sesi ulasan sebelum evaluasi minggu depan",
        "Tag: Analisis Pola",
        "Tag: Rekomendasi Otomatis",
        "Tag: Deteksi Dini",
        "Tag: Ringkasan Mingguan",
      ],
    },
    {
      id: "belajar-lebih-dekat",
      heading:
        "Belajar terasa lebih dekat ketika kemajuan dapat dilihat dan dirayakan.",
      body: [],
      bullets: ["Eyebrow: 04 · Untuk setiap siswa"],
    },
  ],
};
