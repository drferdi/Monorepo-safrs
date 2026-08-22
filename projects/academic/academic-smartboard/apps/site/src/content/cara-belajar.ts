import type { PageContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/cara-belajar.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, dan JSON-LD diabaikan.
//
// hero.cta: satu-satunya CTA hero sumber ("Konsultasi") menunjuk ke
// href="/contact" — rute internal template vendor sendiri (bukan tautan
// vendor yang mati seperti temlis.com di beranda.ts/program-*.ts), tapi
// sama-sama bukan halaman yang ada di situs ini. Berbeda dari beranda.ts
// dan program-*.ts (yang mengarahkan CTA serupa ke /cara-belajar sebagai
// titik konversi), halaman INI ADALAH /cara-belajar — self-link tidak
// bermakna, jadi cta dihilangkan (field opsional). Setiap CTA "Konsultasi"
// lain di situs sudah mengarah ke sini.
//
// Kartu harga (.pricing_card, 3 kartu): tidak ada heading terpisah di
// markup sumber untuk blok ini — satu section_pricing yang sama menaungi
// hero DAN kartu, tanpa <h2> perantara. Heading section di bawah karena
// itu me-reuse teks H1 hero secara sengaja (didokumentasikan).
// - Kartu 1 "Pendampingan Personal" & kartu 2 "Kelas Terarah": deskripsi
//   singkatnya adalah teks Indonesia asli, dipertahankan verbatim.
// - Kartu 2 memiliki 4 item fitur (svg + teks) tapi hanya 1 ("Tutor
//   pendamping") berbahasa Indonesia; 3 lainnya ("End-to-end automation
//   setup", "Predictive analytics dashboards", "AI-driven reporting &
//   insights") adalah filler bahasa Inggris template vendor yang tidak
//   diterjemahkan — diabaikan sesuai instruksi task.
// - Kartu 3 "Program Intensif": deskripsi singkatnya ("Custom-built for
//   enterprises seeking full-scale transformation optimization.") adalah
//   filler bahasa Inggris murni (tidak diterjemahkan) — diabaikan. Sebagai
//   gantinya, 4 item fiturnya (semua berbahasa Indonesia asli) dipakai
//   sebagai "Fitur:" pada bullet kartu ini.
// - Fitur asli kartu 1 (4 item) dan kartu 2 (1 item, "Tutor pendamping")
//   TIDAK dijatuhkan begitu saja — digabung ke bullet masing-masing kartu
//   via label "Fitur:" (colon-join, karena Section tidak punya field
//   fitur bersarang).
//
// FAQ (.faq_item, 5 item): setiap pertanyaan+jawaban digabung jadi satu
// bullet "Pertanyaan? — Jawaban." (colon setelah tanda tanya janggal,
// dipakai em dash mengikuti pola quote—atribusi yang sudah ada).
//
// CTA bawah (section_cta): heading+body dipertahankan; tombol "Konsultasi"
// pada section ini tidak punya field di Section — dijatuhkan, mengikuti
// pola yang sama persis dengan beranda.ts/program-*.ts.
export const caraBelajar: PageContent = {
  slug: "cara-belajar",
  // Tanpa sufiks "| El-Kayyisa": segmen bersarang di bawah RootLayout,
  // title.template ("%s | El-Kayyisa") otomatis menambahkannya.
  title: "Cara Belajar",
  description:
    "Pendampingan belajar El-Kayyisa disesuaikan dengan kebutuhan, target, dan tahap perkembangan setiap anak.",
  hero: {
    eyebrow: "Cara Belajar",
    heading: "Pendampingan Belajar sesuai Kebutuhan Anak",
    sub: "Setiap kebutuhan belajar memiliki pendekatan yang berbeda. Kami menyesuaikan pendampingan dengan materi, ritme, dan target belajar anak.",
    // Tidak ada cta — lihat komentar di atas.
  },
  sections: [
    {
      // Heading sengaja menduplikasi H1 hero: markup sumber tidak punya
      // <h2> khusus untuk blok kartu harga, hanya H1 tunggal yang menaungi
      // hero + kartu.
      id: "pendampingan-belajar-sesuai-kebutuhan-anak",
      heading: "Pendampingan Belajar sesuai Kebutuhan Anak",
      body: [],
      bullets: [
        "Pendampingan Personal: Pendampingan satu-satu untuk membantu anak memahami materi dan membangun kebiasaan belajar. Fitur: pemetaan kebutuhan belajar, rencana belajar personal, pendampingan materi inti, komunikasi dengan orang tua.",
        "Kelas Terarah: Pendampingan terarah untuk memperkuat materi, strategi belajar, dan konsistensi anak. Fitur: tutor pendamping.",
        "Program Intensif: Fitur: program belajar sesuai target, pendampingan akademik intensif, tinjauan perkembangan berkala, konsultasi kebutuhan belajar.",
      ],
    },
    {
      id: "pertanyaan-yang-sering-ditanyakan",
      heading: "Pertanyaan yang sering ditanyakan",
      body: [
        "Informasi yang perlu diketahui sebelum memulai pendampingan belajar bersama El-Kayyisa.",
      ],
      bullets: [
        "Untuk jenjang apa pendampingan tersedia? — Pendampingan El-Kayyisa disesuaikan dengan kebutuhan siswa dan materi yang sedang dipelajari. Kami memulai dari pemetaan agar proses belajar terasa relevan dan terarah.",
        "Bagaimana proses pendampingan dimulai? — Kami memulai dari percakapan dan pemetaan kebutuhan belajar, menyusun rencana yang sesuai, lalu mendampingi prosesnya sambil meninjau perkembangan secara berkala.",
        "Apa yang membedakan El-Kayyisa? — El-Kayyisa berfokus pada pemahaman anak, bukan sekadar menyelesaikan tugas. Tutor aktif mendampingi proses belajar dan menyesuaikan pendekatan dengan kebutuhan anak.",
        "Apakah orang tua perlu menyiapkan materi khusus? — Tidak perlu. Kami akan berdiskusi mengenai kebutuhan anak dan materi yang perlu diperkuat agar pendampingan dapat dimulai dengan jelas dan nyaman.",
        "Bagaimana perkembangan belajar dipantau? — Perkembangan ditinjau secara berkala melalui proses belajar, pemahaman materi, dan target yang telah disepakati bersama.",
      ],
    },
    {
      id: "kami-memadukan-pendampingan-dan-pemahaman-belajar",
      heading: "Kami memadukan pendampingan dan pemahaman belajar",
      body: [
        "El-Kayyisa membantu siswa membangun pemahaman, kebiasaan belajar, dan rasa percaya diri melalui pendampingan yang personal.",
      ],
    },
  ],
};
