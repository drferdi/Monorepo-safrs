// Designed and constructed by Drferdi.
import { describe, expect, it } from 'vitest';
import { buildMockPrescriptionResponse, getMockMedicationsByDiagnosis } from './prescription-mock';

describe('prescription-mock safety fallback', () => {
  it('provides explicit initial regimen for ACS-like code', () => {
    const medications = getMockMedicationsByDiagnosis('I20.9');
    expect(medications.length).toBeGreaterThan(0);
    expect(medications.some((med) => med.nama_obat.toLowerCase().includes('aspirin'))).toBe(true);
  });

  it('emits emergency guardrail alert for ACS-like code', () => {
    const response = buildMockPrescriptionResponse('I20.9');

    expect(response.medication_recommendations.length).toBeGreaterThan(0);
    expect(
      response.alerts.some((alert) => alert.type === 'red_flag' && alert.severity === 'emergency')
    ).toBe(true);
  });

  it('keeps antihypertensive regimen available for I10', () => {
    const response = buildMockPrescriptionResponse('I10');
    expect(
      response.medication_recommendations.some((med) => med.nama_obat.includes('Amlodipine'))
    ).toBe(true);
  });

  it('keeps existing mapped packages for supported code', () => {
    const response = buildMockPrescriptionResponse('J06.9');

    expect(response.medication_recommendations.length).toBeGreaterThan(0);
    expect(response.alerts.some((alert) => alert.title === 'Paket Terapi Tidak Tersedia')).toBe(
      false
    );
  });
});
