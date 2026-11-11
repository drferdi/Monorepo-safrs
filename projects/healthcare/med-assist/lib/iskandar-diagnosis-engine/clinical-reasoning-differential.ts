import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from './clinical-reasoning-evidence';

export type DifferentialCandidateCategory =
  'most_compatible' | 'possible' | 'less_likely' | 'must_not_miss';

export type DifferentialFitBand =
  'highly_compatible' | 'compatible' | 'possible' | 'less_likely' | 'must_not_miss';

export interface DiagnosisPack {
  id: string;
  candidateId: string;
  name: string;
  supportKeys: ClinicalReasoningFactKey[];
  weakenKeys: ClinicalReasoningFactKey[];
  mustNotMissKeys: ClinicalReasoningFactKey[];
  nextBestQuestions: string[];
  suggestedExam: string[];
  suggestedInvestigations: string[];
}

export interface DifferentialEvidenceItem {
  factKey: ClinicalReasoningFactKey;
  label: string;
  evidence: string[];
  sourceRefs: string[];
}

export interface DifferentialDiagnosisCandidate {
  id: string;
  name: string;
  category: DifferentialCandidateCategory;
  fitBand: DifferentialFitBand;
  evidenceFor: DifferentialEvidenceItem[];
  evidenceAgainst: DifferentialEvidenceItem[];
  missingToConfirm: string[];
  redFlagsLinked: string[];
  trajectorySignalsLinked: string[];
  nextQuestions: string[];
  suggestedExam: string[];
  suggestedInvestigations: string[];
  explanation: string;
  safetyNote: string;
  requiresPhysicianSelectionForTherapy: true;
}

const ASSIST_DIAGNOSIS_PACKS: DiagnosisPack[] = [
  {
    id: 'pack-pneumonia-bronchopneumonia',
    candidateId: 'candidate-pneumonia-bronchopneumonia',
    name: 'Pneumonia / bronchopneumonia consideration',
    supportKeys: ['respiratory_worsening', 'infection_or_physiologic_burden'],
    weakenKeys: ['treatment_response_good'],
    mustNotMissKeys: ['critical_deterioration'],
    nextBestQuestions: [
      'Apakah ada batuk produktif, nyeri dada pleuritik, atau sesak progresif?',
      'Apakah ada respons terhadap oksigen atau terapi awal?',
    ],
    suggestedExam: [
      'Auskultasi paru terarah',
      'Work of breathing',
      'SpO2 repeat / oxygen response',
    ],
    suggestedInvestigations: ['Pertimbangkan imaging/lab sesuai setting dan protokol lokal'],
  },
  {
    id: 'pack-sepsis-concern',
    candidateId: 'candidate-sepsis-concern',
    name: 'Sepsis concern',
    supportKeys: ['infection_or_physiologic_burden', 'hemodynamic_instability'],
    weakenKeys: ['treatment_response_good'],
    mustNotMissKeys: ['critical_deterioration', 'shock_watch'],
    nextBestQuestions: [
      'Apakah ada sumber infeksi yang jelas?',
      'Apakah ada penurunan perfusi, perubahan kesadaran, atau hipotensi?',
    ],
    suggestedExam: ['Perfusi perifer', 'Status mental', 'Tanda sumber infeksi'],
    suggestedInvestigations: ['Evaluasi penunjang sesuai setting bila red flag persisten'],
  },
  {
    id: 'pack-asthma-exacerbation',
    candidateId: 'candidate-asthma-exacerbation',
    name: 'Asthma exacerbation consideration',
    supportKeys: ['respiratory_worsening'],
    weakenKeys: ['infection_or_physiologic_burden'],
    mustNotMissKeys: ['critical_deterioration'],
    nextBestQuestions: ['Apakah ada wheezing, riwayat asma, atau pencetus alergi/aktivitas?'],
    suggestedExam: ['Wheezing', 'Work of breathing', 'Kemampuan bicara'],
    suggestedInvestigations: ['Peak flow bila tersedia dan sesuai setting'],
  },
  {
    id: 'pack-bronchiolitis',
    candidateId: 'candidate-bronchiolitis',
    name: 'Bronchiolitis consideration',
    supportKeys: ['respiratory_worsening'],
    weakenKeys: [],
    mustNotMissKeys: ['critical_deterioration'],
    nextBestQuestions: ['Apakah usia dan pola wheeze/rhinorrhea mendukung bronchiolitis?'],
    suggestedExam: ['Retraction', 'Wheezing/crackles', 'Hydration status'],
    suggestedInvestigations: ['Investigasi tambahan hanya bila setting dan red flag mendukung'],
  },
  {
    id: 'pack-hypertensive-crisis',
    candidateId: 'candidate-hypertensive-crisis',
    name: 'Hypertensive crisis context',
    supportKeys: ['hemodynamic_instability', 'baseline_or_planning_risk_context'],
    weakenKeys: [],
    mustNotMissKeys: ['critical_deterioration'],
    nextBestQuestions: [
      'Apakah ada nyeri dada, defisit neurologis, sesak berat, atau gangguan penglihatan?',
    ],
    suggestedExam: ['Tekanan darah ulang terstandar', 'Pemeriksaan neurologis singkat'],
    suggestedInvestigations: ['Evaluasi organ target sesuai setting dan protokol lokal'],
  },
];

