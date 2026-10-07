// Sentra Organisation, taken from the Sentra Artificial Intelligence documents of 2026:
// Operating Charter ORG-2026-01 and Financial Architecture FIN-2026-01 (both revision 1.3,
// 16 August 2026), the Legal Transition Guide revision 1.3, and the Minister of Law decree and
// founding statement of 4 September 2026. Chief chose (2026-10-07) to show everything except
// personal data, then dropped the profit-participation section, so no identity numbers, birth
// date, home address or profit shares appear here. Only base figures are stored; derived amounts are
// computed (see organisation.test.ts).

export interface CoreRole {
  id: string
  name: string
  shortName: string
  tier: string
  domain: string
  accountability: string
  aiSupport: string
  decides: string
}

export const CORE_ROLES: CoreRole[] = [
  {
    id: 'founder',
    name: 'dr. Ferdi Iskandar, S.H., M.Kn.',
    shortName: 'dr. Ferdi Iskandar',
    tier: 'Founder & CEO',
    domain: 'Eksekutif',
    accountability: 'Visi, alokasi modal, arsitektur sistem, dan kendali eksekutif akhir.',
    aiSupport: 'Strategic copilot: riset, skenario, penyusunan dokumen, dan simulasi.',
    decides: 'Tesis produk inti, arsitektur AI utama, alokasi modal, dan kemitraan eksternal material.',
  },
  {
    id: 'asyraf',
    name: 'Asyraf Hadi',
    shortName: 'Asyraf Hadi',
    tier: 'Founding Core',
    domain: 'Growth',
    accountability: 'Komersialisasi, kemitraan, akuisisi pelanggan awal, dan brand.',
    aiSupport: 'Growth intelligence: kualifikasi prospek, proposal, dan tindak lanjut CRM.',
    decides: 'Eksekusi growth harian dalam domainnya.',
  },
  {
    id: 'josep',
    name: 'Josep Arianto',
    shortName: 'Josep Arianto',
    tier: 'Founding Core',
    domain: 'Operations',
    accountability: 'Administrasi korporasi, kepatuhan, operasional harian, dan people operations.',
    aiSupport: 'Operational intelligence: checklist, rekonsiliasi biaya, dan tenggat.',
    decides: 'Eksekusi operasional harian dalam domainnya.',
  },
  {
    id: 'novia',
    name: 'dr. Novia Anggraini',
    shortName: 'dr. Novia Anggraini',
    tier: 'Founding Core',
    domain: 'Clinical',
    accountability: 'Tata kelola klinis, persyaratan keselamatan, akurasi SOAP, dan interpretasi bukti.',
    aiSupport: 'Clinical intelligence: penelusuran literatur, penyusunan draf, dan review FHIR/SatuSehat.',
    decides: 'Tata kelola klinis dalam domainnya.',
  },
  {
    id: 'karel',
    name: 'Karel Sinatra',
    shortName: 'Karel Sinatra',
    tier: 'Core Team',
    domain: 'Academic & Business Development',
    accountability:
      'Komersialisasi Sentra Academic/Tutor Smartboard; memimpin pilot institusi, customer discovery, kemitraan, adopsi, dan akuntabilitas pendapatan.',
    aiSupport: 'Academic & commercial intelligence: pipeline, konversi, retensi, dan umpan balik product-market.',
    decides:
      'Go-to-market dan pilot Academic dalam domainnya. Karel tidak termasuk Founder atau Founding Core, tidak otomatis memegang saham legal, dan tidak punya veto atas keputusan Founder.',
  },
  {
    id: 'farhan',
    name: 'Farhan Nugroho, S.T.',
    shortName: 'Farhan Nugroho',
    tier: 'Founding Contributor',
    domain: 'Infrastructure',
    accountability: 'Uptime, deployment, backup, troubleshooting jaringan, dan keandalan sistem.',
    aiSupport: 'Reliability copilot: log, deteksi anomali, dan runbook insiden.',
    decides: 'Triase server dalam domainnya.',
  },
]

export interface Advisor {
  name: string
  mandate: string
  boundary: string
}

