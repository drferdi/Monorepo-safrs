// Drferdi — vision, brought to life.
/**
 * Sentra EMR Auto-Fill Engine — Type Definitions
 * @canonical-source — This is the SINGLE SOURCE OF TRUTH for EMR bridge types.
 * Ghost Protocol (app/ghost-protocols/utils/types.ts) must mirror shared types.
 * Run `node scripts/verify-emr-types-sync.js` to validate sync.
 */

// ============================================================================
// CORE DOMAIN TYPES (from assist/utils/types.ts)
// ============================================================================

export type PageType = 'anamnesa' | 'diagnosa' | 'resep' | 'unknown'

export type AturanPakai = '1' | '2' | '3' | '4' | '5'
export type DiagnosaJenis = 'PRIMER' | 'SEKUNDER'
export type DiagnosaKasus = 'BARU' | 'LAMA'
export type Prioritas = '0' | '1'

export interface Encounter {
  id: string
  patient_id: string
  timestamp: string
  dokter: { id: string; nama: string }
  perawat: { id: string; nama: string }
  anamnesa: {
    keluhan_utama: string
    keluhan_tambahan: string
    lama_sakit: { thn: number; bln: number; hr: number }
    is_pregnant?: boolean
    riwayat_penyakit: string | null
    alergi: {
      obat: string[]
      makanan: string[]
      udara: string[]
      lainnya: string[]
    }
  }
  diagnosa: {
    icd_x: string
    nama: string
    jenis: DiagnosaJenis
    kasus: DiagnosaKasus
    prognosa: string
    penyakit_kronis: string[]
  }
  resep: ResepMedication[]
}

export interface ResepMedication {
  racikan: string
  nama_obat: string
  jumlah: number
  signa: string
  aturan_pakai: AturanPakai
  keterangan: string
}

// ============================================================================
// FILL PAYLOADS (from assist/utils/types.ts)
// ============================================================================

export interface AnamnesaFillPayload {
  keluhan_utama: string
  keluhan_tambahan: string
  lama_sakit: { thn: number; bln: number; hr: number }
  is_pregnant?: boolean
  riwayat_penyakit?: {
    sekarang: string
    dahulu: string
    keluarga: string
  }
  alergi: {
    obat: string[]
    makanan: string[]
    udara: string[]
    lainnya: string[]
  }
  vital_signs?: {
    tekanan_darah_sistolik: number
    tekanan_darah_diastolik: number
    nadi: number
    respirasi: number
    suhu: number
    gula_darah?: number
    kesadaran?: 'COMPOS MENTIS' | 'SOMNOLEN' | 'SOPOR' | 'COMA'
  }
  periksa_fisik?: {
    gcs_membuka_mata: '4' | '3' | '2' | '1'
    gcs_respon_verbal: '5' | '4' | '3' | '2' | '1'
    gcs_respon_motorik: '6' | '5' | '4' | '3' | '2' | '1'
    tinggi: number
    berat: number
    lingkar_perut: number
    imt: number
    hasil_imt: 'Kurus' | 'Normal' | 'BB Lebih' | 'Obesitas I' | 'Obesitas II'
    saturasi: number
    mobilisasi: '0' | '1' | '2'
    toileting: '0' | '1' | '2'
    makan_minum: '0' | '1' | '2'
    mandi: '0' | '1' | '2'
    berpakaian: '0' | '1' | '2'
    aktifitas_fisik: string
  }
  resiko_jatuh?: {
    cara_berjalan: '0' | '1'
    penopang: '0' | '1'
  }
  keadaan_fisik?: {
    kulit?: { inspeksi: string; palpasi: string }
    kuku?: { inspeksi: string; palpasi: string }
    kepala?: { inspeksi: string; palpasi: string }
    wajah?: { inspeksi: string; palpasi: string }
    mata?: { inspeksi: string }
    telinga?: { inspeksi: string; palpasi: string }
    hidung_sinus?: { inspeksi: string; palpasi_perkusi: string }
    mulut_bibir?: { inspeksi_luar: string; inspeksi_dalam: string }
    leher?: {
      inspeksi: string
      auskultasi_karotis: string
      palpasi_tiroid: string
      auskultasi_bising: string
    }
    dada_punggung?: {
      inspeksi: string
      palpasi: string
      perkusi: string
      auskultasi: string
    }
    kardiovaskuler?: {
      inspeksi: string
      palpasi: string
      perkusi: string
      auskultasi: string
    }
    abdomen_perut?: {
      inspeksi: string
      auskultasi: string
      perkusi_kuadran: string
      perkusi_hepar: string
      perkusi_limfa: string
      perkusi_ginjal: string
      palpasi_kuadran: string
    }
    ekstremitas_atas?: { inspeksi: string; palpasi: string }
    ekstremitas_bawah?: { inspeksi: string; palpasi: string }
  }
  assesmen_nyeri?: {
    merasakan_nyeri: '0' | '1'
    skala_nyeri: number
  }
  lainnya?: {
    terapi: string
    terapi_non_obat: string
    bmhp?: string
    rencana_tindakan?: string
    merokok: '0' | '1'
    konsumsi_alkohol: '0' | '1'
    kurang_sayur_buah: '0' | '1'
    edukasi: string
    askep?: string
    observasi?: string
    keterangan?: string
    biopsikososial?: string
    tindakan_keperawatan?: string
  }
  status_psikososial?: {
    alat_bantu_aktrifitas: '1' | '0'
    kendala_komunikasi: '1' | '0'
    merawat_dirumah: '1' | '0'
    membutuhkan_bantuan: '1' | '0'
    bahasa_digunakan: 'indonesia' | 'daerah' | 'lainnya'
    tinggal_dengan: 'sendiri' | 'suami/istri' | 'orangtua' | 'lainnya'
    sosial_ekonomi: 'baik' | 'cukup' | 'kurang'
    gangguan_jiwa_dimasa_lalu: '1' | '0'
    status_ekonomi: 'baik' | 'cukup' | 'kurang'
    hubungan_keluarga?: 'harmonis' | 'tidak harmonis'
  }
  tenaga_medis?: {
    dokter_nama: string
    perawat_nama: string
  }
}

