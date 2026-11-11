// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { normalizeStaffName, pickExactStaffMatch, staffSearchTerm } from './staff-match';

describe('staffSearchTerm', () => {
  it('types the core name without titles or degrees, keeping case', () => {
    expect(staffSearchTerm('dr. Budi Santoso, Sp.PD')).toBe('Budi Santoso');
    expect(staffSearchTerm('JOSEP ARIANTO, A.Md')).toBe('JOSEP ARIANTO');
    expect(staffSearchTerm('Ns.  Dian   Sunardi')).toBe('Dian Sunardi');
    expect(staffSearchTerm('dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC')).toBe('Ferdi Iskandar');
  });
});

describe('normalizeStaffName', () => {
  it('drops titles, degrees after a comma, case and punctuation', () => {
    expect(normalizeStaffName('dr. Budi Santoso, Sp.PD')).toBe('budi santoso');
    expect(normalizeStaffName('Ns. DIAN SUNARDI, S.Kep')).toBe('dian sunardi');
    expect(normalizeStaffName('  drg.  Ani   Lestari ')).toBe('ani lestari');
  });
});

describe('pickExactStaffMatch', () => {
  it('selects the one menu item that carries the name', () => {
    expect(pickExactStaffMatch(['BUDI SANTOSO - Dokter Umum', 'DIAN SUNARDI'], 'dr. Budi Santoso, Sp.PD')).toBe(0);
  });

  it('accepts a menu item that is the name without trailing degrees', () => {
    expect(pickExactStaffMatch(['Dian Sunardi'], 'Dian Sunardi S Kep')).toBe(0);
  });

  it('selects nothing when no item or several items match', () => {
    expect(pickExactStaffMatch(['EKO PRASETYO'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN SUNARDI', 'DIAN SUNARDI (Bidan)'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN SUNARDI'], '')).toBe(-1);
  });

  it('rejects a different clinician whose name merely shares a word with the target', () => {
    expect(pickExactStaffMatch(['ANDI BUDI SANTOSO'], 'Budi Santoso')).toBe(-1);
    expect(pickExactStaffMatch(['BUDI SANTOSO'], 'Muhammad Budi Santoso')).toBe(-1);
    expect(pickExactStaffMatch(['BUDI SANTOSO WIJAYA'], 'Budi Santoso')).toBe(-1);
  });

  it('accepts a degree-abbreviation suffix but not a real extra surname', () => {
    expect(pickExactStaffMatch(['Budi Santoso Sp PD'], 'dr. Budi Santoso')).toBe(0);
    expect(pickExactStaffMatch(['JOSEP ARIANTO, A.Md'], 'JOSEP ARIANTO, A.Md')).toBe(0);
  });
});
