import type {
  AnomalyTag,
  ClinicalReasoning,
  EntityTag,
  LabRecommendation,
  LabResult,
  ManagementStep,
  MedicationOrder,
  PhysicalExamRow,
  SeverityKey,
  SimulationBranch,
  TrajectoryMedication,
  TrajectoryPoint,
  VitalSign,
} from '@/components/sentrasim/types'

export const FINAL_ANAMNESA_TEXT =
  'demam tinggi, batuk produktif kehijauan, sesak saat aktivitas ringan, dan nyeri dada kanan saat batuk'

const CASE_METADATA = ['PEREMPUAN, 46 TAHUN', 'KELUHAN SEJAK 3 HARI', 'TRIASE KUNING'] as const

const DIRECTED_HISTORY = [
  'Demam mencapai 38.8 C, menggigil, dan dahak berubah menjadi mukopurulen.',
  'Sesak muncul saat berjalan ke kamar mandi, tanpa riwayat asma aktif.',
  'Tidak ada hemoptisis, tidak ada penurunan kesadaran, dan tidak ada nyeri dada tipe iskemik.',
] as const

const ANAMNESA_TAGS: readonly EntityTag[] = [
  { text: 'Demam Tinggi', type: 'SYMPTOM' },
  { text: 'Batuk Produktif Hijau', type: 'SYMPTOM' },
  { text: 'Sesak Aktivitas Ringan', type: 'RED FLAG' },
  { text: 'Nyeri Pleuritik Kanan', type: 'OBSERVATION' },
]

const VITALS: readonly VitalSign[] = [
  { label: 'GCS', value: '15', unit: 'E4V5M6' },
  { label: 'Tekanan Darah', value: '132/84', unit: 'mmHg' },
  { label: 'Nadi', value: '108', unit: 'bpm', critical: true },
  { label: 'Napas', value: '24', unit: 'x/m', critical: true },
  { label: 'Suhu', value: '38.8', unit: 'C', critical: true },
  { label: 'SpO2', value: '92', unit: '%', critical: true },
  { label: 'CRT', value: '< 2', unit: 'detik' },
]

const LAB_RECOMMENDATIONS: readonly LabRecommendation[] = [
  { name: 'Hematologi Lengkap', status: 'DIPILIH UNTUK KONFIRMASI INFEKSI' },
  { name: 'C-Reactive Protein (CRP)', status: 'DIPILIH UNTUK MENILAI INFLAMASI' },
  { name: 'Foto Toraks AP/PA', status: 'DIPILIH UNTUK EVALUASI INFILTRAT' },
]

const LAB_RESULTS: readonly LabResult[] = [
  { name: 'Leukosit', value: '15.200/uL', interpretation: 'Leukositosis neutrofilik', alert: true },
  { name: 'CRP', value: '86 mg/L', interpretation: 'Inflamasi akut bermakna', alert: true },
  {
    name: 'Foto Toraks',
    value: 'Infiltrat lobus bawah kanan',
    interpretation: 'Konsolidasi sesuai CAP',
    alert: true,
  },
]

const TRAJECTORY_POINTS: readonly TrajectoryPoint[] = [
  { label: 'Masuk', value: 'SpO2 92% / T 38.8 C' },
  { label: '30 Menit O2', value: 'SpO2 94% / T 38.4 C' },
  { label: '2 Jam', value: 'SpO2 96% / T 37.8 C' },
]

const TRAJECTORY_MEDICATIONS: readonly TrajectoryMedication[] = [
  { name: 'Oksigen nasal kanul', dosage: '2-3 L/menit' },
  { name: 'Antipiretik', dosage: 'sesuai protokol' },
  { name: 'Antibiotik empirik', dosage: 'setelah verifikasi alergi' },
]

