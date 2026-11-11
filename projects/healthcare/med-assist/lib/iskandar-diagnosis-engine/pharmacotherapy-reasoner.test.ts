// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';

import { generatePharmacotherapyPlan } from './pharmacotherapy-reasoner';

import type { PrescriptionRequestContext } from '@/types/api';

const inventory = [
  { nama_obat: 'Amlodipin tablet 5 mg', stok_tersedia: 3000, status: 'tersedia' },
  { nama_obat: 'Lisinopril tablet 10 mg', stok_tersedia: 100, status: 'tersedia' },
  { nama_obat: 'Bisoprolol tablet 5 mg', stok_tersedia: 250, status: 'tersedia' },
  {
    nama_obat: 'Isosorbid dinitrat tablet sublingual 5 mg',
    stok_tersedia: 150,
    status: 'tersedia',
  },
  { nama_obat: 'Simvastatin tablet 20 mg', stok_tersedia: 900, status: 'tersedia' },
];

function baseContext(icd: string): PrescriptionRequestContext {
  return {
    icd_x: icd,
    patient_age: 45,
    alergi: [],
    penyakit_kronis: [],
    current_medications: [],
  };
}

describe('pharmacotherapy reasoner', () => {
  it('builds non-empty hypertension regimen for I10', async () => {
    const plan = await generatePharmacotherapyPlan(baseContext('I10'), inventory);
    expect(plan.medications.length).toBeGreaterThan(0);
    expect(plan.medications.some((med) => med.nama_obat.toLowerCase().includes('amlodip'))).toBe(
      true
    );
    expect(plan.confidence).toBeGreaterThan(40);
    expect(plan.riskTier).toBe('urgent');
    expect(plan.reviewWindow).toBe('24h');
    expect(plan.drivers.some((line) => line.includes('Syndrome: hypertension'))).toBe(true);
    expect(plan.missingData).toContain('keluhan_utama_missing');
  });

  it('builds ACS regimen with escalation semantics', async () => {
    const plan = await generatePharmacotherapyPlan(baseContext('I20.9'), inventory);
    expect(plan.medications.length).toBeGreaterThan(0);
    expect(
      plan.alerts.some((alert) => alert.severity === 'emergency' && alert.title.includes('ACS'))
    ).toBe(true);
    expect(
      plan.medications.some(
        (med) =>
          med.nama_obat.toLowerCase().includes('isosorbid') ||
          med.nama_obat.toLowerCase().includes('nitro') ||
          med.nama_obat.toLowerCase().includes('aspirin')
      )
    ).toBe(true);
  });

  it('blocks nitrate recommendation under severe hypotension safety rule', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I20.9'),
        vital_signs: { systolic: 80, diastolic: 50 },
      },
      inventory
    );

    expect(
      plan.medications.some(
        (med) =>
          med.nama_obat.toLowerCase().includes('isosorbid') ||
          med.nama_obat.toLowerCase().includes('nitro')
      )
    ).toBe(false);
    expect(
      plan.alerts.some(
        (alert) =>
          alert.title.includes('Kandidat Terapi Diblok') ||
          alert.message.toLowerCase().includes('sbp 80')
      )
    ).toBe(true);
  });

  it('adds explicit guardrail reason when high-priority cardiac code has no safe regimen', async () => {
    const constrainedInventory = [
      {
        nama_obat: 'Isosorbid dinitrat tablet sublingual 5 mg',
        stok_tersedia: 100,
        status: 'tersedia',
      },
    ];

    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I21.9'),
        alergi: ['aspirin', 'nitroglycerin'],
        vital_signs: { systolic: 80, diastolic: 50 },
      },
      constrainedInventory
    );

    expect(plan.medications.length).toBe(0);
    expect(
      plan.alerts.some((alert) =>
        alert.title.includes('Regimen Kosong pada Sindrom Kardiak Prioritas Tinggi')
      )
    ).toBe(true);
    expect(plan.drivers.some((line) => line.includes('High-priority guardrail aktif'))).toBe(true);
  });

  it('blocks beta-blocker recommendation under severe bradycardia safety rule', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I10'),
        vital_signs: { heart_rate: 45, systolic: 170, diastolic: 100 },
      },
      inventory
    );

    expect(plan.medications.some((med) => med.nama_obat.toLowerCase().includes('bisoprolol'))).toBe(
      false
    );
    expect(plan.alerts.some((alert) => alert.message.toLowerCase().includes('beta-blocker'))).toBe(
      true
    );
  });

  it('blocks ACE inhibitor or ARB recommendation in pregnancy context', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I10'),
        is_pregnant: true,
        penyakit_kronis: ['Kehamilan trimester 2'],
        selected_diagnosis_name: 'Hipertensi pada kehamilan',
      },
      inventory
    );

    expect(
      plan.medications.some((med) =>
        ['lisinopril', 'captopril', 'valsartan', 'losartan', 'telmisartan'].some((keyword) =>
          med.nama_obat.toLowerCase().includes(keyword)
        )
      )
    ).toBe(false);
    expect(plan.alerts.some((alert) => alert.message.toLowerCase().includes('kehamilan'))).toBe(
      true
    );
  });

  it('uses explicit is_pregnant=false to override textual pregnancy hints', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I10'),
        is_pregnant: false,
        penyakit_kronis: ['Kehamilan trimester 2'],
        selected_diagnosis_name: 'Hipertensi pada kehamilan',
        vital_signs: { systolic: 165, diastolic: 105 },
      },
      inventory
    );

    expect(plan.medications.some((med) => med.nama_obat.toLowerCase().includes('lisinopril'))).toBe(
      true
    );
    expect(
      plan.alerts.some((alert) => alert.message.toLowerCase().includes('ace inhibitor/arb'))
    ).toBe(false);
  });

  it('marks added chronic continuation medications with a structured flag', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I10'),
        current_medications: ['Metformin 500 mg 2x1 sesudah makan'],
      },
      inventory
    );

    expect(
      plan.medications.some(
        (med) =>
          med.nama_obat.toLowerCase().includes('metformin') && med.isChronicContinuation === true
      )
    ).toBe(true);
  });

  it('preserves the chronic continuation flag when historical therapy overlaps an existing candidate', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I10'),
        current_medications: ['Amlodipin 10 mg 2x1 sesudah makan'],
      },
      inventory
    );

    const amlodipine = plan.medications.find((med) =>
      med.nama_obat.toLowerCase().includes('amlodip')
    );
    expect(amlodipine).toMatchObject({
      isChronicContinuation: true,
    });
  });
});
