// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import { getResepRowSelectors } from '@/data/field-mappings';

describe('getResepRowSelectors', () => {
  it('keeps generic fallback selectors only for first row', () => {
    const row0 = getResepRowSelectors(0);
    const row2 = getResepRowSelectors(2);

    expect(row0.obat_nama).toContain('input[name="obat_nama"]');
    expect(row0.obat_signa).toContain('input[placeholder*="Cari Resep"]');

    expect(row2.obat_nama).not.toContain('input[name="obat_nama"]');
    expect(row2.obat_signa).not.toContain('input[placeholder*="Cari Resep"]');
    expect(row2.obat_nama).toContain('input[name="obat_nama[2]"]');
    expect(row2.obat_nama).toContain('input[name="obat_nama[3]"]');
  });
});
