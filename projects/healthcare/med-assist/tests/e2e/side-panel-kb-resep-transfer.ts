/**
 * The knowledge-base therapy for J18 (Amoxicillin "500-1000 mg", "3x sehari 5-7 hari", as in
 * public/data/penyakit.json) the way the side panel hands it to the RME mapper, and the resep
 * rows the mapper makes of it. `payload-mapper.test.ts` asserts the mapper still makes exactly
 * these rows; the synthetic ePuskesmas spec sends them through the built extension. This is the
 * case that failed live on 2026-10-01. Synthetic data only.
 */
import type { MedicationRecommendation } from '../../types/api';

export const KB_J18_MEDICATION: MedicationRecommendation = {
  nama_obat: 'Amoxicillin',
  dosis: '500-1000 mg 3x sehari 5-7 hari',
  aturan_pakai: 'Sesudah makan',
  durasi: '',
  rationale: 'Terapi farmakologi awal berbasis knowledge ICD (J18).',
  safety_check: 'safe',
  contraindications: [],
};

export const KB_J18_RESEP_MEDICATIONS = [
  {
    racikan: '0',
    jumlah_permintaan: 10,
    nama_obat: 'Amoksisilin kapsul/kaplet 500 mg',
    jumlah: 10,
    signa: '3x1',
    aturan_pakai: '2',
    keterangan: 'Terapi farmakologi awal berbasis knowledge ICD (J18).',
  },
];
