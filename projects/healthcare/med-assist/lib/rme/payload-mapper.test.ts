// Designed and constructed by Drferdi.
import { describe, expect, it, vi } from 'vitest';

import {
  __rmeMapperInternals,
  buildRMETransferPayload,
  mapPregnancyStatusToBoolean,
} from '@/lib/rme/payload-mapper';

describe('RME payload mapper', () => {
  it('maps unknown pregnancy status to is_pregnant=false with explicit reason', () => {
    const pregnancy = mapPregnancyStatusToBoolean('P', null);

    expect(pregnancy.is_pregnant).toBe(false);
    expect(pregnancy.reasonCode).toBe('PREGNANCY_UNKNOWN_DEFAULT_FALSE');
  });

  it('builds payload with triad warning when regimen role is incomplete', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Batuk berdahak',
      patientGender: 'P',
      pregnancyStatus: false,
      allergies: ['Obat'],
      diagnosis: {
        icd_x: 'J06.9',
        nama: 'ISPA',
      },
      medications: [
        {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: 'Simptomatik',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Vitamin C 500mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Supportive',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    expect(mapped.payload.anamnesa.is_pregnant).toBe(false);
    expect(mapped.payload.resep).not.toBeNull();
    expect(mapped.payload.resep?.medications.length).toBe(2);
    const vitaminRow = mapped.payload.resep?.medications.find(
      (row) =>
        row.nama_obat.toLowerCase().includes('vitamin') ||
        row.nama_obat.toLowerCase().includes('askorbat')
    );
    expect(vitaminRow).toBeDefined();
    expect(vitaminRow?.nama_obat.toLowerCase()).not.toContain('parasetamol');
    expect(mapped.reasonCodes).toContain('RESEP_TRIAD_INCOMPLETE');
  });

  it('keeps up to 6 safe medications in the resep payload', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Kontrol penyakit kronis',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'I10',
        nama: 'Hipertensi esensial',
      },
      medications: [
        {
          nama_obat: 'Amlodipin 5mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Utama',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Captopril 25mg',
          dosis: '2x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '30 hari',
          rationale: 'Utama tambahan',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: 'Adjuvant',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Cetirizine 10mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Adjuvant tambahan',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Vitamin C 500mg',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Vitamin',
          safety_check: 'safe',
          contraindications: [],
        },
        {
          nama_obat: 'Vitamin B Complex',
          dosis: '1x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Vitamin tambahan',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    expect(mapped.payload.resep).not.toBeNull();
    expect(mapped.payload.resep?.medications).toHaveLength(6);
  });

  it('marks resep empty after safety filter when all meds are contraindicated', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri dada',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'I20.9',
        nama: 'Suspek angina',
      },
      medications: [
        {
          nama_obat: 'Captopril 12.5mg',
          dosis: '2x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '5 hari',
          rationale: 'Should be blocked',
          safety_check: 'contraindicated',
          contraindications: ['Pregnancy'],
        },
      ],
    });

    expect(mapped.payload.resep).toBeNull();
    expect(mapped.reasonCodes).toContain('RESEP_EMPTY_AFTER_SAFETY');
    expect(mapped.reasonCodes).toContain('RESEP_PAYLOAD_EMPTY');
  });

  it('calculates rounded quantity with 3-day baseline and keeps signa text', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Hipertensi',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'I10',
        nama: 'Hipertensi esensial',
      },
      medications: [
        {
          nama_obat: 'Captopril 25mg',
          dosis: '3x1',
          aturan_pakai: 'Sebelum makan',
          durasi: '33 hari',
          rationale: 'Kontrol tekanan darah',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    const resep = mapped.payload.resep;
    expect(resep).not.toBeNull();
    expect(resep?.static.no_resep).toBe('');
    expect(resep?.medications[0]?.jumlah_permintaan).toBe(10);
    expect(resep?.medications[0]?.jumlah).toBe(10);
    expect(resep?.medications[0]?.signa).toBe('3x1');
    expect(resep?.medications[0]?.aturan_pakai).toBe('1');
  });

  it('always fills keterangan when rationale is missing', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Demam',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'R50',
        nama: 'Demam',
      },
      medications: [
        {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: '',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    expect(mapped.payload.resep?.medications[0]?.keterangan).toContain('Aturan minum');
    expect(mapped.payload.resep?.medications[0]?.keterangan).toContain('Review klinis');
  });

  it('keeps original medication name when stock match is low confidence', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Keluhan lambung',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'K29',
        nama: 'Gastritis',
      },
      medications: [
        {
          nama_obat: 'Obat Uji Tidak Ada 123',
          dosis: '2 x 1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: '',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    const resepItem = mapped.payload.resep?.medications[0];
    expect(resepItem?.nama_obat).toBe('Obat Uji Tidak Ada 123');
    expect(resepItem?.signa).toBe('2x1');
  });

  it('leaves ruangan empty and keeps dokter/perawat for resep ajax fields', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Batuk',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'J06.9',
        nama: 'ISPA',
      },
      tenagaMedis: {
        ruangan: 'POLI UMUM',
        dokterNama: 'dr. Ferdi',
        perawatNama: 'Ns. Delia',
      },
      medications: [
        {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: 'Simptomatik',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    expect(mapped.payload.resep?.ajax.ruangan).toBe('');
    expect(mapped.payload.resep?.ajax.dokter).toBe('dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC');
    expect(mapped.payload.resep?.ajax.perawat).toBe('JOSEP ARIANTO, A.Md');
  });

  it('prefers solid paracetamol form for 500mg input instead of syrup', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Demam',
      patientGender: 'L',
      diagnosis: {
        icd_x: 'R50',
        nama: 'Demam',
      },
      medications: [
        {
          nama_obat: 'Paracetamol 500mg',
          dosis: '3x1',
          aturan_pakai: 'Sesudah makan',
          durasi: '3 hari',
          rationale: 'Simptomatik',
          safety_check: 'safe',
          contraindications: [],
        },
      ],
    });

    const namaObat = mapped.payload.resep?.medications[0]?.nama_obat.toLowerCase() || '';
    expect(namaObat).toContain('parasetamol');
    expect(namaObat).toContain('tablet');
    expect(namaObat).not.toContain('sirup');
  });

  it('returns ranked stock candidates with tablet ahead of syrup for adult paracetamol query', () => {
    const candidates =
      __rmeMapperInternals.resolveMedicationCandidatesFromStock('Paracetamol 500mg');

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.toLowerCase()).toContain('parasetamol');
    expect(candidates[0]?.toLowerCase()).toContain('tablet');
    expect(candidates[0]?.toLowerCase()).not.toContain('sirup');
  });

  it('keeps liquid preference for syrup query when formulation is explicit', () => {
    const candidates = __rmeMapperInternals.resolveMedicationCandidatesFromStock(
      'Paracetamol sirup 120 mg/5 ml'
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.toLowerCase()).toContain('parasetamol');
    expect(candidates[0]?.toLowerCase()).toContain('sirup');
  });

  it('normalizes C/K spelling variant for stock scoring', () => {
    const scoreMatch = __rmeMapperInternals.scoreMedicationCandidate(
      'Captopril 25mg',
      'Kaptopril 25 mg tablet'
    );
    const scoreMiss = __rmeMapperInternals.scoreMedicationCandidate(
      'Captopril 25mg',
      'Parasetamol 500 mg tablet'
    );

    expect(scoreMatch).toBeGreaterThan(scoreMiss);
  });

  it('randomizes Askep lainnya fields from the approved five-option pools', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);

    try {
      const mapped = buildRMETransferPayload({
        keluhanUtama: 'Demam dan nyeri kepala',
        patientGender: 'L',
        diagnosis: {
          icd_x: 'R50',
          nama: 'Demam',
        },
      });

      expect(mapped.payload.anamnesa.lainnya).toEqual(
        expect.objectContaining({
          terapi: 'Terapi farmakologis mengikuti rencana dokter dan respons pasien dipantau.',
          terapi_non_obat:
            'Mobilisasi ringan dianjurkan sesuai kemampuan, disertai pemantauan keluhan.',
          bmhp: 'BMHP digunakan sesuai kebutuhan tindakan dan prinsip kebersihan tetap dijaga.',
          rencana_tindakan:
            'Evaluasi berkala dilakukan untuk menilai respons pasien terhadap perawatan.',
          edukasi: 'Pasien memahami instruksi perawatan di rumah dan bersedia mengikuti anjuran.',
          askep: 'Perawatan berjalan baik, pasien kooperatif, dan tidak tampak tanda kegawatan.',
          observasi: 'Pantau nyeri, asupan cairan, tanda vital, dan keluhan tambahan bila muncul.',
          keterangan: 'Dokumentasi telah dilakukan dan pasien memahami rencana tindak lanjut.',
          biopsikososial:
            'Pasien stabil, psikologis tenang, dan hubungan sosial pasien tampak baik.',
          tindakan_keperawatan:
            'Membantu kebutuhan dasar pasien, menjaga keamanan, dan melakukan dokumentasi.',
        })
      );
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('writes the ticked education as whole items that fit the RME text limit', () => {
    const first = 'Minum air putih minimal 2 liter/hari (dewasa) atau sesuai BB (anak). Air hangat lebih membantu.';
    const second = 'Istirahat cukup, jangan bekerja/sekolah dulu hingga 24 jam bebas demam.';
    const tooLong = `Kontrol: ${'jika gejala tidak membaik dalam 7-10 hari '.repeat(3).trim()}.`;
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri menelan',
      patientGender: 'L',
      diagnosis: { icd_x: 'J02', nama: 'Faringitis' },
      edukasi: [first, second, tooLong],
    });

    // The third item would cross 250 characters, so it is left out rather than cut in half.
    expect(mapped.payload.anamnesa.lainnya?.edukasi).toBe(`${first} ${second}`);
  });

  it('generates normal adult anthropometrics when no measured values are available', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    try {
      const mapped = buildRMETransferPayload({
        keluhanUtama: 'Demam',
        patientGender: 'L',
        patientAge: 35,
      });

      const periksaFisik = mapped.payload.anamnesa.periksa_fisik;
      expect(periksaFisik?.tinggi).toBeGreaterThan(0);
      expect(periksaFisik?.berat).toBeGreaterThan(0);
      expect(periksaFisik?.lingkar_perut).toBeGreaterThan(0);
      expect(periksaFisik?.imt).toBeGreaterThanOrEqual(20);
      expect(periksaFisik?.imt).toBeLessThanOrEqual(22.8);
      expect(periksaFisik?.hasil_imt).toBe('Normal');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('uses the older-adult normal BMI range for senior fallback anthropometrics', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    try {
      const mapped = buildRMETransferPayload({
        keluhanUtama: 'Kontrol kesehatan',
        patientGender: 'P',
        patientAge: 72,
      });

      const periksaFisik = mapped.payload.anamnesa.periksa_fisik;
      expect(periksaFisik?.imt).toBeGreaterThanOrEqual(22);
      expect(periksaFisik?.imt).toBeLessThanOrEqual(26.9);
      expect(periksaFisik?.hasil_imt).toBe('Normal');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('generates plausible child anthropometrics from age-specific fallback ranges', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    try {
      const mapped = buildRMETransferPayload({
        keluhanUtama: 'Batuk pilek',
        patientGender: 'L',
        patientAge: 8,
      });

      const periksaFisik = mapped.payload.anamnesa.periksa_fisik;
      expect(periksaFisik?.tinggi).toBeGreaterThanOrEqual(120);
      expect(periksaFisik?.tinggi).toBeLessThanOrEqual(135);
      expect(periksaFisik?.berat).toBeGreaterThan(0);
      expect(periksaFisik?.imt).toBeGreaterThanOrEqual(14.5);
      expect(periksaFisik?.imt).toBeLessThanOrEqual(19);
      expect(periksaFisik?.hasil_imt).toBe('Normal');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('builds full mapped Anamnesa values for the latest rme-puskesmas PENGKAJIAN AWAL fields', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri perut kanan bawah',
      patientGender: 'L',
      vitalSigns: {
        sbp: 131,
        dbp: 71,
        hr: 88,
        rr: 22,
        temp: 37.2,
        glucose: 140,
      },
      spo2: 98,
      avpu: 'A',
      painScore: 6,
      diagnosis: {
        icd_x: 'R10.3',
        nama: 'Nyeri abdomen bawah',
      },
    });

    const anamnesa = mapped.payload.anamnesa as typeof mapped.payload.anamnesa & {
      vital_signs: NonNullable<typeof mapped.payload.anamnesa.vital_signs> & {
        map: number;
        detak_jantung: 'REGULAR' | 'IREGULAR';
      };
      periksa_fisik: NonNullable<typeof mapped.payload.anamnesa.periksa_fisik> & {
        cara_ukur: 'berdiri';
        triage: 'TIDAK GAWAT DARURAT';
      };
      assesmen_nyeri: NonNullable<typeof mapped.payload.anamnesa.assesmen_nyeri> & {
        waktu: '0' | '1';
      };
    };

    expect(anamnesa.vital_signs.map).toBe(91);
    expect(anamnesa.vital_signs.detak_jantung).toBe('REGULAR');
    expect(anamnesa.periksa_fisik.cara_ukur).toBe('berdiri');
    expect(anamnesa.periksa_fisik.triage).toBe('TIDAK GAWAT DARURAT');
    // "Nyeri perut kanan bawah" tidak menyebut mekanisme/durasi eksplisit —
    // pencetus dan waktu harus tidak terisi (extraction-only, bukan fabrikasi).
    expect(anamnesa.assesmen_nyeri.pencetus).toBeUndefined();
    expect(anamnesa.assesmen_nyeri.kualitas).toBe('Melilit');
    expect(anamnesa.assesmen_nyeri.lokasi).toBe('Abdomen');
    expect(anamnesa.assesmen_nyeri.waktu).toBeUndefined();
  });

  it('leaves pencetus/kualitas/waktu unset when keluhan has no matching keyword', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri kepala',
      patientGender: 'L',
      painScore: 3,
    });

    const assesmenNyeri = mapped.payload.anamnesa.assesmen_nyeri;
    expect(assesmenNyeri?.merasakan_nyeri).toBe('1');
    expect(assesmenNyeri?.pencetus).toBeUndefined();
    expect(assesmenNyeri?.kualitas).toBeUndefined();
    expect(assesmenNyeri?.waktu).toBeUndefined();
    expect(assesmenNyeri?.lokasi).toBe('Kepala');
  });

  it('extracts pencetus and waktu when keluhan names an explicit mechanism and duration', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri kaki setelah jatuh, hilang timbul sejak kemarin',
      patientGender: 'L',
    });

    const assesmenNyeri = mapped.payload.anamnesa.assesmen_nyeri;
    expect(assesmenNyeri?.pencetus).toBe('Jatuh');
    expect(assesmenNyeri?.waktu).toBe('0');
  });

  it('raises mobilisasi to 2 when complaint text names a mobility limitation and disabilityType is empty', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Pasien tidak bisa jalan sejak kemarin',
      patientGender: 'L',
    });

    expect(mapped.payload.anamnesa.periksa_fisik?.mobilisasi).toBe('2');
    // The other four ADL fields stay disabilityType-driven only.
    expect(mapped.payload.anamnesa.periksa_fisik?.toileting).toBe('0');
    expect(mapped.payload.anamnesa.periksa_fisik?.makan_minum).toBe('0');
    expect(mapped.payload.anamnesa.periksa_fisik?.mandi).toBe('0');
    expect(mapped.payload.anamnesa.periksa_fisik?.berpakaian).toBe('0');
  });

  it('does not downgrade mobilisasi when disabilityType already implies a value at or above the keyword default', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Demam',
      patientGender: 'L',
      disabilityType: 'Kelemahan tungkai',
    });

    // disabilityType alone maps to '1'; no mobility keyword present, so it stays '1'.
    expect(mapped.payload.anamnesa.periksa_fisik?.mobilisasi).toBe('1');
  });

  it('keeps resiko_jatuh and skala_nyeri behavior unchanged by the pencetus/kualitas/waktu/mobilisasi fix', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri perut kanan bawah',
      patientGender: 'L',
      avpu: 'A',
      painScore: 6,
    });

    expect(mapped.payload.anamnesa.resiko_jatuh).toEqual({ cara_berjalan: '0', penopang: '0' });
    expect(mapped.payload.anamnesa.assesmen_nyeri?.skala_nyeri).toBe(6);
  });

  it('infers pain assessment and physical exam from composed draft complaint text', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Pemeriksaan umum',
      keluhanTambahan: '',
      patientGender: 'L',
      anamnesaDraftPayload: {
        lama_sakit: { thn: 0, bln: 0, hr: 1 },
        riwayat_penyakit: {
          sekarang: 'Pasien mengeluh nyeri perut kanan bawah dan mual sejak pagi.',
          dahulu: '',
          keluarga: '',
        },
      },
    });

    expect(mapped.payload.anamnesa.assesmen_nyeri?.merasakan_nyeri).toBe('1');
    expect(mapped.payload.anamnesa.assesmen_nyeri?.lokasi).toBe('Abdomen');
    expect(mapped.payload.anamnesa.keadaan_fisik?.abdomen_perut).toEqual(
      expect.objectContaining({
        inspeksi: expect.any(String),
      })
    );
  });

  it('builds structured anatomy payload from localized complaint text', () => {
    const mapped = buildRMETransferPayload({
      keluhanUtama: 'Nyeri perut kanan bawah sejak pagi',
      keluhanTambahan: 'Mual tanpa muntah',
      patientGender: 'L',
    });

    expect(mapped.payload.anamnesa.anatomi_tubuh).toEqual([
      {
        bagian_tubuh: 'Perut',
        keterangan: expect.stringContaining('Nyeri perut kanan bawah sejak pagi'),
        confidence: 'high',
        source: 'keluhan',
      },
    ]);
  });
});
