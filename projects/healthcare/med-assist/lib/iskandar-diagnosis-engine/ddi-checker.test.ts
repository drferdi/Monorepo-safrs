import { describe, expect, it } from 'vitest';

import { checkDrugInteractions } from './ddi-checker';
import { generatePharmacotherapyPlan } from './pharmacotherapy-reasoner';

// The drug-interaction guard on the bundled DDInter 2.0 table (major and moderate pairs only).
// Generic English names match the table directly; the pairs below are read from it.

describe('checkDrugInteractions', () => {
  it('flags a major pair as blocking', async () => {
    const result = await checkDrugInteractions(['Simvastatin', 'Clarithromycin']);

    expect(result.interactions.map((interaction) => interaction.severity)).toEqual(['major']);
    expect(result.hasBlocking).toBe(true);
    expect(result.stats).toEqual({ major: 1, moderate: 0, total: 1 });
  });

  it('finds the pair in either order', async () => {
    const result = await checkDrugInteractions(['Clarithromycin', 'Simvastatin']);

    expect(result.hasBlocking).toBe(true);
  });

  it('reports a moderate pair without blocking', async () => {
    const result = await checkDrugInteractions(['Metformin', 'Ibuprofen']);

    expect(result.interactions.map((interaction) => interaction.severity)).toEqual(['moderate']);
    expect(result.hasBlocking).toBe(false);
  });

  it('reports nothing for one drug', async () => {
    const result = await checkDrugInteractions(['Simvastatin']);

    expect(result.interactions).toEqual([]);
    expect(result.hasBlocking).toBe(false);
  });
});

describe('pharmacotherapy reasoner DDI guard', () => {
  const inventory = [
    { nama_obat: 'Amlodipine', stok_tersedia: 3000, status: 'tersedia' },
    { nama_obat: 'Lisinopril', stok_tersedia: 100, status: 'tersedia' },
  ];
  const context = {
    icd_x: 'I10',
    patient_age: 45,
    alergi: [],
    penyakit_kronis: [],
  };

  it('proposes amlodipine for I10 when nothing interacts with it', async () => {
    const plan = await generatePharmacotherapyPlan(
      { ...context, current_medications: [] },
      inventory
    );

    expect(plan.medications.map((med) => med.nama_obat)).toContain('Amlodipine');
  });

  // Amlodipine + itraconazole is a major pair in the table.
  it('leaves out a candidate with a major interaction with a current medication', async () => {
    const plan = await generatePharmacotherapyPlan(
      { ...context, current_medications: ['Itraconazole'] },
      inventory
    );

    expect(plan.medications.map((med) => med.nama_obat)).not.toContain('Amlodipine');
  });
});
