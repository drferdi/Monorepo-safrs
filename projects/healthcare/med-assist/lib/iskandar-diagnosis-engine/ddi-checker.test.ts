import { describe, expect, it } from 'vitest';

import { checkDrugInteractions, DDI_DRUG_ALIASES, resolveDDIDrugNames } from './ddi-checker';
import { generatePharmacotherapyPlan } from './pharmacotherapy-reasoner';

// The drug-interaction guard on the bundled DDInter 2.0 table (major and moderate pairs only).
// The pairs below are read from it.

describe('resolveDDIDrugNames', () => {
  it.each([
    ['Amlodipin tablet 5 mg', ['amlodipine']],
    ['Asam asetilsalisilat', ['acetylsalicylicacid']],
    ['Aspirin', ['acetylsalicylicacid']],
    ['Paracetamol 500 mg', ['acetaminophen']],
    ['Spironolakton 25 mg', ['spironolactone']],
    ['Kaptopril 25 mg', ['captopril']],
    ['Klorfeniramin Maleat ( CTM ) tablet 4 mg', ['chlorpheniramine']],
    ['CTM', ['chlorpheniramine']],
    ['Natrium Diklofenak 50 mg', ['diclofenac']],
    ['Asam mefenamat 500 mg', ['mefenamicacid']],
    ['Siprofloksasin 500 mg', ['ciprofloxacin']],
    ['Amoksisilin sirup 125 mg/5 ml', ['amoxicillin']],
    ['Deksametason 0,5 mg', ['dexamethasone']],
    ['Glibenklamid 5 mg', ['glyburide']],
    ['Natrium valproat', ['valproicacid']],
    ['Salbutamol sulfat 2 mg', ['salbutamol']],
    ['Kalium klorida', ['potassiumchloride']],
    ['Natrium bikarbonat', ['sodiumbicarbonate']],
    ['Kalsium laktat', ['calciumlactate']],
    ['Vitamin B6', ['pyridoxine']],
    ['Amlodipin Hexpharm', ['amlodipine']],
  ])('reads %s as %j', async (name, expected) => {
    expect(await resolveDDIDrugNames(name)).toEqual(expected);
  });

  it('reads a product of two drugs as both', async () => {
    expect(await resolveDDIDrugNames('Kotrimoksazol 480 mg')).toEqual([
      'sulfamethoxazole',
      'trimethoprim',
    ]);
    expect(await resolveDDIDrugNames('Amoksisilin + Asam klavulanat')).toEqual([
      'amoxicillin',
      'clavulanicacid',
    ]);
    expect(await resolveDDIDrugNames('Antasida Doen')).toEqual([
      'aluminumhydroxide',
      'magnesiumhydroxide',
    ]);
  });

  it('reads an Indonesian "-ida" salt with and without it', async () => {
    expect(await resolveDDIDrugNames('Ranitidin hidroklorida 150 mg')).toEqual(['ranitidine']);
  });

  it('reads manufacturer and form words as nothing', async () => {
    for (const name of ['Hexpharm', 'Indofarma', 'Kombinasi', 'Dewasa', 'Steril', 'Larutan Oral']) {
      expect(await resolveDDIDrugNames(name)).toEqual([]);
    }
  });

  // The old matcher took the first table name containing the input.
  it('never matches a longer name that contains the input', async () => {
    expect(await resolveDDIDrugNames('Prednisolon 5 mg')).toEqual(['prednisolone']);
    expect(await resolveDDIDrugNames('Tetrasiklin')).toEqual(['tetracycline']);
    expect(await resolveDDIDrugNames('Vitamin K')).toEqual([]);
  });

  it('reads a name the table does not list as nothing', async () => {
    expect(await resolveDDIDrugNames('Ambroxol 30 mg')).toEqual([]);
  });

  it('points every alias at a name in the table', async () => {
    const targets = [...new Set(Object.values(DDI_DRUG_ALIASES).flat())];
    for (const target of targets) {
      expect(await resolveDDIDrugNames(target)).toEqual([target]);
    }
  });
});

describe('checkDrugInteractions', () => {
  it.each([
    ['Aspirin', 'Warfarin'],
    ['Asam asetilsalisilat 80 mg', 'Warfarin 2 mg'],
    ['Spironolakton 25 mg', 'Kaptopril 25 mg'],
    ['Simvastatin 20 mg', 'Klaritromisin 500 mg'],
  ])('flags %s with %s as a major pair', async (drugA, drugB) => {
    const result = await checkDrugInteractions([drugA, drugB]);

    expect(result.interactions).toMatchObject([
      { drug_a: drugA, drug_b: drugB, severity: 'major' },
    ]);
    expect(result.hasBlocking).toBe(true);
  });

  // Amlodipine + atorvastatin is a moderate pair in the table, and also one product.
  it('checks the two drugs of one product against others, not against each other', async () => {
    const separate = await checkDrugInteractions(['Amlodipin', 'Atorvastatin']);
    const oneProduct = await checkDrugInteractions(['Amlodipin/Atorvastatin', 'Ambroxol']);

    expect(separate.interactions.map((interaction) => interaction.severity)).toEqual(['moderate']);
    expect(oneProduct.interactions).toEqual([]);
  });

  it('flags paracetamol with warfarin as a moderate pair', async () => {
    const result = await checkDrugInteractions(['Paracetamol 500 mg', 'Warfarin']);

    expect(result.interactions.map((interaction) => interaction.severity)).toEqual(['moderate']);
  });

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
