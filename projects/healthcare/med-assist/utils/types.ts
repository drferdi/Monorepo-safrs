// Designed and constructed by Drferdi.
/**
 * Sentra Assist — Core Type Definitions
 * @sync-with app/primaryhealth/dashboard/src/lib/emr/types.ts (canonical source)
 * Shared types (PageType → RMETransferResult) must stay in sync with dashboard.
 * Run `node scripts/verify-emr-types-sync.js` from repo root to validate.
 */

// Core data structures for Sentra Assist
// Based on SENTRA-SPEC-001 v1.2.0 Section 11.1 & 17

export type PageType = 'anamnesa' | 'diagnosa' | 'resep' | 'unknown';

/**
 * AturanPakai type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type AturanPakai = '1' | '2' | '3' | '4' | '5';
/**
 * DiagnosaJenis type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type DiagnosaJenis = 'PRIMER' | 'SEKUNDER';
/**
 * DiagnosaKasus type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type DiagnosaKasus = 'BARU' | 'LAMA';
/**
 * Prioritas type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type Prioritas = '0' | '1';

// =============================================================================
// HYBRID CLINICAL AUTO-TEXT CONTRACTS
// =============================================================================

export type AnamnesisMissingField =
  | 'keluhan_utama'
  | 'onset'
  | 'lokasi'
  | 'kualitas'
  | 'keparahan'
  | 'faktor_pemicu'
  | 'faktor_peredam';

/**
 * AnamnesisExtractionResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AnamnesisExtractionResult {
  keluhan_utama: string;
  onset: string | null;
  lokasi: string | null;
  kualitas: string | null;
  keparahan: number | null;
  faktor_pemicu: string[];
  faktor_peredam: string[];
  chronology_summary?: string | null;
  associated_symptoms?: string[];
  pertinent_negatives?: string[];
  functional_impact?: string | null;
  red_flag_signs?: string[];
  clinician_questions?: string[];
  data_belum_lengkap: AnamnesisMissingField[];
}

// Encounter state (Section 11.1)
export interface Encounter {
  id: string; // pelayanan_id
  patient_id: string;
  timestamp: string; // ISO datetime
  dokter: {
    id: string;
    nama: string;
  };
  perawat: {
    id: string;
    nama: string;
  };
  anamnesa: {
    keluhan_utama: string;
    keluhan_tambahan: string;
    lama_sakit: {
      thn: number;
      bln: number;
      hr: number;
    };
    is_pregnant?: boolean;
    riwayat_penyakit: string | null;
    alergi: {
      obat: string[];
      makanan: string[];
      udara: string[];
      lainnya: string[];
    };
  };
  diagnosa: {
    icd_x: string;
    nama: string;
    jenis: DiagnosaJenis;
    kasus: DiagnosaKasus;
    prognosa: string;
    penyakit_kronis: string[];
  };
  resep: ResepMedication[];
}

// Medication row (Section 6.3)
export interface ResepMedication {
  racikan: string;
  nama_obat: string;
  jumlah: number;
  signa: string;
  aturan_pakai: AturanPakai;
  keterangan: string;
}

// Fill payloads (Section 17.1)
export interface ResepFillPayload {
  static: {
    no_resep: string;
    alergi: string;
  };
  ajax: {
    ruangan: string;
    dokter: string;
    perawat: string;
  };
  medications: Array<{
    racikan: string;
    jumlah_permintaan: number;
    nama_obat: string;
    jumlah: number;
    signa: string;
    aturan_pakai: AturanPakai;
    keterangan: string;
  }>;
  prioritas: Prioritas;
}

export interface AnatomiTubuhFillItem {
  bagian_tubuh: string;
  keterangan: string;
  confidence: 'high' | 'medium';
  source: 'keluhan' | 'assesmen_nyeri';
}

/**
 * AnamnesaFillPayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface AnamnesaFillPayload {
  keluhan_utama: string; // Singkat
  keluhan_tambahan: string; // Lengkap, minimum 3 baris
  lama_sakit: {
    thn: number;
    bln: number;
    hr: number;
  };
  is_pregnant?: boolean;
  // Riwayat Penyakit (MRiwayatPasien)
  riwayat_penyakit?: {
    sekarang: string; // RPS - Riwayat Penyakit Sekarang
    dahulu: string; // RPD - Riwayat Penyakit Dulu
    keluarga: string; // RPK - Riwayat Penyakit Keluarga
  };
  alergi: {
    obat: string[];
    makanan: string[];
    udara: string[];
    lainnya: string[];
  };
  // Vital Signs (from TTV Inference)
  vital_signs?: {
    tekanan_darah_sistolik: number;
    tekanan_darah_diastolik: number;
    nadi: number;
    respirasi: number;
    suhu: number;
    gula_darah?: number;
    kesadaran?: 'COMPOS MENTIS' | 'SOMNOLEN' | 'SOPOR' | 'COMA';
    map?: number;
    detak_jantung?: 'REGULAR' | 'IREGULAR';
  };
  // Periksa Fisik Extended (GCS, Anthropometrics, SpO2, Activity)
  periksa_fisik?: {
    // GCS - Glasgow Coma Scale (E4V5M6 = 15 normal)
    gcs_membuka_mata: '4' | '3' | '2' | '1'; // 4=Spontan, 3=Dengan perintah, 2=Dengan rangsang nyeri, 1=Tidak ada
    gcs_respon_verbal: '5' | '4' | '3' | '2' | '1'; // 5=Orientasi baik, 4=Bingung, 3=Kata tidak tepat, 2=Suara tanpa arti, 1=Tidak ada
    gcs_respon_motorik: '6' | '5' | '4' | '3' | '2' | '1'; // 6=Mampu bergerak, 5=Melokalisir nyeri, 4=Menarik, 3=Fleksi abnormal, 2=Ekstensi, 1=Tidak ada
    // Anthropometrics (Indonesian averages)
    tinggi: number; // cm - Male: 165-170, Female: 155-160
    berat: number; // kg - Male: 60-70, Female: 50-60
    lingkar_perut: number; // cm - Male: 80-90, Female: 70-85
    imt: number; // Calculated: berat / (tinggi/100)^2
    hasil_imt: 'Kurus' | 'Normal' | 'BB Lebih' | 'Obesitas I' | 'Obesitas II';
    cara_ukur?: string;
    triage?: 'GAWAT DARURAT' | 'DARURAT' | 'TIDAK GAWAT DARURAT' | 'MENINGGAL';
    // SpO2 / Saturasi Oksigen
    saturasi: number; // % - Normal: 95-100
    // Aktivitas Fisik / ADL Assessment (0=Mandiri, 1=Dibantu, 2=Tergantung)
    mobilisasi: '0' | '1' | '2';
    toileting: '0' | '1' | '2';
    makan_minum: '0' | '1' | '2';
    mandi: '0' | '1' | '2';
    berpakaian: '0' | '1' | '2';
    // Assessment Fungsional Textarea
    aktifitas_fisik: string;
  };
  // Assesmen Resiko Jatuh (Get Up and Go)
  resiko_jatuh?: {
    cara_berjalan: '0' | '1'; // 0=Tidak, 1=Ya (sempoyongan/tidak seimbang)
    penopang: '0' | '1'; // 0=Tidak, 1=Ya (memegang penopang saat duduk)
  };
  // Keadaan Fisik (Physical Examination - symptom-dependent)
  keadaan_fisik?: {
    // Each area has checkbox (enabled), inspeksi, and palpasi
    kulit?: { inspeksi: string; palpasi: string };
    kuku?: { inspeksi: string; palpasi: string };
    kepala?: { inspeksi: string; palpasi: string };
    wajah?: { inspeksi: string; palpasi: string };
    mata?: { inspeksi: string };
    telinga?: { inspeksi: string; palpasi: string };
    hidung_sinus?: { inspeksi: string; palpasi_perkusi: string };
    mulut_bibir?: { inspeksi_luar: string; inspeksi_dalam: string };
    leher?: {
      inspeksi: string;
      auskultasi_karotis: string;
      palpasi_tiroid: string;
      auskultasi_bising: string;
    };
    dada_punggung?: {
      inspeksi: string;
      palpasi: string;
      perkusi: string;
      auskultasi: string;
    };
    kardiovaskuler?: {
      inspeksi: string;
      palpasi: string;
      perkusi: string;
      auskultasi: string;
    };
    dada_aksila?: {
      inspeksi_dada: string;
      palpasi_dada: string;
      inspeksi_palpasi_aksila: string;
    };
    abdomen_perut?: {
      inspeksi: string;
      auskultasi: string;
      perkusi_kuadran: string;
      perkusi_hepar: string;
      perkusi_limfa: string;
      perkusi_ginjal: string;
      palpasi_kuadran: string;
    };
    ekstremitas_atas?: { inspeksi: string; palpasi: string };
    ekstremitas_bawah?: { inspeksi: string; palpasi: string };
  };
  // Assesmen Nyeri (Pain Assessment)
  assesmen_nyeri?: {
    merasakan_nyeri: '0' | '1'; // 0=Tidak, 1=Ya
    skala_nyeri: number; // 0-10 (0=Tidak Nyeri, 1-3=Ringan, 4-6=Sedang, 7-10=Berat)
    pencetus?: string; // Faktor pencetus/pemberat nyeri (conditional — tampil jika Ya)
    kualitas?: string; // Kualitas nyeri (conditional)
    lokasi?: string; // Lokasi nyeri (conditional)
    waktu?: '0' | '1'; // 0=Hilang timbul, 1=Intermiten
  };
  anatomi_tubuh?: AnatomiTubuhFillItem[];
  // Lainnya Section
  lainnya?: {
    terapi: string; // Terapi Obat yang dianjurkan (required)
    terapi_non_obat: string; // Terapi Non Obat yang dianjurkan (required)
    bmhp?: string; // BMHP yang digunakan
    rencana_tindakan?: string; // Rencana
    merokok: '0' | '1'; // 0=Tidak, 1=Ya
    konsumsi_alkohol: '0' | '1'; // 0=Tidak, 1=Ya
    kurang_sayur_buah: '0' | '1'; // 0=Tidak, 1=Ya
    edukasi: string; // Edukasi (required)
    askep?: string; // Deskripsi Askep
    observasi?: string; // Observasi
    keterangan?: string; // Keterangan
    biopsikososial?: string; // Biopsikososial
    tindakan_keperawatan?: string; // Tindakan Keperawatan
  };
  // Status Fisis/Neurologis/Mental, Biologis, Psikososiospiritual
  status_psikososial?: {
    alat_bantu_aktrifitas: '1' | '0';
    kendala_komunikasi: '1' | '0';
    merawat_dirumah: '1' | '0';
    membutuhkan_bantuan: '1' | '0';
    bahasa_digunakan: 'indonesia' | 'daerah' | 'lainnya';
    tinggal_dengan: 'sendiri' | 'suami/istri' | 'orangtua' | 'lainnya';
    sosial_ekonomi: 'baik' | 'cukup' | 'kurang';
    gangguan_jiwa_dimasa_lalu: '1' | '0';
    status_ekonomi: 'baik' | 'cukup' | 'kurang';
    hubungan_keluarga?: 'harmonis' | 'tidak harmonis';
  };
  // Tenaga Medis
  tenaga_medis?: {
    dokter_nama: string;
    perawat_nama: string;
  };
}

/**
 * DiagnosaFillPayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface DiagnosaFillPayload {
  icd_x: string;
  nama: string;
  jenis: DiagnosaJenis;
  kasus: DiagnosaKasus;
  prognosa: string;
  penyakit_kronis: string[];
}

// Fill result (Section 17.2)
export interface FillResult {
  success: Array<{
    field: string;
    value: string;
    method: 'direct' | 'autocomplete';
  }>;
  failed: Array<{
    field: string;
    error: string;
  }>;
  skipped: Array<{
    field: string;
    reason: 'readonly' | 'csrf' | 'empty';
  }>;
}

// Page detection result
export interface PageReadyInfo {
  pageType: PageType;
  pelayananId: string | null;
  url: string;
}

// Scrape request/result
export interface ScrapeRequest {
  pageType: PageType;
  fields?: string[];
}

/**
 * ScrapePayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface ScrapePayload {
  pageType: PageType;
  data: unknown;
  timestamp: string;
}

// Field mapping configuration
export interface FieldConfig {
  selector: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'autocomplete';
  required?: boolean;
  readonly?: boolean;
}

/**
 * PageFieldMap interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface PageFieldMap {
  [fieldName: string]: FieldConfig;
}

// =============================================================================
// RME AUTO TRANSFER CONTRACTS
// =============================================================================

export type RMETransferStepStatus = 'anamnesa' | 'diagnosa' | 'resep';

/**
 * RMETransferStepState type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type RMETransferStepState =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * RMETransferErrorClass type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type RMETransferErrorClass = 'recoverable' | 'fatal';

/**
 * RMETransferReasonCode type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type RMETransferReasonCode =
  | 'DUPLICATE_SUPPRESSED'
  | 'USER_CANCELLED'
  | 'NO_ACTIVE_TAB'
  | 'PAGE_NOT_READY'
  | 'STEP_TIMEOUT'
  | 'FIELD_NOT_FOUND'
  | 'NO_FIELDS_FILLED'
  | 'RETRY_EXHAUSTED'
  | 'DIAGNOSA_PAYLOAD_EMPTY'
  | 'RESEP_PAYLOAD_EMPTY'
  | 'RESEP_EMPTY_AFTER_SAFETY'
  | 'RESEP_TRIAD_INCOMPLETE'
  | 'PREGNANCY_UNKNOWN_DEFAULT_FALSE'
  | 'UNKNOWN_STEP_FAILURE';

/**
 * RMETransferStepResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface RMETransferStepResult {
  step: RMETransferStepStatus;
  state: RMETransferStepState;
  attempt: number;
  latencyMs: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  reasonCode?: RMETransferReasonCode;
  errorClass?: RMETransferErrorClass;
  message?: string;
}

/**
 * RMETransferState type
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export type RMETransferState = 'success' | 'partial' | 'failed' | 'cancelled';

/**
 * RMETransferPayload interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface RMETransferPayload {
  anamnesa: AnamnesaFillPayload;
  diagnosa?: DiagnosaFillPayload | null;
  resep?: ResepFillPayload | null;
  options?: {
    requestId?: string;
    forceRun?: boolean;
    idempotencyWindowMs?: number;
    startFromStep?: RMETransferStepStatus;
    onlyStep?: RMETransferStepStatus;
  };
  meta?: {
    reasonCodes?: RMETransferReasonCode[];
    triadComplete?: boolean;
    triadMissingRoles?: Array<'utama' | 'adjuvant' | 'vitamin'>;
  };
}

/**
 * RMETransferResult interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface RMETransferResult {
  runId: string;
  fingerprint: string;
  state: RMETransferState;
  startedAt: string;
  completedAt: string;
  totalLatencyMs: number;
  reasonCodes: RMETransferReasonCode[];
  steps: Record<RMETransferStepStatus, RMETransferStepResult>;
}

/**
 * RMETransferProgressEvent interface
 *
 * @remarks
 * TODO: Add type description and property documentation
 * Auto-generated on 2026-04-15
 */

export interface RMETransferProgressEvent {
  runId: string;
  state: 'running' | 'completed' | 'cancelled';
  transferState: RMETransferState;
  activeStep?: RMETransferStepStatus;
  steps: Record<RMETransferStepStatus, RMETransferStepResult>;
  reasonCodes: RMETransferReasonCode[];
  updatedAt: string;
}
