// Designed and constructed by Drferdi.
/**
 * ABCDE Action Protocols — Clinical Pattern-Matching Engine (v2).
 *
 * 9 structured emergency action protocols for FKTP (Puskesmas).
 * Each protocol follows ABCDE (Airway, Breathing, Circulation, Disability, Exposure)
 * with FKTP-appropriate steps.
 *
 * ALL content transcribed 1:1 from:
 *   docs/specs/assist-gate 2-detect-trigger-action.md
 *
 * DO NOT modify thresholds or clinical recommendations without dr. Ferdi review.
 *
 * @module lib/emergency-detector/action-protocols
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** ABCDE phase identifier. */
export type ABCDEPhase = 'A' | 'B' | 'C' | 'D' | 'E' | 'other';

/** A single action step within a protocol. */
export interface ActionStep {
  /** ABCDE phase this step belongs to */
  phase: ABCDEPhase;
  /** Action description (Indonesian, FKTP-appropriate) */
  action: string;
}

/** A complete emergency action protocol. */
export interface ActionProtocol {
  /** Unique protocol ID */
  id: string;
  /** Protocol name */
  name: string;
  /** Clinical condition this protocol addresses */
  condition: string;
  /** Ordered ABCDE steps */
  steps: ActionStep[];
  /** "Do not do" warnings, kept separate from positive steps */
  contraindications?: string[];
  /** Criteria for referral to RS (hospital) */
  referralCriteria: string[];
  /** Evidence/guideline source */
  source: string;
}

// ---------------------------------------------------------------------------
// 9 ABCDE Protocols — transcribed from spec
// ---------------------------------------------------------------------------

