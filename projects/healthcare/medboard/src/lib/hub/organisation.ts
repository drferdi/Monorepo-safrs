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
      'Go-to-market dan pilot Academic dalam domainnya; bukan Founder atau Founding Core, tanpa saham legal otomatis dan tanpa veto atas keputusan Founder.',
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
    boundary: 'Penasihat; tanpa delegasi eksekutif.',
  },
  {
    name: 'Kevin Susanto, B.Eng., MTech IS',
    mandate: 'Review teknis independen atas kode, keamanan cloud, dan kepatuhan API.',
    boundary: 'Review dan rekomendasi.',
  },
  {
    name: 'dr. Dibya Arfianda, Sp.OG. / dr. Boyong Baskoro, Sp.OG.',
    mandate: 'Validasi klinis lulus/gagal secara independen sebelum rilis klinis.',
    boundary: 'Dapat memblokir rilis; tim pengembang tidak dapat membatalkan kegagalan keselamatan klinis.',
  },
]

export const FOUNDING_COMPACT = [
  { label: 'Human first', desc: 'Integritas, akuntabilitas, dan kepedulian tidak bisa ditawar.' },
  {
    label: 'AI augments everyone',
    desc: 'Satu lapisan kecerdasan yang diatur mendukung setiap fungsi dalam batas akses yang disetujui.',
  },
  {
    label: 'Human authority',
    desc: 'Penilaian akhir, akuntabilitas, dan eskalasi tetap pada pemimpin manusia yang disebut namanya.',
  },
  {
    label: 'Modular resources',
    desc: 'Tim inti memegang kapabilitas bersama dan memakai spesialis eksternal untuk keahlian terbatas.',
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
    desc: 'Asinkron bila memungkinkan; hambatan dieskalasi dengan pemilik, dampak, dan keputusan yang diminta.',
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
    model: 'Founder, Founding Core, Karel Sinatra Core Team, Founding Contributor, dan jaringan penasihat.',
    trigger: 'Rentang kendali harian melebihi kapasitas koordinasi.',
  },
  {
    phase: 'Fase 2',
    team: '±15–25 orang',
    model: 'Tim Engineering, Clinical, Growth, dan Corporate Operations tersendiri.',
    trigger: 'Satu product stream butuh pemilik akuntabel tersendiri.',
  },
  {
    phase: 'Fase 3',
    team: '50+ orang',
    model: 'Struktur C-level formal dan birokrasi operasional yang didelegasikan.',
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
    id: 'ui',
    name: 'Sentra/ui',
    pillar: 'Design Partner',
    model: 'Proyek dan retainer',
    role: 'Mesin arus kas: monetisasi tercepat dan pembelajaran klien.',
    revenue: [0.74, 1.39, 2.21, 3.11],
    driver: 'Proyek selesai',
    gate: '≥30 draf proyek selesai; pendapatan campuran Rp18 juta.',
    ifFails: 'Batasi kerja kustom, ubah harga, tunda rekrutmen.',
  },
  {
    id: 'tutor',
    name: 'Tutor Smartboard',
    pillar: 'Academic Solutions',
    model: 'SaaS institusi',
    role: 'Mesin pertumbuhan: membuktikan adopsi sekolah berskala.',
    revenue: [0.36, 1.68, 5.28, 14.4],
    driver: 'Nilai kontrak tahunan Rp24 juta per sekolah',
    gate: 'Perpanjangan berbayar membuktikan nilai di kelas.',
    ifFails: 'Tunda percepatan akuisisi; fokus pada retensi dan hasil belajar.',
  },
  {
    id: 'assist',
    name: 'Sentra Assist',
    pillar: 'Healthcare AI',
    model: 'SaaS fasilitas',
    role: 'Mesin keunggulan jangka panjang: penerapan lebih lambat, daya tahan klinis tertinggi.',
    revenue: [0.18, 1.08, 4.5, 15.3],
    driver: 'Kemitraan puskesmas',
    gate: 'Validator independen tidak menemukan kegagalan keselamatan kritis.',
    ifFails: 'Hentikan penerapan klinis dan pemasaran; kembali ke validasi.',
  },
  {
    id: 'payroll',
    name: 'Payroll Automation',
    pillar: 'Digital Finance',
    model: 'SaaS per karyawan per bulan',
    role: 'Mesin pendapatan berulang: pendapatan bulanan yang awet.',
    revenue: [0.25, 1.13, 3.78, 9.45],
    driver: 'Rp15 ribu per karyawan per bulan',
    gate: 'Harga Rp15 ribu diterima tanpa kesalahan hitung.',
    ifFails: 'Persempit cakupan; perbaiki keandalan payroll sebelum menambah fitur.',
  },
]

export const REPORTED_TOTAL_REVENUE = [1.53, 5.28, 15.77, 42.26]

export const EBITDA = [-2.2, -3.1, -2.4, 12.77]

export const FINANCE_CADENCE = [
  { label: 'Bulanan', desc: 'P&L per produk, runway kas, review pajak dan kepatuhan.' },
  { label: 'Kuartalan', desc: 'Review Board/Founder atas gate, harga, dan alokasi modal.' },
  { label: 'Tahunan', desc: 'Model disesuaikan ulang dengan laporan audit atau manajemen dan rencana operasional.' },
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
  { gate: 'G5', name: 'Stabilise', phase: 'Stabilise', timing: 'Hari 1–100', purpose: 'Tutup defect dan risiko residual.', decision: 'Close / extend' },
]

export const SOURCE_DOCUMENTS = [
  { code: 'ORG-2026-01', title: 'Operating Charter — Organisation by Design', revision: 'Revisi 1.3 · 16 Agustus 2026' },
  { code: 'FIN-2026-01', title: 'Financial Architecture 2027–2030', revision: 'Revisi 1.3 · 16 Agustus 2026' },
  { code: 'Panduan', title: 'Transisi Legal Korporasi', revision: 'Revisi 1.3 · 16 Agustus 2026' },
  { code: 'AHU', title: 'Keputusan Menteri Hukum, pengesahan pendirian', revision: '4 September 2026' },
  { code: 'Pendirian', title: 'Surat Pernyataan Pendirian Perseroan Perorangan', revision: '4 September 2026' },
]