export const INDEPENDENT_PANEL: Advisor[] = [
  {
    name: 'Widya Puti Melinda, S.Psi., M.M.',
    mandate: 'Nasihat keuangan dan operasional.',
    boundary: 'Memberi nasihat, tanpa wewenang eksekutif.',
  },
  {
    name: 'Kevin Susanto, B.Eng., MTech IS',
    mandate: 'Review teknis independen atas kode, keamanan cloud, dan kepatuhan API.',
    boundary: 'Review dan rekomendasi.',
  },
  {
    name: 'dr. Dibya Arfianda, Sp.OG.',
    mandate: 'Menilai lulus atau gagal secara klinis, secara independen, sebelum fitur klinis dirilis.',
    boundary: 'Boleh memblokir rilis. Tim pengembang tidak bisa membatalkan putusan gagal keselamatan klinis.',
  },
]

export const FOUNDING_COMPACT = [
  { label: 'Human first', desc: 'Integritas, akuntabilitas, dan kepedulian tidak bisa ditawar.' },
  {
    label: 'AI augments everyone',
    desc: 'Satu lapisan AI yang diatur membantu setiap fungsi, sebatas akses yang sudah disetujui.',
  },
  {
    label: 'Human authority',
    desc: 'Keputusan akhir, tanggung jawab, dan eskalasi selalu dipegang pemimpin yang ditunjuk dengan nama.',
  },
  {
    label: 'Modular resources',
    desc: 'Tim inti mengerjakan kemampuan yang dipakai bersama. Untuk keahlian yang sempit, Sentra memakai spesialis dari luar.',
  },
]

export const DECISION_RIGHTS = [
  {
    tier: 'Founder-only',
    examples: 'Tesis produk inti, arsitektur AI utama, alokasi modal, kemitraan eksternal material.',
    owner: 'Founder & CEO',
  },
  {
    tier: 'Domain-owned',
    examples: 'Growth harian, eksekusi operasional, tata kelola klinis, go-to-market dan pilot Academic, triase server.',
    owner: 'Asyraf, Josep, dr. Novia, Karel Sinatra, atau Farhan dalam domainnya',
  },
  {
    tier: 'Council input',
    examples: 'Peluncuran besar, arah lintas produk, risiko regulasi.',
    owner: 'Founding Council memberi saran; Founder memutuskan',
  },
  {
    tier: 'Independent validation',
    examples: 'Kesiapan rilis klinis dan gate keselamatan pasien.',
    owner: 'Independent Validator Panel',
  },
]

export const OPERATING_RHYTHM = [
  {
    label: 'Founding Council mingguan',
    desc: 'Maksimal 60 menit: apa yang berubah, apa yang terhambat, apa yang perlu keputusan Founder, dan tiga prioritas berikutnya.',
  },
  {
    label: 'Stand-up domain harian',
    desc: 'Asinkron bila bisa. Hambatan dieskalasi dengan menyebut pemiliknya, dampaknya, dan keputusan yang diminta.',
  },
  {
    label: 'Review operasional bulanan',
    desc: 'Sasaran, register risiko, kas, keandalan layanan, bukti pelanggan, dan status kepatuhan.',
  },
  {
    label: 'Protokol insiden',
    desc: 'Lindungi pengguna dulu, amankan bukti, tunjuk pemilik insiden, sampaikan fakta, lalu learning review.',
  },
]

export const SCALE_PHASES = [
  {
    phase: 'Fase 0–1',
    team: '±6–11 orang',
    model: 'Founder, Founding Core, Core Team (Karel Sinatra), Founding Contributor, dan jaringan penasihat.',
    trigger: 'Jumlah orang yang dikoordinasi tiap hari sudah melampaui kapasitas.',
  },
  {
    phase: 'Fase 2',
    team: '±15–25 orang',
    model: 'Engineering, Clinical, Growth, dan Corporate Operations masing-masing punya tim sendiri.',
    trigger: 'Satu product stream butuh pemilik sendiri yang bertanggung jawab penuh.',
  },
  {
    phase: 'Fase 3',
    team: '50+ orang',
    model: 'Struktur C-level formal, dengan urusan operasional didelegasikan.',
    trigger: 'Transisi PT, audit VC, atau investasi eksternal formal.',
  },
]

