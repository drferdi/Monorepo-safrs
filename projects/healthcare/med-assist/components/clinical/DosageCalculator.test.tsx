import { describe, expect, it } from 'vitest';

import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-evidence';
import { runClinicalReasoningArbiter } from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-arbiter';
import { buildDifferentialCandidatesFromEvidencePack } from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-differential';
import { buildTherapyReasoningPackFromArbiter } from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-therapy';
import { generatePharmacotherapyPlan } from '@/lib/iskandar-diagnosis-engine/pharmacotherapy-reasoner';
import type { PrescriptionRequestContext } from '@/types/api';

function fact(key: ClinicalReasoningFactKey, overrides: Partial<ClinicalFact> = {}): ClinicalFact {
  const acuteDeterioration =
    key !== 'baseline_or_planning_risk_context' && key !== 'treatment_response_good';

  return {
    key,
    label: key.replace(/_/g, ' '),
    category:
      key === 'baseline_or_planning_risk_context'
        ? 'baseline_planning_context'
        : key === 'treatment_response_good' || key === 'treatment_response_poor'
          ? 'treatment_response'
          : key === 'infection_or_physiologic_burden'
            ? 'infection_or_physiologic_burden'
            : 'acute_deterioration',
    severity: key === 'critical_deterioration' ? 'critical' : 'high',
    value: true,
    acuteDeterioration,
    trajectoryIds:
      key === 'respiratory_worsening'
        ? ['T-45']
        : key === 'infection_or_physiologic_burden'
          ? ['T-16', 'T-54', 'T-50']
          : key === 'critical_deterioration'
            ? ['T-13']
            : ['T-52'],
    evidence: [`${key} evidence`],
    sourceRefs: [`trajectory_signal:${key}`],
    ...overrides,
  };
}

function makePack(facts: ClinicalFact[]): ReasoningEvidencePack {
  return {
    clinicalFacts: facts,
    activeTrajectorySignals: [],
    redFlags: [],
    driverContributions: [],
    missingCriticalInputs: ['Alergi obat belum terdokumentasi'],
    trajectoryCoverage: [],
    sourceMap: facts.flatMap((item) =>
      item.sourceRefs.map((sourceRef) => ({
        sourceRef,
        targetFactKeys: [item.key],
      }))
    ),
    safetyDominance: {
      criticalAlert: facts.some((item) => item.key === 'critical_deterioration'),
      mustNotMissPresent: facts.some((item) => item.key === 'critical_deterioration'),
      unstablePatient: facts.some((item) => item.acuteDeterioration && item.severity !== 'low'),
      treatmentResponseConflict:
        facts.some((item) => item.key === 'treatment_response_good') &&
        facts.some((item) => item.key === 'treatment_response_poor'),
    },
    therapySupportReady: false,
    therapySupportRequirement: 'physician_selected_working_diagnosis_required',
  };
}

const inventory = [
  { nama_obat: 'Amlodipin tablet 5 mg', stok_tersedia: 3000, status: 'tersedia' },
  { nama_obat: 'Lisinopril tablet 10 mg', stok_tersedia: 100, status: 'tersedia' },
  { nama_obat: 'Bisoprolol tablet 5 mg', stok_tersedia: 250, status: 'tersedia' },
  {
    nama_obat: 'Isosorbid dinitrat tablet sublingual 5 mg',
    stok_tersedia: 150,
    status: 'tersedia',
  },
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

describe('DosageCalculator legacy surface replacement', () => {
  it('keeps therapy support locked until a physician confirms the working diagnosis', () => {
    const evidencePack = makePack([
      fact('respiratory_worsening'),
      fact('infection_or_physiologic_burden'),
      fact('treatment_response_poor'),
    ]);
    const candidates = buildDifferentialCandidatesFromEvidencePack(evidencePack);
    const arbiterResult = runClinicalReasoningArbiter({
      evidencePack,
      candidates,
    });
    const pack = buildTherapyReasoningPackFromArbiter({ evidencePack, arbiterResult });

    expect(pack.status).toBe('locked');
    expect(pack.actions).toEqual([]);
    expect(pack.blockers).toEqual(
      expect.arrayContaining(['physician_selected_working_diagnosis_required'])
    );
    expect(pack.autoSubmit).toBe(false);
    expect(pack.requiresPhysicianOrder).toBe(true);
  });

  it('preserves medication safety guardrails in the active pharmacotherapy reasoner', async () => {
    const plan = await generatePharmacotherapyPlan(
      {
        ...baseContext('I20.9'),
        vital_signs: { systolic: 80, diastolic: 50 },
      },
      inventory
    );

    expect(plan.medications.some((med) => /isosorbid|nitro/i.test(med.nama_obat))).toBe(false);
    expect(plan.alerts.some((alert) => alert.title.includes('Diblok Safety'))).toBe(true);
  });
});
