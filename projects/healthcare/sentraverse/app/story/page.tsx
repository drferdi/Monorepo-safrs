// Architected and built by Drferdi.
'use client'

import { motion, useInView } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  Baby,
  BedDouble,
  Bell,
  Bot,
  Brain,
  BrainCog,
  ClipboardCheck,
  FileSearch,
  HeartPulse,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Mic,
  PenLine,
  Plug,
  Scissors,
  ShieldCheck,
  Siren,
  Stethoscope,
  TrendingUp,
  Video,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type React from 'react'
import { useRef } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { CountUp } from '@/components/ui/count-up'

/* ─── Scroll Reveal ─────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Data ──────────────────────────────────────────────────── */
const TEAM = [
  {
    name: 'Dr. Ferdi Iskandar, S.H., M.Kn., CMDC, CLM',
    role: 'Founder, CEO & Clinical Steward',
    desc: 'Dokter berlisensi dengan 15+ tahun pengalaman klinis. CEO rumah sakit swasta selama 10+ tahun. Multidisiplin ilmu Kedokteran dan Hukum Perdata — Analisis 70+ kasus hukum pada tenaga medis. Artificial Intelligence Enthusiast. Membangun Sentra sejak Maret 2025.',
    stats: [
      { label: 'Pengalaman Klinis', value: '15+ Tahun' },
      { label: 'CEO Rumah Sakit', value: '10+ Tahun' },
      { label: 'Kasus Hukum Medis', value: '70+' },
      { label: 'Jurnal Internasional', value: '130+' },
    ],
  },
  {
    name: 'dr. Dibya Arfianda, Sp.OG',
    role: 'Clinical Advisor, Maternal & Fetal Medicine',
    subtitle: 'Dokter Spesialis Obstetri dan Ginekologi',
    country: 'Indonesia',
    desc: 'Spesialis Obstetri-Ginekologi yang memvalidasi logika klinis Sentra di domain maternal-fetal. Kontributor utama pengembangan modul POGS untuk penurunan angka kematian ibu.',
  },
  {
    name: 'dr. Boyong Baskoro, Sp.OG',
    role: 'Clinical Advisor, Obstetrics & Gynecology',
    subtitle: 'Dokter Spesialis Obstetri dan Ginekologi',
    country: 'Indonesia',
    desc: 'Spesialis Obstetri-Ginekologi yang memperkuat rigor klinis Sentra di berbagai fasilitas. Fokus pada standar pelayanan maternal healthcare di tingkat nasional.',
  },
  {
    name: 'Nathanael Kevin Susanto, BIT, M.Tech',
    role: 'Software Engineer, Visa Worldwide',
    subtitle: 'Software Engineer, Visa Worldwide',
    country: 'Singapore',
    desc: 'Memastikan kualitas dari Sentra Healthcare memiliki tingkat reliabilitas yang tinggi. Menjembatani standar enterprise dengan kebutuhan healthcare.',
  },
]

const ADMIN_TEAM = [
  {
    name: 'Joseph Arianto, S.Gz.',
    role: 'Clinical and Patient Liaison Audit',
    task: 'Menjembatani komunikasi antara tim klinis dan pasien, memastikan standar pelayanan terjaga melalui audit berkala.',
  },
  {
    name: 'Oriza Rahmawati A.Md.Keb',
    role: 'Clinical and Patient Liaison Audit',
    task: 'Audit interaksi klinis-pasien dengan latar belakang kebidanan, memastikan kepatuhan protokol pelayanan maternal.',
  },
  {
    name: 'Nurmayatul Handayani A.Md.RMIK',
    role: 'Office Administrator',
    task: 'Mengelola administrasi kantor, rekam medis, dan informasi kesehatan sesuai standar RMIK nasional.',
  },
  {
    name: 'dr. Armando Hadyono Joko Sasmito, M.Kes',
    role: 'Operations',
    task: 'Mengawasi operasional harian dan memastikan kelancaran alur kerja klinis di seluruh unit layanan.',
  },
  {
    name: 'dr. Auliya Pratama Afandi',
    role: 'Head of Quality Assurance & Control',
    task: 'Memimpin penjaminan mutu layanan, audit kualitas klinis, dan penerapan standar akreditasi.',
  },
  {
    name: 'Apt. Umul Farida M.Farm',
    role: 'Head of Pharmacotherapy Audit',
    task: 'Memimpin audit farmakoterapi, memastikan keamanan peresepan dan kepatuhan terhadap formularium nasional.',
  },
  {
    name: 'Michael Subrata',
    role: 'Infrastructure Officer',
    task: 'Mengelola infrastruktur teknologi dan memastikan ketersediaan serta keandalan sistem operasional Sentra.',
  },
]

const TEST_PILOT = [
  {
    name: 'dr. Radea Renozadra',
    role: 'Test Pilot',
    task: 'Menguji dan memvalidasi fitur klinis Sentra dalam alur kerja pelayanan pasien secara langsung.',
  },
  {
    name: 'dr. Novia Dwi Anggraini',
    role: 'Test Pilot',
    task: 'Menguji modul diagnostik dan memberikan umpan balik klinis untuk penyempurnaan sistem.',
  },
]

const PILOT_SITES = [
  {
    name: 'RSIA Melinda DHAI',
    type: 'Mother & Child Hospital',
    status: 'Pilot Validation',
    desc: 'Laboratorium klinis utama Sentra. Rumah Sakit Ibu dan Anak untuk validasi klinis dan pilot deployment. Partner utama pengembangan dan pengujian modul maternal healthcare.',
    stats: [],
    services: ['Maternal Healthcare', 'Clinical Validation'],
    website: 'https://melinda.co.id/',
    websiteLabel: 'Website RSIA Melinda Dr. H. Achmad Iskandar',
  },
  {
    name: 'Puskesmas Balowerti Kota Kediri',
    type: 'Primary Care Facility',
    status: 'Active Deployment',
    desc: 'Sumber 45,030 data kasus pasien nyata yang menjadi fondasi mesin AADI V4.3. Deployment aktif AADI & Sentra Assist.',
    stats: [
      { label: 'Data Kasus', value: '45,030' },
      { label: 'Penyakit', value: '159' },
      { label: 'Entri ICD-10', value: '1,930' },
    ],
    services: ['KIA', 'USG', 'IGD', 'PONED', 'VCT HIV', 'JIWA'],
    website: 'https://puskesmasbalowerti.com/',
    websiteLabel: 'Website Puskesmas Balowerti Kota Kediri',
  },
]