// Planned safe distributable profit, in Rp million (Financial Architecture §04).
export const SAFE_PROFIT_PLAN = [
  { year: 2027, millions: 230 },
  { year: 2028, millions: 1530 },
  { year: 2029, millions: 7250 },
]

export const YEARS = [2027, 2028, 2029, 2030]

// Rp billion per year, 2027-2030 (Financial Architecture §02, §03, §06).
export const PRODUCTS = [
  {
    id: 'assist',
    name: 'Asisten Medis dan MedBoard',
    pillar: 'Healthcare AI',
    model: 'SaaS fasilitas',
    role: 'Keunggulan jangka panjang. Penerapannya lebih lambat, tetapi daya tahannya di layanan klinis paling tinggi.',
    revenue: [0.18, 1.08, 4.5, 15.3],
    driver: 'Kemitraan puskesmas',
    gate: 'Validator independen tidak menemukan kegagalan keselamatan kritis.',
    ifFails: 'Hentikan penerapan klinis dan pemasaran; kembali ke validasi.',
  },
  {
    id: 'tutor',
    name: 'Tutor Smartboard',
    pillar: 'Academic Solutions',
    model: 'SaaS institusi',
    role: 'Penggerak pertumbuhan. Unit ini membuktikan bahwa sekolah dapat mengadopsinya dalam skala besar.',
    revenue: [0.36, 1.68, 5.28, 14.4],
    driver: 'Nilai kontrak tahunan Rp24 juta per sekolah',
    gate: 'Sekolah memperpanjang langganan berbayar sebagai bukti manfaatnya di kelas.',
    ifFails: 'Tunda percepatan akuisisi; fokus pada retensi dan hasil belajar.',
  },
  {
    id: 'payroll',
    name: 'Payroll Automation',
    pillar: 'Digital Finance',
    model: 'SaaS per karyawan per bulan',
    role: 'Pendapatan berulang yang stabil dari langganan bulanan.',
    revenue: [0.25, 1.13, 3.78, 9.45],
    driver: 'Rp15 ribu per karyawan per bulan',
    gate: 'Harga Rp15 ribu diterima tanpa kesalahan hitung.',
    ifFails: 'Persempit cakupan; perbaiki keandalan payroll sebelum menambah fitur.',
  },
  {
    id: 'ui',
    name: 'Sentra/ui',
    pillar: 'Design Partner',
    model: 'Proyek dan retainer',
    role: 'Penopang arus kas. Jarak dari proyek ke pendapatan paling pendek, dan setiap proyek memberi masukan langsung dari klien.',
    revenue: [0.74, 1.39, 2.21, 3.11],
    driver: 'Proyek selesai',
    gate: '≥30 draf proyek selesai; pendapatan campuran Rp18 juta.',
    ifFails: 'Batasi kerja kustom, ubah harga, tunda rekrutmen.',
  },
]

export const REPORTED_TOTAL_REVENUE = [1.53, 5.28, 15.77, 42.26]

export const EBITDA = [-2.2, -3.1, -2.4, 12.77]

export const FINANCE_CADENCE = [
  { label: 'Bulanan', desc: 'P&L per produk, runway kas, review pajak dan kepatuhan.' },
  { label: 'Kuartalan', desc: 'Review Board/Founder atas gate, harga, dan alokasi modal.' },
  { label: 'Tahunan', desc: 'Model dicocokkan ulang dengan laporan audit atau laporan manajemen, serta rencana operasional.' },
]

export const LEGAL_ENTITY = {
  name: 'Sentra Artificial Intelligence',
  form: 'Perseroan Perorangan, usaha mikro',
  decree: 'AHU-A119231.AH.01.30.Tahun 2026',
  decreeTitle: 'Keputusan Menteri Hukum tentang Pengesahan Pendirian Badan Hukum Perseroan Perorangan',
  ratified: '4 September 2026',
  domicile: 'Kota Kediri, Jawa Timur',
  capital: 'Rp10.000.000',
}