const PHYSICAL_EXAM_ROWS: readonly PhysicalExamRow[] = [
  {
    organ: 'Kepala & Leher',
    result: 'Mukosa mulut agak kering, faring hiperemis ringan, tidak ada deviasi trakea',
  },
  {
    organ: 'Dada (Cor & Pulmo)',
    result:
      'Gerak dinding dada simetris, rhonki basah kasar basal kanan, suara napas menurun ringan di basis kanan',
    alert: true,
  },
  {
    organ: 'Perut (Abdomen)',
    result: 'Supel, bising usus normal, tidak ada nyeri tekan, hepar lien tidak teraba',
  },
  { organ: 'Ekstremitas', result: 'Akral hangat, edema tidak ada, perfusi perifer baik' },
]

const ANOMALY_TAGS: readonly AnomalyTag[] = [
  { text: 'SpO2 92%', type: 'HYPOXEMIA', tone: 'critical' },
  { text: 'RR 24 x/menit', type: 'TACHYPNEA', tone: 'warning' },
  { text: 'T 38.8 C', type: 'FEBRILE', tone: 'warning' },
  { text: 'Alergi Amoksisilin', type: 'ALLERGY', tone: 'critical' },
  { text: 'Hipertensi Terkontrol', type: 'COMORBID', tone: 'default' },
]

const CLINICAL_REASONING: readonly ClinicalReasoning[] = [
  {
    title: 'Pneumonia komunitas lobus bawah kanan',
    type: 'DIAGNOSIS KERJA',
    summary:
      'Paling sesuai karena ada demam, batuk produktif, ronki lokal, desaturasi, leukositosis, dan infiltrat fokal.',
    tone: 'primary',
  },
  {
    title: 'Bronkopneumonia bakterial',
    type: 'DIAGNOSIS BANDING',
    summary:
      'Masih mungkin bila distribusi infiltrat lebih menyebar, namun temuan saat ini lebih fokal di basal kanan.',
    tone: 'warning',
  },
  {
    title: 'ISPA virus dengan superinfeksi sekunder',
    type: 'DIAGNOSIS BANDING',
    summary:
      'Dipertimbangkan karena awalnya diawali gejala saluran napas atas, tetapi bukti bakteri lebih dominan.',
    tone: 'muted',
  },
]

const MANAGEMENT_STEPS: readonly ManagementStep[] = [
  {
    title: 'Stabilisasi awal dan monitoring',
    detail:
      'Berikan oksigen nasal kanul untuk target SpO2 94-96 persen, monitor nadi, RR, suhu, dan respons klinis serial.',
    tone: 'urgent',
  },
  {
    title: 'Antibiotik empirik berbasis protokol',
    detail:
      'Hindari amoksisilin. Pilih regimen non-amoksisilin sesuai protokol fasilitas dan verifikasi ulang riwayat alergi beta-laktam sebelum pemberian.',
    tone: 'primary',
  },
  {
    title: 'Terapi suportif dan disposition',
    detail:
      'Berikan antipiretik, cairan adekuat, edukasi tanda bahaya, dan pertimbangkan observasi atau rawat inap karena hipoksemia dan takipnea.',
    tone: 'supportive',
  },
]

const MEDICATION_ORDERS: readonly MedicationOrder[] = [
  {
    name: 'Levofloxacin',
    regimen: '750 mg IV atau PO sesuai protokol fasilitas',
    note: 'Pilihan non-amoksisilin dipertimbangkan setelah verifikasi alergi, fungsi ginjal, dan risiko QT.',
    tone: 'primary',
  },
  {
    name: 'Parasetamol',
    regimen: '500-1000 mg sesuai protokol antipiretik',
    note: 'Untuk kontrol demam dan kenyamanan pasien selama observasi.',
    tone: 'supportive',
  },
]

