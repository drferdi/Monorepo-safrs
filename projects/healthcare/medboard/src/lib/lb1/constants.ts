// Drferdi — vision, brought to life.
// ─── Konstanta LB1 — sesuai format template Excel Laporan SP3 LB1 ────────────

export const BUCKET_ORDER = [
  '0_7_hari',
  '8_28_hari',
  '1_11_bulan',
  '1_4_tahun',
  '5_9_tahun',
  '10_14_tahun',
  '15_19_tahun',
  '20_44_tahun',
  '45_54_tahun',
  '55_59_tahun',
  '60_64_tahun',
  '65_69_tahun',
  '70_tahun',
] as const

export type AgeBucket = (typeof BUCKET_ORDER)[number]

export const VISIT_ORDER = ['KB', 'KL'] as const
export const SEX_ORDER = ['L', 'P'] as const

// Kolom awal tiap bucket usia di template Excel (kolom A=1)
// D=4, H=8, L=12, P=16, T=20, X=24, AB=28, AF=32, AJ=36, AN=40, AR=44, AV=48, AZ=52
export const TEMPLATE_BUCKET_START_COL: Record<AgeBucket, number> = {
  '0_7_hari': 4,
  '8_28_hari': 8,
  '1_11_bulan': 12,
  '1_4_tahun': 16,
  '5_9_tahun': 20,
  '10_14_tahun': 24,
  '15_19_tahun': 28,
  '20_44_tahun': 32,
  '45_54_tahun': 36,
  '55_59_tahun': 40,
  '60_64_tahun': 44,
  '65_69_tahun': 48,
  '70_tahun': 52,
}

// Kolom total (BD=56, BE=57, BF=58, BG=59, BH=60, BI=61)
export const TOTAL_COL: Record<string, number> = {
  KB_L: 56, // BD
  KB_P: 57, // BE
  KL_L: 58, // BF
  KL_P: 59, // BG
  TOTAL_L: 60, // BH
  TOTAL_P: 61, // BI
}

// lb1_col_index: hitung kolom Excel untuk kombinasi bucket+visit+sex
// Tiap bucket punya 4 kolom: KB_L, KB_P, KL_L, KL_P
export function lb1ColIndex(bucket: AgeBucket, visit: 'KB' | 'KL', sex: 'L' | 'P'): number {
  const base = TEMPLATE_BUCKET_START_COL[bucket]
  if (visit === 'KB' && sex === 'L') return base
  if (visit === 'KB' && sex === 'P') return base + 1
  if (visit === 'KL' && sex === 'L') return base + 2
  if (visit === 'KL' && sex === 'P') return base + 3
  throw new Error(`Unexpected visit=${visit} sex=${sex}`)
}

// Baris data mulai dari baris 17 di template Excel
export const START_DATA_ROW = 17

// Alias kolom export file (untuk header detection)
export const CANONICAL_COLUMNS: Record<string, string[]> = {
  visit_date: ['TANGGAL', 'TGL', 'TANGGALKUNJUNGAN', 'TGLKUNJUNGAN', 'KUNJUNGANTANGGAL'],
  age_year: ['UMURTH', 'UMURTAHUN', 'TH', 'TAHUN', 'UMUR'],
  age_month: ['UMURBL', 'UMURBULAN', 'BL', 'BULAN'],
  age_day: ['UMURHR', 'UMURHARI', 'HR', 'HARI'],
  dx_code: [
    'KODEDIAGNOSE',
    'KODEDIAGNOSA',
    'KODEDX',
    'DX',
    'ICD10',
    'ICD',
    'DIAGNOSA1',
    'DIAGNOSIS1',
  ],
  sex: ['SEX', 'LP', 'L/P', 'JK', 'JENISKELAMIN'],
  visit_type: [
    'KBKL',
    'KB/KL',
    'JENISKUNJUNGAN',
    'KUNJUNGANBARULAMA',
    'STATUSKUNJUNGAN',
    'KUNJUNGAN',
  ],
}

export const REQUIRED_COLUMNS = ['visit_date', 'dx_code', 'sex', 'visit_type'] as const

// Positional mapping untuk export ePuskesmas (0-indexed)
export const EPUSKESMAS_COL = {
  sex: 7,
  visit_date: 13,
  age_year: 17,
  age_month: 18,
  age_day: 19,
  visit_type: 22,
  dx1: 62,
  dx2: 64,
  dx3: 66,
} as const

export const SEX_MAP: Record<string, 'L' | 'P'> = {
  L: 'L',
  LAKI: 'L',
  LAKILAKI: 'L',
  'LAKI-LAKI': 'L',
  M: 'L',
  P: 'P',
  PR: 'P',
  PEREMPUAN: 'P',
  F: 'P',
  W: 'P',
}

export const VISIT_MAP: Record<string, 'KB' | 'KL'> = {
  KB: 'KB',
  BARU: 'KB',
  KUNJUNGANBARU: 'KB',
  KL: 'KL',
  LAMA: 'KL',
  KUNJUNGANLAMA: 'KL',
}
