import { describe, expect, it } from 'vitest';

import { standardDoseFor } from './standardDose';

import stockDatabase from '@/public/data/stok_obat.json';

// Chief, 2026-09-29: the picked medicine brings "dosis minimal dan standard sesudah/ sebelum makan
// atau signa lain", from references ("Cari dulu referensi").
describe('standardDoseFor', () => {
  it('gives the lowest standard adult regimen in whole units and the signa of the references', () => {
    expect(standardDoseFor('Amlodipin tablet 10 mg')).toEqual({ dosis: '1x1', aturan_pakai: 'Sesudah makan' });
    expect(standardDoseFor('BLUD Kaptopril tablet 25 mg')).toEqual({ dosis: '2x1', aturan_pakai: 'Sebelum makan' });
    expect(standardDoseFor('Domperidon tablet 10 mg')).toEqual({ dosis: '3x1', aturan_pakai: 'Sebelum makan' });
    expect(standardDoseFor('Doksisiklin kapsul/kaplet 100 mg')).toEqual({ dosis: '2x1', aturan_pakai: 'Saat makan' });
    expect(standardDoseFor('Kloramfenikol Kapsul/kaplet 250 mg')).toEqual({ dosis: '4x2', aturan_pakai: 'Sesudah makan' });
    expect(standardDoseFor('Isosorbid dinitrat tablet sublingual 5 mg')).toEqual({ dosis: '1x1', aturan_pakai: 'Jika diperlukan' });
  });

  it('gives a single dose its one day, so the RME does not count a daily supply', () => {
    expect(standardDoseFor('Flukonazol kapsul 150 mg (program)')).toEqual({ dosis: '1x1', aturan_pakai: 'Sesudah makan', durasi: '1 hari' });
    expect(standardDoseFor('Albendazol tablet 400 mg (program)')).toEqual({ dosis: '1x1', aturan_pakai: 'Saat makan', durasi: '1 hari' });
  });

  it('fires only for the strengths its reference covers', () => {
    expect(standardDoseFor('Amoksilin 125 Mg')).toBeNull();
    expect(standardDoseFor('BLUD Domperidon 50 mg')).toBeNull();
    expect(standardDoseFor('Klindamisin kapsul 150 mg')).toEqual({ dosis: '4x1', aturan_pakai: 'Sesudah makan' });
    expect(standardDoseFor('KLINDAMISIN 300 MG')).toEqual({ dosis: '2x1', aturan_pakai: 'Sesudah makan' });
  });

  it('gives syrups the signa only, their dose following the weight', () => {
    expect(standardDoseFor('Amoksisilin sirup kering 125 mg/5 ml')).toEqual({ dosis: '', aturan_pakai: 'Sesudah makan' });
    expect(standardDoseFor('Antasida Doen II suspensi')).toEqual({ dosis: '', aturan_pakai: 'Sebelum makan' });
  });

  it('gives nothing to injections, programme regimens and specialist-titrated drugs', () => {
    for (const name of [
      'Ampisilin Serbuk injeksi i.m/i.v.1000 mg',
      'Bedaquiline 100mg',
      'Obat Anti Tuberkulosis(OAT) Dosis Harian(program)',
      'Pil KB Kombinasi',
      'Haloperidol tablet 5 mg',
      'Diazepam tablet 5mg (program)',
      'Vaksin BCG + Pelarut',
    ]) {
      expect(standardDoseFor(name)).toBeNull();
    }
  });

  it('gives eye, ear and skin preparations their applications and "Pemakaian luar"', () => {
    expect(standardDoseFor('Kloramfenikol Tetes Mata')).toEqual({ dosis: '6x1 tetes', aturan_pakai: 'Pemakaian luar' });
    expect(standardDoseFor('Gentamisin salep mata 0,3%')).toEqual({ dosis: '3x aplikasi', aturan_pakai: 'Pemakaian luar' });
    expect(standardDoseFor('Kloramfenikol Tetes Telinga 3 %')).toEqual({ dosis: '2x2 tetes', aturan_pakai: 'Pemakaian luar' });
    expect(standardDoseFor('Permetrin Krim 5%')).toEqual({ dosis: '1x aplikasi', aturan_pakai: 'Pemakaian luar', durasi: '1 hari' });
    expect(standardDoseFor('Mikonazol krim/salep 2% (nitrat)')).toEqual({ dosis: '2x aplikasi', aturan_pakai: 'Pemakaian luar' });
    expect(standardDoseFor('Fenol Gliserol tetes telinga 10%')).toBeNull();
    expect(standardDoseFor('Nistatin tablet vaginal 100.000 IU/g')).toBeNull();
  });

  it('writes every stock dose so the RME signa reads it (NxM, drops or applications), or leaves it empty', () => {
    const items = (stockDatabase.stok_obat as Array<{ nama_obat: string; kelompok: string }>).filter((item) => item.kelompok === 'OBAT');
    const doses = items.flatMap((item) => {
      const standard = standardDoseFor(item.nama_obat);
      return standard ? [standard.dosis] : [];
    });
    expect(doses.length).toBeGreaterThan(40);
    for (const dosis of doses) expect(dosis).toMatch(/^(\d+x\d+( tetes)?|\d+x aplikasi)?$/);
  });
});
