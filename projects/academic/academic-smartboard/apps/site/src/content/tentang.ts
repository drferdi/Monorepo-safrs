import type { PageContent } from "./types.ts";

// Sumber: D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/source-pages/tentang.html
// (arsip HTML hasil scrape template Webflow "Aeline"). Konten Indonesia diekstrak
// verbatim dari markup vendor; markup, nav, footer, form, dan JSON-LD diabaikan.
//
// hero.cta: CTA sumber menunjuk href="/contact" — rute internal template
// vendor sendiri, tidak ada di situs ini. Diarahkan ke /cara-belajar
// mengikuti pola persis beranda.ts/program-*.ts.
//
// hero: markup sumber (.sec_h-about) tidak punya elemen .tag — jadi tidak
// ada eyebrow untuk hero (berbeda dari cara-belajar.ts/wawasan.ts yang
// memilikinya). Blok visual "h-about_img" (kartu mockup .ecard/.vcard) di
// sebelah hero adalah dekorasi UI, bukan prosa: teks .ecard_inner yang
// tersambung membentuk kalimat "Pendampingan yang memahami cara belajar
// setiap anak", dan .vcard berisi label UI generik ("Rencana belajar" /
// "Fokus Belajar Personal" / "Sesi pendampingan" x3 "Belajar terarah" /
// placeholder "—") — keduanya diabaikan sebagai chrome UI, bukan konten.
// Caption ".testi-people" "Pendampingan yang terarah" (muncul 2x di
// halaman ini, dekat avatar) adalah tagline dekoratif berulang tanpa
// field tujuan di Section — diabaikan, konsisten dengan beranda.ts yang
// juga tidak memuatnya.
//
// Section "Tentang Kami" (.sec_ab-about): heading sumber adalah judul
// tipografis yang dipecah per kata ("A" "ruang" "belajar" "personal"
// "untuk" "membantu" "anak" "memahami" "dan" "bertumbuh" "percaya diri").
// Kata "A" di depan adalah sisa artikel bahasa Inggris template yang tidak
// diterjemahkan (filler) — diabaikan; sisanya digabung jadi satu kalimat
// Indonesia yang utuh.
//
// Section "Tutor yang mendampingi" (.sec_team): 3 kartu tutor (nama +
// peran) digabung jadi bullet "Nama: Peran." (colon-join, karena Section
// tidak punya field tim bersarang). Tombol "Konsultasi" di header section
// ini tidak punya field cta di Section — dijatuhkan.
//
// Section "Proses Pendampingan" (.sec_journey): heading sumber "Proses
// Pendampingan toward  intelligent transformation" — suffix bahasa
// Inggris tidak diterjemahkan (filler template) — diabaikan, disisakan
// "Proses Pendampingan" (cocok dengan tag section). 4 tahap perjalanan
// digabung jadi bullet "Tahap: detail." (colon-join).
//
// CTA bawah (section_cta): sama persis dengan blok section_cta di
// cara-belajar.html — heading+body dipertahankan verbatim, tombol
// "Konsultasi" dijatuhkan (Section tidak punya field cta).
export const tentang: PageContent = {
  slug: "tentang",
  // Judul asli sumber "Tentang El-Kayyisa | Bimbingan Belajar Personal"
  // memakai sufiks "| Bimbingan Belajar Personal", bukan "| El-Kayyisa" —
  // dipersingkat jadi "Tentang El-Kayyisa" agar title.template layout
  // ("%s | El-Kayyisa") tidak menghasilkan sufiks ganda/janggal.
  title: "Tentang El-Kayyisa",
  description:
    "El-Kayyisa adalah ruang belajar personal yang membantu siswa memahami materi, membangun kebiasaan, dan berkembang bertahap.",
  hero: {
    heading: "Mendampingi anak belajar dengan lebih percaya diri",
    sub: "El-Kayyisa adalah ruang belajar personal yang membantu siswa memahami materi, membangun kebiasaan, dan berkembang bertahap.",
    cta: { label: "Konsultasi", href: "/cara-belajar" },
  },
  sections: [
    {
      id: "ruang-belajar-personal-untuk-membantu-anak-memahami-dan-bertumbuh-percaya-diri",
      heading:
        "Ruang belajar personal untuk membantu anak memahami dan bertumbuh percaya diri",
      body: [],
    },
    {
      id: "tutor-yang-mendampingi",
      heading: "Tutor yang mendampingi",
      body: [],
      bullets: [
        "Tutor El-Kayyisa: Tutor Akademik.",
        "Mentor Belajar: Pendamping Belajar.",
        "Pendamping Akademik: Tutor Personal.",
      ],
    },
    {
      id: "proses-pendampingan",
      heading: "Proses Pendampingan",
      body: [
        "Setiap proses dimulai dari memahami kebutuhan anak, lalu menyusun langkah belajar yang sesuai dan terus ditinjau bersama.",
      ],
      bullets: [
        "Pemetaan: Kami memulai dari percakapan dan pemetaan kebutuhan belajar anak.",
        "Rencana: Kami menyusun rencana belajar sesuai target, cara belajar, dan materi yang perlu diperkuat.",
        "Dampingi: Tutor mendampingi proses belajar-mengajar secara aktif untuk menguatkan pemahaman anak.",
        "Tinjau: Perkembangan belajar ditinjau secara berkala agar langkah berikutnya tetap terarah.",
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
