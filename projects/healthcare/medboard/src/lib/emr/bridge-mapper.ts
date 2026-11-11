/**
 * Sentra EMR Bridge Mapper
 * Converts Dashboard EMR form state → Assist RMETransferPayload.
 *
 * This runs client-side in the EMR page to build the payload before
 * POSTing to /api/emr/bridge.
 */

import { normalizeDrugNameForPrescription } from '@/lib/clinical/formulary-resolver'
import type {
  AnamnesaFillPayload,
  AturanPakai,
  DiagnosaFillPayload,
  ResepFillPayload,
  RMETransferPayload,
} from './types'

// ============================================================================
// INPUT TYPES — mirrors Dashboard EMR page state
// ============================================================================

export interface DashboardVitals {
  gcs: string
  td: string
  nadi: string
  napas: string
  suhu: string
  spo2: string
}

export interface DashboardGulaDarah {
  nilai: string
  tipe: 'GDS' | 'GDP' | '2JPP'
}

export interface DashboardRiwayat {
  rps: string
  rpk: string
}

export interface DashboardDiagnosa {
  icdCode: string
  icdName: string
  jenis: 'PRIMER' | 'SEKUNDER'
  kasus: 'BARU' | 'LAMA'
}

export interface DashboardMedication {
  namaObat: string
  jumlah: number
  signa: string
  aturanPakai: string
  keterangan?: string
  racikan?: string
}

export interface DashboardEncounterData {
  pelayananId: string
  patientName?: string

  // Anamnesa fields
  keluhanUtama: string
  keluhanTambahan: string
  vitals: DashboardVitals
  gulaDarah?: DashboardGulaDarah
  isPregnant?: boolean
  riwayat: DashboardRiwayat
  rpdSelected?: string[]
  alergiSelected?: string[]
  bodyWeightKg?: string
  bodyHeightCm?: string

  // Diagnosa
  diagnosa?: DashboardDiagnosa
  prognosa?: string
  penyakitKronis?: string[]

  // Resep
  medications?: DashboardMedication[]
  noResep?: string

  // Tenaga medis
  dokterNama?: string
  perawatNama?: string
}

// ============================================================================
// PARSERS
// ============================================================================

function parseNumber(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseTD(td: string): { sistolik: number; diastolik: number } {
  const match = td.match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return { sistolik: 0, diastolik: 0 }
  return { sistolik: Number(match[1]), diastolik: Number(match[2]) }
}

function parseGCS(gcs: string): { e: string; v: string; m: string } {
  const match = gcs.match(/E(\d)\s*V(\d)\s*M(\d)/i)
  if (!match) return { e: '4', v: '5', m: '6' }
  return { e: match[1], v: match[2], m: match[3] }
}

function mapAturanPakai(value: string): AturanPakai {
  const map: Record<string, AturanPakai> = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '1x1': '1',
    '2x1': '2',
    '3x1': '3',
    '4x1': '4',
  }
  return map[value.toLowerCase()] || '3'
}

function calculateIMT(weightKg: number, heightCm: number): { imt: number; hasil: string } {
  if (weightKg <= 0 || heightCm <= 0) return { imt: 0, hasil: 'Normal' }
  const heightM = heightCm / 100
  const imt = weightKg / (heightM * heightM)
  let hasil: string
  if (imt < 18.5) hasil = 'Kurus'
  else if (imt < 25) hasil = 'Normal'
  else if (imt < 27) hasil = 'BB Lebih'
  else if (imt < 30) hasil = 'Obesitas I'
  else hasil = 'Obesitas II'
  return { imt: Math.round(imt * 10) / 10, hasil }
}

function categorizeAlergi(allergyItems: string[]): {
  obat: string[]
  makanan: string[]
  udara: string[]
  lainnya: string[]
} {
  const result = {
    obat: [] as string[],
    makanan: [] as string[],
    udara: [] as string[],
    lainnya: [] as string[],
  }
  const foodKeywords = ['telur', 'susu', 'kacang', 'ikan', 'udang', 'seafood', 'gandum', 'gluten']
  const airKeywords = ['debu', 'asap', 'serbuk', 'bulu', 'polusi']

  for (const item of allergyItems) {
    const lower = item.toLowerCase()
    if (foodKeywords.some(k => lower.includes(k))) {
      result.makanan.push(item)
    } else if (airKeywords.some(k => lower.includes(k))) {
      result.udara.push(item)
    } else {
      result.obat.push(item)
    }
  }
  return result
}

// ============================================================================
// MAIN MAPPER
// ============================================================================

