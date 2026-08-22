import type { PageContent } from "./types.ts";

// Sumber:
// - D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/src/components/PrivacyPolicyPage.tsx (126 baris)
// - D:/Devops/abyss-monorepo/apps/academic/smartboard/landing/src/components/TermsOfServicePage.tsx (142 baris)
// Kedua sumber merender lewat komponen bersama `PolicyPage.tsx` (arsip) yang
// menerima title/description/kicker/updated/intro/sections — dipetakan ke
// `PageContent` di sini tanpa memperluas tipe:
//   - kicker ("Legal")   → hero.eyebrow (field sudah ada, dirender persis
//     sebagai label kecil oleh Hero.tsx, cocok dengan peran kicker sumber).
//   - updated + intro    → digabung jadi satu hero.sub: kalimat
//     "Terakhir diperbarui: <tanggal>." diikuti paragraf intro verbatim.
//     Section pada tipe beku tidak punya slot terpisah untuk metadata
//     "terakhir diperbarui"; digabung sebagai kalimat pembuka alih-alih
//     dihilangkan, karena ini fakta yang berarti bagi pembaca kebijakan.
//   - title/description  → PageContent.title/description langsung (dipakai
//     untuk <title>/meta description di page.tsx, sama seperti sumber
//     memakainya untuk `setPageMeta`).
//   - sections[].heading  → heading verbatim TERMASUK penomoran ("1. ...")
//     karena ini teks hukum bernomor, bukan judul section marketing biasa.
//   - <ul><li> sumber      → Section.bullets (Section punya field ini);
//     paragraf pengantar sebelum <ul> (jika ada) → Section.body[0].
//   - <Link to="/about">   → Section.body adalah string[] (prosa polos,
//     tanpa dukungan link inline). Diagram rute (`docs/plans/active/
//     2026-08-20-smartboard-site-port.md`) memetakan /about → /tentang,
//     tapi tanpa slot href di Section, tautan itu tidak bisa direalisasikan
//     sebagai link — teks kalimatnya dipertahankan verbatim, hanya
//     pembungkus <Link> yang dijatuhkan (nama halaman "Tentang" tetap ada
//     sebagai teks polos). Sama dengan pola "markup dijatuhkan, teks
//     dipertahankan" yang sudah dipakai tentang.ts/program-*.ts untuk CTA
//     tanpa field.
//   - `© {new Date().getFullYear()}` (terms §7) → tahun literal 2026
//     (tanggal kerja port ini). Static export membekukan output di waktu
//     build; field string content tidak bisa menyimpan ekspresi tanggal
//     dinamis.
//
// === Audit privasi vs realita (Task 9 Step 2, keputusan terbuka #8) ===
// Keputusan #8: form newsletter footer sumber (mati — `preventDefault`,
// tanpa backend) TIDAK di-port ke situs ini.
// Diperiksa: seluruh 126 baris PrivacyPolicyPage.tsx (9 section) untuk
// klausul yang mengklaim pengumpulan email newsletter/marketing.
// Hasil: TIDAK ADA klausul semacam itu di sumber — kata "newsletter" sama
// sekali tidak muncul di teks kebijakan manapun (hanya ada di markup footer
// terpisah, SiteChrome.tsx, yang bukan bagian dari komponen kebijakan ini).
// Section 1 menyebut "data kontak siswa serta orang tua/wali (nomor
// telepon, email, alamat)" — ini email yang dikumpulkan lewat proses
// pendaftaran bimbingan belajar El-Kayyisa (offline/WhatsApp/tatap muka),
// bukan lewat form newsletter situs. Klausul ini menjelaskan praktik data
// LAYANAN El-Kayyisa secara keseluruhan, bukan mekanisme HTTP situs statis
// ini — jadi tetap akurat terlepas dari form apa yang ada di situs.
// Section 6 ("Cookie dan Teknologi Serupa") adalah satu-satunya klausul
// tentang situs itu sendiri; dipertahankan verbatim karena berbahasa hedge
// ("dapat menggunakan cookie") dan tetap berlaku sebagai disclosure
// pelindung untuk cookie host/CDN, bukan klaim form yang sudah dihapus.
// Kesimpulan: NOL klausul dihapus. Tidak ada penyesuaian isi selain
// pemetaan struktural di atas (heading/bullet/link-drop) — teks hukum itu
// sendiri tetap verbatim dari sumber. Rincian ada di pesan commit untuk
// review Chief.
export const kebijakanPrivasi: PageContent = {
  slug: "kebijakan-privasi",
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi El-Kayyisa: informasi yang kami kumpulkan, cara kami menggunakannya, dan hak Anda atas data pribadi.",
  hero: {
    eyebrow: "Legal",
    heading: "Kebijakan Privasi",
    sub: "Terakhir diperbarui: 1 Agustus 2026. El-Kayyisa berkomitmen menjaga kerahasiaan dan keamanan data siswa, orang tua, dan pengguna Sentra Smartboard. Kebijakan ini menjelaskan informasi apa yang kami kumpulkan, bagaimana kami menggunakannya, dan hak Anda atas data tersebut.",
  },
  sections: [
    {
      id: "informasi-yang-kami-kumpulkan",
      heading: "1. Informasi yang Kami Kumpulkan",
      body: [
        "Kami mengumpulkan informasi yang diperlukan untuk menyelenggarakan bimbingan belajar dan Sentra Smartboard, meliputi:",
      ],
      bullets: [
        "Nama dan data kontak siswa serta orang tua/wali (nomor telepon, email, alamat).",
        "Data akademik siswa: kelas, mata pelajaran, target belajar, dan jadwal sesi.",
        "Riwayat kehadiran, catatan perkembangan yang disusun tutor setelah setiap sesi.",
        "Aktivitas belajar yang tercatat di Sentra Smartboard, termasuk ringkasan dan rekomendasi yang dihasilkan oleh Sentra AI.",
        "Informasi pembayaran yang diperlukan untuk memproses biaya bimbingan.",
      ],
    },
    {
      id: "bagaimana-kami-menggunakan-informasi",
      heading: "2. Bagaimana Kami Menggunakan Informasi",
      body: [],
      bullets: [
        "Menyusun dan mengatur jadwal serta materi sesi bimbingan.",
        "Memantau perkembangan belajar siswa dan menyusun rekomendasi langkah berikutnya.",
        "Berkomunikasi dengan orang tua/wali mengenai kemajuan dan hal yang perlu ditindaklanjuti.",
        "Meningkatkan kualitas layanan, termasuk akurasi insight yang dihasilkan Sentra AI.",
        "Memproses pembayaran dan menerbitkan bukti pembayaran.",
      ],
    },
    {
      id: "data-anak-dan-persetujuan-orang-tua",
      heading: "3. Data Anak dan Persetujuan Orang Tua",
      body: [
        "Karena sebagian besar pengguna layanan kami adalah anak-anak, kami hanya mengumpulkan dan memproses data siswa atas persetujuan orang tua/wali pada saat pendaftaran. Orang tua/wali berhak meninjau, meminta koreksi, atau meminta penghapusan data anak mereka kapan saja melalui kontak yang tercantum di halaman ini.",
      ],
    },
    {
      id: "berbagi-informasi",
      heading: "4. Berbagi Informasi",
      body: [
        "Kami tidak menjual atau menyewakan data pribadi kepada pihak ketiga. Informasi hanya dibagikan kepada tutor yang menangani siswa terkait dan kepada orang tua/wali siswa itu sendiri, kecuali diwajibkan oleh hukum yang berlaku atau untuk memenuhi kewajiban kontraktual dengan penyedia layanan pendukung (misalnya penyedia pembayaran).",
      ],
    },
    {
      id: "keamanan-data",
      heading: "5. Keamanan Data",
      body: [
        "Kami menerapkan langkah teknis dan organisasi yang wajar untuk melindungi data dari akses, perubahan, atau pengungkapan yang tidak sah, termasuk pembatasan akses hanya kepada staf dan tutor yang membutuhkan data tersebut untuk menjalankan tugasnya.",
      ],
    },
    {
      id: "cookie-dan-teknologi-serupa",
      heading: "6. Cookie dan Teknologi Serupa",
      body: [
        "Situs kami dapat menggunakan cookie untuk menjaga fungsi dasar, seperti status navigasi dan preferensi tampilan. Cookie ini tidak digunakan untuk melacak aktivitas Anda di situs lain.",
      ],
    },
    {
      id: "hak-anda",
      heading: "7. Hak Anda",
      body: [
        "Anda berhak meminta akses, koreksi, atau penghapusan data pribadi yang kami simpan, serta menarik persetujuan atas pemrosesan data anak Anda. Untuk mengajukan permintaan ini, silakan hubungi kami melalui kontak pada bagian terakhir halaman ini.",
      ],
    },
    {
      id: "perubahan-kebijakan",
      heading: "8. Perubahan Kebijakan",
      body: [
        "Kebijakan ini dapat diperbarui dari waktu ke waktu mengikuti perkembangan layanan kami. Perubahan signifikan akan diinformasikan melalui situs ini beserta tanggal pembaruan terbaru.",
      ],
    },
    {
      id: "hubungi-kami",
      heading: "9. Hubungi Kami",
      // Sumber: '...hubungi tim El-Kayyisa melalui halaman <Link to="/about">Tentang</Link> kami.'
      // Section.body adalah string[] tanpa dukungan link inline — pembungkus
      // <Link> dijatuhkan, nama halaman "Tentang" dipertahankan sebagai teks.
      body: [
        "Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau ingin menggunakan hak Anda atas data pribadi, hubungi tim El-Kayyisa melalui halaman Tentang kami.",
      ],
    },
  ],
};

