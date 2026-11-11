// Question templates for the Audrey chat (Chief 2026-10-07). Each [slot] is selected in turn so
// the doctor types straight over it.

export interface AudreyTemplate {
  label: string
  text: string
}

export const AUDREY_TEMPLATES: AudreyTemplate[] = [
  { label: 'Dosis obat', text: 'Berapa dosis [nama obat] untuk pasien [usia] tahun, BB [berat] kg?' },
  {
    label: 'Penyakit',
    text: 'Jelaskan [nama penyakit]: kriteria diagnosis, tata laksana di puskesmas, dan tanda bahaya.',
  },
  { label: 'Diagnosis banding', text: 'Diagnosis banding untuk [keluhan utama] pada pasien [usia] tahun.' },
  { label: 'Rujukan', text: 'Kapan pasien [diagnosis] harus dirujuk dari puskesmas?' },
  { label: 'Interaksi obat', text: 'Apakah ada interaksi antara [obat pertama] dan [obat kedua]?' },
  { label: 'Edukasi pasien', text: 'Buat edukasi singkat untuk pasien [diagnosis] dalam bahasa awam.' },
]

export function firstSlot(text: string): { start: number; end: number } | null {
  const match = /\[[^\]]+\]/.exec(text)
  return match ? { start: match.index, end: match.index + match[0].length } : null
}
