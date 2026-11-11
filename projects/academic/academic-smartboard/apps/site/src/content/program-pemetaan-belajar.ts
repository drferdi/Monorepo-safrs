import type { ProgramContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/program-pemetaan-belajar.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, JSON-LD, dan filler
// bahasa Inggris (mis. deskripsi Service JSON-LD) diabaikan.
//
// benefits: markup sumber (.benefits_layout) berisi 2 item unik yang diulang
// 2x (kemungkinan untuk marquee/carousel) plus 1 slot gambar tanpa teks
// (.benefit_img) — duplikat dan slot gambar diabaikan, hanya 2 item unik
// yang diambil. Heading section sumber ("Manfaat pendampingan terarah") dan
// sub-tagline-nya tidak punya field di ProgramContent; ProgramPage.tsx
// memakai label tetap "Manfaat" untuk blok ini.
//
// Testimoni placeholder (.benefit_item.is-large: "Testimoni akan ditampilkan
// setelah memperoleh persetujuan." / "Orang Tua Siswa" / "Testimoni menunggu
// persetujuan") TIDAK di-port sesuai instruksi task.
//
// steps: sumber tidak memuat urutan langkah bernomor (hanya hero, benefits,
// testimoni umum, dan CTA) — array kosong.
export const programPemetaanBelajar: ProgramContent = {
  slug: "program/pemetaan-belajar",
  // Tanpa sufiks "| El-Kayyisa": halaman ini adalah segmen bersarang di
  // bawah RootLayout, jadi title.template layout ("%s | El-Kayyisa" —
  // lihat src/app/layout.tsx) otomatis menambahkannya. beranda.ts memakai
  // sufiks penuh karena app/page.tsx berada di segmen yang SAMA dengan
  // layout yang mendefinisikan template, sehingga template itu tidak
  // berlaku untuknya (perilaku Next.js metadata).
  title: "Pemetaan Belajar",
  description:
    "Kami membantu memetakan kebutuhan belajar dan menentukan fokus pendampingan yang sesuai.",
  programName: "Pemetaan Belajar",
  hero: {
    heading: "Pemetaan Belajar",
    // Dua paragraf w-richtext sumber digabung jadi satu `sub` — Hero.tsx
    // hanya menerima satu string, bukan array seperti Section.body.
    sub: "Kami membantu memetakan kebutuhan belajar dan menentukan fokus pendampingan yang sesuai. Melalui pemetaan pemahaman, target, dan kebiasaan belajar, kami menyusun langkah bertahap sesuai kebutuhan siswa.",
    // CTA sumber menunjuk https://temlis.com/ — domain template vendor
    // (tautan mati), bukan halaman situs ini. Diarahkan ke /cara-belajar
    // mengikuti pola beranda.ts.
    cta: { label: "Konsultasi", href: "/cara-belajar" },
  },
  benefits: [
    "Prioritas Belajar Jelas: Kenali konsep yang perlu diperkuat dan susun langkah belajar secara bertahap.",
    "Belajar Lebih Efisien: Kenali konsep yang perlu diperkuat dan susun langkah belajar secara bertahap.",
  ],
  steps: [],
  sections: [
    {
      id: "belajar-yang-didampingi-secara-menyeluruh",
      heading: "Belajar yang didampingi secara menyeluruh",
      body: [
        "Fasilitas belajar, tutor yang profesional, dan Smartboard Sentra mendukung setiap proses perkembangan anak.",
      ],
      bullets: [
        '"Ruang belajar nyaman, pendekatan personal, dan pendampingan sesuai kebutuhan anak." — Fasilitas & keunggulan El-Kayyisa',
        '"Tutor menguasai materi dan aktif mendampingi setiap aktivitas belajar-mengajar." — Tutor profesional & suportif',
        '"Student 360, perkembangan anak, dan kurikulum nasional dalam satu Smartboard." — Smartboard Sentra · 3 fitur terintegrasi',
      ],
    },
    {
      id: "belajar-lebih-tepat-berkembang-bertahap",
      heading: "Belajar lebih tepat berkembang bertahap",
      body: [
        "El-Kayyisa membantu siswa memahami kebutuhan belajar dan berkembang melalui pendampingan personal.",
      ],
    },
  ],
};