export function mapDashboardToTransferPayload(data: DashboardEncounterData): RMETransferPayload {
  const tdParsed = parseTD(data.vitals.td)
  const gcsParsed = parseGCS(data.vitals.gcs)
  const weight = parseNumber(data.bodyWeightKg || '')
  const height = parseNumber(data.bodyHeightCm || '')
  const imtCalc = calculateIMT(weight, height)
  const alergi = categorizeAlergi(data.alergiSelected || [])

  // Build Anamnesa payload
  const anamnesa: AnamnesaFillPayload = {
    keluhan_utama: data.keluhanUtama.trim(),
    keluhan_tambahan: data.keluhanTambahan.trim() || data.keluhanUtama.trim(),
    lama_sakit: { thn: 0, bln: 0, hr: 1 },
    is_pregnant: data.isPregnant,
    riwayat_penyakit: {
      sekarang: data.riwayat.rps.trim(),
      dahulu: (data.rpdSelected || []).join(', '),
      keluarga: data.riwayat.rpk.trim(),
    },
    alergi,
    vital_signs:
      tdParsed.sistolik > 0
        ? {
            tekanan_darah_sistolik: tdParsed.sistolik,
            tekanan_darah_diastolik: tdParsed.diastolik,
            nadi: parseNumber(data.vitals.nadi),
            respirasi: parseNumber(data.vitals.napas),
            suhu: parseNumber(data.vitals.suhu),
            gula_darah: data.gulaDarah ? parseNumber(data.gulaDarah.nilai) || undefined : undefined,
            kesadaran: 'COMPOS MENTIS',
          }
        : undefined,
    periksa_fisik: {
      gcs_membuka_mata: gcsParsed.e as AnamnesaFillPayload['periksa_fisik'] extends {
        gcs_membuka_mata: infer T
      }
        ? T
        : never,
      gcs_respon_verbal: gcsParsed.v as AnamnesaFillPayload['periksa_fisik'] extends {
        gcs_respon_verbal: infer T
      }
        ? T
        : never,
      gcs_respon_motorik: gcsParsed.m as AnamnesaFillPayload['periksa_fisik'] extends {
        gcs_respon_motorik: infer T
      }
        ? T
        : never,
      tinggi: height,
      berat: weight,
      lingkar_perut: 0,
      imt: imtCalc.imt,
      hasil_imt: imtCalc.hasil as 'Kurus' | 'Normal' | 'BB Lebih' | 'Obesitas I' | 'Obesitas II',
      saturasi: parseNumber(data.vitals.spo2),
      mobilisasi: '0',
      toileting: '0',
      makan_minum: '0',
      mandi: '0',
      berpakaian: '0',
      aktifitas_fisik: 'Mandiri',
    },
    lainnya: {
      terapi: '-',
      terapi_non_obat: '-',
      merokok: '0',
      konsumsi_alkohol: '0',
      kurang_sayur_buah: '0',
      edukasi: 'Edukasi penyakit dan pola hidup sehat',
    },
    status_psikososial: {
      alat_bantu_aktrifitas: '0',
      kendala_komunikasi: '0',
      merawat_dirumah: '0',
      membutuhkan_bantuan: '0',
      bahasa_digunakan: 'indonesia',
      tinggal_dengan: 'suami/istri',
      sosial_ekonomi: 'cukup',
      gangguan_jiwa_dimasa_lalu: '0',
      status_ekonomi: 'cukup',
      hubungan_keluarga: 'harmonis',
    },
    tenaga_medis: {
      dokter_nama: data.dokterNama || '',
      perawat_nama: data.perawatNama || '',
    },
  }

  // Build Diagnosa payload (optional)
  let diagnosa: DiagnosaFillPayload | null = null
  if (data.diagnosa?.icdCode) {
    diagnosa = {
      icd_x: data.diagnosa.icdCode,
      nama: data.diagnosa.icdName,
      jenis: data.diagnosa.jenis,
      kasus: data.diagnosa.kasus,
      prognosa: data.prognosa || 'Baik',
      penyakit_kronis: data.penyakitKronis || [],
    }
  }

  // Build Resep payload (optional)
  let resep: ResepFillPayload | null = null
  if (data.medications && data.medications.length > 0) {
    resep = {
      static: {
        no_resep: data.noResep || '',
        alergi: alergi.obat.join(', ') || '-',
      },
      ajax: {
        ruangan: 'BP Umum',
        dokter: data.dokterNama || '',
        perawat: data.perawatNama || '',
      },
      medications: data.medications.map(med => ({
        racikan: med.racikan || 'non racikan',
        jumlah_permintaan: med.jumlah,
        nama_obat: normalizeDrugNameForPrescription(med.namaObat),
        jumlah: med.jumlah,
        signa: med.signa,
        aturan_pakai: mapAturanPakai(med.aturanPakai),
        keterangan: med.keterangan || '',
      })),
      prioritas: '0',
    }
  }

  return {
    anamnesa,
    diagnosa,
    resep,
    options: {
      requestId: `brg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    },
  }
}
