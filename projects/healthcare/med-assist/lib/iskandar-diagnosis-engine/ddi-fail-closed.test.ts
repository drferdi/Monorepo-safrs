import { afterEach, describe, expect, it, vi } from 'vitest';

// When interactions cannot be checked, the answer is never "no interactions".

const inventory = [{ nama_obat: 'Amlodipine', stok_tersedia: 3000, status: 'tersedia' }];
const context = {
  icd_x: 'I10',
  patient_age: 45,
  alergi: [],
  penyakit_kronis: [],
  current_medications: ['Lisinopril'],
};

afterEach(() => {
  vi.doUnmock('@/data/ddi-clinical.json');
  vi.doUnmock('./ddi-checker');
  vi.resetModules();
});

describe('DDI fail-closed', () => {
  it('throws when the interaction table cannot be loaded', async () => {
    vi.resetModules();
    vi.doMock('@/data/ddi-clinical.json', () => {
      throw new Error('unreadable table');
    });
    const { checkDrugInteractions } = await import('./ddi-checker');

    await expect(checkDrugInteractions(['Simvastatin', 'Clarithromycin'])).rejects.toThrow(
      'DDI database unavailable'
    );
  });

  it('leaves a candidate out of the plan when its interactions cannot be checked', async () => {
    vi.resetModules();
    vi.doMock('./ddi-checker', () => ({
      checkDrugInteractions: vi.fn(async () => {
        throw new Error('DDI database unavailable');
      }),
    }));
    const { generatePharmacotherapyPlan } = await import('./pharmacotherapy-reasoner');

    const plan = await generatePharmacotherapyPlan(context, inventory);

    expect(plan.medications.map((med) => med.nama_obat)).not.toContain('Amlodipine');
    expect(plan.alerts.map((alert) => alert.message)).toContain(
      'Amlodipine: DDI tidak dapat diperiksa: DDI database unavailable'
    );
  });
});
