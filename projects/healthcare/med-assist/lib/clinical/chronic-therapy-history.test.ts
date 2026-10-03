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

  // Chief, 2026-10-04 ("Saya gak mau ada signa tidak tercatat"): these signa forms fell to a
  // medication without a dose.
  it.each([
    ['Captopril tablet 25 mg 3X1/2 Sesudah Makan', 3, '1/2', 0.5, 'Sesudah makan'],
    ['Ambroxol tablet 30 mg 2x1.5 Sesudah Makan', 2, '1,5', 1.5, 'Sesudah makan'],
    ['CTM 3x½', 3, '1/2', 0.5, 'Sesudah makan'],
    ['Metformin 3 dd 1 sebelum makan', 3, '1', 1, 'Sebelum makan'],
    ['Antasida 3×1', 3, '1', 1, 'Sesudah makan'],
    ['Parasetamol 3x sehari', 3, '1', 1, 'Sesudah makan'],
    ['Parasetamol 3 kali sehari sesudah makan', 3, '1', 1, 'Sesudah makan'],
  ])('reads the signa of "%s"', (line, frequency, amountText, amount, aturanPakai) => {
    const [medication] = parseTherapyHistoryText(line).medications;

    expect(medication).toMatchObject({
      frequencyPerDay: frequency,
      amountText,
      amountPerTake: amount,
      aturanPakai,
      doseLabel: `${frequency}x${amountText}`,
    });
  });

  it('reads no signa from a frequency without units or a day', () => {
    const [medication] = parseTherapyHistoryText('Parasetamol 3x').medications;

    expect(medication).toMatchObject({ frequencyPerDay: 0, doseLabel: '' });
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

  // Chief, 2026-09-30 ("ada logic salah masa nama obatnya begitu"): form labels from the visit
  // history became chronic cards "Obat", "Dr Dokter", ":" and "Advise Dokter", each a 1x1
  // medication that a tick would continue into the RME resep.
  it('never reads form labels or the "sesuai advis dokter" placeholder as a medication', () => {
    expect(parseTherapyHistoryText('Obat, Dr Dokter, :, Advise Dokter').medications).toEqual([]);
    expect(parseTherapyHistoryText('Obat : Sesuai Advise Dokter').medications).toEqual([]);
    expect(parseTherapyHistoryText('Kontrol 1 minggu sesuai advis dokter').educations).toEqual([
      'Kontrol 1 minggu sesuai advis dokter',
    ]);

    const result = extractChronicTherapiesFromHistory([
      { timestamp: '2026-09-20', terapi_obat: 'Amlodipin 1x10mg sesudah makan; Obat; Dr Dokter; :; Advise Dokter' },
      { timestamp: '2026-09-10', terapi_obat: 'Obat, Dr Dokter, :, Advise Dokter' },
    ]);
    expect(result.medications.map((item) => item.displayName)).toEqual(['Amlodipin']);
  });

  // Chief, 2026-10-02 ("Pengisian dosis salah"): a name without a signa in the history got 1x1
  // "Sesudah makan" and reached the resep with that invented dose. It keeps its name, not a dose.
  it('gives a medication named without a signa no dose', () => {
    const result = parseTherapyHistoryText('NAC, CTM');

    expect(
      result.medications.map((item) => [item.displayName, item.frequencyPerDay, item.doseLabel])
    ).toEqual([
      ['NAC', 0, ''],
      ['CTM', 0, ''],
    ]);
  });

  it('reads a riwayat Resep row: name, signa, aturan pakai', () => {
    const [medication] = parseTherapyHistoryText(
      'Klorfeniramin Maleat ( CTM ) tablet 4 mg 2x1 Sebelum Makan'
    ).medications;

    expect(medication).toMatchObject({
      displayName: 'Klorfeniramin Maleat ( CTM ) Tablet 4 Mg',
      frequencyPerDay: 2,
      amountPerTake: 1,
      aturanPakai: 'Sebelum makan',
    });
  });
});