const MILD_BRANCH: SimulationBranch = {
  label: 'RINGAN',
  severityLabel: 'CAP Ringan',
  headline: 'Rawat jalan dengan monitoring ketat',
  finalAnamnesaText: 'demam, batuk berdahak, dan nyeri dada ringan saat batuk',
  caseMetadata: ['Laki-laki, 29 tahun', 'Keluhan 2 hari', 'Severity ringan'],
  directedHistory: [
    'Demam 38.1 C dengan batuk produktif putih kekuningan, tanpa sesak saat istirahat.',
    'Masih mampu makan minum, tidak ada mual berat, dan tidak ada riwayat rawat inap paru sebelumnya.',
    'Tidak ada penurunan kesadaran, hemoptisis, atau nyeri dada berat.',
  ],
  historyNow: 'Keluhan dominan batuk berdahak dan demam, aktivitas harian masih cukup baik.',
  pastHistory: 'Tanpa komorbid mayor, tanpa riwayat alergi obat bermakna, non-perokok aktif.',
  positiveFlags:
    'Ronki lokal ringan dan infiltrat minimal, tetapi hemodinamik stabil dan oksigenasi baik.',
  negativeFlags: 'Tidak ada hipoksemia, hipotensi, takipnea berat, atau tanda sepsis.',
  allergies: [
    { label: 'Alergi obat', value: 'Tidak ada riwayat bermakna' },
    { label: 'Alergi makanan', value: 'Tidak ada' },
    { label: 'Obat rutin', value: 'Tidak ada' },
  ],
  anamnesaTags: [
    { text: 'Demam', type: 'SYMPTOM' },
    { text: 'Batuk Berdahak', type: 'SYMPTOM' },
    { text: 'Nyeri Dada Ringan', type: 'OBSERVATION' },
  ],
  vitals: [
    { label: 'GCS', value: '15', unit: 'E4V5M6' },
    { label: 'Tekanan Darah', value: '118/76', unit: 'mmHg' },
    { label: 'Nadi', value: '94', unit: 'bpm' },
    { label: 'Napas', value: '20', unit: 'x/m' },
    { label: 'Suhu', value: '38.1', unit: 'C', critical: true },
    { label: 'SpO2', value: '96', unit: '%' },
    { label: 'CRT', value: '< 2', unit: 'detik' },
  ],
  labRecommendations: LAB_RECOMMENDATIONS,
  labResults: [
    {
      name: 'Leukosit',
      value: '11.800/uL',
      interpretation: 'Peningkatan ringan sesuai infeksi awal',
    },
    { name: 'CRP', value: '24 mg/L', interpretation: 'Inflamasi ringan-sedang' },
    {
      name: 'Foto Toraks',
      value: 'Infiltrat minimal lobus bawah kanan',
      interpretation: 'Sesuai CAP ringan',
    },
  ],
  trajectoryPoints: [
    { label: 'Masuk', value: 'SpO2 96% / T 38.1 C' },
    { label: '1 Jam', value: 'SpO2 97% / T 37.8 C' },
    { label: 'Pulang', value: 'SpO2 97% / T 37.5 C' },
  ],
  trajectoryOxygenPolyline: '50,92 180,82 320,74 450,68',
  trajectoryTemperaturePolyline: '50,44 180,58 320,70 450,82',
  trajectoryFinalPoint: { x: 450, y: 68 },
  trajectoryMedications: [
    { name: 'Antibiotik oral', dosage: 'sesuai protokol rawat jalan' },
    { name: 'Antipiretik', dosage: 'sesuai kebutuhan' },
    { name: 'Hidrasi oral', dosage: 'adekuat' },
  ],
  physicalExamRows: [
    {
      organ: 'Kepala & Leher',
      result: 'Faring hiperemis ringan, mukosa lembap, tidak ada deviasi trakea',
    },
    {
      organ: 'Dada (Cor & Pulmo)',
      result: 'Ronki halus basal kanan, tanpa retraksi, ekspansi baik',
    },
    { organ: 'Perut (Abdomen)', result: 'Supel, tanpa nyeri tekan' },
    { organ: 'Ekstremitas', result: 'Akral hangat, perfusi baik, tanpa edema' },
  ],
  anomalyTags: [
    { text: 'Suhu 38.1 C', type: 'FEBRILE', tone: 'warning' },
    { text: 'Infiltrat minimal', type: 'IMAGING', tone: 'default' },
    { text: 'SpO2 96%', type: 'STABLE OXYGENATION', tone: 'default' },
  ],
  clinicalReasoning: [
    {
      title: 'Pneumonia komunitas ringan',
      type: 'DIAGNOSIS KERJA',
      summary:
        'Gejala respiratorik akut dengan infiltrat minimal dan tanpa red flag berat mendukung cabang ringan.',
      tone: 'primary',
    },
    {
      title: 'Bronkitis akut bakterial',
      type: 'DIAGNOSIS BANDING',
      summary: 'Masih mungkin, tetapi bukti radiologi membuat CAP lebih kuat.',
      tone: 'muted',
    },
  ],
  medications: [
    {
      name: 'Azitromisin oral',
      regimen: 'sesuai protokol fasilitas untuk CAP ringan',
      note: 'Cocok bila pasien stabil, toleransi oral baik, dan tidak ada kontraindikasi.',
      tone: 'primary',
    },
    {
      name: 'Parasetamol',
      regimen: 'sesuai kebutuhan demam/nyeri',
      note: 'Untuk kontrol simptomatik di rumah.',
      tone: 'supportive',
    },
  ],
  therapies: [
    {
      title: 'Edukasi rawat jalan',
      detail:
        'Instruksikan kontrol 24-48 jam atau lebih cepat bila sesak, demam persisten, atau intake menurun.',
      tone: 'supportive',
    },
    {
      title: 'Hidrasi dan istirahat',
      detail: 'Fokus pada asupan cairan, istirahat, dan kepatuhan antibiotik oral.',
      tone: 'supportive',
    },
  ],
  routeTitle: 'Cabang ringan terpilih',
  routeDetail:
    'Pasien memenuhi jalur rawat jalan terstruktur karena oksigenasi stabil dan bukti penyakit masih terbatas.',
  routeReason: 'Severity rendah + hasil penunjang ringan + tanpa red flag mayor.',
  trajectoryInsight:
    'Respons cepat terhadap terapi suportif dan tidak ada kebutuhan oksigen membuat observasi singkat di IGD cukup sebelum pulang terencana.',
}

