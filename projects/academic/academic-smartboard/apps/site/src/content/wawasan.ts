import type { PageContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/wawasan.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, dan JSON-LD diabaikan.
//
// hero: markup sumber (.sec_h-blog) tidak memuat tombol CTA di hero itu
// sendiri (tombol "Baca selengkapnya" ada di kartu artikel unggulan, bukan
// hero) — hero.cta tidak diisi.
//
// sections: sesuai instruksi task, daftar artikel (.blog_main-card unggulan
// + 5 kartu .content-blog_card) masing-masing jadi satu Section (heading =
// judul artikel, body = ringkasan). Hanya kartu unggulan yang punya
// paragraf ringkasan di markup sumber; 5 kartu grid lainnya cuma punya
// label kategori + judul (tanpa ringkasan) — body dibiarkan [] untuk itu,
// bukan direka-reka. Label kategori tiap kartu (mis. "Cara Belajar",
// "Tutor") dipakai verbatim sebagai satu-satunya item bullets (Section
// tidak punya field kategori bersendiri).
//
// id tiap section adalah kebab-case dari JUDUL artikel Indonesia, BUKAN
// dari slug URL sumbernya — URL sumber (mis.
// "/blog/5-ways-ai-can-streamline-business-operations") adalah tautan mati
// vendor berbahasa Inggris yang tidak berhubungan dengan judul artikel
// Indonesia-nya.
//
// Gambar tiap artikel (.blog_main-card_img / .content-blog_card_img) di-port
// di Task 10: PNG arsip dikonversi ke webp (lebar 1536px asli, di bawah
// batas 1600px sehingga tidak di-resize) dan disimpan di
// public/images/wawasan/<section.id>.webp. Pemetaan file arsip ke section
// diverifikasi lewat atribut src <img> pada source-pages/wawasan.html
// (bukan tebakan dari nama file semata).
//
// Dijatuhkan (bukan konten artikel):
// - Header pembuka blok listing (.sec_content-blog: tag "Artikel Pilihan"
//   + <h2>"Wawasan terbaru" + paragraf sub) — paragraf sub-nya adalah
//   duplikat verbatim dari hero.sub; brief secara eksplisit memetakan
//   "satu section per artikel", jadi header listing ini tidak dibuatkan
//   Section terpisah.
// - Tombol "Baca selengkapnya" pada kartu unggulan — tautan mati vendor,
//   dan Section tidak punya field cta.
export const wawasan: PageContent = {
  slug: "wawasan",
  // Tanpa sufiks "| El-Kayyisa": segmen bersarang di bawah RootLayout,
  // title.template ("%s | El-Kayyisa") otomatis menambahkannya.
  title: "Wawasan",
  description:
    "Wawasan belajar untuk membantu orang tua dan siswa membangun proses belajar yang lebih terarah.",
  hero: {
    eyebrow: "Wawasan",
    heading: "Wawasan untuk belajar yang lebih terarah",
    sub: "Catatan dan panduan untuk membantu anak memahami materi, membangun kebiasaan belajar, dan berkembang dengan percaya diri.",
  },
  sections: [
    {
      id: "5-cara-membantu-anak-belajar-lebih-terarah",
      heading: "5 Cara Membantu Anak Belajar Lebih Terarah",
      body: [
        "Belajar yang terarah dimulai dari memahami kebutuhan anak, memilih strategi yang sesuai, dan membangun rutinitas yang dapat dijalani secara konsisten.",
      ],
      bullets: ["Pendampingan Belajar"],
      image: {
        src: "/images/wawasan/5-cara-membantu-anak-belajar-lebih-terarah.webp",
        alt: "5 Cara Membantu Anak Belajar Lebih Terarah",
      },
    },
    {
      id: "memahami-cara-belajar-anak-di-rumah",
      heading: "Memahami Cara Belajar Anak di Rumah",
      body: [],
      bullets: ["Cara Belajar"],
      image: {
        src: "/images/wawasan/memahami-cara-belajar-anak-di-rumah.webp",
        alt: "Memahami Cara Belajar Anak di Rumah",
      },
    },
    {
      id: "membangun-kebiasaan-belajar-yang-konsisten",
      heading: "Membangun Kebiasaan Belajar yang Konsisten",
      body: [],
      bullets: ["Pendampingan"],
      image: {
        src: "/images/wawasan/membangun-kebiasaan-belajar-yang-konsisten.webp",
        alt: "Membangun Kebiasaan Belajar yang Konsisten",
      },
    },
    {
      id: "peran-tutor-dalam-menguatkan-pemahaman",
      heading: "Peran Tutor dalam Menguatkan Pemahaman",
      body: [],
      bullets: ["Tutor"],
      image: {
        src: "/images/wawasan/peran-tutor-dalam-menguatkan-pemahaman.webp",
        alt: "Peran Tutor dalam Menguatkan Pemahaman",
      },
    },
    {
      id: "mengenal-perkembangan-belajar-anak",
      heading: "Mengenal Perkembangan Belajar Anak",
      body: [],
      bullets: ["Perkembangan Anak"],
      image: {
        src: "/images/wawasan/mengenal-perkembangan-belajar-anak.webp",
        alt: "Mengenal Perkembangan Belajar Anak",
      },
    },
    {
      id: "belajar-aktif-dengan-smartboard-sentra",
      heading: "Belajar Aktif dengan Smartboard Sentra",
      body: [],
      bullets: ["Smartboard Sentra"],
      image: {
        src: "/images/wawasan/belajar-aktif-dengan-smartboard-sentra.webp",
        alt: "Belajar Aktif dengan Smartboard Sentra",
      },
    },
  ],
};
