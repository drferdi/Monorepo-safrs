import type { ProgramContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/program-pendampingan-personal.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, JSON-LD, dan filler
// bahasa Inggris diabaikan.
//
// benefits: 2 item unik diulang 2x dalam markup sumber (kemungkinan untuk
// marquee/carousel) plus 1 slot gambar tanpa teks (.benefit_img) — duplikat
// dan slot gambar diabaikan. Heading section sumber ("Manfaat pendampingan
// personal") dan sub-taglinenya tidak punya field di ProgramContent;
// ProgramPage.tsx memakai label tetap "Manfaat".
//
// Testimoni placeholder ("Testimoni akan ditampilkan setelah memperoleh
// persetujuan." / "Orang Tua Siswa" / "Testimoni menunggu persetujuan")
// TIDAK di-port sesuai instruksi task.
//
// steps: sumber tidak memuat urutan langkah bernomor — array kosong.
export const programPendampinganPersonal: ProgramContent = {
  slug: "program/pendampingan-personal",
  // Tanpa sufiks "| El-Kayyisa": halaman ini adalah segmen bersarang di
  // bawah RootLayout, jadi title.template layout ("%s | El-Kayyisa" —
  // lihat src/app/layout.tsx) otomatis menambahkannya. beranda.ts memakai
  // sufiks penuh karena app/page.tsx berada di segmen yang SAMA dengan
  // layout yang mendefinisikan template, sehingga template itu tidak
  // berlaku untuknya (perilaku Next.js metadata).
  title: "Pendampingan Personal",
  description:
    "Kami membantu siswa mengenali cara belajar, target, dan materi yang perlu diperkuat.",
  programName: "Pendampingan Personal",
  hero: {
    heading: "Pendampingan Personal",
    // Dua paragraf w-richtext sumber digabung jadi satu `sub` — Hero.tsx
    // hanya menerima satu string, bukan array seperti Section.body.
    sub: "Kami membantu siswa mengenali cara belajar, target, dan materi yang perlu diperkuat. Melalui percakapan awal dan pemetaan pemahaman, kami menyusun pendampingan yang personal dan bertahap.",
    // CTA sumber menunjuk https://temlis.com/ — domain template vendor
    // (tautan mati), bukan halaman situs ini. Diarahkan ke /cara-belajar
    // mengikuti pola beranda.ts.
    cta: { label: "Konsultasi", href: "/cara-belajar" },
  },
  benefits: [
    "Langkah Belajar Bertahap: Siswa memperoleh arah belajar yang jelas untuk menguatkan pemahaman dan rasa percaya diri.",
    "Penguatan Pemahaman: Siswa memperoleh arah belajar yang jelas untuk menguatkan pemahaman dan rasa percaya diri.",
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
