/**
 * Kak Kayyisa — local guided knowledge for Bimbel Ops smartboard.
 * Keyword match only; no network / no PHI in prompts.
 */

export interface GuideTopic {
  id: string;
  title: string;
  body: string;
  link?: string;
  linkLabel?: string;
  keywords: string[];
}

export const KAYYISA_TOPICS: GuideTopic[] = [
  {
    id: "dashboard-overview",
    title: "Ringkasan Smartboard",
    body:
      "Smartboard dibaca berurutan: 01 Perlu Tindakan (apa yang menghambat sekarang), " +
      "02 Rantai Sesi Hari Ini (enam tahap sesi hari ini), lalu deret KPI, " +
      "lalu 03 Indikator Operasional (empat kartu pola — bukan antrean kerja), " +
      "dan ditutup tabel Jadwal Hari Ini. Kolom kanan berisi Kak Kayyisa, " +
      "atau panel Kesiapan Payroll untuk peran Finance.",
    link: "/dashboard",
    linkLabel: "Buka Smartboard",
    keywords: [
      "smartboard",
      "dashboard",
      "ringkasan",
      "kpi",
      "utama",
      "beranda",
      "overview",
    ],
  },
  {
    id: "session-chain",
    title: "Rantai Sesi Hari Ini",
    body:
      "Enam tahap berurutan untuk hari ini: " +
      "01 Jadwal (sesi disusun) → 02 Check-in (sesi dimulai) → 03 Absensi (sesi terabsen) → " +
      "04 Evaluasi (sesi lengkap) → 05 Verifikasi (sesi sah) → 06 Honor (honor terbit). " +
      "Angka yang mengecil tajam antar tahap menunjukkan di mana alur hari ini tersendat.",
    link: "/sesi",
    linkLabel: "Daftar Sesi",
    keywords: [
      "rantai",
      "session chain",
      "tahap",
      "corong",
      "funnel",
      "alur hari ini",
      "chain",
    ],
  },
  {
    id: "tutorial-penggunaan",
    title: "Tutorial Penggunaan",
    body:
      "Panduan bergambar dengan isi sama seperti PDF resmi: login, Smartboard, navigasi, sesi, " +
      "Kak Kayyisa, dan tips kerja harian. Buka dari menu Master Data → Tutorial Penggunaan, " +
      "atau unduh PDF dari halaman itu.",
    link: "/tutorial",
    linkLabel: "Buka Tutorial",
    keywords: [
      "tutorial",
      "panduan",
      "cara pakai",
      "manual",
      "pdf",
      "bantuan",
      "belajar",
    ],
  },
  {
    id: "teaching-card",
    title: "Pola Belajar Siswa (Akademik)",
    body:
      "Kartu pertama di Indikator Operasional. Menampilkan jumlah sesi 7 hari terakhir, sesi selesai, " +
      "dan yang dibatalkan. Gunakan untuk melihat beban mengajar mingguan. " +
      "Klik Detail untuk membuka daftar Sesi.",
    link: "/sesi",
    linkLabel: "Lihat Sesi",
    keywords: [
      "pola belajar",
      "belajar",
      "mengajar",
      "sesi",
      "minggu",
      "aktivitas",
      "teaching",
      "jadwal kelas",
    ],
  },
  {
    id: "finance-card",
    title: "Pola Keuangan (Payroll)",
    body:
      "Kartu keuangan merangkum estimasi payroll bulan berjalan, pecahan dasar/insentif/transport, " +
      "serta progress honor yang sudah dibayar. Peran murid/orang tua tidak melihat ringkasan ini. " +
      "Detail lengkap ada di Rekap Honor.",
    link: "/keuangan/honor",
    linkLabel: "Rekap Honor",
    keywords: [
      "pola keuangan",
      "keuangan",
      "honor",
      "payroll",
      "gaji",
      "uang",
      "finance",
      "insentif",
      "transport",
    ],
  },
  {
    id: "tutor-eval-card",
    title: "Pola Pengajaran (Guru & Metode)",
    body:
      "Kartu ini memantau sesi yang menunggu evaluasi, kelengkapan pengisian evaluasi bulan ini, " +
      "dan pengajar yang paling aktif mengisi evaluasi. Pastikan setiap sesi selesai punya evaluasi sebelum verifikasi.",
    link: "/evaluasi",
    linkLabel: "Halaman Evaluasi",
    keywords: [
      "pola pengajaran",
      "evaluasi pengajar",
      "tentor",
      "kelengkapan",
      "menunggu evaluasi",
      "tutor",
    ],
  },
  {
    id: "student-eval-card",
    title: "Evaluasi Siswa",
    body:
      "Kartu Evaluasi Siswa menampilkan jumlah evaluasi, rata-rata skor (1–5), sebaran skor sebagai " +
      "grafik garis, dan status kompetensi (belum/mulai/cukup/menguasai). " +
      "Untuk tren per murid, buka Perkembangan Murid.",
    link: "/akademik/perkembangan",
    linkLabel: "Perkembangan Murid",
    keywords: [
      "evaluasi siswa",
      "murid",
      "skor",
      "kompetensi",
      "nilai",
      "student",
    ],
  },
  {
    id: "attendance",
    title: "Kehadiran Hari Ini",
    body:
      'Kehadiran dibaca di tiga tempat: KPI "Murid Hadir Hari Ini", tahap 03 Absensi pada Rantai Sesi, ' +
      'dan baris "N sesi belum memiliki absensi lengkap" di Perlu Tindakan. ' +
      "Absensinya sendiri diisi dari halaman detail sesi setelah tentor check-in. " +
      "(Kartu Komposisi Kehadiran sudah tidak ada — isinya tumpang tindih dengan ketiga tempat itu.)",
    link: "/sesi?date=today",
    linkLabel: "Sesi Hari Ini",
    keywords: [
      "hadir",
      "absen",
      "kehadiran",
      "attendance",
      "izin",
      "terlambat",
    ],
  },
  {
    id: "actions",
    title: "Perlu Tindakan",
    body:
      "Blok 01 di Smartboard, urut dari yang paling mendesak: absensi belum lengkap, sesi menunggu evaluasi, " +
      "sesi siap diverifikasi, dan murid yang kehadirannya perlu perhatian. " +
      "Klik baris untuk langsung ke filter yang sesuai. Kalau kosong, memang tidak ada yang menghambat.",
    link: "/sesi?status=menunggu_evaluasi",
    linkLabel: "Sesi Menunggu Evaluasi",
    keywords: [
      "tindakan",
      "masalah",
      "pending",
      "verifikasi",
      "urgent",
      "perlu",
    ],
  },
  {
    id: "operational-indicator",
    title: "Indikator Operasional",
    body:
      "Blok 03 berisi empat kartu pola: Pola Belajar Siswa (Akademik), Pola Pengajaran (Guru & Metode), " +
      "Pola Keuangan (Payroll), dan Evaluasi Siswa. Ini bacaan tren, bukan antrean kerja — " +
      "yang harus dikerjakan hari ini selalu ada di blok 01 Perlu Tindakan. " +
      "Kartu yang muncul menyesuaikan peran Anda.",
    link: "/dashboard",
    linkLabel: "Buka Smartboard",
    keywords: [
      "operational indicator",
      "indikator",
      "pola",
      "kartu",
      "tren",
      "analitik",
      "indikator operasional",
    ],
  },
  {
    id: "schedule",
    title: "Jadwal & Kalender",
    body:
      "Tabel Jadwal Hari Ini di smartboard menampilkan jam, mapel, pengajar, format, dan status. " +
      "Untuk mengelola jadwal berulang atau minggu penuh, gunakan menu Kalender & Jadwal.",
    link: "/jadwal",
    linkLabel: "Kalender & Jadwal",
    keywords: ["jadwal", "kalender", "hari ini", "schedule", "mingguan"],
  },
  {
    id: "session-flow",
    title: "Alur Sesi Pembelajaran",
    body:
      "Alur tipikal: Jadwal → Sesi dibuat → Check-in tentor → Absensi murid → Evaluasi → Verifikasi → Honor. " +
      "Buka detail sesi untuk check-in/out, absensi, dan form evaluasi. " +
      "Progres alur ini untuk hari berjalan terlihat di blok 02 Rantai Sesi Hari Ini.",
    link: "/sesi",
    linkLabel: "Daftar Sesi",
    keywords: [
      "alur",
      "workflow",
      "check-in",
      "checkin",
      "cara kerja",
      "langkah",
      "proses",
    ],
  },
];