const PRODUCTS = [
  {
    name: 'AADI',
    domain: 'Autonomous Artificial Diagnostic Intelligence',
    status: 'Sedang Diuji',
    icon: Stethoscope,
    desc: 'Mesin inferensi diagnostik otonom yang mengoperasikan arsitektur multi-layer reasoning di atas korpus 45,030 rekam medis tervalidasi. Mengintegrasikan Iskandar Engine V4.3 dengan 159 entitas penyakit, 1,930 pemetaan ICD-10, 8-rule safety gate system, dan deteksi interaksi obat dengan akurasi 95%. Setiap keluaran diagnostik melewati pipeline validasi bertingkat sebelum mencapai layar dokter.',
  },
  {
    name: 'Audrey',
    domain: 'Voice-First Clinical Intelligence',
    status: 'Sedang Diuji',
    icon: Mic,
    desc: 'Asisten klinis berbasis native audio yang dirancang untuk beroperasi secara real-time selama konsultasi pasien dengan pipeline lokal-first. Audrey memproses streaming suara pada codec 24kHz, melakukan grounding terhadap sumber medis internal, dan menghasilkan insight diagnostik yang dikalibrasi untuk sumber daya fasilitas kesehatan primer. Voice stack dipisahkan dari reasoning stack agar cutover provider bisa dilakukan tanpa mengganggu alur klinis.',
  },
  {
    name: 'Intelligence Dashboard',
    domain: 'Unified Clinical Operations Platform',
    status: 'Sedang Diuji',
    icon: LayoutDashboard,
    desc: 'Platform komando terpadu yang mengorkestrasi seluruh ekosistem Sentra dalam satu antarmuka. Mengintegrasikan EMR auto-fill via Playwright RPA engine, ICD-X multi-version unification (2010/2016/2019), LB1 national report automation, medical calculator suite (SenCall), telemedicine WebRTC, ACARS real-time communication, dan admin console dengan KPI monitoring — seluruhnya terhubung melalui Socket.IO bidirectional bridge.',
  },
  {
    name: 'Sentra Assist',
    domain: 'Clinical Workflow Automation',
    status: 'Sedang Diuji',
    icon: Plug,
    desc: 'Chrome Extension (Manifest V3) yang bertindak sebagai jembatan otomasi antara Intelligence Dashboard dan sistem EMR nasional. Mengeksekusi transfer data klinis terstruktur — anamnesis, diagnosis, resep — melalui RPA orchestrator.',
  },
  {
    name: 'Telemedicine',
    domain: 'Remote Clinical Consultation',
    status: 'Sedang Diuji',
    icon: Video,
    desc: 'Infrastruktur konsultasi jarak jauh berbasis WebRTC peer-to-peer dengan adaptive bitrate streaming pada resolusi HD 720p. Dilengkapi virtual waiting room, e-prescription modal, transfer file hasil laboratorium, dan auto-generasi SOAP note pasca-sesi — seluruhnya terenkripsi dan terintegrasi dengan sistem penjadwalan appointment.',
  },
  {
    name: 'Med-Cognitive',
    domain: 'Neural Memory Architecture for Clinical AI',
    status: 'Sudah Dibangun',
    icon: Brain,
    desc: 'Arsitektur jaringan syaraf digital yang berfungsi sebagai persistent cognitive layer bagi seluruh agen AI Sentra. Med-Cognitive mengimplementasikan mekanisme long-term memory retrieval berbasis semantic embedding — memungkinkan setiap agen mengakses, mengonsolidasi, dan memanggil kembali keputusan klinis, preferensi terapeutik, dan konteks historis pasien lintas sesi tanpa degradasi informasi. Sistem ini meniru prinsip konsolidasi memori pada korteks prefrontal manusia: encoding, storage, dan retrieval — ditranslasikan ke dalam infrastruktur komputasional yang persisten dan queryable.',
  },
  {
    name: 'ReferraLink',
    domain: 'Awareness-Intelligence Protocol',
    status: 'Sedang Diuji',
    icon: Link2,
    desc: 'Neural reasoning engine yang secara real-time memproses dan menganalisis fluktuasi regulasi BPJS dan polis asuransi swasta. Mengoperasikan decoupled awareness algorithm untuk dynamic claim optimization — melakukan cross-referencing antara regulasi terbaru dengan diagnosis rujukan pasien secara instan. Verifier Insights menyuntikkan rekomendasi berbasis probabilitas keberhasilan klaim tertinggi kepada tim verifikator, secara radikal meminimalisir anomali dan penolakan klaim.',
  },
  {
    name: 'MELLY',
    domain: 'Hyper-Personalized Augmented Virtual Agent',
    status: 'Sedang Dibangun',
    icon: Bot,
    desc: 'Medical Enhanced Liaison for You — bukan sekadar chatbot, melainkan agen virtual yang ditugaskan secara eksklusif untuk setiap pasien. Dibangun di atas orkestrasi agen lokal-first dengan fokus pada keselamatan klinis dan data sovereignty. Mendampingi pasien secara proaktif dari fase prakonsepsi, kehamilan, persalinan, hingga pediatrik (usia 18 tahun), serta menyusun sintesis laporan medis berkala yang diinjeksikan langsung ke dalam Rekam Medis Elektronik pasien.',
  },
  {
    name: 'Melinda Dashboard',
    domain: 'Zero-Friction Interoperability Platform',
    status: 'Sedang Dibangun',
    icon: LayoutGrid,
    desc: 'Unified single-page application yang membongkar silo data antar-departemen, menciptakan interoperabilitas absolut di seluruh ekosistem RSIA Melinda. Antarmuka adaptif dengan hyper-customization yang menyesuaikan profil pengguna — perhitungan jasa medis, insentif, dan metrik performa terintegrasi real-time dengan backend RME. Dilengkapi Lifestyle API Integration sebagai asisten eksekutif staf melalui command line atau instruksi suara.',
  },
  {
    name: 'Melinda Shield',
    domain: 'Cognitive Cybersecurity Infrastructure',
    status: 'Sedang Dibangun',
    icon: ShieldCheck,
    desc: 'Arsitektur keamanan siber prediktif dan otonom dengan perlindungan data tingkat militer melalui lima layer pertahanan: (I) VaultAES-256 GCM + Blockchain Ledger dengan AI Behavioral Heuristics RNN/CNN dan Bio-Gatekeeper IoT via RTLS triangulasi, (II) EHR Shield dengan Dynamic Geofenced Encryption dan Temporal Access Decay berbasis jadwal shift, (III) Sub-Second Containment dengan micro-segmentation < 1 detik dan autonomous telemetry ke regulator, (IV) The Tracer untuk resolusi identitas ancaman internal/eksternal via Global Threat Intelligence, (V) Autonomous Resource Reallocation dengan Spatio-Biometric Sync dan God-Eye view real-time compliance dashboard.',
  },
  {
    name: 'Autonomous Admission',
    domain: 'Admission & Journey Tracking',
    status: 'Sedang Dibangun',
    icon: ClipboardCheck,
    desc: 'Sistem eliminasi antrean fisik pasien obstetri melalui Vision AI extraction dari dokumen rujukan digital, validasi otomatis jadwal spesialis pada SIMRS, dan bridging ke peladen asuransi kesehatan nasional di background. Berfungsi sebagai navigator kesehatan digital — pengingat jadwal USG, kepatuhan suplemen esensial, dan rekomendasi klinis berkala sepanjang siklus kehamilan.',
  },
  {
    name: 'Smart Triage',
    domain: 'Pediatric & Maternal Algorithmic Assessment',
    status: 'Sedang Dibangun',
    icon: Activity,
    desc: 'Asesmen awal terstruktur via komunikasi asinkron sebelum konsultasi tatap muka. Mengumpulkan parameter krusial pediatrik (suhu, riwayat kejang) dan obstetri (usia kehamilan, frekuensi kontraksi, indikasi perdarahan) menggunakan diksi yang menjaga ketenangan psikologis. Output dikompilasi menjadi draf SOAP untuk dokter — dan apabila algoritma mendeteksi anomali gawat darurat (ketuban pecah dini), sistem secara otonom memicu protokol eskalasi PONEK/IGD.',
  },
  {
    name: 'Proactive Care Navigator',
    domain: 'Post-Partum & Preventive Monitoring',
    status: 'Sedang Dibangun',
    icon: HeartPulse,
    desc: 'Kontinuitas layanan proaktif pasca-discharge. Menganalisis basis data RME untuk menjadwalkan intervensi preventif — notifikasi otomatis imunisasi dasar anak, pemantauan jarak jauh pemulihan luka bedah dan laktasi pada masa nifas, serta instrumen skrining awal deteksi depresi pascasalin. Memposisikan institusi sebagai penyedia continuum of care.',
  },
  {
    name: 'Ambient Scribe',
    domain: 'Clinical Voice-to-EMR Engine',
    status: 'Sedang Dibangun',
    icon: PenLine,
    desc: 'Perekaman klinis ambien berbasis natural language processing yang mengidentifikasi dan memisahkan dialog klinis dari percakapan latar. Mentranskripsi parameter vital — taksiran berat janin, lingkar kepala, frekuensi DJJ — dan memetakannya secara presisi ke kolom Rekam Medis Elektronik, membebaskan tenaga medis dari beban dokumentasi manual.',
  },
  {
    name: 'Critical Alert System',
    domain: 'Proactive NICU & Telemetry Intelligence',
    status: 'Sedang Dibangun',
    icon: Bell,
    desc: 'Integrasi langsung dengan Sistem Informasi Laboratorium dan perangkat telemetri untuk unit perawatan intensif. Mendeteksi deviasi signifikan pada parameter fisiologis — perburukan gas darah, indikasi gawat janin pada CTG — dan mentransmisikan peringatan kritis langsung ke perangkat seluler atau wearables dokter penanggung jawab, melewati alur pelaporan hierarkis manual.',
  },
  {
    name: 'Predictive Bed Management',
    domain: 'Autonomous Turnaround Orchestration',
    status: 'Sedang Dibangun',
    icon: BedDouble,
    desc: 'Sistem observasi real-time perubahan status klinis pasien pada RME. Saat otorisasi pemulangan diberikan, sistem memprakarsai rantai komando otonom tiga departemen simultan: finalisasi tagihan keuangan, disposisi obat pulang pada farmasi, dan work order desinfeksi pada housekeeping dengan SLA terukur — mengeliminasi bottleneck antar-departemen dan meningkatkan Bed Occupancy Rate.',
  },
  {
    name: 'AI Coding Auditor',
    domain: 'Clinical Coding & Claim Defense',
    status: 'Sedang Dibangun',
    icon: FileSearch,
    desc: 'Auditor internal yang memindai korespondensi antara kode ICD-10, ICD-9 CM, dengan bukti dokumentasi medis historis (laporan operasi, partograf). Mendeteksi diskrepansi dan ketidaklengkapan dokumen sebelum berkas diajukan — memitigasi risiko kerugian finansial akibat sengketa klaim asuransi kesehatan nasional maupun swasta.',
  },
  {
    name: 'OR Orchestrator',
    domain: 'Smart Operating Room Logistics',
    status: 'Sedang Dibangun',
    icon: Scissors,
    desc: 'Sinkronisasi logistik presisi untuk fasilitas bedah. Pada kedaruratan Seksio Sesarea Cito, sistem secara algoritmik merevisi jadwal operasi elektif, mengoordinasikan kehadiran tim bedah on-call, dan memverifikasi ketersediaan kantong darah spesifik pada unit transfusi — mengoptimalkan utilisasi ruang operasi dan menjamin kesiapan sumber daya kasus high-risk.',
  },
]