const SEVERE_BRANCH: SimulationBranch = {
  label: 'BERAT',
  severityLabel: 'CAP Berat',
  headline: 'Rawat inap intensif dengan bundle sepsis/respirasi',
  finalAnamnesaText:
    'demam tinggi, batuk produktif pekat, sesak berat saat istirahat, dan lemah umum progresif',
  caseMetadata: ['Perempuan, 68 tahun', 'Keluhan 4 hari', 'Severity berat'],
  directedHistory: [
    'Demam tinggi menetap, napas cepat, dan keluarga melihat pasien tampak mengantuk sejak pagi.',
    'Sesak muncul saat istirahat, intake sangat menurun, dan ada riwayat hipertensi serta diabetes.',
    'Batuk berdahak pekat tanpa hemoptisis, tetapi terdapat nyeri pleuritik dan kelemahan menyeluruh.',
  ],
  historyNow: 'Distres napas meningkat cepat, aktivitas sangat terbatas, dan intake oral buruk.',
  pastHistory: 'Hipertensi dan diabetes melitus tipe 2, dengan riwayat ruam setelah amoksisilin.',
  positiveFlags:
    'Hipoksemia berat, takipnea, takikardia, hipotensi relatif, dan infiltrat multilobar.',
  negativeFlags:
    'Belum ada henti napas atau penurunan GCS berat, tetapi risiko dekompensasi tinggi.',
  allergies: [
    { label: 'Alergi obat', value: 'Amoksisilin (ruam menyeluruh)', alert: true },
    { label: 'Komorbid', value: 'Hipertensi + DM tipe 2' },
    { label: 'Obat rutin', value: 'Amlodipin, metformin' },
  ],
  anamnesaTags: [
    { text: 'Sesak Saat Istirahat', type: 'RED FLAG' },
    { text: 'Demam Tinggi Persisten', type: 'SYMPTOM' },
    { text: 'Lemah Umum', type: 'SYSTEMIC' },
    { text: 'Produktif Pekat', type: 'SYMPTOM' },
  ],
  vitals: [
    { label: 'GCS', value: '14', unit: 'E4V4M6', critical: true },
    { label: 'Tekanan Darah', value: '98/64', unit: 'mmHg', critical: true },
    { label: 'Nadi', value: '124', unit: 'bpm', critical: true },
    { label: 'Napas', value: '32', unit: 'x/m', critical: true },
    { label: 'Suhu', value: '39.2', unit: 'C', critical: true },
    { label: 'SpO2', value: '86', unit: '%', critical: true },
    { label: 'CRT', value: '> 2', unit: 'detik', critical: true },
  ],
  labRecommendations: LAB_RECOMMENDATIONS,
  labResults: [
    { name: 'Leukosit', value: '19.400/uL', interpretation: 'Leukositosis berat', alert: true },
    { name: 'CRP', value: '168 mg/L', interpretation: 'Inflamasi berat', alert: true },
    {
      name: 'Foto Toraks',
      value: 'Infiltrat multilobar bilateral',
      interpretation: 'Sesuai CAP berat',
      alert: true,
    },
  ],
  trajectoryPoints: [
    { label: 'Masuk', value: 'SpO2 86% / T 39.2 C' },
    { label: '30 Menit O2', value: 'SpO2 91% / T 38.9 C' },
    { label: '2 Jam', value: 'SpO2 93% / T 38.4 C' },
  ],
  trajectoryOxygenPolyline: '50,136 180,116 320,96 450,84',
  trajectoryTemperaturePolyline: '50,28 180,40 320,54 450,68',
  trajectoryFinalPoint: { x: 450, y: 84 },
  trajectoryMedications: [
    { name: 'Oksigen high flow/NRM', dosage: 'sesuai target saturasi' },
    { name: 'Antibiotik IV', dosage: 'segera setelah kultur/protokol' },
    { name: 'Cairan resusitasi', dosage: 'sesuai evaluasi hemodinamik' },
  ],
  physicalExamRows: [
    {
      organ: 'Kepala & Leher',
      result: 'Mukosa kering, pasien tampak toksik, bicara terputus-putus',
      alert: true,
    },
    {
      organ: 'Dada (Cor & Pulmo)',
      result: 'Ronki kasar bilateral, retraksi ringan, suara napas menurun difus',
      alert: true,
    },
    { organ: 'Perut (Abdomen)', result: 'Supel, bising usus menurun ringan' },
    {
      organ: 'Ekstremitas',
      result: 'Akral lebih dingin, CRT memanjang, perfusi menurun',
      alert: true,
    },
  ],
  anomalyTags: [
    { text: 'SpO2 86%', type: 'SEVERE HYPOXEMIA', tone: 'critical' },
    { text: 'RR 32 x/menit', type: 'RESPIRATORY DISTRESS', tone: 'critical' },
    { text: 'BP 98/64', type: 'HEMODYNAMIC RISK', tone: 'critical' },
    { text: 'Multilobar infiltrate', type: 'IMAGING', tone: 'warning' },
  ],
  clinicalReasoning: [
    {
      title: 'Pneumonia komunitas berat',
      type: 'DIAGNOSIS KERJA',
      summary:
        'Kombinasi hipoksemia berat, takipnea, toksik sistemik, dan infiltrat multilobar mendorong cabang berat.',
      tone: 'primary',
    },
    {
      title: 'Sepsis akibat fokus paru',
      type: 'KOMPLIKASI',
      summary:
        'Perlu disingkirkan aktif dan ditatalaksana paralel karena perfusi mulai turun dan inflamasi sangat tinggi.',
      tone: 'warning',
    },
  ],
  medications: [
    {
      name: 'Antibiotik IV spektrum luas non-amoksisilin',
      regimen: 'sesuai protokol CAP berat dan status alergi',
      note: 'Mulai cepat setelah verifikasi alergi dan pertimbangan kultur bila feasible tanpa menunda terapi.',
      tone: 'urgent',
    },
    {
      name: 'Antipiretik IV/PO',
      regimen: 'sesuai protokol',
      note: 'Untuk kontrol demam sambil stabilisasi respirasi dan hemodinamik.',
      tone: 'supportive',
    },
  ],
  therapies: [
    {
      title: 'Stabilisasi ABC dan oksigenasi',
      detail:
        'Targetkan saturasi dengan high flow atau non-rebreathing mask, dan siapkan eskalasi ventilasi bila gagal.',
      tone: 'urgent',
    },
    {
      title: 'Bundle sepsis/monitoring intensif',
      detail:
        'Pertimbangkan kultur, laktat, gas darah, cairan terukur, dan monitoring ketat di area rawat intensif.',
      tone: 'urgent',
    },
  ],
  routeTitle: 'Cabang berat terpilih',
  routeDetail:
    'Pasien masuk jalur rawat inap intensif karena distress napas, hipoksemia, dan bukti penyakit luas.',
  routeReason: 'Severity tinggi + hasil penunjang berat + red flag multipel.',
  trajectoryInsight:
    'Perbaikan awal setelah oksigen ada, tetapi pasien tetap berisiko tinggi gagal napas dan membutuhkan evaluasi intensif berkelanjutan.',
}

