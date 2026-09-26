import { describe, expect, it } from 'vitest';

import {
  extractChronicTherapiesFromHistory,
  parseTherapyHistoryText,
} from './chronic-therapy-history';

describe('chronic-therapy-history', () => {
  it('splits one terapi_obat blob into separate medications instead of one merged string', () => {
    const parsed = parseTherapyHistoryText(
      'Amlodipin 1x10mg sesudah makan; Lisinopril 1x10mg sesudah makan; Edukasi kontrol 2 minggu'
    );

    expect(parsed.medications.map((item) => item.displayName)).toEqual(['Amlodipin', 'Lisinopril']);
    expect(parsed.educations).toEqual(['Edukasi kontrol 2 minggu']);
  });

  it('locks the highest dose for the same chronic drug across the latest 5 visits', () => {
    const result = extractChronicTherapiesFromHistory([
      {
        timestamp: '2026-06-27T07:00:00.000Z',
        terapi_obat: 'Amlodipin 1x5mg sesudah makan; Lisinopril 1x5mg sesudah makan',
      },
      {
        timestamp: '2026-06-24T07:00:00.000Z',
        terapi_obat: 'Amlodipin 1x10mg sesudah makan',
      },
      {
        timestamp: '2026-06-20T07:00:00.000Z',
        terapi_obat: 'Lisinopril 1x10mg sesudah makan',
      },
    ]);

    expect(result.medications.map((item) => `${item.displayName} ${item.doseLabel}`)).toEqual([
      'Amlodipin 1x10mg',
      'Lisinopril 1x10mg',
    ]);
  });

  it('ignores narrative boilerplate lines while preserving actual chronic medications', () => {
    const parsed = parseTherapyHistoryText(
      'Pemberian Terapi Farmakologi Sesuai Dengan Instruksi Medis Tertulis (KPO) Pada Rekam Medis Terintegrasi 1x1 PC; Amlo 3x10mg PC; Metformin HCl tablet 500 mg 1x1; Vitamin B Kompleks tablet 1x1'
    );

    expect(parsed.medications.map((item) => item.displayName)).toEqual([
      'Amlo',
      'Metformin HCl Tablet 500 Mg',
      'Vitamin B Kompleks Tablet',
    ]);
    expect(
      parsed.medications.some((item) => /Pemberian Terapi Farmakologi/i.test(item.displayName))
    ).toBe(false);
  });

  it('keeps wound care and education out of chronic medications', () => {
    const parsed = parseTherapyHistoryText(
      'Rawat luka; Perawatan luka setiap 2 hari; Edukasi kontrol 3 hari; Paracetamol 3x1 sesudah makan'
    );

    expect(parsed.medications.map((item) => item.displayName)).toEqual(['Paracetamol']);
    expect(parsed.procedures).toEqual(['Rawat luka', 'Perawatan luka setiap 2 hari']);
    expect(parsed.educations).toEqual(['Edukasi kontrol 3 hari']);
  });

  it('does not guess ambiguous long narrative as a medication', () => {
    const parsed = parseTherapyHistoryText(
      'Pasien disarankan menjaga kebersihan luka dan kembali bila nyeri memberat'
    );

    expect(parsed.medications).toEqual([]);
    expect(parsed.procedures).toEqual([]);
    expect(parsed.educations).toEqual([
      'Pasien disarankan menjaga kebersihan luka dan kembali bila nyeri memberat',
    ]);
  });
});