export const KAYYISA_QUICK_PROMPTS = [
  { label: "Apa isi smartboard?", query: "ringkasan smartboard" },
  { label: "Rantai sesi", query: "rantai tahap hari ini" },
  { label: "Honor & payroll", query: "pola keuangan honor" },
  { label: "Isi evaluasi", query: "menunggu evaluasi" },
  { label: "Alur sesi", query: "alur sesi pembelajaran" },
];

const FALLBACK =
  "Kak Kayyisa belum menemukan topik itu. Coba tanya tentang smartboard, sesi, kehadiran, evaluasi, jadwal, atau honor. " +
  "Atau pilih salah satu saran cepat di bawah.";

/**
 * @param {string} raw
 * @returns {{ reply: string, topic: GuideTopic | null }}
 */
export function answerKayyisa(raw: string): {
  reply: string;
  topic: GuideTopic | null;
} {
  const q = String(raw || "")
    .toLowerCase()
    .trim();
  if (!q) {
    return {
      reply:
        "Halo! Saya Kak Kayyisa. Tanyakan fitur smartboard — misalnya KPI, kartu visualisasi, evaluasi, atau jadwal hari ini.",
      topic: null,
    };
  }

  let best: GuideTopic | null = null;
  let bestScore = 0;
  for (const topic of KAYYISA_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (q.includes(kw)) score += kw.length >= 6 ? 2 : 1;
    }
    if (q.includes(topic.title.toLowerCase())) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  if (!best || bestScore === 0) {
    return { reply: FALLBACK, topic: null };
  }

  return {
    reply: `**${best.title}**\n\n${best.body}`,
    topic: best,
  };
}
