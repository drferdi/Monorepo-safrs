import { describe, expect, it } from 'vitest';

import {
  DOKTER_NAMA,
  PERAWAT_NAMA,
  resolveStaffField,
  resolveTenagaMedisNames,
} from './tenaga-medis';

describe('resolveStaffField', () => {
  it('maps crew professions to the RME field', () => {
    expect(resolveStaffField('Dokter')).toBe('dokter');
    expect(resolveStaffField('Dokter Gigi')).toBe('dokter');
    expect(resolveStaffField('Perawat')).toBe('perawat');
    expect(resolveStaffField('Bidan')).toBe('perawat');
    expect(resolveStaffField('Apoteker')).toBe('perawat');
    expect(resolveStaffField('Triage Officer')).toBe('perawat');
  });

  it('returns null for unknown or empty professions', () => {
    expect(resolveStaffField('Umum')).toBeNull();
    expect(resolveStaffField('')).toBeNull();
    expect(resolveStaffField(undefined)).toBeNull();
  });
});

describe('resolveTenagaMedisNames', () => {
  it('puts a doctor in the doctor field and keeps the nurse constant', () => {
    expect(resolveTenagaMedisNames({ name: 'dr. Budi', profession: 'Dokter' })).toEqual({
      dokter_nama: 'dr. Budi',
      perawat_nama: PERAWAT_NAMA,
    });
  });

  it('puts a nakes in the nurse field and keeps the doctor constant', () => {
    expect(resolveTenagaMedisNames({ name: 'Dian', profession: 'Bidan' })).toEqual({
      dokter_nama: DOKTER_NAMA,
      perawat_nama: 'Dian',
    });
  });

  it('keeps both constants without a usable user', () => {
    const constants = { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA };
    expect(resolveTenagaMedisNames(null)).toEqual(constants);
    expect(resolveTenagaMedisNames({ name: 'Eko', profession: 'Umum' })).toEqual(constants);
    expect(resolveTenagaMedisNames({ name: '  ', profession: 'Dokter' })).toEqual(constants);
  });
});
