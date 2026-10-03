import type { VisitSummaryInput } from './visit-summary-model';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

type Vitals = VisitRecord['vitals'];

/** A past visit as the scraper keeps it, with clinician names and therapy the PDF must not print. */
export function syntheticVisit(date: string, vitals: Vitals): VisitRecord {
  return {
    patient_id: 'RM-00-12-34',
    encounter_id: `enc-${date}`,
    timestamp: `${date}T09:00:00`,
    vitals,
    keluhan_utama: 'Kontrol',
    terapi_obat: 'Obat Rahasia 1x1',
    dokter_penanganan: 'dr. Rahasia',
    perawat_penanganan: 'Ns. Rahasia',
    source: 'scrape',
  };
}

export const syntheticVisitSummaryInput: VisitSummaryInput = {
  rm: 'RM-00-12-34',
  age: 54,
  gender: 'P',
  keluhanUtama: 'Nyeri kepala tengkuk sejak 3 hari, memberat saat sore',
  keluhanTambahan: 'Pusing berputar ringan',
  allergies: ['Amoksisilin'],
  pregnant: false,
  vitals: { sbp: 152, dbp: 96, hr: 88, rr: 20, temp: 37.2, glucose: 142 },
  diagnoses: [
    { icd: 'I10', name: 'Hipertensi esensial' },
    { icd: 'R51', name: 'Nyeri kepala' },
  ],
  medications: [
    { name: 'Amlodipin', dose: '1x10mg', use: 'Sesudah makan', duration: '30 hari' },
    { name: 'Parasetamol', dose: '3x500mg', use: 'Jika diperlukan', duration: '3 hari' },
  ],
  alerts: [
    {
      severity: 'high',
      title: 'Tekanan darah tinggi',
      message: 'TD ≥ 140/90 pada dua kunjungan; evaluasi kepatuhan obat.',
    },
    { severity: 'info', title: 'Edukasi garam', message: 'Batasi garam < 5 g/hari.' },
  ],
  education: ['Minum obat tekanan darah setiap hari pada jam yang sama.', 'Batasi garam dan makanan asin.'],
  followUp: '1 minggu',
  safetyNet: ['Nyeri kepala hebat mendadak', 'Lemah separuh badan atau bicara pelo'],
  staff: { dokter_nama: 'dr. Klinisi Sintetis', perawat_nama: 'Ns. Verifikator Sintetis' },
  context: {
    facilityName: 'Puskesmas Sintetis',
    triage: { zone: 'kuning', headline: 'Hipertensi derajat 2' },
    spo2: 98,
    visitHistory: [
      syntheticVisit('2026-06-12', { sbp: 148, dbp: 94, hr: 84, rr: 18, temp: 36.8, glucose: 130 }),
      syntheticVisit('2026-07-10', { sbp: 156, dbp: 98, hr: 90, rr: 20, temp: 37, glucose: 150 }),
      syntheticVisit('2026-08-14', { sbp: 150, dbp: 95, hr: 86, rr: 19, temp: 36.9, glucose: 138 }),
      syntheticVisit('2026-09-11', { sbp: 158, dbp: 100, hr: 92, rr: 20, temp: 37.1, glucose: 160 }),
    ],
  },
  printedAt: new Date(2026, 9, 3, 14, 20),
};

/** Enough medications to push Tatalaksana over a page. */
export const longVisitSummaryInput: VisitSummaryInput = {
  ...syntheticVisitSummaryInput,
  medications: Array.from({ length: 45 }, (_, index) => ({
    name: `Obat Sintetis ${index + 1}`,
    dose: '2x250mg',
    use: 'Sesudah makan',
    duration: '5 hari',
  })),
};
