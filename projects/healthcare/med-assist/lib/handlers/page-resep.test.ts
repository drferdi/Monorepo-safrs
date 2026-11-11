// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import { __resepInternals } from '@/lib/handlers/page-resep';

describe('page-resep internals', () => {
  it('ranks solid candidate above liquid for adult tablet query', () => {
    const ranked = __resepInternals.rankMedicationNameCandidates('Paracetamol 500mg', [
      'Paracetamol',
      'Paracetamol sirup',
      'Paracetamol tablet',
    ]);

    expect(ranked[0]?.toLowerCase()).toContain('tablet');
    expect(ranked[0]?.toLowerCase()).not.toContain('sirup');
  });

  it('detects stock warning alert and extracts medication name', () => {
    const alertText =
      'Stok Obat Parasetamol sirup 120 mg/ 5 ml di Ruangan APOTEK tidak mencukupi! Silahkan pilih obat lain atau ruangan / apotek tujuan lain!';

    expect(__resepInternals.isStockInsufficientAlert(alertText)).toBe(true);
    expect(__resepInternals.extractMedicationNameFromStockAlert(alertText)).toContain(
      'Parasetamol sirup'
    );
  });

  it('normalizes and validates signa format strictly', () => {
    const normalized = __resepInternals.normalizeSignaInput(' 3 X 1 ');

    expect(normalized).toBe('3x1');
    expect(__resepInternals.isValidSignaFormat(normalized)).toBe(true);
    expect(__resepInternals.isValidSignaFormat('sesuai anjuran')).toBe(false);
  });

  it('detects preferred form from medication query', () => {
    expect(__resepInternals.detectPreferredMedicationForm('Paracetamol 500mg')).toBe('solid');
    expect(__resepInternals.detectPreferredMedicationForm('Paracetamol sirup 120 mg/5 ml')).toBe(
      'liquid'
    );
  });

  it('supports orthographic C/K variants for medication matching', () => {
    const ranked = __resepInternals.rankMedicationNameCandidates('Captopril 25mg', [
      'Kaptopril 25 mg tablet',
      'Parasetamol 500 mg tablet',
    ]);

    expect(ranked[0]?.toLowerCase()).toContain('kaptopril');
  });

  it('supports transliteration X->KS and C->S for antibiotic matching', () => {
    const ranked = __resepInternals.rankMedicationNameCandidates('Cefixime 200mg', [
      'Sefiksim 200 mg kapsul',
      'Amoksisilin 500 mg kapsul',
    ]);

    expect(ranked[0]?.toLowerCase()).toContain('sefiksim');
  });
});