const MODULES = [
  {
    name: 'POGS',
    desc: 'Pregnancy Observation Global System — sistem observasi kehamilan menyeluruh yang memantau kondisi maternal-fetal dari trimester awal hingga persalinan, mendeteksi risiko secara real-time dan memicu eskalasi otomatis.',
    tags: ['Obstetri', 'Partograf', 'Akan Dibangun'],
    icon: Baby,
  },
  {
    name: 'CDOS',
    desc: 'Clinical Decision Orchestration System — mesin orkestrasi keputusan klinis multi-layer yang mengintegrasikan guideline nasional dan internasional ke dalam alur kerja diagnostik terstruktur.',
    tags: ['Decision Support', 'Clinical Pathway', 'Akan Dibangun'],
    icon: BrainCog,
  },
  {
    name: 'TRIAGE',
    desc: 'Sistem triase algoritmik berbasis skor keparahan yang mengklasifikasi prioritas pasien secara otomatis berdasarkan parameter vital dan keluhan utama di unit gawat darurat.',
    tags: ['Emergency', 'Scoring', 'Akan Dibangun'],
    icon: Siren,
  },
  {
    name: 'PREDICTION',
    desc: 'Predictive analytics engine yang memanfaatkan machine learning untuk memodelkan trajektori klinis pasien — memprediksi risiko deteriorasi, readmisi, dan komplikasi sebelum terjadi.',
    tags: ['Machine Learning', 'Prognostik', 'Akan Dibangun'],
    icon: TrendingUp,
  },
]