export const ketentuanLayanan: PageContent = {
  slug: "ketentuan-layanan",
  title: "Ketentuan Layanan",
  description:
    "Ketentuan layanan El-Kayyisa: syarat pendaftaran, biaya, tanggung jawab pengguna, dan hukum yang berlaku.",
  hero: {
    eyebrow: "Legal",
    heading: "Ketentuan Layanan",
    sub: "Terakhir diperbarui: 1 Agustus 2026. Ketentuan Layanan ini mengatur penggunaan bimbingan belajar El-Kayyisa dan Sentra Smartboard oleh siswa serta orang tua/wali. Dengan menggunakan layanan kami, Anda menyetujui ketentuan berikut.",
  },
  sections: [
    {
      id: "penerimaan-ketentuan",
      heading: "1. Penerimaan Ketentuan",
      body: [
        "Dengan mendaftar atau menggunakan layanan El-Kayyisa, termasuk Sentra Smartboard, Anda dianggap telah membaca, memahami, dan menyetujui Ketentuan Layanan ini. Jika Anda mendaftarkan anak sebagai siswa, Anda menyetujui ketentuan ini atas nama anak tersebut sebagai orang tua/wali yang sah.",
      ],
    },
    {
      id: "deskripsi-layanan",
      heading: "2. Deskripsi Layanan",
      body: [
        "El-Kayyisa menyediakan bimbingan belajar personal secara tatap muka maupun daring, dilengkapi dengan Sentra Smartboard — sistem yang membantu siswa dan orang tua memantau kelas, target materi, dan capaian belajar. Layanan dapat berubah atau diperbarui dari waktu ke waktu untuk meningkatkan kualitas bimbingan.",
      ],
    },
    {
      id: "pendaftaran-dan-akun",
      heading: "3. Pendaftaran dan Akun",
      body: [
        "Pendaftaran memerlukan data yang benar dan terkini mengenai siswa dan orang tua/wali. Anda bertanggung jawab menjaga kerahasiaan kredensial akun (jika ada) dan segera memberi tahu kami apabila terjadi penggunaan akun yang tidak sah.",
      ],
    },
    {
      id: "biaya-dan-pembayaran",
      heading: "4. Biaya dan Pembayaran",
      body: [
        "Biaya bimbingan mengikuti paket yang disepakati pada saat pendaftaran dan dibayarkan sesuai jadwal yang diinformasikan. Keterlambatan pembayaran dapat memengaruhi kelanjutan sesi. Rincian biaya dapat berubah dan akan diinformasikan sebelum berlaku.",
      ],
    },
    {
      id: "kebijakan-pembatalan-dan-penjadwalan-ulang",
      heading: "5. Kebijakan Pembatalan dan Penjadwalan Ulang",
      body: [
        "Pembatalan atau penjadwalan ulang sesi dapat dilakukan sesuai kesepakatan dengan tutor, dengan pemberitahuan sebelumnya yang wajar. Pembatalan mendadak tanpa pemberitahuan dapat dihitung sebagai sesi yang telah digunakan.",
      ],
    },
    {
      id: "tanggung-jawab-pengguna",
      heading: "6. Tanggung Jawab Pengguna",
      body: [],
      bullets: [
        "Memastikan siswa mengikuti sesi sesuai jadwal yang disepakati.",
        "Memberikan informasi yang akurat mengenai kebutuhan belajar siswa.",
        "Menggunakan Sentra Smartboard sesuai tujuannya, yaitu memantau perkembangan belajar, bukan untuk tujuan lain di luar layanan.",
      ],
    },
    {
      id: "hak-kekayaan-intelektual",
      heading: "7. Hak Kekayaan Intelektual",
      // Sumber: `Hak Ekonomi sepenuhnya dimiliki oleh El-Kayyisa © {new Date().getFullYear()}.`
      // Static export membekukan output di waktu build; dibakukan sebagai
      // tahun literal 2026 (tanggal kerja port Task 9, 2026-08-20).
      body: [
        "Karya ini — termasuk desain, materi pembelajaran, dan sistem Sentra Smartboard — diciptakan oleh Sentra untuk El-Kayyisa.",
        "Hak Ekonomi sepenuhnya dimiliki oleh El-Kayyisa © 2026. Seluruh hak ekonomi dilindungi undang-undang. Dilarang menggandakan, mendistribusikan, atau mengkomersialkan tanpa izin tertulis dari El-Kayyisa.",
        "Hak Moral tetap melekat pada Sentra selaku Pencipta dan wajib dicantumkan sebagai kredit atas karya ini sesuai dengan Pasal 5 UU Hak Cipta.",
      ],
    },
    {
      id: "batasan-tanggung-jawab",
      heading: "8. Batasan Tanggung Jawab",
      body: [
        "El-Kayyisa berupaya memberikan bimbingan belajar dengan standar terbaik, namun tidak menjamin hasil akademik tertentu, karena hasil belajar juga dipengaruhi oleh faktor di luar kendali kami, termasuk keterlibatan siswa dan dukungan di rumah.",
      ],
    },
    {
      id: "perubahan-ketentuan",
      heading: "9. Perubahan Ketentuan",
      body: [
        "Ketentuan ini dapat diperbarui sewaktu-waktu. Perubahan yang berlaku akan tercermin pada tanggal pembaruan di bagian atas halaman ini, dan penggunaan layanan setelah perubahan berarti Anda menyetujui ketentuan yang diperbarui.",
      ],
    },
    {
      id: "hukum-yang-berlaku",
      heading: "10. Hukum yang Berlaku",
      body: [
        "Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum yang berlaku di Republik Indonesia.",
      ],
    },
    {
      id: "hubungi-kami",
      heading: "11. Hubungi Kami",
      // Sama seperti kebijakanPrivasi §9: <Link to="/about"> dijatuhkan,
      // teks "Tentang" dipertahankan sebagai prosa polos.
      body: [
        "Untuk pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi tim El-Kayyisa melalui halaman Tentang kami.",
      ],
    },
  ],
};
