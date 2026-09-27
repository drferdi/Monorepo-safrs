/**
 * Golden cases for the legacy diagnosis engine.
 *
 * Every case is synthetic. The inputs come from the existing clinical tests
 * (`diagnosis-quality.test.ts`, `get-suggestions-flow.*.test.ts`) and from the synthetic
 * appendicitis case in `mira-system/assist/cases/`, restated in Indonesian as a clinician would
 * type it. Encounters mirror what `entrypoints/background.ts` builds before calling the engine:
 * the request's complaints are copied into the encounter, and scraped allergies and chronic
 * diseases live on the encounter only (the side panel never sends them).
 *
 * @module lib/diagnosis-engine/__golden__/cases
 */

import type { DiagnosisRequestContext } from '@/types/api';
import type { Encounter } from '~/utils/types';

export interface GoldenCase {
  id: string;
  encounter: Encounter;
  context: DiagnosisRequestContext;
}

const FIXED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function buildCase(
  id: string,
  context: DiagnosisRequestContext,
  history: { allergies?: string[]; chronicDiseases?: string[] } = {}
): GoldenCase {
  return {
    id,
    context,
    encounter: {
      id: `golden-${id}`,
      patient_id: 'golden-synthetic',
      timestamp: FIXED_TIMESTAMP,
      dokter: { id: '', nama: '' },
      perawat: { id: '', nama: '' },
      anamnesa: {
        keluhan_utama: context.keluhan_utama,
        keluhan_tambahan: context.keluhan_tambahan ?? '',
        lama_sakit: { thn: 0, bln: 0, hr: 0 },
        riwayat_penyakit: null,
        alergi: { obat: history.allergies ?? [], makanan: [], udara: [], lainnya: [] },
      },
      diagnosa: {
        icd_x: '',
        nama: '',
        jenis: 'PRIMER',
        kasus: 'BARU',
        prognosa: '',
        penyakit_kronis: history.chronicDiseases ?? [],
      },
      resep: [],
    },
  };
}

export const GOLDEN_CASES: GoldenCase[] = [
  buildCase('cardiac-chest-pain', {
    keluhan_utama: 'nyeri dada sesak napas keringat dingin jantung berdebar',
    keluhan_tambahan: '',
    patient_age: 55,
    patient_gender: 'M',
    vital_signs: {
      systolic: 150,
      diastolic: 95,
      heart_rate: 110,
      respiratory_rate: 24,
      temperature: 36.8,
    },
  }),
  buildCase('diabetes-classic', {
    keluhan_utama: 'poliuri polidipsi polifagi penurunan berat badan lemas',
    keluhan_tambahan: '',
    patient_age: 50,
    patient_gender: 'F',
  }),
  buildCase('ari-fever-cough', {
    keluhan_utama: 'demam batuk pilek sakit tenggorokan hidung tersumbat',
    keluhan_tambahan: '',
    patient_age: 30,
    patient_gender: 'F',
    vital_signs: {
      systolic: 120,
      diastolic: 80,
      heart_rate: 88,
      respiratory_rate: 18,
      temperature: 38.2,
    },
  }),
  buildCase('generic-malaise', {
    keluhan_utama: 'lemas pusing tidak enak badan',
    keluhan_tambahan: '',
    patient_age: 45,
    patient_gender: 'M',
  }),
  buildCase('chest-pain-young-normal-vitals', {
    keluhan_utama: 'Nyeri dada',
    keluhan_tambahan: '',
    patient_age: 21,
    patient_gender: 'F',
    vital_signs: {
      systolic: 117,
      diastolic: 75,
      heart_rate: 81,
      respiratory_rate: 17,
      temperature: 36.3,
    },
  }),
  buildCase('chest-pain-no-vitals', {
    keluhan_utama: 'Nyeri dada',
    keluhan_tambahan: '',
    patient_age: 42,
    patient_gender: 'M',
  }),
  buildCase('headache', {
    keluhan_utama: 'Sakit kepala',
    keluhan_tambahan: '',
    patient_age: 40,
    patient_gender: 'M',
  }),
  buildCase(
    'sepsis-like-with-history',
    {
      keluhan_utama: 'Demam tinggi, menggigil, sesak',
      keluhan_tambahan: 'Lemas dan napas cepat',
      patient_age: 47,
      patient_gender: 'M',
      vital_signs: {
        systolic: 85,
        diastolic: 52,
        heart_rate: 128,
        respiratory_rate: 30,
        temperature: 39.2,
        spo2: 92,
        gcs: 14,
      },
    },
    { allergies: ['penisilin'], chronicDiseases: ['diabetes'] }
  ),
  buildCase('appendicitis-like', {
    keluhan_utama: 'nyeri perut kanan bawah',
    keluhan_tambahan:
      'awalnya nyeri di sekitar pusar, mual, muntah dua kali, demam, nafsu makan turun',
    patient_age: 22,
    patient_gender: 'M',
    vital_signs: {
      systolic: 128,
      diastolic: 78,
      heart_rate: 104,
      respiratory_rate: 18,
      temperature: 38.1,
      spo2: 99,
    },
  }),
  buildCase(
    'hypertension-headache-with-history',
    {
      keluhan_utama: 'sakit kepala tengkuk berat',
      keluhan_tambahan: 'pandangan kabur',
      patient_age: 60,
      patient_gender: 'F',
      vital_signs: {
        systolic: 185,
        diastolic: 110,
        heart_rate: 90,
        respiratory_rate: 20,
        temperature: 36.7,
      },
    },
    { chronicDiseases: ['hipertensi'] }
  ),
  buildCase('pediatric-diarrhoea', {
    keluhan_utama: 'diare cair lebih dari 5 kali sehari',
    keluhan_tambahan: 'muntah, rewel',
    patient_age: 3,
    patient_gender: 'M',
    vital_signs: { heart_rate: 130, respiratory_rate: 30, temperature: 38.5 },
  }),
  buildCase('missing-chief-complaint', {
    keluhan_utama: '',
    keluhan_tambahan: '',
    patient_age: 35,
    patient_gender: 'F',
  }),
];