export function getAssistDiagnosisPacks(): DiagnosisPack[] {
  return ASSIST_DIAGNOSIS_PACKS.map((pack) => ({
    ...pack,
    supportKeys: [...pack.supportKeys],
    weakenKeys: [...pack.weakenKeys],
    mustNotMissKeys: [...pack.mustNotMissKeys],
    nextBestQuestions: [...pack.nextBestQuestions],
    suggestedExam: [...pack.suggestedExam],
    suggestedInvestigations: [...pack.suggestedInvestigations],
  }));
}

function findFacts(
  factsByKey: Map<ClinicalReasoningFactKey, ClinicalFact>,
  keys: ClinicalReasoningFactKey[]
): ClinicalFact[] {
  return keys
    .map((key) => factsByKey.get(key))
    .filter((item): item is ClinicalFact => Boolean(item));
}

function toEvidenceItem(fact: ClinicalFact): DifferentialEvidenceItem {
  return {
    factKey: fact.key,
    label: fact.label,
    evidence: [...fact.evidence],
    sourceRefs: [...fact.sourceRefs],
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function categoryFromEvidence(input: {
  pack: DiagnosisPack;
  supports: ClinicalFact[];
  mustNotMiss: ClinicalFact[];
  safetyDominance: ReasoningEvidencePack['safetyDominance'];
}): DifferentialCandidateCategory {
  if (input.mustNotMiss.length > 0 && input.safetyDominance.mustNotMissPresent) {
    return 'must_not_miss';
  }
  if (input.supports.length >= Math.min(2, input.pack.supportKeys.length)) {
    return 'most_compatible';
  }
  if (input.supports.length > 0) {
    return 'possible';
  }
  return 'less_likely';
}

function fitBandFromCategory(category: DifferentialCandidateCategory): DifferentialFitBand {
  if (category === 'must_not_miss') return 'must_not_miss';
  if (category === 'most_compatible') return 'highly_compatible';
  if (category === 'possible') return 'possible';
  return 'less_likely';
}

function candidateSafetyNote(category: DifferentialCandidateCategory): string {
  if (category === 'must_not_miss') {
    return 'Must-not-miss consideration; verify source, perfusion, mental status, and escalation need.';
  }
  return 'Clinical reasoning support only; physician remains the final decision-maker.';
}

function buildCandidate(
  pack: DiagnosisPack,
  evidencePack: ReasoningEvidencePack,
  factsByKey: Map<ClinicalReasoningFactKey, ClinicalFact>
): DifferentialDiagnosisCandidate | null {
  const supports = findFacts(factsByKey, pack.supportKeys);
  const weakens = findFacts(factsByKey, pack.weakenKeys);
  const mustNotMiss = findFacts(factsByKey, pack.mustNotMissKeys);
  const hasCandidateEvidence = supports.length > 0 || mustNotMiss.length > 0;
  if (!hasCandidateEvidence) return null;
  const hasAcuteSupport = supports.some((fact) => fact.acuteDeterioration);
  if (!hasAcuteSupport && mustNotMiss.length === 0) return null;

  const category = categoryFromEvidence({
    pack,
    supports,
    mustNotMiss,
    safetyDominance: evidencePack.safetyDominance,
  });
  if (category === 'less_likely') return null;

  const evidenceFor = [...supports, ...mustNotMiss].map(toEvidenceItem);
  const evidenceAgainst = weakens.map(toEvidenceItem);
  const trajectorySignalsLinked = uniqueStrings(
    [...supports, ...mustNotMiss].flatMap((fact) => fact.trajectoryIds)
  );

  return {
    id: pack.candidateId,
    name: pack.name,
    category,
    fitBand: fitBandFromCategory(category),
    evidenceFor,
    evidenceAgainst,
    missingToConfirm: uniqueStrings([
      ...pack.suggestedExam,
      ...evidencePack.missingCriticalInputs,
    ]).slice(0, 6),
    redFlagsLinked: evidencePack.redFlags.map((flag) => flag.id),
    trajectorySignalsLinked,
    nextQuestions: [...pack.nextBestQuestions],
    suggestedExam: [...pack.suggestedExam],
    suggestedInvestigations: [...pack.suggestedInvestigations],
    explanation:
      'Generated as clinical reasoning support from trajectory evidence; not an autonomous diagnosis.',
    safetyNote: candidateSafetyNote(category),
    requiresPhysicianSelectionForTherapy: true,
  };
}

export function buildDifferentialCandidatesFromEvidencePack(
  evidencePack: ReasoningEvidencePack,
  packs: DiagnosisPack[] = getAssistDiagnosisPacks()
): DifferentialDiagnosisCandidate[] {
  const factsByKey = new Map(evidencePack.clinicalFacts.map((fact) => [fact.key, fact]));

  return packs
    .map((pack) => buildCandidate(pack, evidencePack, factsByKey))
    .filter((item): item is DifferentialDiagnosisCandidate => Boolean(item))
    .sort((left, right) => {
      const categoryRank: Record<DifferentialCandidateCategory, number> = {
        must_not_miss: 0,
        most_compatible: 1,
        possible: 2,
        less_likely: 3,
      };
      return categoryRank[left.category] - categoryRank[right.category];
    });
}