export const ACTION_PROTOCOLS: readonly ActionProtocol[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RESPIRATORY FAILURE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_RESP_FAILURE',
    name: 'Gagal Napas Akut',
    condition: 'RR tinggi (>=25-30) + SpO2 rendah (<90-92) +/- sulit bicara',
    steps: [
      {
        phase: 'A',
        action:
          'Nilai jalan napas: pastikan tidak ada sumbatan, posisikan head tilt-chin lift jika tidak ada kecurigaan trauma leher.',
      },
      {
        phase: 'A',
        action: 'Bila muntah/sekret: miringkan kepala, bersihkan jalan napas.',
      },
      {
        phase: 'B',
        action: 'Pasien duduk tegak (posisi semi-fowler).',
      },
      {
        phase: 'B',
        action: 'Berikan oksigen: masker/simple mask 6-10 L/menit, kalau ada.',
      },
      {
        phase: 'B',
        action: 'Jika asma/COPD: mulai nebulizer bronkodilator sesuai protokol lokal.',
      },
      {
        phase: 'C',
        action: 'Cek nadi, tekanan darah, CRT; bila tanda syok, aktifkan juga paket syok.',
      },
      {
        phase: 'other',
        action: 'Pasang monitor vital sign sederhana, ulang RR/SpO2 tiap beberapa menit.',
      },
      {
        phase: 'other',
        action: 'Panggil dokter sesegera mungkin.',
      },
      {
        phase: 'other',
        action: 'Siapkan rujuk emergensi ke IGD RS, hubungi SPGDT/PSC bila tersedia.',
      },
    ],
    referralCriteria: [
      'SpO2 tetap <90% setelah O2',
      'RR tetap >=30',
      'Sulit bicara / silent chest',
      'Penurunan kesadaran',
    ],
    source: 'PMK 47/2018, WHO Emergency Triage',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SYOK (SHOCK)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_SHOCK',
    name: 'Syok',
    condition: 'SBP <90-100 atau MAP <65 + HR tinggi + CRT memanjang / kulit dingin',
    steps: [
      {
        phase: 'A',
        action:
          'Pastikan jalan napas terbuka, posisi sesuai (supinasi dengan sedikit elevasi kaki bila bukan gagal napas).',
      },
      {
        phase: 'B',
        action: 'Berikan oksigen 6-10 L/menit.',
      },
      {
        phase: 'C',
        action:
          'Baringkan pasien, angkat kaki (Trendelenburg modifikasi) bila tidak dicurigai trauma tulang belakang.',
      },
      {
        phase: 'C',
        action: 'Hentikan perdarahan luar bila ada (tekan langsung, balut tekan).',
      },
      {
        phase: 'C',
        action:
          'Pasang infus besar (NaCl 0,9% atau Ringer Laktat) dan mulai cairan sesuai SOP lokal.',
      },
      {
        phase: 'other',
        action: 'Pantau vital sign tiap beberapa menit.',
      },
      {
        phase: 'other',
        action: 'Siapkan dokumen dan komunikasi rujuk emergensi ke RS; aktifkan SPGDT.',
      },
    ],
    referralCriteria: [
      'SBP tetap <90 setelah cairan awal',
      'MAP tetap <65',
      'Penurunan kesadaran',
      'Perdarahan tidak terkontrol',
    ],
    source: 'PMK 47/2018, MSF Shock Guidelines',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SEPSIS BERAT / EARLY SEPSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_SEPSIS',
    name: 'Sepsis Berat / Early Sepsis',
    condition: 'Demam/hipotermia + HR >90 + RR >=22 + (SBP <=100 atau mental status turun)',
    steps: [
      {
        phase: 'A',
        action: 'Pastikan jalan napas terbuka.',
      },
      {
        phase: 'B',
        action: 'Oksigen bila RR tinggi/SpO2 turun.',
      },
      {
        phase: 'C',
        action: 'Cek BP berulang, nadi, CRT; bila SBP <90, ikuti paket syok.',
      },
      {
        phase: 'D',
        action: 'Cek kesadaran, gula darah (hipo/hiper).',
      },
      {
        phase: 'other',
        action: 'Mulai cairan IV bila ada tanda hipoperfusi (tunduk ke panduan lokal).',
      },
      {
        phase: 'other',
        action: 'Segera dokter review; jangan pulangkan begitu saja.',
      },
      {
        phase: 'other',
        action: 'Bila kecurigaan sepsis berat/septic shock kuat, rujuk ke RS secepatnya.',
      },
    ],
    referralCriteria: [
      'SBP <=100 persisten',
      'AVPU != A (penurunan kesadaran)',
      'qSOFA >= 2',
      'Tidak membaik setelah cairan awal',
    ],
    source: 'qSOFA (JAMA 2016), Surviving Sepsis Campaign 2021',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ANAFILAKSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_ANAPHYLAXIS',
    name: 'Anafilaksis',
    condition: 'Paparan alergen + gejala kulit/mukosa + sesak/SpO2 turun atau SBP turun',
    steps: [
      {
        phase: 'A',
        action:
          'Nilai jalan napas; bila ada pembengkakan lidah/laring, posisi duduk tegak, siapkan jalan napas darurat.',
      },
      {
        phase: 'B',
        action: 'Oksigen 6-10 L/menit.',
      },
      {
        phase: 'C',
        action: 'Adrenalin IM segera (0,3-0,5 mg IM dewasa — detail dosis mengacu panduan lokal).',
      },
      {
        phase: 'C',
        action: 'Pasang infus, mulai cairan (NaCl/RL).',
      },
      {
        phase: 'other',
        action: 'Pantau vital sign ketat.',
      },
      {
        phase: 'other',
        action: 'Rujuk emergensi (IGD) tanpa menunggu lama.',
      },
      {
        phase: 'other',
        action: 'Dokumentasikan waktu pemberian adrenalin dan respon pasien.',
      },
    ],
    referralCriteria: [
      'Semua kasus anafilaksis harus dirujuk',
      'Risiko biphasic reaction dalam 8-12 jam',
      'SBP <90 atau SpO2 <94 setelah adrenalin',
    ],
    source: 'WHO Anaphylaxis Guidelines, EAACI 2021',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ACS / INFARK
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_ACS',
    name: 'ACS / Infark Miokard',
    condition: 'Nyeri dada khas + keringat dingin +/- HR/BP abnormal',
    steps: [
      {
        phase: 'A',
        action: 'Pastikan jalan napas terbuka.',
      },
      {
        phase: 'B',
        action: 'Oksigen bila SpO2 <94%.',
      },
      {
        phase: 'C',
        action: 'Pantau BP, HR, ritme (kalau ada monitor).',
      },
      {
        phase: 'other',
        action: 'Jangan biarkan pasien berjalan/berdiri.',
      },
      {
        phase: 'other',
        action:
          'Beri obat awal sesuai panduan PPK FKTP (mis: aspirin bila tidak kontraindikasi; detail dosis merujuk PPK resmi).',
      },
      {
        phase: 'other',
        action:
          'Rujuk segera ke RS yang punya fasilitas penanganan ACS (lebih baik yang punya cath lab).',
      },
    ],
    referralCriteria: [
      'Semua kasus suspected ACS harus dirujuk',
      'Nyeri dada >20 menit tidak membaik',
      'SBP <90 atau >180',
      'Aritmia',
    ],
    source: 'AHA/ACC Guidelines 2021, PPK FKTP',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. STROKE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_STROKE',
    name: 'Stroke',
    condition: 'Defisit neurologis fokal mendadak +/- BP tinggi, +/- kesadaran menurun',
    steps: [
      {
        phase: 'A',
        action: 'Pastikan jalan napas terbuka.',
      },
      {
        phase: 'B',
        action: 'Berikan oksigen bila ada hipoksia.',
      },
      {
        phase: 'C',
        action: 'Pantau BP; jangan turunkan agresif di FKTP tanpa indikasi khusus.',
      },
      {
        phase: 'other',
        action: 'Catat waktu onset gejala (last known well).',
      },
      {
        phase: 'other',
        action: 'Jaga kepala agak tinggi (sekitar 30 derajat) bila kesadaran menurun.',
      },
      {
        phase: 'other',
        action: 'Rujuk secepat mungkin (time critical — door-to-needle window).',
      },
      {
        phase: 'other',
        action:
          'BP tinggi BUKAN alasan menahan rujukan; penurunan TD agresif di FKTP tidak direkomendasikan.',
      },
    ],
    referralCriteria: [
      'Semua kasus suspected stroke harus dirujuk SEGERA',
      'Time-critical: golden hour untuk trombolisis',
      'AVPU != A',
      'Gejala progresif',
    ],
    source: 'AHA/ASA Stroke Guidelines, PERDOSSI',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. DKA / HHS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_DKA_HHS',
    name: 'DKA / HHS',
    condition: 'Pasien DM + napas cepat/dalam + lemas/mual, vital sign abnormal',
    steps: [
      {
        phase: 'A',
        action: 'Pastikan jalan napas terbuka.',
      },
      {
        phase: 'B',
        action: 'Oksigen bila sesak atau SpO2 turun.',
      },
      {
        phase: 'C',
        action: 'Pasang infus dan mulai cairan (NaCl 0,9% sesuai SOP lokal).',
      },
      {
        phase: 'D',
        action: 'Cek gula darah kapiler.',
      },
      {
        phase: 'other',
        action: 'Jangan berikan insulin mandiri di FKTP kecuali ada panduan/kompetensi yang jelas.',
      },
      {
        phase: 'other',
        action: 'Rujuk emergensi ke RS dengan fasilitas rawat inap/ICU.',
      },
    ],
    referralCriteria: [
      'Semua kasus suspected DKA/HHS harus dirujuk',
      'Glucose >300 dengan gejala metabolik',
      'Napas Kussmaul',
      'Penurunan kesadaran',
      'Dehidrasi berat',
    ],
    source: 'PERKENI 2024, ADA Standards of Care 2026',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. HIPOGLIKEMIA SEDANG-BERAT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_HYPOGLYCEMIA',
    name: 'Hipoglikemia Sedang-Berat',
    condition: 'Gula darah rendah + perubahan kesadaran/gelisah/kejang',
    steps: [
      {
        phase: 'A',
        action: 'Pastikan jalan napas, posisi miring bila muntah.',
      },
      {
        phase: 'B',
        action: 'Oksigen bila perlu.',
      },
      {
        phase: 'C',
        action: 'Cek gula darah.',
      },
      {
        phase: 'D',
        action: 'Bila pasien masih bisa minum: berikan glukosa oral cepat serap (air gula/juice).',
      },
      {
        phase: 'D',
        action:
          'Bila tidak bisa minum: berikan terapi IV sesuai panduan lokal (glukosa IV — detail dosis merujuk PPK).',
      },
      {
        phase: 'other',
        action: 'Observasi ketat, ulang gula darah.',
      },
      {
        phase: 'other',
        action: 'Rujuk bila tidak membaik atau etiologi serius.',
      },
    ],
    referralCriteria: [
      'Tidak membaik setelah 2-3 siklus 15-15 rule',
      'Penurunan kesadaran persisten',
      'Kejang',
      'Etiologi tidak jelas',
    ],
    source: 'PERKENI 2024, ADA 15-15 Rule',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. CARDIAC ARREST / NYARIS HENTI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_CARDIAC_ARREST',
    name: 'Cardiac Arrest / Nyaris Henti',
    condition: 'Tidak respons, tidak napas normal, tidak ada nadi',
    steps: [
      {
        phase: 'A',
        action: 'Cek respon dan napas; bila tidak ada napas normal, lanjut CPR.',
      },
      {
        phase: 'other',
        action: 'Aktifkan SPGDT/EMS dan minta AED bila ada.',
      },
      {
        phase: 'other',
        action:
          'Mulai RJP (CPR) sesuai algoritme (kompresi dada, ventilasi jika terlatih dan ada alat).',
      },
      {
        phase: 'other',
        action: 'Lanjutkan sampai sistem rujukan tiba / alat lanjutan tersedia.',
      },
    ],
    referralCriteria: [
      'Semua kasus cardiac arrest: aktifkan SPGDT/EMS segera',
      'Lanjutkan CPR sampai bantuan datang',
    ],
    source: 'AHA BLS Guidelines 2020, PMK 47/2018',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. HIPERTENSI EMERGENSI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_HTN_EMERGENCY',
    name: 'Hipertensi Emergensi',
    condition:
      'Krisis hipertensi bertahap — TD sangat tinggi dengan atau tanpa kerusakan organ target',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen bila SpO2 rendah atau distress.' },
      {
        phase: 'C',
        action:
          'Ukur ulang TD dengan teknik benar; identifikasi gejala organ target — nyeri dada (ACS/diseksi), defisit neurologis (stroke), edema paru, tanda AKI, kehamilan/preeklampsia.',
      },
      {
        phase: 'other',
        action:
          'Bila ada gejala organ target di atas: MERAH — siapkan rujuk untuk terapi antihipertensi IV terpantau.',
      },
      {
        phase: 'other',
        action:
          'Bila asimtomatik tanpa bukti kerusakan organ: JANGAN turunkan TD cepat di triase. Nilai kepatuhan obat, atur ulang pengukuran dan follow-up/rujukan sesuai SOP.',
      },
    ],
    contraindications: [
      'Jangan menurunkan TD secara cepat/agresif pada pasien asimtomatik tanpa bukti kerusakan organ target.',
    ],
    referralCriteria: [
      'Nyeri dada ACS/diseksi aorta',
      'Defisit neurologis akut / stroke',
      'Ensefalopati hipertensif',
      'Edema paru akut',
      'Tanda AKI (acute kidney injury)',
      'Kehamilan dengan TD ≥160/110 atau gejala preeklampsia berat',
    ],
    source: 'AHA 2024 Hypertensive Emergency Guidelines',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. PREEKLAMPSIA BERAT / EKLAMSIA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_PREECLAMPSIA_ECLAMPSIA',
    name: 'Preeklampsia Berat / Eklamsia',
    condition:
      'Kehamilan + TD tinggi ± gejala berat (nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, sesak/edema paru, kejang, oliguria)',
    steps: [
      {
        phase: 'A',
        action:
          'Miringkan pasien ke kiri bila kejang, pastikan jalan napas, pasang OPA jika kejang aktif.',
      },
      { phase: 'B', action: 'Oksigen.' },
      { phase: 'C', action: 'Ukur ulang TD dengan teknik benar; pasang akses IV.' },
      {
        phase: 'D',
        action:
          'Nilai gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium/RUQ, kejang, oliguria; cek trombosit/SGOT bila tersedia.',
      },
      {
        phase: 'other',
        action:
          'Bila TD berat (≥160/110) atau ada gejala berat: MERAH — berikan MgSO4 untuk profilaksis/terapi kejang sesuai SOP, berikan antihipertensi yang aman untuk kehamilan (nifedipin/metildopa) sesuai SOP, rujuk ke FKRTL setelah stabilisasi awal.',
      },
    ],
    contraindications: [
      'Jangan menunda pemberian MgSO4 pada eklamsia/preeklampsia berat dengan alasan menunggu hasil lab.',
      'Jangan gunakan antihipertensi yang tidak aman untuk kehamilan.',
    ],
    referralCriteria: [
      'TD sistolik ≥160 atau diastolik ≥110 pada kehamilan',
      'Kejang (eklamsia)',
      'Gejala berat: nyeri kepala hebat, gangguan visual, nyeri epigastrium, sesak/edema paru, oliguria',
    ],
    source: 'Kemenkes RI (Pedoman Hipertensi dalam Kehamilan)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. DENGUE BERAT / SYOK DENGUE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_DENGUE_SHOCK',
    name: 'Dengue Berat / Syok Dengue',
    condition: 'Demam + tanda perdarahan + tanda syok, curiga dengue berat',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen.' },
      {
        phase: 'C',
        action:
          'Pasang akses IV, berikan cairan kristaloid isotonik secara hati-hati sesuai fase penyakit dan respons klinis, pantau nadi/TD/CRT/diuresis ketat.',
      },
      { phase: 'other', action: 'Rujuk ke RS dengan kemampuan tata laksana dengue berat.' },
    ],
    contraindications: [
      'Hindari NSAID dan aspirin (risiko perdarahan).',
      'Hindari pemberian cairan berlebihan tanpa pemantauan ketat (risiko overload saat fase kebocoran plasma reda).',
    ],
    referralCriteria: [
      'Tanda syok (TD turun, nadi cepat lemah, CRT memanjang)',
      'Perdarahan bermakna',
      'Diuresis menurun',
      'Tidak respons terhadap resusitasi cairan awal',
    ],
    source: 'WHO Dengue Guidelines / PAHO-WHO Dengue Management Algorithm',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. MENINGITIS / SEPSIS MENINGOKOKUS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_MENINGITIS_MENINGOCOCCAL_SEPSIS',
    name: 'Meningitis / Sepsis Meningokokus',
    condition: 'Demam + kaku kuduk/penurunan kesadaran, atau demam + petekie + toksik',
    steps: [
      { phase: 'A', action: 'Terapkan isolasi droplet bila dicurigai meningokokus.' },
      { phase: 'B', action: 'Oksigen bila diperlukan.' },
      { phase: 'C', action: 'Pasang akses IV.' },
      { phase: 'D', action: 'Koreksi hipoglikemia dan kejang bila ada.' },
      {
        phase: 'other',
        action:
          'Berikan antibiotik parenteral segera bila tersedia sesuai SOP — jangan menunggu hasil pemeriksaan penunjang untuk memulai terapi.',
      },
      { phase: 'other', action: 'Rujuk segera ke RS.' },
    ],
    contraindications: [
      'Jangan menunda pemberian antibiotik untuk menunggu hasil laboratorium/pencitraan.',
    ],
    referralCriteria: [
      'Semua kasus suspek meningitis/sepsis meningokokus harus dirujuk segera',
      'Petekie yang meluas, tanda syok, atau penurunan kesadaran progresif',
    ],
    source: 'WHO 2025 Meningitis Guidelines (target antibiotik dalam 1 jam)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. EKSASERBASI ASMA / COPD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_ASTHMA_COPD_EXACERBATION',
    name: 'Eksaserbasi Asma / COPD',
    condition: 'Sesak + wheezing/silent chest, riwayat asma atau COPD, RR/SpO2 abnormal',
    steps: [
      { phase: 'A', action: 'Posisikan pasien duduk tegak.' },
      {
        phase: 'B',
        action:
          'Untuk asma berat: SABA inhalasi/nebulisasi berulang, tambahkan ipratropium, oksigen terkontrol, kortikosteroid sistemik diberikan dini.',
      },
      {
        phase: 'B',
        action:
          'Untuk COPD: bronkodilator kerja pendek, oksigen terkontrol (hati-hati target SpO2 88-92% bila risiko retensi CO2), steroid sistemik/antibiotik sesuai indikasi dan SOP.',
      },
      {
        phase: 'other',
        action:
          'Rujuk bila berat, respons buruk terhadap terapi awal, silent chest, mengantuk, atau bingung.',
      },
    ],
    contraindications: [
      'Jangan memberikan oksigen tanpa target/tanpa titrasi pada pasien COPD berisiko retensi CO2 — gunakan target saturasi konservatif sesuai SOP.',
    ],
    referralCriteria: [
      'Silent chest',
      'Mengantuk berat atau bingung (tanda kelelahan napas)',
      'Tidak respons terhadap bronkodilator + steroid awal',
      'SpO2 tetap rendah setelah terapi',
    ],
    source: 'GINA 2025 (Global Initiative for Asthma), GOLD 2026 (COPD)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. EPIGLOTITIS / OBSTRUKSI LARING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_UPPER_AIRWAY_OBSTRUCTION',
    name: 'Epiglotitis / Obstruksi Laring',
    condition: 'Sulit napas + suara serak/stridor, curiga obstruksi jalan napas atas',
    steps: [
      {
        phase: 'A',
        action:
          'JANGAN memaksa pemeriksaan tenggorok. Biarkan pasien pada posisi paling nyaman baginya — jangan dibaringkan bila memperburuk gejala.',
      },
      { phase: 'B', action: 'Berikan oksigen tanpa memprovokasi pasien.' },
      {
        phase: 'other',
        action: 'Siapkan rujukan emergensi dengan notifikasi RS tujuan terlebih dahulu.',
      },
    ],
    contraindications: [
      'Jangan memeriksa tenggorok secara paksa (dapat memicu spasme laring total).',
      'Jangan memaksa posisi berbaring bila pasien merasa lebih nyaman duduk/tegak.',
    ],
    referralCriteria: [
      'Semua kasus suspek epiglotitis/obstruksi laring harus dirujuk emergensi dengan notifikasi RS',
    ],
    source: 'Praktik klinis standar tata laksana jalan napas atas darurat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. EMBOLI PARU / DISEKSI AORTA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_PE_AORTIC_DISSECTION',
    name: 'Emboli Paru / Diseksi Aorta',
    condition:
      'Nyeri dada non-ACS yang berpotensi mematikan — sesak mendadak (curiga PE) atau nyeri dada/punggung robek mendadak (curiga diseksi aorta)',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen; EKG 12 sadapan bila tersedia.' },
      {
        phase: 'C',
        action:
          'Nilai tanda syok, hipotensi, atau hipertensi berat; nilai defisit nadi/neurologis (diseksi) atau faktor risiko PE (postpartum, hemoptisis, unilateral leg swelling).',
      },
      {
        phase: 'other',
        action:
          'JANGAN menunda rujukan untuk menunggu pemeriksaan penunjang lokal. Analgesia sesuai SOP untuk diseksi aorta. Rujuk emergensi.',
      },
    ],
    contraindications: [
      'Hindari bolus cairan agresif pada dugaan diseksi aorta kecuali pasien syok.',
      'Jangan menunda rujukan untuk mengejar kepastian diagnosis di fasilitas primer.',
    ],
    referralCriteria: [
      'Hipotensi atau sinkop dengan dugaan PE',
      'SpO2 rendah dengan dugaan PE',
      'Nyeri dada/punggung robek mendadak dengan defisit nadi/neurologis',
      'Hipertensi berat dengan nyeri dada/punggung mendadak hebat',
    ],
    source: 'AHA/ACC Guidelines (Acute Aortic Syndrome, Pulmonary Embolism)',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. RED FLAG NEUROLOGIS (SAH / CEDERA KEPALA BERAT)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_NEURO_RED_FLAG',
    name: 'Red Flag Neurologis (SAH / Cedera Kepala Berat)',
    condition:
      "Nyeri kepala thunderclap mendadak, atau cedera kepala dengan tanda peningkatan TIK (Cushing's Triad)",
    steps: [
      { phase: 'A', action: 'Imobilisasi servikal bila ada riwayat trauma.' },
      { phase: 'B', action: 'Oksigen.' },
      { phase: 'C', action: 'Elevasi kepala tempat tidur bila pasien tidak hipotensi.' },
      { phase: 'D', action: 'Kontrol kejang dan muntah sesuai SOP.' },
      { phase: 'other', action: 'Rujuk emergensi segera.' },
    ],
    contraindications: ['Jangan mengelevasi kepala bila pasien hipotensi/syok.'],
    referralCriteria: [
      'Semua kasus suspek SAH (nyeri kepala thunderclap) atau cedera kepala berat harus dirujuk emergensi',
    ],
    source: 'NICE Head Injury Guideline',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. CAUDA EQUINA SYNDROME
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_CAUDA_EQUINA',
    name: 'Cauda Equina Syndrome',
    condition:
      'Retensi/inkontinensia urin baru, gangguan BAB, saddle anesthesia, kelemahan tungkai bilateral progresif, nyeri radikular berat',
    steps: [
      {
        phase: 'other',
        action:
          'Dokumentasikan onset gejala dan temuan neurologis secara rinci (kekuatan motorik, sensasi saddle, tonus sfingter bila memungkinkan).',
      },
      { phase: 'other', action: 'Berikan analgesia yang aman sesuai SOP.' },
      {
        phase: 'other',
        action:
          'Rujuk segera untuk MRI dan evaluasi bedah saraf/ortopedi — ini bukan kasus observasi di Puskesmas.',
      },
    ],
    contraindications: [
      'Jangan menahan pasien untuk observasi di Puskesmas — ini kondisi time-critical yang butuh MRI dan bedah saraf/ortopedi segera.',
    ],
    referralCriteria: ['Semua kasus dengan kecurigaan cauda equina syndrome harus dirujuk segera'],
    source: 'GIRFT (Getting It Right First Time) Cauda Equina Syndrome Pathway 2026',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. KEGAWATAN ABDOMEN OBSTETRI (KET / ABORTUS)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_OBSTETRIC_ABDOMEN_BLEEDING',
    name: 'Kegawatan Abdomen Obstetri (KET / Abortus)',
    condition: 'Hamil (atau dugaan hamil) + nyeri perut + perdarahan',
    steps: [
      { phase: 'A', action: 'Pastikan jalan napas terbuka.' },
      { phase: 'B', action: 'Oksigen bila diperlukan.' },
      {
        phase: 'C',
        action:
          'Lakukan tes kehamilan bila status belum jelas; nilai tanda syok/perdarahan; pasang akses IV; berikan cairan bila hemodinamik tidak stabil.',
      },
      { phase: 'other', action: 'Rujuk untuk USG dan evaluasi lanjutan.' },
    ],
    contraindications: [
      'Jangan menunda rujukan untuk menunggu USG/lab lokal bila pasien syok, nyeri hebat, sinkop, atau perdarahan aktif.',
    ],
    referralCriteria: [
      'Tanda syok atau hemodinamik tidak stabil',
      'Nyeri perut hebat',
      'Sinkop',
      'Perdarahan aktif bermakna',
    ],
    source: 'Praktik klinis standar kegawatan obstetri-ginekologi',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. DEPRESI NAPAS AKIBAT OBAT / OVERDOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_TOX_RESP_DEPRESSION',
    name: 'Depresi Napas Akibat Obat / Overdosis',
    condition: 'RR rendah/borderline + mengantuk berat, curiga overdosis obat',
    steps: [
      { phase: 'A', action: 'Posisikan jalan napas terbuka; posisi miring bila risiko muntah.' },
      {
        phase: 'B',
        action:
          'Berikan bantuan napas dengan bag-valve-mask bila ventilasi tidak adekuat; oksigen.',
      },
      {
        phase: 'D',
        action:
          'Cek gula darah sewaktu; berikan nalokson bila curiga overdosis opioid dan tersedia, sesuai SOP.',
      },
      { phase: 'other', action: 'Observasi ketat, rujuk.' },
    ],
    contraindications: [
      'Jangan mengandalkan nalokson tunggal tanpa terus memantau jalan napas — efeknya bisa lebih pendek dari opioid penyebab (risiko relaps depresi napas).',
    ],
    referralCriteria: [
      'Ventilasi tidak adekuat meski sudah dibantu',
      'Tidak respons terhadap nalokson (bila diberikan)',
      'Penurunan kesadaran menetap',
    ],
    source: 'Praktik BLS/toksikologi klinis standar',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. RISIKO TERSEMBUNYI PADA LANSIA (ORTOSTATIK / FRAILTY)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_GERIATRIC_OCCULT_RISK',
    name: 'Risiko Tersembunyi pada Lansia (Ortostatik / Frailty)',
    condition:
      'Hipotensi ortostatik, atau frailty dengan tanda vital naik perlahan — tidak boleh dianggap "hijau" hanya karena angka tidak ekstrem',
    steps: [
      { phase: 'C', action: 'Cek tekanan darah/nadi ortostatik bila aman untuk dilakukan.' },
      { phase: 'D', action: 'Cek gula darah sewaktu.' },
      {
        phase: 'other',
        action:
          'Nilai hidrasi, obat-obatan yang dikonsumsi, kemungkinan infeksi tersembunyi, delirium, riwayat jatuh, dan asupan makan/minum.',
      },
    ],
    contraindications: [
      'Jangan menyimpulkan "stabil/aman" hanya berdasarkan angka vital yang belum mencapai ambang ekstrem pada pasien lansia frail.',
    ],
    referralCriteria: [
      'Pasien frail yang tinggal sendiri',
      'Delirium baru',
      'Hipotensi atau takikardia bermakna',
      'Dehidrasi atau asupan makan/minum gagal',
      'Caregiver menyatakan kekhawatiran signifikan',
    ],
    source: 'Praktik kedokteran gawat darurat geriatri standar',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 22. SAFETY-NET UNTUK KEKHAWATIRAN KLINIS / KODE MERAH OTOMATIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'PROTO_SAFETY_NET_CLINICAL_CONCERN',
    name: 'Safety-Net untuk Kekhawatiran Klinis / Kode Merah Otomatis',
    condition:
      'Kode merah otomatis dari sistem, deteriorasi progresif, vital borderline, nyeri hebat, atau kekhawatiran klinis umum tanpa diagnosis pasti',
    steps: [
      { phase: 'other', action: 'Ulangi pengukuran tanda vital.' },
      { phase: 'other', action: 'Jangan pulangkan pasien sebelum dilakukan reassessment.' },
      { phase: 'other', action: 'Cari kemungkinan diagnosis time-critical yang mungkin terlewat.' },
      {
        phase: 'other',
        action:
          'Rujuk bila nyeri hebat, pasien tampak toksik, tren vital memburuk, pasien/keluarga tampak sangat khawatir, atau data yang ada tidak cukup untuk menyatakan pasien aman.',
      },
    ],
    contraindications: [
      'Jangan memulangkan pasien hanya berdasarkan satu kali pengukuran vital yang tampak normal bila ada kekhawatiran klinis yang jelas.',
    ],
    referralCriteria: [
      'Tren vital memburuk meski belum mencapai ambang kritis',
      'Kekhawatiran klinis kuat dari nakes atau keluarga tanpa diagnosis pasti',
      'Data tidak cukup untuk menyatakan pasien aman dipulangkan',
    ],
    source: 'Prinsip keselamatan pasien umum (clinical safety-netting)',
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup function
// ---------------------------------------------------------------------------

/**
 * Find an action protocol by ID.
 *
 * @param id - Protocol ID (e.g. 'PROTO_RESP_FAILURE')
 * @returns The protocol or undefined if not found
 */
export function getActionProtocol(id: string): ActionProtocol | undefined {
  return ACTION_PROTOCOLS.find((p) => p.id === id);
}
