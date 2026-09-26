import type {
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from './clinical-reasoning-evidence';
import type {
  ClinicalReasoningArbiterResult,
  ClinicalReasoningTherapyGate,
} from './clinical-reasoning-arbiter';
import type { DifferentialDiagnosisCandidate } from './clinical-reasoning-differential';

export type TherapyReasoningPackStatus = 'locked' | 'ready';
export type TherapyReasoningPriority = 'immediate' | 'urgent' | 'routine';

export type TherapyReasoningActionCategory =
  | 'stabilization_review'
  | 'condition_specific_support'
  | 'diagnostic_confirmation'
  | 'monitoring_reassessment'
  | 'escalation_review'
  | 'medication_safety_review';

export interface TherapyReasoningAction {
  id: string;
  label: string;
  category: TherapyReasoningActionCategory;
  priority: TherapyReasoningPriority;
  rationale: string;
  evidenceFactKeys: ClinicalReasoningFactKey[];
  sourceRefs: string[];
}

export interface TherapyReasoningSafetyCheck {
  id: string;
  label: string;
  required: true;
  rationale: string;
}

export interface TherapyReasoningPack {
  status: TherapyReasoningPackStatus;
  selectedWorkingDiagnosis: DifferentialDiagnosisCandidate | null;
  therapyGate: ClinicalReasoningTherapyGate;
  actions: TherapyReasoningAction[];
  safetyChecks: TherapyReasoningSafetyCheck[];
  blockers: string[];
  explanation: string;
  automationLevel: 'review_only';
  autoSubmit: false;
  requiresPhysicianOrder: true;
}

export interface BuildTherapyReasoningPackInput {
  evidencePack: ReasoningEvidencePack;
  arbiterResult: ClinicalReasoningArbiterResult;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function factSourceRefs(
  evidencePack: ReasoningEvidencePack,
  keys: ClinicalReasoningFactKey[]
): string[] {
  return uniqueStrings(
    evidencePack.clinicalFacts
      .filter((fact) => keys.includes(fact.key))
      .flatMap((fact) => fact.sourceRefs)
  );
}

function baseSafetyChecks(evidencePack: ReasoningEvidencePack): TherapyReasoningSafetyCheck[] {
  const checks: TherapyReasoningSafetyCheck[] = [
    {
      id: 'allergy-contraindication-review',
      label: 'Review alergi dan kontraindikasi',
      required: true,
      rationale: 'Terapi hanya boleh disusun setelah alergi dan kontraindikasi dikonfirmasi.',
    },
    {
      id: 'medication-reconciliation-review',
      label: 'Rekonsiliasi obat aktif',
      required: true,
      rationale: 'Obat aktif dan interaksi potensial harus ditinjau sebelum order terapi.',
    },
    {
      id: 'renal-hepatic-review',
      label: 'Review fungsi ginjal/hepar bila relevan',
      required: true,
      rationale: 'Penyesuaian terapi membutuhkan status organ dan konteks komorbid.',
    },
    {
      id: 'local-protocol-review',
      label: 'Cocokkan dengan protokol lokal',
      required: true,
      rationale:
        'Pack ini hanya review support; order final mengikuti protokol dan judgment dokter.',
    },
  ];

  if (evidencePack.safetyDominance.treatmentResponseConflict) {
    checks.push({
      id: 'response-conflict-review',
      label: 'Rekonsiliasi respons terapi yang konflik',
      required: true,
      rationale:
        'Respons terapi baik dan buruk muncul bersamaan sehingga perlu reassessment klinis.',
    });
  }

  return checks;
}

function buildSafetyActions(evidencePack: ReasoningEvidencePack): TherapyReasoningAction[] {
  const actions: TherapyReasoningAction[] = [];

  if (evidencePack.safetyDominance.criticalAlert || evidencePack.safetyDominance.unstablePatient) {
    const keys: ClinicalReasoningFactKey[] = [
      'critical_deterioration',
      'hemodynamic_instability',
      'shock_watch',
      'respiratory_worsening',
    ];
    actions.push({
      id: 'safety-stabilization-review',
      label: 'Review stabilisasi dan eskalasi segera',
      category: 'stabilization_review',
      priority: 'immediate',
      rationale:
        'Trajectory menunjukkan instabilitas atau alert kritis; stabilisasi dan kebutuhan eskalasi harus direview dulu.',
      evidenceFactKeys: keys,
      sourceRefs: factSourceRefs(evidencePack, keys),
    });
  }

  if (evidencePack.safetyDominance.mustNotMissPresent) {
    const keys: ClinicalReasoningFactKey[] = ['critical_deterioration', 'shock_watch'];
    actions.push({
      id: 'must-not-miss-escalation-review',
      label: 'Review must-not-miss sebelum terapi rutin',
      category: 'escalation_review',
      priority: 'immediate',
      rationale:
        'Must-not-miss aktif; terapi rutin tidak boleh mendahului evaluasi kondisi berisiko tinggi.',
      evidenceFactKeys: keys,
      sourceRefs: factSourceRefs(evidencePack, keys),
    });
  }

  return actions;
}

function buildConditionActions(
  evidencePack: ReasoningEvidencePack,
  selected: DifferentialDiagnosisCandidate
): TherapyReasoningAction[] {
  const actions: TherapyReasoningAction[] = [];
  const id = selected.id;

  if (id === 'candidate-sepsis-concern') {
    actions.push(
      {
        id: 'sepsis-source-control-review',
        label: 'Review sumber infeksi dan kebutuhan kontrol sumber',
        category: 'diagnostic_confirmation',
        priority: 'urgent',
        rationale:
          'Working diagnosis sepsis concern membutuhkan korelasi sumber infeksi, perfusi, dan status mental.',
        evidenceFactKeys: ['infection_or_physiologic_burden', 'hemodynamic_instability'],
        sourceRefs: factSourceRefs(evidencePack, [
          'infection_or_physiologic_burden',
          'hemodynamic_instability',
        ]),
      },
      {
        id: 'protocol-antimicrobial-review',
        label: 'Review kebutuhan antimikroba sesuai protokol lokal',
        category: 'condition_specific_support',
        priority: 'urgent',
        rationale:
          'Antimikroba tidak dipilih otomatis; dokter perlu menilai indikasi, alergi, kontraindikasi, dan protokol lokal.',
        evidenceFactKeys: ['infection_or_physiologic_burden'],
        sourceRefs: factSourceRefs(evidencePack, ['infection_or_physiologic_burden']),
      }
    );
  }

  if (id === 'candidate-pneumonia-bronchopneumonia') {
    actions.push(
      {
        id: 'respiratory-support-review',
        label: 'Review dukungan respirasi dan respons oksigen',
        category: 'stabilization_review',
        priority: 'urgent',
        rationale:
          'Working diagnosis respirasi membutuhkan review work of breathing, SpO2, dan respons dukungan awal.',
        evidenceFactKeys: ['respiratory_worsening'],
        sourceRefs: factSourceRefs(evidencePack, ['respiratory_worsening']),
      },
      {
        id: 'pneumonia-protocol-review',
        label: 'Review tata laksana pneumonia sesuai protokol lokal',
        category: 'condition_specific_support',
        priority: 'urgent',
        rationale:
          'Terapi spesifik perlu dikaitkan dengan severity, alergi, komorbid, dan hasil konfirmasi klinis.',
        evidenceFactKeys: ['respiratory_worsening', 'infection_or_physiologic_burden'],
        sourceRefs: factSourceRefs(evidencePack, [
          'respiratory_worsening',
          'infection_or_physiologic_burden',
        ]),
      }
    );
  }

  if (id === 'candidate-asthma-exacerbation' || id === 'candidate-bronchiolitis') {
    actions.push({
      id: 'airway-breathing-review',
      label: 'Review airway-breathing dan monitoring respirasi',
      category: 'stabilization_review',
      priority: 'urgent',
      rationale:
        'Working diagnosis respirasi obstruktif/anak membutuhkan monitoring respirasi serial sebelum terapi spesifik.',
      evidenceFactKeys: ['respiratory_worsening'],
      sourceRefs: factSourceRefs(evidencePack, ['respiratory_worsening']),
    });
  }

  if (id === 'candidate-hypertensive-crisis') {
    actions.push({
      id: 'target-organ-review',
      label: 'Review gejala organ target dan pengukuran ulang tekanan darah',
      category: 'diagnostic_confirmation',
      priority: 'urgent',
      rationale:
        'Konteks krisis hipertensi membutuhkan konfirmasi tekanan darah terstandar dan evaluasi organ target.',
      evidenceFactKeys: ['hemodynamic_instability', 'baseline_or_planning_risk_context'],
      sourceRefs: factSourceRefs(evidencePack, [
        'hemodynamic_instability',
        'baseline_or_planning_risk_context',
      ]),
    });
  }

  return actions;
}

function buildReassessmentActions(evidencePack: ReasoningEvidencePack): TherapyReasoningAction[] {
  if (!evidencePack.safetyDominance.treatmentResponseConflict) return [];

  const keys: ClinicalReasoningFactKey[] = ['treatment_response_good', 'treatment_response_poor'];

  return [
    {
      id: 'treatment-response-reassessment',
      label: 'Reassess respons terapi sebelum order lanjutan',
      category: 'monitoring_reassessment',
      priority: 'urgent',
      rationale:
        'Respons terapi konflik; dokter perlu menilai ulang timeline, intervensi, dan parameter yang berubah.',
      evidenceFactKeys: keys,
      sourceRefs: factSourceRefs(evidencePack, keys),
    },
  ];
}

export function buildTherapyReasoningPackFromArbiter({
  evidencePack,
  arbiterResult,
}: BuildTherapyReasoningPackInput): TherapyReasoningPack {
  const selectedWorkingDiagnosis = arbiterResult.selectedWorkingDiagnosis;
  const locked = arbiterResult.therapyGate.status !== 'ready' || selectedWorkingDiagnosis === null;

  if (locked) {
    return {
      status: 'locked',
      selectedWorkingDiagnosis: null,
      therapyGate: arbiterResult.therapyGate,
      actions: [],
      safetyChecks: baseSafetyChecks(evidencePack),
      blockers: uniqueStrings([
        'physician_selected_working_diagnosis_required',
        ...arbiterResult.blockingFactors,
      ]),
      explanation:
        'Therapy reasoning remains locked until a physician-confirmed working diagnosis is selected.',
      automationLevel: 'review_only',
      autoSubmit: false,
      requiresPhysicianOrder: true,
    };
  }

  const actions = [
    ...buildSafetyActions(evidencePack),
    ...buildConditionActions(evidencePack, selectedWorkingDiagnosis),
    ...buildReassessmentActions(evidencePack),
  ];

  return {
    status: 'ready',
    selectedWorkingDiagnosis,
    therapyGate: arbiterResult.therapyGate,
    actions,
    safetyChecks: baseSafetyChecks(evidencePack),
    blockers: [],
    explanation:
      'Generated as review-only therapy reasoning from physician-confirmed working diagnosis and trajectory evidence.',
    automationLevel: 'review_only',
    autoSubmit: false,
    requiresPhysicianOrder: true,
  };
}
