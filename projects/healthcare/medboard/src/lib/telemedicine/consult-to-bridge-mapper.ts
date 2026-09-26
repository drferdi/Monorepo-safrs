// Pure mapping Assist consult → RMETransferPayload (no server-only; testable).
import type { AnamnesaFillPayload, RMETransferPayload } from '@/lib/emr/types'
import type { AssistConsultPayload } from './socket-bridge'

function parseNum(s: string | undefined): number {
  if (s == null || s === '') return 0
  const n = Number.parseFloat(String(s).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Build minimal AnamnesaFillPayload dari data consult Assist (untuk transfer ke antrian bridge EMR).
 */
export function consultToAnamnesaPayload(consult: AssistConsultPayload): AnamnesaFillPayload {
  const ttv = consult.ttv || {}
  const antro = consult.anthropometrics || {}
  const kronis = Array.isArray(consult.penyakit_kronis) ? consult.penyakit_kronis : []
  const risk = Array.isArray(consult.risk_factors) ? consult.risk_factors : []

  const payload: AnamnesaFillPayload = {
    keluhan_utama: consult.keluhan_utama || '',
    keluhan_tambahan: risk.length > 0 ? risk.join('; ') : '',
    lama_sakit: { thn: 0, bln: 0, hr: 0 },
    alergi: {
      obat: [],
      makanan: [],
      udara: [],
      lainnya: [],
    },
    riwayat_penyakit:
      kronis.length > 0 ? { sekarang: kronis.join(', '), dahulu: '', keluarga: '' } : undefined,
    vital_signs: {
      tekanan_darah_sistolik: parseNum(ttv.sbp),
      tekanan_darah_diastolik: parseNum(ttv.dbp),
      nadi: parseNum(ttv.hr),
      respirasi: parseNum(ttv.rr),
      suhu: parseNum(ttv.temp),
      gula_darah: parseNum(ttv.glucose) || undefined,
    },
  }

  if (
    antro.tinggi != null &&
    antro.berat != null &&
    antro.imt != null &&
    antro.lingkar_perut != null
  ) {
    const hasilImt = antro.hasil_imt || 'Normal'
    const mappedImt: 'Kurus' | 'Normal' | 'BB Lebih' | 'Obesitas I' | 'Obesitas II' =
      hasilImt.includes('Kurus')
        ? 'Kurus'
        : hasilImt.includes('Obesitas II')
          ? 'Obesitas II'
          : hasilImt.includes('Obesitas I')
            ? 'Obesitas I'
            : hasilImt.includes('Lebih')
              ? 'BB Lebih'
              : 'Normal'
    payload.periksa_fisik = {
      gcs_membuka_mata: '4',
      gcs_respon_verbal: '5',
      gcs_respon_motorik: '6',
      tinggi: antro.tinggi,
      berat: antro.berat,
      lingkar_perut: antro.lingkar_perut,
      imt: antro.imt,
      hasil_imt: mappedImt,
      saturasi: parseNum(ttv.spo2) || 0,
      mobilisasi: '0',
      toileting: '0',
      makan_minum: '0',
      mandi: '0',
      berpakaian: '0',
      aktifitas_fisik: '',
    }
  }

  return payload
}

/**
 * Build RMETransferPayload dari accepted consult (hanya anamnesa; diagnosa/resep nanti di EMR).
 */
export function consultToBridgePayload(consult: AssistConsultPayload): RMETransferPayload {
  return {
    anamnesa: consultToAnamnesaPayload(consult),
  }
}
