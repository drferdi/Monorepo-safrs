import type { PageContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/beranda.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, dan tautan sosial diabaikan.
export const beranda: PageContent = {
  slug: "",
  title: "El-Kayyisa | Bimbingan Belajar Personal dan Terarah",
  description:
    "El-Kayyisa membantu siswa belajar lebih terarah melalui pendampingan personal, penguatan pemahaman, dan pemantauan perkembangan secara berkelanjutan.",
  hero: {
    heading: "Belajar lebih tepat. Berkembang bertahap.",
    sub: "Pendampingan personal untuk fokus pada materi yang perlu diperkuat.",
    // CTA sumber menunjuk https://temlis.com/ — domain template vendor (tautan mati),
    // bukan halaman situs ini. Diarahkan ke /cara-belajar sesuai instruksi task.
    cta: { label: "Konsultasi", href: "/cara-belajar" },
  },
  sections: [
    {
      id: "pendampingan-belajar-yang-personal-dan-terarah",
      heading: "Pendampingan belajar yang personal dan terarah",
      body: ["Setiap siswa belajar dengan prioritas yang sesuai kebutuhannya."],
      bullets: [
        "Pemetaan Belajar: Kenali materi yang perlu diperkuat sebelum sesi dimulai.",
        "Kelas Personal: Sesi belajar disesuaikan dengan target dan cara belajar siswa.",
        "Perkembangan Siswa: Pantau pemahaman dan tentukan prioritas belajar berikutnya.",
      ],
    },
    {
      id: "belajar-bukan-sekadar-lebih-lama",
      heading: "Belajar bukan sekadar lebih lama",
      body: [
        "Kami membantu siswa memahami kebutuhan belajar, membangun kebiasaan, dan berkembang secara bertahap.",
      ],
    },
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
