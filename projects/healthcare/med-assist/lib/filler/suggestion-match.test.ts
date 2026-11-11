import { describe, expect, it } from 'vitest';

import {
  medicationSearchTerm,
  pickExactSuggestion,
  pickMedicationSuggestion,
} from './suggestion-match';

// The ePuskesmas signa list (read live, 2026-10-01) offers "3X1", "3X1/3", "3X1,5", "3X1/2" for
// "3x1"; only the one that is exactly the signa may be chosen, never the first that contains it.
describe('pickExactSuggestion', () => {
  it('picks the item that is exactly the value, ignoring case and spaces', () => {
    expect(pickExactSuggestion(['3X1/2', '3X1,5', '3X1'], '3x1')).toBe(2);
    expect(pickExactSuggestion(['3 x 1/3', '3 x 1'], '3x1')).toBe(1);
  });

  it('picks nothing when no item is exactly the value', () => {
    expect(pickExactSuggestion(['3X1/3', '3X1,5', '3X1/2'], '3x1')).toBe(-1);
    expect(pickExactSuggestion([], '3x1')).toBe(-1);
  });
});

// The ePuskesmas "Nama Obat" list (read live, 2026-10-01/02) labels items "<kode> - <nama> (<stok>)"
// and searches by substring: "Klorfeniramin" finds "Klorfeniramin Maleat ( CTM ) tablet 4 mg",
// "(CTM)" without its spaces finds nothing. Chief, 2026-10-02: type a few words, wait for the
// suggestions, then click the medication itself.
describe('medicationSearchTerm', () => {
  it('types the leading words of the name, up to the first one with punctuation', () => {
    expect(medicationSearchTerm('Klorfeniramin Maleat ( CTM ) tablet 4 mg')).toBe(
      'Klorfeniramin Maleat'
    );
    expect(medicationSearchTerm('N-asetilsistein kapsul 200 mg')).toBe('N-asetilsistein kapsul');
    expect(medicationSearchTerm('Amoksisilin kapsul/kaplet 500 mg')).toBe('Amoksisilin');
    expect(medicationSearchTerm('  Parasetamol  ')).toBe('Parasetamol');
  });
});

describe('pickMedicationSuggestion', () => {
  const items = [
    '20011 - Amoksisilin sirup 125 mg/5 ml (40)',
    '20109 - Klorfeniramin Maleat ( CTM ) tablet 4 mg (1051)',
    '20012 - Amoksisilin kapsul/kaplet 500 mg (832)',
  ];

  it('picks the item whose catalogue name is the medication, code and stock ignored', () => {
    expect(pickMedicationSuggestion(items, 'Amoksisilin kapsul/kaplet 500 mg')).toBe(2);
    expect(pickMedicationSuggestion(items, 'Klorfeniramin Maleat (CTM) tablet 4 mg')).toBe(1);
    expect(pickMedicationSuggestion(items, 'klorfeniramin maleat ( ctm ) tablet 4 mg')).toBe(1);
  });

  it('picks nothing for a different strength or form, never the first item', () => {
    expect(pickMedicationSuggestion(items, 'Amoksisilin kapsul/kaplet 250 mg')).toBe(-1);
    expect(pickMedicationSuggestion(items, 'Amoksisilin')).toBe(-1);
    expect(pickMedicationSuggestion([], 'Amoksisilin kapsul/kaplet 500 mg')).toBe(-1);
  });
});
