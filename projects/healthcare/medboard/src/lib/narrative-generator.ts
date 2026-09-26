/**
 * AI Narrative Generator - Iskandar Engine V3.2
 * Generates structured clinical narratives from raw symptoms.
 */

export interface GeneratedNarrative {
  keluhan_utama: string
  lama_sakit: string
  is_akut: boolean
  confidence: number
  entities: {
    keluhan_utama: string
    onset_durasi: string
    faktor_pemberatan: string
  }
}

const ACUTE_SYMPTOMS = ['demam', 'batuk', 'pilek', 'mual', 'muntah', 'diare', 'nyeri perut akut']

function sanitizeNarrativeInput(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSymptoms(text: string): string[] {
  return text
    .split(/[,;.\n]/g)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function getClinicalDetails(isAkut: boolean, symptoms: string[]): string {
  const details = isAkut
    ? [
        'Aktivitas harian pasien mulai terganggu.',
        'Pasien merasa badan lemas dan nafsu makan menurun.',
        'Riwayat kontak dengan orang sakit disangkal.',
      ]
    : [
        'Keluhan ini sudah dirasakan hilang timbul sebelumnya.',
        'Pasien sudah mencoba pengobatan mandiri namun belum ada perbaikan signifikan.',
        'Keluhan mulai mempengaruhi kualitas hidup dan waktu istirahat pasien.',
      ]
  return details.join(' ')
}

export function generateNarrative(symptomText: string): GeneratedNarrative {
  const cleanText = sanitizeNarrativeInput(symptomText)

  if (!cleanText) {
    return {
      keluhan_utama: '',
      lama_sakit: '',
      is_akut: true,
      confidence: 0,
      entities: { keluhan_utama: '', onset_durasi: '', faktor_pemberatan: '' },
    }
  }

  const symptoms = parseSymptoms(cleanText)
  const isAkut = ACUTE_SYMPTOMS.some(s => cleanText.toLowerCase().includes(s))

  // Extract duration if present
  const durationMatch = cleanText.match(/(\d+)\s*(hari|jam|minggu|bulan|tahun)/i)
  const duration = durationMatch ? durationMatch[0] : 'beberapa waktu terakhir'

  // Build a 3-LINE MINIMUM Narrative
  // Baris 1: Deskripsi gejala dan durasi
  const line1 = `Pasien datang dengan keluhan ${symptoms.join(', ')} yang dirasakan sejak ${duration}.`

  // Baris 2: Karakteristik klinis (tidak random, tapi berbasis akut/kronik)
  const line2 = isAkut
    ? 'Keluhan dirasakan memberat secara mendadak disertai perasaan tidak nyaman pada tubuh.'
    : 'Keluhan bersifat kronis progresif yang dirasakan semakin mengganggu dalam beberapa waktu terakhir.'

  // Baris 3: Dampak fungsional dan riwayat (The "Dr. Iskandar" Touch)
  const line3 = getClinicalDetails(isAkut, symptoms)

  const fullNarrative = `${line1}\n${line2}\n${line3}`

  return {
    keluhan_utama: fullNarrative,
    lama_sakit: duration,
    is_akut: isAkut,
    confidence: 1.0,
    entities: {
      keluhan_utama: symptoms[0] || cleanText,
      onset_durasi: duration,
      faktor_pemberatan: isAkut ? 'Aktivitas' : 'Istirahat',
    },
  }
}
