// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { buildDiagnosisRequestPayload } from './diagnosis-request-payload';

describe('Diagnosis UI request payload builder', () => {
  it('builds the current diagnosis request payload with deduped chronic diseases and supported vitals', () => {
    const payload = buildDiagnosisRequestPayload({
      keluhanUtama: 'Kontrol HT DM dengan nyeri dada',
      keluhanTambahan: '',
      patientAge: 52,
      patientGender: 'L',
      pregnancyStatus: false,
      allergies: ['Obat', ' obat ', 'tidak ada'],
      chronicDiseases: ['DM', 'dm', 'HIPERTENSI'],
      vitals: { sbp: 150, dbp: 92, hr: 88, rr: 20, temp: 36.7, glucose: 214 },
    });

    expect(payload).toEqual({
      keluhan_utama: 'Kontrol HT DM dengan nyeri dada',
      keluhan_tambahan: '',
      patient_age: 52,
      patient_gender: 'M',
      allergies: ['Obat'],
      chronic_diseases: ['DM', 'HIPERTENSI'],
      vital_signs: {
        systolic: 150,
        diastolic: 92,
        heart_rate: 88,
        respiratory_rate: 20,
        temperature: 36.7,
      },
    });
    expect(payload).not.toHaveProperty('pregnancy_status');
    expect(payload.vital_signs).not.toHaveProperty('glucose');
  });

  it('keeps chronic_diseases present as an empty array when no chronic context exists', () => {
    const payload = buildDiagnosisRequestPayload({
      keluhanUtama: 'Batuk pilek',
      keluhanTambahan: '',
      patientAge: 19,
      patientGender: 'L',
      pregnancyStatus: null,
      allergies: [],
      chronicDiseases: [],
      vitals: { sbp: 118, dbp: 76, hr: 84, rr: 18, temp: 36.8, glucose: 0 },
    });

    expect(payload.chronic_diseases).toEqual([]);
    expect(payload.vital_signs).toEqual({
      systolic: 118,
      diastolic: 76,
      heart_rate: 84,
      respiratory_rate: 18,
      temperature: 36.8,
    });
  });

  it('omits unsupported pregnancy and glucose fields fail-closed', () => {
    const payload = buildDiagnosisRequestPayload({
      keluhanUtama: 'Mual muntah pada kehamilan',
      keluhanTambahan: 'Lemas',
      patientAge: 30,
      patientGender: 'P',
      pregnancyStatus: true,
      allergies: [],
      chronicDiseases: ['DM gestasional'],
      vitals: { sbp: 110, dbp: 70, hr: 96, rr: 20, temp: 37.1, glucose: 208 },
    });

    expect(payload).not.toHaveProperty('pregnancy_status');
    expect(payload.vital_signs).toEqual({
      systolic: 110,
      diastolic: 70,
      heart_rate: 96,
      respiratory_rate: 20,
      temperature: 37.1,
    });
    expect(payload.vital_signs).not.toHaveProperty('glucose');
  });

  it('does not invent patient_age 30 when age is 0 or missing (H7)', () => {
    const zeroAge = buildDiagnosisRequestPayload({
      keluhanUtama: 'Batuk',
      keluhanTambahan: '',
      patientAge: 0,
      patientGender: 'L',
      allergies: [],
      chronicDiseases: [],
      vitals: { sbp: 120, dbp: 80, hr: 72, rr: 16, temp: 36.5 },
    });
    expect(zeroAge.patient_age).toBe(0);
    expect(zeroAge.patient_age).not.toBe(30);

    const negativeAge = buildDiagnosisRequestPayload({
      keluhanUtama: 'Batuk',
      keluhanTambahan: '',
      patientAge: -1,
      patientGender: 'P',
      allergies: [],
      chronicDiseases: [],
      vitals: { sbp: 110, dbp: 70, hr: 80, rr: 18, temp: 36.8 },
    });
    expect(negativeAge.patient_age).toBe(0);
    expect(negativeAge.patient_age).not.toBe(30);
  });
});