const VALUES = [
  {
    name: 'Nakes Pertama',
    desc: 'Setiap fitur berakar dari kebutuhan nyata tenaga kesehatan. Kami mendengarkan sebelum membangun.',
  },
  {
    name: 'Keamanan Tanpa Kompromi',
    desc: 'Enkripsi AES-256, audit log, dan arsitektur zero-trust — standar minimum untuk setiap data pasien.',
  },
  {
    name: 'Kepatuhan Regulasi',
    desc: 'Dibangun mengikuti regulasi Kemenkes RI dan standar BPJS. Siap bermitra dengan ekosistem nasional.',
  },
  {
    name: 'Kualitas Kode',
    desc: 'TypeScript strict, validasi Zod, parameterized query — standar produksi sejak hari pertama.',
  },
  {
    name: 'Inklusivitas Digital',
    desc: 'Sistem berfungsi di jaringan terbatas dan perangkat sederhana. Infrastruktur bukan alasan seseorang tidak terlayani.',
  },
  {
    name: 'Iterasi Berkelanjutan',
    desc: 'Setiap versi didorong umpan balik nyata dari lapangan. Pengembangan tidak berhenti pada peluncuran.',
  },
]

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function StoryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': 'https://sentrahai.com/#founder',
    name: 'Dr. Ferdi Iskandar',
    jobTitle: 'Founder, CEO & Clinical Steward',
    description:
      'Dokter berlisensi dengan 15+ tahun pengalaman klinis. CEO rumah sakit swasta selama 10+ tahun.',
    sameAs: ['https://linkedin.com/company/sentra-ai'],
    worksFor: {
      '@type': 'Organization',
      name: 'Sentra Healthcare Solutions',
    },
  }

  return (
    <main className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── NAV (global — konsisten tinggi & isi lintas halaman) ── */}
      <Navbar />

      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="pt-[60px] py-32 flex items-center relative overflow-hidden border-b border-muted/20">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute w-[480px] h-[480px] rounded-full -top-[120px] -right-[80px]"
            style={{ background: 'rgba(235,89,57,0.08)', filter: 'blur(120px)' }}
            animate={{ y: [0, -20, 10, 0], x: [0, 10, -10, 0] }}
            transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto w-full px-6 md:px-12 pt-32 pb-24">
          <div className="grid lg:grid-cols-[1fr_480px] gap-12 items-center">
            <div>
              <motion.p
                className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                Sentra Healthcare AI — Our Story
              </motion.p>

              <motion.h1
                className="font-jakarta font-bold text-foreground leading-[1.2] tracking-tight max-w-[900px] mb-8 text-[32px] md:text-[56px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                Teknologi yang Bekerja untuk <span className="text-accent italic">Nakes,</span>{' '}
                Bukan Sebaliknya.
              </motion.h1>

              <motion.p
                className="text-lg text-muted leading-relaxed max-w-[650px] mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                Sentra Healthcare AI adalah platform kecerdasan buatan yang dirancang khusus untuk
                memperkuat layanan kesehatan primer di Indonesia — dimulai dari Puskesmas. Lahir
                dari 45,030 data kasus pasien nyata, bukan asumsi.
              </motion.p>

              <motion.div
                className="flex items-center gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href="#tim" className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full border border-muted flex items-center justify-center text-muted group-hover:border-accent group-hover:text-accent transition-all">
                    <ArrowUpRight size={20} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-muted group-hover:text-accent transition-all">
                    Kenali Tim Kami
                  </span>
                </Link>
              </motion.div>
            </div>

            {/* ─── Langflow-style Agent Orchestration ─── */}
            <motion.div
              className="hidden lg:block relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative w-[500px] h-[440px]">
                {/* Canvas dot grid */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(183,171,152,0.1) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                {/* Bezier connection wires */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 500 440"
                  fill="none"
                >
                  {/* Patient Input → AADI (right handle → left handle) */}
                  <path
                    d="M135 60 C180 60, 170 100, 210 100"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* AADI Response → Audrey (right → left) */}
                  <path
                    d="M400 130 C440 130, 440 210, 400 210"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* AADI Tools → Dashboard (bottom → top) */}
                  <path
                    d="M305 165 C305 200, 180 200, 180 240"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* Audrey Response → Output (right → left) */}
                  <path
                    d="M400 260 C450 260, 440 360, 390 360"
                    stroke="rgba(196,149,106,0.25)"
                    strokeWidth="2"
                    fill="none"
                  />
                  {/* Dashboard → Output (right → left) */}
                  <path
                    d="M270 280 C320 280, 290 360, 320 360"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="2"
                    fill="none"
                  />

                  {/* Animated pulse on main wire */}
                  <circle r="4" fill="#eb5939" opacity="0">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path="M135 60 C180 60, 170 100, 210 100"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="3.5" fill="#C4956A" opacity="0">
                    <animateMotion
                      dur="2.5s"
                      repeatCount="indefinite"
                      path="M400 130 C440 130, 440 210, 400 210"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.8;0.8;0"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="3" fill="#b8ac99" opacity="0">
                    <animateMotion
                      dur="3s"
                      repeatCount="indefinite"
                      path="M305 165 C305 200, 180 200, 180 240"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.7;0.7;0"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>

                {/* ══ Node: Patient Input (top-left) ══ */}
                <div className="absolute" style={{ left: 0, top: 20, width: 140 }}>
                  <div
                    className="rounded-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(235,89,57,0.06) 0%, transparent 50%), #18171a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5), 6px -6px 24px rgba(235,89,57,0.06)',
                    }}
                  >
                    <div
                      className="px-3 py-2.5 flex items-center gap-2"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span
                        style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                      >
                        Patient Input
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      <div
                        className="rounded px-2 py-1.5"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.04)',
                        }}
                      >
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                          Anamnesis stream...
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Output handle right */}
                  <div
                    className="absolute top-1/2 -right-[6px] -translate-y-1/2 w-[12px] h-[12px] rounded-full"
                    style={{
                      background: '#eb5939',
                      boxShadow: '0 0 8px rgba(235,89,57,0.5)',
                      border: '2px solid #18171a',
                    }}
                  />
                </div>

                {/* ══ Node: AADI Agent (center) ══ */}
                <div className="absolute" style={{ left: 200, top: 55, width: 210 }}>
                  <div
                    className="rounded-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(235,89,57,0.1) 0%, rgba(235,89,57,0.02) 40%, transparent 60%), #18171a',
                      border: '1px solid rgba(235,89,57,0.2)',
                      boxShadow:
                        '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(235,89,57,0.04), 8px -8px 30px rgba(235,89,57,0.08)',
                    }}
                  >
                    {/* Header */}
                    <div
                      className="px-4 py-2.5 flex items-center gap-2.5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: 'rgba(235,89,57,0.15)' }}
                      >
                        <Stethoscope size={11} style={{ color: '#eb5939' }} />
                      </div>
                      <span
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
                      >
                        AADI Agent
                      </span>
                    </div>
                    {/* Fields */}
                    <div className="px-4 py-2 flex flex-col gap-2">
                      {/* Prompt field */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{
                              background: '#eb5939',
                              border: '1.5px solid #18171a',
                              boxShadow: '0 0 4px rgba(235,89,57,0.4)',
                            }}
                          />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                            Prompt
                          </span>
                        </div>
                        <div
                          className="rounded px-2 py-1.5"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow:
                              'inset 2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 3px rgba(255,255,255,0.04)',
                          }}
                        >
                          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                            Diagnose from anamnesis...
                          </span>
                        </div>
                      </div>
                      {/* Model field */}
                      <div
                        className="flex items-center justify-between rounded px-2 py-1"
                        style={{
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{ background: '#b8ac99' }}
                          />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                            Engine
                          </span>
                        </div>
                        <span
                          style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
                        >
                          Iskandar V4.3
                        </span>
                      </div>
                      {/* Tools field */}
                      <div
                        className="flex items-center justify-between rounded px-2 py-1"
                        style={{
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{ background: '#b8ac99' }}
                          />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Tools</span>
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                          3 active
                        </span>
                      </div>
                      {/* Response output */}
                      <div
                        className="flex items-center justify-end gap-1.5 pt-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                          Response
                        </span>
                        <div
                          className="w-[10px] h-[10px] rounded-full"
                          style={{
                            background: '#eb5939',
                            boxShadow: '0 0 6px rgba(235,89,57,0.5)',
                            border: '2px solid #18171a',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Input handle left */}
                  <div className="absolute -left-[6px]" style={{ top: 42 }}>
                    <div
                      className="w-[12px] h-[12px] rounded-full"
                      style={{
                        background: '#eb5939',
                        boxShadow: '0 0 8px rgba(235,89,57,0.4)',
                        border: '2px solid #18171a',
                      }}
                    />
                  </div>
                </div>

                {/* ══ Node: Audrey (right) ══ */}
                <div className="absolute" style={{ left: 300, top: 190, width: 190 }}>
                  <div
                    className="rounded-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(235,89,57,0.06) 0%, transparent 45%), #18171a',
                      border: '1px solid rgba(196,149,106,0.2)',
                      boxShadow:
                        '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(196,149,106,0.03), 6px -6px 24px rgba(235,89,57,0.06)',
                    }}
                  >
                    <div
                      className="px-4 py-2.5 flex items-center gap-2.5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: 'rgba(196,149,106,0.15)' }}
                      >
                        <Mic size={11} style={{ color: '#C4956A' }} />
                      </div>
                      <span
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
                      >
                        Audrey
                      </span>
                    </div>
                    <div className="px-4 py-2 flex flex-col gap-2">
                      <div
                        className="flex items-center justify-between rounded px-2 py-1"
                        style={{
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{ background: '#C4956A' }}
                          />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Model</span>
                        </div>
                        <span
                          style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
                        >
                          Voice Runtime
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between rounded px-2 py-1"
                        style={{
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-[6px] h-[6px] rounded-full"
                            style={{ background: '#C4956A' }}
                          />
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Role</span>
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                          Voice Agent
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-end gap-1.5 pt-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                          Response
                        </span>
                        <div
                          className="w-[10px] h-[10px] rounded-full"
                          style={{
                            background: '#C4956A',
                            boxShadow: '0 0 6px rgba(196,149,106,0.5)',
                            border: '2px solid #18171a',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Input handle left */}
                  <div
                    className="absolute -left-[6px] top-[20px] w-[12px] h-[12px] rounded-full"
                    style={{
                      background: '#C4956A',
                      boxShadow: '0 0 6px rgba(196,149,106,0.4)',
                      border: '2px solid #18171a',
                    }}
                  />
                </div>

                {/* ══ Node: Dashboard (bottom-left) ══ */}
                <div className="absolute" style={{ left: 60, top: 235, width: 180 }}>
                  <div
                    className="rounded-lg"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(235,89,57,0.05) 0%, transparent 50%), #18171a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4), 6px -6px 20px rgba(235,89,57,0.05)',
                    }}
                  >
                    <div
                      className="px-3 py-2 flex items-center gap-2"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center"
                        style={{ background: 'rgba(183,171,152,0.1)' }}
                      >
                        <LayoutDashboard size={9} style={{ color: '#b8ac99' }} />
                      </div>
                      <span
                        style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}
                      >
                        Dashboard
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      <div
                        className="rounded px-2 py-1"
                        style={{
                          boxShadow:
                            'inset 2px 2px 4px rgba(0,0,0,0.35), inset -1px -1px 3px rgba(255,255,255,0.03)',
                        }}
                      >
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
                          EMR · ICD-X · LB1 · SenCall
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Input handle top */}
                  <div
                    className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] rounded-full"
                    style={{ background: 'rgba(183,171,152,0.5)', border: '2px solid #18171a' }}
                  />
                  {/* Output handle right */}
                  <div
                    className="absolute top-1/2 -right-[6px] -translate-y-1/2 w-[10px] h-[10px] rounded-full"
                    style={{ background: 'rgba(183,171,152,0.4)', border: '2px solid #18171a' }}
                  />
                </div>

                {/* ══ Response bubble (bottom-right) ══ */}
                <div className="absolute" style={{ left: 260, top: 340, width: 220 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(235,89,57,0.15)' }}
                    >
                      <Stethoscope size={8} style={{ color: '#eb5939' }} />
                    </div>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                      Responding...
                    </span>
                    <div className="flex gap-0.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: '#eb5939',
                          animation: 'sdxPulse 1.4s ease-in-out infinite',
                        }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: '#eb5939',
                          opacity: 0.5,
                          animation: 'sdxPulse 1.4s ease-in-out 0.2s infinite',
                        }}
                      />
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: '#eb5939',
                          opacity: 0.3,
                          animation: 'sdxPulse 1.4s ease-in-out 0.4s infinite',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(235,89,57,0.05) 0%, transparent 50%), #1e1d1a',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3), 6px -6px 20px rgba(235,89,57,0.05)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.6,
                        display: 'block',
                      }}
                    >
                      Differential: Preeklamsia berat. TD sistolik &gt;160. Proteinuria +3.
                      Rekomendasi: MgSO4 loading dose, rujuk SpOG.
                    </span>
                  </div>
                  {/* Input handle left */}
                  <div
                    className="absolute top-[12px] -left-[6px] w-[10px] h-[10px] rounded-full"
                    style={{ background: 'rgba(183,171,152,0.3)', border: '2px solid #18171a' }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── GENESIS ──────────────────────────────────────── */}
      <section className="py-24 border-b border-muted/20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-12 lg:gap-20">
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                  Cerita Utama Kami
                </p>
                <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mt-4">
                  Tesis Keselamatan Sistemik: Rasionalisasi Klinis di Balik{' '}
                  <span className="text-accent">Sentra</span>
                </h2>
              </Reveal>
              <Reveal delay={0.06}>
                <div className="text-lg text-muted leading-relaxed flex flex-col gap-5">
                  <p>
                    Insiden klinis pada{' '}
                    <strong className="text-foreground">13 dan 21 Februari 2025</strong> di
                    fasilitas kami mengekspos sebuah defisiensi struktural yang krusial — sebuah
                    pola yang dalam literatur sistem kesehatan diidentifikasi sebagai sindrom{' '}
                    <strong className="text-foreground">&ldquo;Tiga Terlambat&rdquo;</strong>:
                    keterlambatan dalam pengambilan keputusan, eskalasi rujukan, dan penanganan
                    medis definitif. Mengobservasi anomali sistemik ini, saya bersama dr. Nanda (dr.
                    Dibya) dan dr. Boyong mengonsolidasikan sebuah komite strategis internal.
                    Konklusinya absolut: pendekatan reaktif tidak lagi memadai; kita menuntut sebuah{' '}
                    <strong className="text-foreground">
                      intervensi arsitektur klinis yang fundamental
                    </strong>
                    .
                  </p>
                  <p>
                    Fase krisis tersebut memicu dua manuver operasional yang dieksekusi secara
                    simultan. Lini pertama berfokus pada desentralisasi diagnostik melalui
                    pemberdayaan ultrasonografi (USG) bagi bidan di garda terdepan. Lini kedua
                    bermuara pada <strong className="text-foreground">rekayasa Sentra</strong>.
                    Selama satu tahun masa inkubasi, saya mengambil peran penuh sebagai
                    dokter-teknolog, melakukan co-engineering kecerdasan komputasional sejak baris
                    kode pertama. Langkah ini dilandasi oleh satu prinsip fundamental dasar saya:
                  </p>
                  <blockquote className="border-l-2 border-accent/40 pl-6 py-2 italic text-foreground/80">
                    &ldquo;Ilmu kesehatan ini terlalu luas, terlalu banyak untuk dipahami
                    seluruhnya. Maka dari itu, gunakan kecerdasan buatan (Artificial Intelligence)
                    untuk membantu kita, dan gunakan hati nurani kita sebagai dokter.&rdquo;
                  </blockquote>
                  <p>
                    Sentra dibangun murni di atas ekuilibrium tersebut. Tujuannya adalah menciptakan
                    ekosistem proaktif yang memutus asimetri informasi, memanfaatkan daya komputasi
                    untuk memetakan risiko pasien jauh sebelum ambulans menyentuh pelataran rumah
                    sakit, namun tetap menyerahkan keputusan akhir pada nurani medis manusia.
                  </p>
                  <p>
                    Perlu dicatat bahwa sebelum insiden tersebut, fasilitas kami telah berhasil
                    mempertahankan <strong className="text-accent">zero mortality rate</strong>{' '}
                    (tingkat mortalitas nol) sejak awal masa kepemimpinan saya. Insiden Februari
                    2025 bukan kegagalan internal — melainkan eksposur terhadap kerentanan sistemik
                    eksternal yang menembus batas fasilitas. Integrasi arsitektur Sentra mencapai
                    titik ekuilibrium pada <strong className="text-foreground">Januari 2026</strong>
                    , memperkuat proteksi yang sudah ada dengan kecerdasan komputasional. Meskipun
                    demikian, memonopoli instrumen mitigasi risiko sekuat ini secara eksklusif
                    merupakan sebuah ironi ekologis dalam dunia kesehatan.
                  </p>
                  <p>
                    Saya sangat menyadari probabilitas kegagalan. Mungkin Sentra masih memiliki
                    celah, atau kinerjanya mungkin lebih buruk dari kalkulasi di atas kertas. Namun
                    di sisi lain, ada probabilitas 50% yang solid bahwa Sentra adalah{' '}
                    <strong className="text-foreground">
                      solusi nyata yang selama ini kita cari
                    </strong>
                    . Petuah mengatakan bahwa satu orang tidak akan mengubah dunia, namun{' '}
                    <strong className="text-accent">
                      satu inovasi yang berani dieksekusi selalu lebih bernilai secara klinis
                      daripada ribuan ide sempurna yang hanya diam di dalam kepala
                    </strong>
                    .
                  </p>
                  <p className="text-sm text-muted/60 italic mt-2">
                    — Disampaikan saat Rapat Internal RSIA Melinda DHAI, 22 Januari 2026 &middot;
                    dr. Ferdi Iskandar
                  </p>
                </div>
              </Reveal>
            </div>

            <div className="hidden lg:block w-px bg-muted/20 self-stretch" />

            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                  Mengapa Ini Penting
                </p>
                <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mt-4">
                  Krisis yang <span className="text-accent">Tidak Bisa</span> Menunggu
                </h2>
              </Reveal>

              <Reveal delay={0.06}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10">
                  <span className="absolute top-6 right-8 text-[40px] md:text-[48px] font-black text-foreground/10 leading-none font-jakarta">
                    <CountUp value={4100} idLocale suffix="+" />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                    Kematian Maternal
                  </span>
                  <p className="text-lg text-muted leading-relaxed mt-4">
                    Berdasarkan pembaruan data tahun 2026, lebih dari{' '}
                    <strong className="text-foreground">
                      4.100 ibu hamil meninggal dunia setiap tahunnya
                    </strong>{' '}
                    (sekitar 1 ibu meninggal setiap jam).
                  </p>
                  <p className="text-lg text-muted leading-relaxed mt-4">
                    Kajian klinis di berbagai rumah sakit Indonesia menyimpulkan bahwa faktor utama
                    kematian maternal yang sebenarnya bisa dicegah ini adalah{' '}
                    <strong className="text-foreground">&ldquo;Tiga Terlambat&rdquo;</strong>:
                    Terlambat mengambil keputusan, terlambat proses rujukan/transportasi, dan
                    terlambat mendapatkan penanganan medis yang memadai setibanya di fasilitas
                    kesehatan. Sekitar{' '}
                    <strong className="text-foreground">80–90% kematian ibu</strong> di rumah sakit
                    berasal dari kelompok rujukan yang terlambat.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.12}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10">
                  <span className="absolute top-6 right-8 text-[40px] md:text-[48px] font-black text-foreground/10 leading-none font-jakarta">
                    <CountUp value={51} />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                    Dugaan Malpraktik
                  </span>
                  <p className="text-lg text-muted leading-relaxed mt-4">
                    Laporan Menkes: Pada periode 2023–2025, Kementerian Kesehatan mengungkap adanya{' '}
                    <strong className="text-foreground">51 aduan dugaan malpraktik</strong>. Dari
                    jumlah tersebut, tercatat ada{' '}
                    <strong className="text-foreground">
                      24 kasus yang menyebabkan pasien meninggal dunia
                    </strong>
                    .
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10">
                  <span className="absolute top-6 right-8 text-[40px] md:text-[48px] font-black text-foreground/10 leading-none font-jakarta">
                    <CountUp value={88} suffix="%" />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                    Kesalahan Medikasi
                  </span>
                  <p className="text-lg text-muted leading-relaxed mt-4">
                    Meskipun tidak seluruhnya berujung kematian, berbagai studi di RS tingkat daerah
                    di Indonesia melaporkan insiden salah resep, salah dosis, atau kelalaian
                    dokumentasi menyentuh persentase kejadian antara{' '}
                    <strong className="text-foreground">15% hingga 88%</strong> di poliklinik maupun
                    rawat inap.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10">
                  <span className="absolute top-6 right-8 text-[40px] md:text-[48px] font-black text-foreground/10 leading-none font-jakarta">
                    <CountUp value={70} suffix="%" />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                    Kanker
                  </span>
                  <p className="text-lg text-muted leading-relaxed mt-4">
                    Pemerintah mencatat tingginya kematian akibat kanker (seperti payudara dan
                    serviks) karena{' '}
                    <strong className="text-foreground">minimnya skrining awal</strong>. Pasien
                    terlambat terdiagnosis dan baru ditangani saat sudah memasuki stadium lanjut.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TIM & KEPEMIMPINAN ────────────────────────────── */}
      <section id="tim" className="py-24 border-b border-muted/20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(183,171,152,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                  Tim & Kepemimpinan
                </p>
                <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mt-4">
                  Dibangun oleh <span className="text-accent">Dokter,</span> untuk Dokter dan Tenaga
                  Kesehatan
                </h2>
              </Reveal>
            </div>
            <div className="flex items-end">
              <Reveal delay={0.06}>
                <p className="text-lg text-muted leading-relaxed">
                  Sentra tidak dibangun oleh teknolog yang masuk ke dunia healthcare. Ini dibangun
                  oleh eksekutif healthcare aktif yang, setelah lebih dari satu dekade menghadapi
                  kegagalan sistemik, membangun solusi dari nol.
                </p>
              </Reveal>
            </div>
          </div>

          {/* Founder card */}
          <Reveal>
            <div className="border border-muted/20 rounded-2xl p-5 md:p-6 mb-6">
              <div className="grid lg:grid-cols-[1fr_auto_280px] gap-6 lg:gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                    Founder
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground font-jakarta">
                    {TEAM[0].name}
                  </h3>
                  <p className="text-sm font-bold tracking-widest text-muted uppercase">
                    {TEAM[0].role}
                  </p>
                  <p className="text-base text-muted leading-relaxed mt-1">{TEAM[0].desc}</p>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {TEAM[0].stats?.map((s) => (
                      <div key={s.label} className="flex flex-col gap-1">
                        <span className="text-[28px] md:text-[32px] font-bold text-foreground font-jakarta leading-none">
                          {s.value}
                        </span>
                        <span className="text-xs text-muted">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden lg:block w-px bg-muted/20 self-stretch" />

                <div className="flex flex-col gap-4">
                  <div className="relative rounded-2xl overflow-hidden h-[160px]">
                    <Image
                      src="/ferdi.png"
                      alt="Dr. Ferdi Iskandar — Founder & CEO Sentra Healthcare AI"
                      fill
                      className="object-cover object-[center_25%] brightness-50"
                    />
                  </div>
                  <blockquote className="text-xs text-muted leading-relaxed italic border-l-2 border-accent pl-4">
                    &ldquo;Di balik setiap inovasi dan keputusan strategis saya sebagai CEO di
                    Melinda DHAI dan Sentra Healthcare Artificial Intelligence, ada satu tujuan
                    sederhana: memuliakan kehidupan manusia. Saya percaya bahwa teknologi terbaik
                    adalah yang bekerja dalam diam untuk mendukung keselamatan pasien dan
                    kesejahteraan masyarakat.&rdquo;
                    <footer className="mt-3 text-foreground not-italic font-bold text-xs tracking-widest uppercase">
                      — dr. Ferdi Iskandar
                    </footer>
                  </blockquote>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Advisors grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.slice(1).map((member, i) => (
              <Reveal key={member.name} delay={i * 0.06}>
                <div className="border border-muted/20 rounded-2xl p-8 h-full flex flex-col gap-4">
                  <span className="text-[10px] font-bold tracking-widest text-accent uppercase font-jakarta">
                    {member.role.includes('Clinical') ? 'Clinical Advisor' : 'Technical Advisor'}
                  </span>
                  <h3 className="text-xl font-bold text-foreground font-jakarta">{member.name}</h3>
                  {'subtitle' in member && (
                    <span className="text-sm text-muted">{member.subtitle}</span>
                  )}
                  {'country' in member && (
                    <span className="text-sm text-muted/60">{member.country}</span>
                  )}
                  <p className="text-sm text-muted leading-relaxed">{member.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Operations & Administration */}
          <Reveal>
            <h3 className="text-xl font-bold text-foreground font-jakarta mt-16 mb-6">
              Operations & Administration
            </h3>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADMIN_TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.04}>
                <div className="border border-muted/20 rounded-2xl p-6 h-full flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-foreground font-jakarta">{member.name}</h4>
                  <span className="text-sm text-accent">{member.role}</span>
                  <p className="text-sm text-muted leading-relaxed">{member.task}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Test Pilot */}
          <Reveal>
            <h3 className="text-xl font-bold text-foreground font-jakarta mt-16 mb-6">
              Test Pilot
            </h3>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEST_PILOT.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.04}>
                <div className="border border-muted/20 rounded-2xl p-6 h-full flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-foreground font-jakarta">{member.name}</h4>
                  <span className="text-sm text-accent">{member.role}</span>
                  <p className="text-sm text-muted leading-relaxed">{member.task}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PILOT SITES ───────────────────────────────────── */}
      <section className="py-24 border-b border-muted/20" style={{ background: '#1c1b17' }}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                  Pilot Sites
                </p>
                <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mt-4">
                  Validasi Klinis Nyata, Bukan Sekadar Demo
                </h2>
              </Reveal>
            </div>
            <div className="flex items-end">
              <Reveal delay={0.06}>
                <p className="text-lg text-muted leading-relaxed">
                  Setiap fitur Sentra divalidasi di fasilitas kesehatan nyata dengan data pasien
                  nyata. Dari Puskesmas hingga rumah sakit rujukan.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {PILOT_SITES.map((site, i) => (
              <Reveal key={site.name} delay={i * 0.06}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10 h-full flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-accent uppercase font-jakarta">
                        {site.type}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-foreground font-jakarta mt-2">
                        {site.name}
                      </h3>
                    </div>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
                      style={{
                        color: site.status === 'Active Deployment' ? '#4ade80' : 'var(--sentra-fg)',
                        background:
                          site.status === 'Active Deployment'
                            ? 'rgba(74,222,128,0.06)'
                            : 'rgba(183,171,152,0.04)',
                        borderColor:
                          site.status === 'Active Deployment'
                            ? 'rgba(74,222,128,0.2)'
                            : 'rgba(183,171,152,0.15)',
                      }}
                    >
                      {site.status}
                    </span>
                  </div>

                  <p className="text-lg text-muted leading-relaxed">{site.desc}</p>

                  {site.stats.length > 0 && (
                    <div className="flex gap-8 pt-4 border-t border-muted/10">
                      {site.stats.map((s) => (
                        <div key={s.label} className="flex flex-col gap-1">
                          <span className="text-2xl font-bold text-foreground font-jakarta">
                            {s.value}
                          </span>
                          <span className="text-xs text-muted">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {site.services.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-bold tracking-widest text-muted uppercase border border-muted/20 px-3 py-1 rounded-full"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {site.website && (
                    <div className="pt-2 border-t border-muted/10">
                      <Link
                        href={site.website}
                        target="_blank"
                        className="text-sm text-muted hover:text-accent transition-colors"
                      >
                        {site.websiteLabel}
                      </Link>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EKOSISTEM PRODUK ──────────────────────────────── */}
      <section className="py-24 border-b border-muted/20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <Reveal>
                <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta">
                  Ekosistem Produk
                </p>
                <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mt-4">
                  Platform <span className="text-accent">Modular</span> yang Tumbuh Bersama
                  Kebutuhan
                </h2>
              </Reveal>
            </div>
            <div className="flex items-end">
              <Reveal delay={0.06}>
                <p className="text-lg text-muted leading-relaxed">
                  Setiap produk Sentra beroperasi sebagai modul independen yang dapat diaktifkan
                  sesuai kebutuhan fasilitas — dari klinik kecil hingga rumah sakit rujukan.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {PRODUCTS.map((product, i) => (
              <Reveal key={product.name} delay={i * 0.06}>
                <div className="relative border border-muted/20 rounded-2xl p-8 md:p-10 h-full flex flex-col gap-4">
                  <div className="absolute top-6 right-6 flex items-center gap-3">
                    <span className="text-[10px] text-muted/50 tracking-wide">
                      Project Lead: dr. Ferdi Iskandar
                    </span>
                    <product.icon size={24} strokeWidth={1.5} style={{ color: '#b8ac99' }} />
                  </div>
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground font-jakarta">
                      {product.name}
                    </h3>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
                      style={{
                        color:
                          product.status === 'Sudah Dibangun'
                            ? '#4ade80'
                            : product.status === 'Sedang Diuji'
                              ? '#facc15'
                              : '#60a5fa',
                        background:
                          product.status === 'Sudah Dibangun'
                            ? 'rgba(74,222,128,0.06)'
                            : product.status === 'Sedang Diuji'
                              ? 'rgba(250,204,21,0.06)'
                              : 'rgba(96,165,250,0.06)',
                        borderColor:
                          product.status === 'Sudah Dibangun'
                            ? 'rgba(74,222,128,0.2)'
                            : product.status === 'Sedang Diuji'
                              ? 'rgba(250,204,21,0.2)'
                              : 'rgba(96,165,250,0.2)',
                      }}
                    >
                      {product.status}
                    </span>
                  </div>
                  <span className="text-xs font-bold tracking-widest text-muted uppercase">
                    {product.domain}
                  </span>
                  <p className="text-sm text-muted leading-relaxed mt-2">{product.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MODUL IN DEVELOPMENT ──────────────────────────── */}
      <section className="py-24 border-b border-muted/20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(183,171,152,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(183,171,152,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta mb-4">
              Pipeline
            </p>
            <h2 className="text-[32px] md:text-[45px] font-bold text-foreground leading-[1.2] font-jakarta mb-16">
              Akan Dibangun
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {MODULES.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.06}>
                <div className="border border-muted/20 rounded-2xl p-8 h-full flex flex-col gap-4 hover:border-accent/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-muted uppercase">
                      Modul · {String(i + 1).padStart(2, '0')}
                    </span>
                    <m.icon size={28} strokeWidth={1.5} style={{ color: '#b8ac99' }} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground font-jakarta">{m.name}</h3>
                  <p className="text-lg text-muted leading-relaxed">{m.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-auto pt-4">
                    {m.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold tracking-widest text-muted uppercase border border-muted/20 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NILAI INTI ────────────────────────────────────── */}
      <section
        className="py-24 border-b border-muted/20"
        style={{ background: '#ffffff', color: '#1a1a1a' }}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta mb-4">
              Nilai Inti
            </p>
            <h2
              className="text-[32px] md:text-[45px] font-bold leading-[1.2] font-jakarta max-w-[600px] mb-16"
              style={{ color: '#1a1a1a' }}
            >
              Prinsip di Balik Setiap Keputusan
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {VALUES.map((v, i) => (
              <Reveal key={v.name} delay={(i % 3) * 0.06}>
                <div className="flex flex-col gap-4">
                  <span
                    className="text-[40px] font-bold font-jakarta leading-none"
                    style={{ color: 'rgba(0,0,0,0.15)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-6 h-px bg-accent" />
                  <h3 className="text-lg font-bold font-jakarta" style={{ color: '#1a1a1a' }}>
                    {v.name}
                  </h3>
                  <p className="text-lg leading-relaxed" style={{ color: '#555' }}>
                    {v.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <section className="py-32 border-b border-muted/20 text-center">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <Reveal>
            <p className="text-xs font-bold tracking-widest text-accent uppercase font-jakarta mb-6">
              Bergabung
            </p>
            <h2 className="text-[32px] md:text-[56px] font-bold text-foreground leading-[1.1] max-w-[700px] mx-auto mb-6 font-jakarta">
              Ikut Membentuk Versi Terbaik Sentra
            </h2>
            <p className="text-lg text-muted max-w-[500px] mx-auto leading-relaxed mb-10">
              Masukan dari tenaga kesehatan dan mitra adalah bagian terpenting dari proses
              pengembangan kami.
            </p>

            <Link
              href="https://wa.me/6289526712861?text=Halo%20Sentra%20Healthcare%20AI"
              target="_blank"
              className="inline-flex items-center gap-4 bg-accent px-10 py-5 rounded-full hover:shadow-[var(--sentra-shadow-accent)] hover:-translate-y-1 transition-all"
            >
              <div className="w-10 h-10 rounded-full border border-background/20 flex items-center justify-center text-background">
                <ArrowUpRight size={24} />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-background">
                Hubungi Tim Kami
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER (branded, konsisten dengan situs) ──────── */}
      <Footer />
    </main>
  )
}
