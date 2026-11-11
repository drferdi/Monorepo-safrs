// Adapted from app\story\page.tsx (PRODUCTS + MODULES)
import {
  Baby,
  Bot,
  Brain,
  BrainCog,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  type LucideIcon,
  Mic,
  Plug,
  ShieldCheck,
  Siren,
  Stethoscope,
  TrendingUp,
  Video,
} from 'lucide-react'

export type ProductStatus = 'Sudah Dibangun' | 'Sedang Diuji' | 'Sedang Dibangun' | 'Akan Dibangun'

export type Product = {
  name: string
  domain: string
  status: ProductStatus
  icon: LucideIcon
  desc: string
}

export const STATUSES: ProductStatus[] = [
  'Sudah Dibangun',
  'Sedang Diuji',
  'Sedang Dibangun',
  'Akan Dibangun',
]

export const STATUS_COLOR: Record<ProductStatus, string> = {
  'Sudah Dibangun': '#4ade80',
  'Sedang Diuji': '#facc15',
  'Sedang Dibangun': '#60a5fa',
  'Akan Dibangun': '#b8ac99',
}

export const PRODUCTS: Product[] = [
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
    name: 'POGS',
    domain: 'Pregnancy Observation Global System',
    status: 'Akan Dibangun',
    icon: Baby,
    desc: 'Sistem observasi kehamilan menyeluruh yang memantau kondisi maternal-fetal dari trimester awal hingga persalinan, mendeteksi risiko secara real-time dan memicu eskalasi otomatis.',
  },
  {
    name: 'CDOS',
    domain: 'Clinical Decision Orchestration System',
    status: 'Akan Dibangun',
    icon: BrainCog,
    desc: 'Mesin orkestrasi keputusan klinis multi-layer yang mengintegrasikan guideline nasional dan internasional ke dalam alur kerja diagnostik terstruktur.',
  },
  {
    name: 'TRIAGE',
    domain: 'Algorithmic Emergency Severity Scoring',
    status: 'Akan Dibangun',
    icon: Siren,
    desc: 'Sistem triase algoritmik berbasis skor keparahan yang mengklasifikasi prioritas pasien secara otomatis berdasarkan parameter vital dan keluhan utama di unit gawat darurat.',
  },
  {
    name: 'PREDICTION',
    domain: 'Predictive Clinical Trajectory Engine',
    status: 'Akan Dibangun',
    icon: TrendingUp,
    desc: 'Predictive analytics engine yang memanfaatkan machine learning untuk memodelkan trajektori klinis pasien — memprediksi risiko deteriorasi, readmisi, dan komplikasi sebelum terjadi.',
  },
]

export type AppEntry = {
  name: string
  desc: string
}

export type AppDomain = {
  domain: string
  apps: AppEntry[]
}

/** Aplikasi nyata di monorepo Abyss, dikelompokkan per domain. */
export const APP_DOMAINS: AppDomain[] = [
  {
    domain: 'Healthcare',
    apps: [
      { name: 'Sentraverse', desc: 'Platform hub & website pemasaran Sentra Healthcare AI.' },
      {
        name: 'Med-Assist',
        desc: 'Pendamping klinis untuk triase cepat, dukungan diagnosis, dan alur kerja EMR.',
      },
      {
        name: 'Medboard',
        desc: 'Dashboard intelijen klinis — trajektori CDSS, momentum engine, dan safety gate.',
      },
      { name: 'ReferraLink', desc: 'Aplikasi manajemen alur kerja rujukan pasien.' },
      { name: 'Healthsphere', desc: 'Aset data Puskesmas beserta website publik pendukungnya.' },
    ],
  },
  {
    domain: 'Academic',
    apps: [
      {
        name: 'Academic Solutions',
        desc: 'Manajemen data riset medis dan alur kerja akademik.',
      },
    ],
  },
  {
    domain: 'Community',
    apps: [
      { name: 'Memory', desc: 'Dashboard + engine memori AI yang persisten lintas sesi agen.' },
      {
        name: 'Lunar Vault',
        desc: 'Overlay memori (dense retrieval + reranker) untuk runtime Lunar.',
      },
    ],
  },
  {
    domain: 'Corporate',
    apps: [
      {
        name: 'Ferdi Iskandar',
        desc: 'Portal presensi korporat/eksekutif untuk dr. Ferdi Iskandar.',
      },
      { name: 'Abby', desc: 'Kit asisten AI personal untuk dr. Ferdi Iskandar.' },
    ],
  },
]