export const SIMULATION_BRANCHES: Record<SeverityKey, SimulationBranch> = {
  ringan: MILD_BRANCH,
  sedang: {
    label: 'SEDANG',
    severityLabel: 'CAP Sedang',
    headline:
      'ARAH KEPUTUSAN KLINIS:\nOBSERVASI KETAT · OKSIGEN · ANTIBIOTIK EMPIRIS · EVALUASI RAWAT INAP',
    finalAnamnesaText: FINAL_ANAMNESA_TEXT,
    caseMetadata: CASE_METADATA,
    directedHistory: DIRECTED_HISTORY,
    historyNow:
      'Dahak makin kental, sesak memburuk pada malam hari, dan belum ada perbaikan dengan obat flu bebas.',
    pastHistory:
      'Hipertensi terkontrol dengan amlodipin, tanpa riwayat PPOK, gagal jantung, atau diabetes.',
    positiveFlags:
      'Hipoksemia ringan, takipnea, dan nyeri pleuritik kanan yang konsisten dengan keterlibatan paru.',
    negativeFlags:
      'Tidak ada penurunan kesadaran, hipotensi, hemoptisis, sianosis berat, atau nyeri dada tipe ACS.',
    allergies: [
      { label: 'Alergi obat', value: 'Amoksisilin (ruam)', alert: true },
      { label: 'Alergi makanan', value: 'Tidak bermakna' },
      { label: 'Obat rutin', value: 'Amlodipin 10 mg' },
    ],
    anamnesaTags: ANAMNESA_TAGS,
    vitals: VITALS,
    labRecommendations: LAB_RECOMMENDATIONS,
    labResults: LAB_RESULTS,
    trajectoryPoints: TRAJECTORY_POINTS,
    trajectoryOxygenPolyline: '50,120 180,95 320,70 450,55',
    trajectoryTemperaturePolyline: '50,35 180,55 320,75 450,90',
    trajectoryFinalPoint: { x: 450, y: 55 },
    trajectoryMedications: TRAJECTORY_MEDICATIONS,
    physicalExamRows: PHYSICAL_EXAM_ROWS,
    anomalyTags: ANOMALY_TAGS,
    clinicalReasoning: CLINICAL_REASONING,
    medications: MEDICATION_ORDERS,
    therapies: MANAGEMENT_STEPS,
    routeTitle: 'Cabang sedang terpilih',
    routeDetail:
      'Pasien memerlukan observasi/rawat inap karena desaturasi ringan, takipnea, dan infiltrat fokal yang jelas.',
    routeReason: 'Severity sedang + kebutuhan oksigen awal + bukti CAP terkonfirmasi.',
    trajectoryInsight:
      'Respons awal terhadap oksigen dan terapi suportif terlihat membaik, tetapi kombinasi hipoksemia ringan, takipnea, dan infiltrat fokal tetap membuat kasus ini lebih aman diposisikan sebagai pneumonia yang perlu observasi ketat dan evaluasi lanjut.',
  },
  berat: SEVERE_BRANCH,
}