export const KBLI = [
  { code: '62194', label: 'Aktivitas pengembangan komponen dasar kecerdasan buatan' },
  { code: '62209', label: 'Aktivitas konsultansi komputer dan manajemen fasilitas komputer lainnya' },
  {
    code: '86910',
    label: 'Aktivitas jasa intermediasi untuk kesehatan medis, kedokteran gigi, dan pelayanan kesehatan manusia lainnya',
  },
  { code: '46791', label: 'Perdagangan besar alat kesehatan dan laboratorium untuk manusia' },
  { code: '63900', label: 'Aktivitas jasa portal pencarian web dan informasi lainnya' },
  { code: '62199', label: 'Aktivitas pemrograman komputer lainnya yang tidak diklasifikasikan di tempat lain' },
]

// Legal Transition Guide §04 and §06: each phase closes with its gate.
export const TRANSITION_STEPS = [
  { gate: 'G0', name: 'Mandate', phase: 'Mobilise', timing: 'Minggu 0–2', purpose: 'Tetapkan alasan, cakupan, dan sponsor.', decision: 'Launch / hold' },
  { gate: 'G1', name: 'Fact base', phase: 'Diagnose', timing: 'Minggu 1–5', purpose: 'Validasi kondisi saat ini.', decision: 'Proceed / remediate' },
  { gate: 'G2', name: 'Design', phase: 'Design', timing: 'Minggu 3–8', purpose: 'Pilih struktur dan jalur migrasi.', decision: 'Select / redesign' },
  { gate: 'G3', name: 'Readiness', phase: 'Prepare', timing: 'Minggu 6–14', purpose: 'Pastikan siap closing.', decision: 'Sign / defer' },
  { gate: 'G4', name: 'Cutover', phase: 'Execute', timing: 'Tanggal target ±2 minggu', purpose: 'Aktifkan entitas target dengan aman.', decision: 'Go / no-go' },
  { gate: 'G5', name: 'Stabilise', phase: 'Stabilise', timing: 'Hari 1–100', purpose: 'Selesaikan defect dan risiko yang tersisa.', decision: 'Close / extend' },
]

// Official documents offered for download. The PDFs are kept out of git (Chief 2026-10-07: the
// monorepo origin is public and the two AHU documents carry the founder's personal data); each
// server holds them in runtime/organisation-documents/ under `file`, served only to signed-in crew.
export interface OfficialDocument {
  id: string
  title: string
  summary: string
  meta: string
  file: string
  personalData: boolean
}

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  {
    id: 'charter',
    title: 'Organisational Charter 2026',
    summary: 'Struktur organisasi, peran tiap anggota inti, hak keputusan, panel independen, dan ritme kerja Sentra.',
    meta: 'ORG-2026-01 · Revisi 1.3 · 16 Agustus 2026',
    file: 'sentra-ai-organisational-charter-2026-rev1.3.pdf',
    personalData: false,
  },
  {
    id: 'financial-architecture',
    title: 'Financial Architecture 2027-2030',
    summary: 'Pendapatan per produk, EBITDA, rencana laba yang aman dibagikan, dan target 2027 untuk setiap unit usaha.',
    meta: 'FIN-2026-01 · Revisi 1.3 · 16 Agustus 2026',
    file: 'sentra-ai-financial-architecture-2027-2030-rev1.3.pdf',
    personalData: false,
  },
  {
    id: 'legal-transition-guide',
    title: 'Corporate Legal Transition Guide 2026',
    summary: 'Enam fase transisi badan hukum, masing-masing ditutup dengan gate keputusan.',
    meta: 'Revisi 1.3 · 16 Agustus 2026',
    file: 'sentra-ai-legal-transition-guide-2026-rev1.3.pdf',
    personalData: false,
  },
  {
    id: 'incorporation-decree',
    title: 'Ministry of Law Decree on Incorporation',
    summary: 'Keputusan Menteri Hukum yang mengesahkan Sentra Artificial Intelligence sebagai badan hukum Perseroan Perorangan.',
    meta: 'AHU-A119231.AH.01.30.Tahun 2026 · 4 September 2026',
    file: 'sentra-ai-incorporation-decree-2026-09-04.pdf',
    personalData: true,
  },
  {
    id: 'statement-of-incorporation',
    title: 'Statement of Incorporation',
    summary: 'Pernyataan pendiri berisi data perseroan, modal usaha, enam kegiatan usaha (KBLI), dan data pemilik usaha.',
    meta: '4 September 2026',
    file: 'sentra-ai-statement-of-incorporation-2026-09-04.pdf',
    personalData: true,
  },
]
