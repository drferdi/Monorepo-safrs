// Architected and built by Drferdi.
// Konten diadaptasi & diringkas dari
// abyss-monorepo (legacy) apps\internal\wikirepo\src\pages\ArticlePage.tsx,
// dialihbahasakan ke Bahasa Indonesia profesional. Istilah teknis, nama engine,
// dan identifier kode dipertahankan dalam bentuk aslinya.

export type TocItem = {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

export const TOC_ITEMS: TocItem[] = [
  {
    label: 'Asal Mula & Latar Belakang',
    href: '#origin',
    children: [
      { label: 'Profil Pendiri', href: '#founder' },
      { label: 'Motivasi Pendirian', href: '#motivation' },
      { label: 'Penamaan & Simbolisme', href: '#naming' },
    ],
  },
  {
    label: 'Arsitektur',
    href: '#architecture',
    children: [
      { label: 'Filosofi Desain', href: '#design-philosophy' },
      { label: 'Model Lapisan', href: '#layer-model' },
      { label: 'Penegakan Batas', href: '#boundary-enforcement' },
    ],
  },
  {
    label: 'Engine Permata Mahkota',
    href: '#engines',
    children: [
      { label: 'Sentra-Nada (Penalaran Klinis)', href: '#nada' },
      { label: 'Sentra-Pustaka (Pipeline RAG)', href: '#pustaka' },
      { label: 'Sentra-Sandi (Interop FHIR)', href: '#sandi' },
      { label: 'Sentra-Bentara (Kontrol Akses)', href: '#bentara' },
      { label: 'Sentra-Cermin (Vector Store)', href: '#cermin' },
    ],
  },
  { label: 'Layanan Platform', href: '#platform' },
  { label: 'Ekosistem Aplikasi', href: '#apps' },
  { label: 'Alur Kerja Pengembangan', href: '#workflow' },
  { label: 'Tata Kelola & Keselamatan', href: '#governance' },
  { label: 'Regulasi & Kepatuhan', href: '#regulatory' },
  { label: 'Pustaka Dokumentasi', href: '#library' },
  { label: 'Spesifikasi Teknis', href: '#tech-specs' },
  { label: 'Referensi', href: '#references' },
]

export const SECTION_IDS = [
  'origin',
  'architecture',
  'engines',
  'platform',
  'apps',
  'workflow',
  'governance',
  'regulatory',
  'library',
  'tech-specs',
  'references',
]

export const INFOBOX_ROWS = [
  { field: 'Status', value: 'Aktif / Produksi' },
  { field: 'Tipe', value: 'pnpm Workspace' },
  { field: 'Sistem Build', value: 'Turborepo 2.x' },
  { field: 'Bahasa', value: 'TypeScript, SQL' },
  { field: 'Engine Inti', value: 'SYMPHONY, NADA, PUSTAKA' },
  { field: 'Infrastruktur', value: 'Kafka, PostgreSQL, Redis' },
  { field: 'Tata Kelola', value: 'Dipandu AI (AGENTS.md)' },
  { field: 'Repositori', value: 'abyss-monorepo.git' },
  { field: 'Pendiri', value: 'dr. Ferdi Iskandar' },
  { field: 'Organisasi', value: 'Sentra Healthcare AI' },
  { field: 'Dimulai', value: '2024' },
  { field: 'Lisensi', value: 'Abyss Internal Documentation License' },
]

export type EngineNode = {
  id: string
  label: string
  desc: string
}

export const ENGINE_NODES: EngineNode[] = [
  { id: 'nada', label: 'sentra-nada', desc: 'Penalaran Klinis' },
  { id: 'pustaka', label: 'sentra-pustaka', desc: 'Pipeline RAG' },
  { id: 'cermin', label: 'sentra-cermin', desc: 'Vector Store' },
  { id: 'sandi', label: 'sentra-sandi', desc: 'Interop FHIR' },
  { id: 'bentara', label: 'sentra-bentara', desc: 'Kontrol Akses' },
]

/** Relasi antar engine, dipertahankan dari graph asli. */
export const ENGINE_RELATIONS = [
  { from: 'sentra-nada', label: 'memanggil', to: 'sentra-pustaka' },
  { from: 'sentra-pustaka', label: 'memakai', to: 'sentra-cermin' },
  { from: 'sentra-cermin', label: 'mengodekan ke', to: 'sentra-sandi' },
  { from: 'sentra-sandi', label: 'dijaga oleh', to: 'sentra-bentara' },
  { from: 'sentra-bentara', label: 'menengok ke', to: 'sentra-cermin' },
]

export type Engine = {
  id: string
  title: string
  description: string
  subsystems: string[]
  disclaimer?: string
}

export const ENGINES: Engine[] = [
  {
    id: 'nada',
    title: 'Sentra-Nada, Engine Penalaran Klinis',
    description:
      'Sentra-Nada adalah inti kecerdasan klinis platform Abyss. Engine ini mengimplementasikan <b>SYMPHONY Engine</b>, kerangka modular untuk asesmen klinis multidimensi secara real-time di titik layanan. Dirancang untuk memperkuat, bukan menggantikan, penilaian tenaga kesehatan berkualifikasi; seluruh keluaran bersifat advisory dengan grounding bukti dan indikator keyakinan.',
    subsystems: [
      '<b>Skoring NEWS2 & Tanda Vital:</b> Implementasi protokol National Early Warning Score 2 (NEWS2) dari UK Royal College of Physicians untuk mengenali perburukan fisiologis pada pasien dewasa.',
      '<b>Pemodelan Trajektori:</b> Menganalisis momentum tren tanda vital dari waktu ke waktu dan menghasilkan proyeksi time-to-critical untuk intervensi proaktif.',
      '<b>Screening Gates:</b> Pemeriksaan biner instan untuk kondisi akut seperti syok sepsis (via proxy SOFA & qSOFA), hipoksemia, dan hipoglikemia.',
      '<b>Clinical Pathways & Trajectory Engine:</b> Rekomendasi jalur klinis berbasis bukti, mengacu pada pedoman klinis Indonesia dan standar internasional (WHO, UpToDate, BMJ Best Practice).',
      '<b>Dukungan Diagnosis Banding:</b> Pembentukan diferensial terstruktur dari profil gejala, tanda vital, dan data diagnostik, disertai bobot probabilistik dan identifikasi red-flag.',
      '<b>Alur Koordinasi Rujukan:</b> Pembentukan jalur rujukan otomatis meliputi klasifikasi urgensi, identifikasi fasilitas penerima, dan pra-pengisian dokumen serah terima.',
      '<b>Deteksi Emergensi:</b> Deteksi sub-detik terhadap pola gawat darurat kritis (risiko henti jantung, gagal napas, kejadian neurologis akut) dengan eskalasi alert otomatis.',
    ],
    disclaimer:
      'Status validasi klinis: dalam pengembangan. Seluruh keluaran klinis menyertakan disclaimer wajib selama menunggu izin edar. Informasi ini bersifat informasional; konsultasikan dengan klinisi berkualifikasi untuk setiap keputusan klinis.',
  },
  {
    id: 'pustaka',
    title: 'Sentra-Pustaka, Pipeline Pengetahuan RAG',
    description:
      'Sentra-Pustaka adalah engine pengambilan dan sintesis pengetahuan medis. Engine ini menerapkan arsitektur <b>Retrieval-Augmented Generation (RAG)</b> lokal-first, teknik yang me-grounding keluaran model bahasa pada korpus pengetahuan terkurasi, sehingga secara signifikan menekan risiko halusinasi yang membuat keluaran LLM tak terkendali tidak aman untuk penggunaan klinis.',
    subsystems: [
      '<b>Arsitektur Hybrid Search:</b> Menggabungkan retrieval semantik padat (embedding <code>pgvector</code> di PostgreSQL) dengan retrieval leksikal (skor setara BM25), difusikan lewat Reciprocal Rank Fusion (RRF).',
      '<b>Pipeline Ingesti Dokumen:</b> Ingesti, chunking, embedding, dan indexing otomatis literatur medis, pedoman klinis, data obat, dan protokol institusi (PDF, DOCX, HTML, data terstruktur).',
      '<b>Evaluasi Berbasis Sitasi:</b> Setiap keluaran RAG di-grounding dengan sitasi sumber tingkat kalimat/paragraf; lapisan deteksi halusinasi (entailment scoring) menandai respons yang kurang didukung bukti.',
      '<b>Suite Algoritma Retrieval:</b> Pemilihan strategi retrieval modular sesuai jenis kueri: pencarian faktual, penalaran diferensial, interaksi obat, dan pengambilan pedoman.',
      '<b>Kerangka Evaluasi & Pengujian:</b> Suite evaluasi kompatibel RAGAS yang mengukur faithfulness, relevansi jawaban, presisi, dan recall konteks pada benchmark kueri klinis terstandar.',
    ],
    disclaimer:
      'Seluruh keluaran pengetahuan bersifat informasional dan bukan merupakan nasihat medis. Keputusan klinis memerlukan evaluasi oleh tenaga kesehatan berkualifikasi.',
  },
  {
    id: 'sandi',
    title: 'Sentra-Sandi, Engine Interoperabilitas FHIR',
    description:
      'Sentra-Sandi adalah engine interoperabilitas dan standar data kesehatan. Engine ini mengimplementasikan <b>HL7 FHIR R4</b>, standar internasional pertukaran data kesehatan elektronik, sehingga aplikasi Sentra dapat berinteroperasi dengan sistem informasi rumah sakit, laboratorium, pencitraan, dan infrastruktur data kesehatan nasional.',
    subsystems: [
      '<b>Implementasi Resource FHIR R4:</b> Cakupan resource inti (Patient, Observation, Condition, Medication, Procedure, DiagnosticReport, Encounter) yang dipetakan ke standar data Kemenkes (SATUSEHAT).',
      '<b>Integrasi CDS Hooks:</b> Implementasi spesifikasi HL7 Clinical Decision Support (CDS) Hooks untuk memicu dukungan keputusan real-time di dalam alur kerja klinis yang sudah ada.',
      '<b>Validasi & Transformasi Data:</b> Transformasi dua arah antara model data internal Sentra dan representasi FHIR, dengan validasi skema di setiap batas integrasi.',
      '<b>Protokol Pertukaran Data:</b> Dukungan pola FHIR RESTful API, otorisasi SMART on FHIR, dan bulk data export untuk analitik kesehatan populasi.',
    ],
  },
  {
    id: 'bentara',
    title: 'Sentra-Bentara, Engine Kontrol Akses',
    description:
      'Sentra-Bentara adalah engine keamanan, autentikasi, dan tata kelola akses. Pada sistem AI kesehatan yang menangani data pasien sensitif, kontrol akses bukan sekadar kebutuhan teknis melainkan <b>kewajiban etis dan hukum</b>, sebagaimana diatur UU Perlindungan Data Pribadi (UU PDP No. 27/2022) dan selaras dengan ISO/IEC 27001.',
    subsystems: [
      '<b>Lapisan Autentikasi:</b> Autentikasi multi-faktor dengan persyaratan kredensial spesifik peran; autentikasi staf klinis mengikuti protokol verifikasi yang lebih ketat sesuai sensitivitas data.',
      '<b>Tier Akses & Kebijakan Keamanan:</b> Model tier hierarkis (Publik → Terautentikasi → Klinis → Administratif → Crown Jewel) dengan matriks izin eksplisit dan penegakan least-privilege.',
      '<b>Session Approval Validator (GO-Gate):</b> Validasi sesi real-time yang menilai legitimasi sesi terhadap pola perilaku, device fingerprinting, dan sinyal risiko kontekstual sebelum akses ke fungsi klinis sensitif.',
    ],
  },
  {
    id: 'cermin',
    title: 'Sentra-Cermin, Engine Vector Store & Embedding',
    description:
      'Sentra-Cermin menyediakan infrastruktur vector embedding yang menopang pencarian semantik, pencocokan kemiripan klinis, dan pengambilan pengetahuan di seluruh platform. Engine ini membungkus ekstensi <code>pgvector</code> PostgreSQL dengan lapisan manajemen embedding sadar-domain, mendukung banyak model embedding dan versioning untuk konsistensi representasi semantik dari waktu ke waktu.',
    subsystems: [
      '<b>Dukungan Multi-model Embedding:</b> Arsitektur model embedding yang dapat dicolok, mendukung model umum maupun embedding biomedis spesifik-domain (varian BiomedBERT, PubMedBERT).',
      '<b>Manajemen Versi Embedding:</b> Melacak versi model embedding terhadap dokumen terindeks sehingga peningkatan model dapat dilakukan tanpa regresi kualitas pencarian.',
      '<b>Utilitas Similarity Search:</b> Operasi cosine similarity, jarak Euclidean, dan inner-product yang teroptimasi, dengan dukungan indeks HNSW dan IVFFlat untuk pencarian approximate nearest-neighbor sub-milidetik pada skala data klinis.',
    ],
  },
]

/** Puisi "Permata Mahkota Sentra", versi ringkas Bahasa Indonesia. */
/** Puisi asli "The Crown Jewels of Sentra" — Bahasa Inggris, apa adanya. */
export const CROWN_JEWEL_POEM: string[] = [
  'In the quiet core where Sentra breathes,\nfive jewels wake beneath the deep.\nNot tools alone, not names in code,\nbut ancient lights on a guarded road.',
  '**Nada** calls, a voice through night,\nseeking meaning, shape, and light.\nIts signal flows where knowledge starts,\nto **Pustaka**, keeper of minds and hearts.',
  '**Pustaka** turns the pages wide,\nwhere memory, law, and truth reside.\nIt gathers fragments, names the stream,\nthen looks through **Cermin** like a dream.',
  'For **Cermin** sees what others miss,\na mirrored gate, a silent witness.\nIt does not speak with borrowed flame,\nit reflects the source, the wound, the name.',
  'Then hidden deep where secrets stand,\n**Sandi** waits with coded hand.\nWhat must be sealed, it shapes with care,\nso fragile truth is safe from air.',
  'And at the gate, with watchful eyes,\n**Bentara** guards what must not die.\nNo reckless hand, no wandering key,\nmay touch the crown or bend decree.',
  'So **Nada** calls, and **Pustaka** knows,\nthrough **Cermin’s** glass the meaning flows.\nTo **Sandi’s** seal, to **Bentara’s** shield,\nthe sacred system is revealed.',
  'Five jewels bound, yet each alone,\na living law beneath the throne.\nNot built for noise, nor made for fame,\nbut to protect the Sentra flame.',
]

export const APP_ROWS = [
  {
    domain: 'Healthcare',
    apps: 'sentra-main, sentra-assist, intelligence-board, referralink, primary healthcare delivery',
    users: 'Klinisi, pasien, administrator',
  },
  {
    domain: 'Academic',
    apps: 'clinical-simulator, evaluation-engine, academic-solutions',
    users: 'Mahasiswa kedokteran, pendidik',
  },
  {
    domain: 'Community',
    apps: 'drferdi-memory, drferdi-transformer, daf-website, community innovation apps',
    users: 'Kader kesehatan, masyarakat umum',
  },
  {
    domain: 'Corporate',
    apps: 'ferdiiskandar-portfolio, branding platform, internal comms',
    users: 'Organisasi Sentra, mitra',
  },
]

export const WORKFLOW_COMMANDS = [
  { cmd: 'pnpm dev', comment: '# Jalankan semua dev server secara paralel' },
  { cmd: 'pnpm build', comment: '# Build semua paket (cache Turborepo)' },
  { cmd: 'pnpm test', comment: '# Jalankan seluruh test suite beserta coverage' },
  { cmd: 'pnpm test:engines', comment: '# Uji engine Crown Jewel saja' },
  { cmd: 'pnpm lint', comment: '# ESLint + pemeriksaan penegakan batas' },
  { cmd: 'pnpm typecheck', comment: '# Pemeriksaan tipe TypeScript strict' },
  { cmd: 'pnpm db:migrate', comment: '# Terapkan migrasi basis data yang tertunda' },
  { cmd: 'pnpm db:studio', comment: '# Buka Drizzle Studio' },
  { cmd: 'pnpm db:seed', comment: '# Isi basis data dev dengan fixture klinis' },
  { cmd: 'pnpm agents:validate', comment: '# Validasi konsistensi AGENTS.md' },
]

export const COMPLIANCE_ROWS = [
  {
    framework: 'UU PDP No. 27/2022',
    domain: 'Perlindungan Data Pribadi Indonesia',
    relevance:
      'Penanganan data pasien; menjadi acuan desain kontrol akses Sentra-Bentara dan persyaratan residensi data.',
  },
  {
    framework: 'HL7 FHIR R4',
    domain: 'Interoperabilitas Kesehatan',
    relevance:
      'Standar internasional pertukaran data kesehatan; diimplementasikan pada engine Sentra-Sandi.',
  },
  {
    framework: 'FDA AI/ML SaMD Guidance',
    domain: 'Regulasi Alat Kesehatan AI (AS)',
    relevance:
      'Menjadi acuan prinsip desain SaMD; diterapkan pada keluaran penalaran klinis Sentra-Nada.',
  },
  {
    framework: 'ISO/IEC 27001',
    domain: 'Manajemen Keamanan Informasi',
    relevance:
      'Kerangka acuan kontrol keamanan platform; menjadi dasar pemodelan ancaman dan kebijakan akses.',
  },
  {
    framework: 'IEC 62304',
    domain: 'Siklus Hidup Perangkat Lunak Medis',
    relevance:
      'Mendefinisikan persyaratan SDLC perangkat lunak medis; menjadi acuan desain CI/CD dan pengujian.',
  },
  {
    framework: 'Permenkes RME',
    domain: 'Regulasi Rekam Medis Elektronik Kemenkes RI',
    relevance: 'Mengatur format, konten, dan retensi RME; menjadi acuan desain model data.',
  },
]

export const TECH_SPEC_CARDS = [
  {
    title: 'Stack Inti',
    items: [
      { label: 'Runtime', value: 'Node.js 22+' },
      { label: 'Manajer Paket', value: 'pnpm 9.x' },
      { label: 'Engine Monorepo', value: 'Turborepo 2.x' },
      { label: 'Framework', value: 'Next.js, NestJS' },
    ],
  },
  {
    title: 'Data & AI',
    items: [
      { label: 'Basis Data', value: 'PostgreSQL 16+' },
      { label: 'Vector Store', value: 'pgvector' },
      { label: 'Messaging', value: 'Apache Kafka' },
      { label: 'Orkestrasi AI', value: 'LangFlow' },
    ],
  },
]

export const REFERENCE_DOCS = [
  'Architecture Overview/Architecture Overview.md',
  'Getting Started.md',
  'AI Capabilities & Systems/Clinical Reasoning Engines.md',
  'Governance & Operations/Agent System & Decision Making.md',
  'Architecture Overview/Monorepo Strategy & Governance.md',
  'Crown Jewel AI Engines/Crown Jewel AI Engines.md',
  'AI Capabilities & Systems/RAG & Retrieval Systems.md',
  'AI Capabilities & Systems/FHIR & Interoperability.md',
  'Governance & Operations/Security & Compliance/Compliance & Regulatory Framework.md',
  'Shared Engines & Packages/Sentra Crown Jewels.md',
  'Platform Services/Orchestration Engine.md',
  'Corporate Applications/Ferdi Iskandar Portfolio.md',
]

export type LibraryItem = {
  label: string
  children?: LibraryItem[]
}

export type LibraryCategory = {
  title: string
  items: LibraryItem[]
}

export const LIBRARY_DATA: LibraryCategory[] = [
  {
    title: 'Inti & Sistem',
    items: [
      { label: 'Getting Started' },
      {
        label: 'AI Capabilities & Systems',
        children: [
          { label: 'AI Capabilities & Systems' },
          { label: 'AI Governance & Safety' },
          { label: 'Clinical Pathways & Trajectories' },
          { label: 'Clinical Reasoning Engines' },
          { label: 'Diagnostic Engines & Algorithms' },
          { label: 'Emergency Detection Systems' },
          { label: 'Referral Coordination Workflows' },
          { label: 'CDS Hooks Integration' },
          { label: 'Data Validation & Transformation' },
          { label: 'FHIR & Interoperability' },
          { label: 'FHIR Resource Implementation' },
          { label: 'Healthcare Data Exchange Protocols' },
          { label: 'Flow Definition Language' },
          { label: 'Flow Orchestration' },
          { label: 'Orchestrator Engine Architecture' },
          { label: 'Citation & Evidence Management' },
          { label: 'Embedding & Vector Systems' },
          { label: 'Evaluation & Testing Framework' },
          { label: 'Knowledge Ingestion Pipeline' },
          { label: 'RAG & Retrieval Systems' },
          { label: 'Retrieval Algorithms' },
        ],
      },
      {
        label: 'Architecture Overview',
        children: [
          { label: 'Architecture Overview' },
          { label: 'Domain Boundaries & Taxonomy' },
          { label: 'Monorepo Strategy & Governance' },
          { label: 'Academic Platforms' },
          { label: 'Application Layer Architecture' },
          { label: 'Community Innovation Apps' },
          { label: 'Prototype & Experimental Apps' },
          { label: 'Branding Platform' },
          { label: 'Corporate Applications' },
          { label: 'Ferdi Iskandar Portfolio' },
          { label: 'Healthcare Applications' },
          { label: 'Primary Healthcare Delivery System' },
          { label: 'Sentra Assist AI Platform' },
          { label: 'API Gateway & Integration' },
          { label: 'Flow Management System' },
          { label: 'Platform Services Architecture' },
          { label: 'Design System & UI Components' },
          { label: 'Integration Layer & Connectors' },
          { label: 'Medical Knowledge Repository' },
          { label: 'Shared Primitives & Foundation' },
          { label: 'Tooling Libraries & Utilities' },
        ],
      },
    ],
  },
  {
    title: 'Aplikasi & API',
    items: [
      {
        label: 'API Reference',
        children: [
          { label: 'API Reference' },
          { label: 'Healthcare Application APIs' },
          { label: 'Integration & Bridge APIs' },
          { label: 'Orchestration & Flow Management APIs' },
          { label: 'Portal & Dashboard APIs' },
        ],
      },
      {
        label: 'Applications',
        children: [
          { label: 'Application Architecture & Boundaries' },
          { label: 'Applications' },
          { label: 'Corporate Applications' },
          { label: 'Internal Applications' },
          { label: 'Clinical Data Management' },
          { label: 'Healthcare API Integration' },
          { label: 'Healthcare Applications' },
          { label: 'Primary Healthcare Application' },
          { label: 'Sentra Main Application' },
        ],
      },
      {
        label: 'Platform Services',
        children: [
          { label: 'Platform Services' },
          { label: 'Data Services' },
          { label: 'Document Ingestion Pipeline' },
          { label: 'Knowledge Management System' },
          { label: 'Query & Command Architecture' },
          { label: 'External System Integrations' },
          { label: 'Flow Orchestration Engine' },
          { label: 'Integration Platforms' },
          { label: 'Service Connectivity' },
          { label: 'Flow Execution Engine' },
          { label: 'Health Monitoring & Status' },
          { label: 'Messaging Infrastructure' },
          { label: 'Orchestration Engine' },
          { label: 'Saga Management System' },
          { label: 'Dashboard Architecture' },
          { label: 'Deployment & Configuration' },
          { label: 'Operational Dashboards' },
          { label: 'Portal & Dashboard' },
          { label: 'UI Component System' },
        ],
      },
    ],
  },
  {
    title: 'Pengembangan & Tata Kelola',
    items: [
      {
        label: 'Development Guide',
        children: [
          { label: 'CLI Tools & Automation' },
          { label: 'Coding Standards & Patterns' },
          { label: 'Development Guide' },
          { label: 'Getting Started' },
          { label: 'Testing & Quality Assurance' },
        ],
      },
      {
        label: 'Governance & Operations',
        children: [
          { label: 'Contribution Workflow' },
          { label: 'Governance & Operations' },
          { label: 'Agent Lifecycle & Operations' },
          { label: 'Agent System & Decision Making' },
          { label: 'Boundary Management' },
          { label: 'Decision Making Framework' },
          { label: 'Emergency Protocols & Handoff Procedures' },
          { label: 'Daily Operations' },
          { label: 'Emergency Response' },
          { label: 'Environment Management' },
          { label: 'Monitoring & Alerting' },
          { label: 'Operational Procedures' },
          { label: 'Access Control & Data Classification' },
          { label: 'Compliance & Regulatory Framework' },
          { label: 'Incident Response & Vulnerability Management' },
          { label: 'Security & Compliance' },
          { label: 'Threat Modeling & Risk Assessment' },
        ],
      },
      {
        label: 'Infrastructure & Deployment',
        children: [
          { label: 'CI/CD Pipelines & Automation' },
          { label: 'Containerized Development Environment' },
          { label: 'Deployment Strategies & Environments' },
          { label: 'Infrastructure & Deployment' },
          { label: 'Monitoring & Observability' },
        ],
      },
    ],
  },
  {
    title: 'Engine Bersama & Dukungan',
    items: [
      {
        label: 'Shared Engines & Packages',
        children: [
          { label: 'Shared Engines & Packages' },
          { label: 'Clinical Packages' },
          { label: 'Reference Data Package' },
          { label: 'Safety Substrate Package' },
          { label: 'Shared Types Package' },
          { label: 'Database Package' },
          { label: 'Document Ingestion Package' },
          { label: 'Integration Bridge' },
          { label: 'Language Flow Client' },
          { label: 'Platform Packages' },
          { label: 'Sentra Bentara - Access Control' },
          { label: 'Sentra Cermin - Embedding Utilities' },
          { label: 'Sentra Crown Jewels' },
          { label: 'Sentra Nada - Clinical Reasoning Engine' },
          { label: 'Sentra Pustaka - RAG Engine' },
          { label: 'Sentra Sandi - FHIR Interoperability' },
          { label: 'Design Tokens' },
          { label: 'Shared Primitives' },
          { label: 'Type Definitions' },
          { label: 'Utility Libraries' },
          { label: 'Tooling Packages' },
        ],
      },
      {
        label: 'Troubleshooting & Support',
        children: [
          { label: 'Application Troubleshooting' },
          { label: 'Common Development Issues' },
          { label: 'Infrastructure & Deployment Problems' },
          { label: 'Security Incidents & Compliance' },
          { label: 'Troubleshooting & Support' },
        ],
      },
    ],
  },
]
