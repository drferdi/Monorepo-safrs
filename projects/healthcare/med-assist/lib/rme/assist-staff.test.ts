import { describe, expect, it } from 'vitest';

import type { AuthSession } from '@/lib/api/auth-store';
import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { assistStaffFromSession, withResepStaff, withStaffNames } from './assist-staff';

const crewSession = (profession: string, id = 'budi'): AuthSession => ({
  user: {
    id,
    username: id,
    name: 'dr. Budi',
    role: 'doctor',
    facilityId: 'F',
    facilityName: 'F',
    poli: profession,
  },
  tokens: { accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: 0 },
  serverBaseUrl: 'http://127.0.0.1',
});

describe('assistStaffFromSession', () => {
  it('reads name and crew profession', () => {
    expect(assistStaffFromSession(crewSession('Dokter'))).toEqual({
      name: 'dr. Budi',
      profession: 'Dokter',
    });
  });

  it('ignores local accounts and missing sessions', () => {
    expect(assistStaffFromSession(crewSession('Dokter', 'local:sentraone'))).toBeNull();
    expect(assistStaffFromSession(null)).toBeNull();
  });
});

describe('withStaffNames / withResepStaff', () => {
  const doctor = { name: 'dr. Budi', profession: 'Dokter' };

  it('overrides anamnesa tenaga_medis', () => {
    const out = withStaffNames(
      { tenaga_medis: { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA } },
      doctor
    );
    expect(out.tenaga_medis).toEqual({ dokter_nama: 'dr. Budi', perawat_nama: PERAWAT_NAMA });
  });

  it('adds tenaga_medis to a diagnosa payload that has none', () => {
    const payload: { icd_x: string; tenaga_medis?: { dokter_nama: string; perawat_nama: string } } =
      { icd_x: 'J18.9' };
    expect(withStaffNames(payload, doctor)).toEqual({
      icd_x: 'J18.9',
      tenaga_medis: { dokter_nama: 'dr. Budi', perawat_nama: PERAWAT_NAMA },
    });
  });

  it('overrides resep ajax dokter/perawat', () => {
    const out = withResepStaff(
      { ajax: { ruangan: '', dokter: DOKTER_NAMA, perawat: PERAWAT_NAMA } },
      doctor
    );
    expect(out.ajax).toEqual({ ruangan: '', dokter: 'dr. Budi', perawat: PERAWAT_NAMA });
  });

  it('returns the payload untouched without staff', () => {
    const payload = { ajax: { ruangan: '', dokter: DOKTER_NAMA, perawat: PERAWAT_NAMA } };
    expect(withResepStaff(payload, null)).toBe(payload);
  });
});