export interface DiagnosaFillPayload {
  icd_x: string
  nama: string
  jenis: DiagnosaJenis
  kasus: DiagnosaKasus
  prognosa: string
  penyakit_kronis: string[]
}

export interface ResepFillPayload {
  static: {
    no_resep: string
    alergi: string
  }
  ajax: {
    ruangan: string
    dokter: string
    perawat: string
  }
  medications: Array<{
    racikan: string
    jumlah_permintaan: number
    nama_obat: string
    jumlah: number
    signa: string
    aturan_pakai: AturanPakai
    keterangan: string
  }>
  prioritas: Prioritas
}

// ============================================================================
// RME TRANSFER CONTRACTS (from assist/utils/types.ts)
// ============================================================================

export type RMETransferStepStatus = 'anamnesa' | 'diagnosa' | 'resep'

export type RMETransferStepState =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'cancelled'

export type RMETransferErrorClass = 'recoverable' | 'fatal'

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
  | 'UNKNOWN_STEP_FAILURE'

export interface RMETransferStepResult {
  step: RMETransferStepStatus
  state: RMETransferStepState
  attempt: number
  latencyMs: number
  successCount: number
  failedCount: number
  skippedCount: number
  reasonCode?: RMETransferReasonCode
  errorClass?: RMETransferErrorClass
  message?: string
}

export type RMETransferState = 'success' | 'partial' | 'failed' | 'cancelled'

export interface RMETransferPayload {
  anamnesa: AnamnesaFillPayload
  diagnosa?: DiagnosaFillPayload | null
  resep?: ResepFillPayload | null
  options?: {
    requestId?: string
    forceRun?: boolean
    idempotencyWindowMs?: number
    startFromStep?: RMETransferStepStatus
    onlyStep?: RMETransferStepStatus
  }
  meta?: {
    reasonCodes?: RMETransferReasonCode[]
    triadComplete?: boolean
    triadMissingRoles?: Array<'utama' | 'adjuvant' | 'vitamin'>
  }
}

export interface RMETransferResult {
  runId: string
  fingerprint: string
  state: RMETransferState
  startedAt: string
  completedAt: string
  totalLatencyMs: number
  reasonCodes: RMETransferReasonCode[]
  steps: Record<RMETransferStepStatus, RMETransferStepResult>
}

export interface RMETransferProgressEvent {
  runId: string
  state: 'running' | 'completed' | 'cancelled'
  transferState: RMETransferState
  activeStep?: RMETransferStepStatus
  steps: Record<RMETransferStepStatus, RMETransferStepResult>
  reasonCodes: RMETransferReasonCode[]
  updatedAt: string
}

// ============================================================================
// DASHBOARD-SPECIFIC TYPES (new — tidak ada di assist)
// ============================================================================

export interface EMRTransferConfig {
  baseUrl: string
  loginUrl: string
  sessionStoragePath: string
  headless?: boolean
  sessionTtlMs?: number
}

export interface EMRHistoryEntry {
  id: string
  timestamp: string
  transferId: string
  patientId?: string
  state: RMETransferState
  steps: Partial<Record<RMETransferStepStatus, RMETransferStepState>>
  totalLatencyMs: number
  error?: string
  reasonCodes: RMETransferReasonCode[]
}

export interface EMRProgressEvent {
  transferId: string
  step: RMETransferStepStatus | 'init' | 'login' | 'done'
  status: 'running' | 'success' | 'failed' | 'skipped'
  message: string
  timestamp: string
}

export interface FieldConfig {
  selector: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'autocomplete'
  required?: boolean
  readonly?: boolean
}

export interface PageFieldMap {
  [fieldName: string]: FieldConfig
}
