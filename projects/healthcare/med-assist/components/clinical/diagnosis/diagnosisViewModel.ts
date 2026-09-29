export type DiagnosisSourceView = 'suggested' | 'manual';

export interface DiagnosisPageViewModelInput {
  context: DiagnosisContextViewModelInput;
  primary: DiagnosisPrimaryViewModelInput | null;
  evidence: DiagnosisEvidenceViewModelInput;
  candidates: DiagnosisCandidateViewModelInput[];
  selectedDiagnoses: DiagnosisSelectedViewModelInput[];
  therapy: DiagnosisTherapyViewModelInput;
  transfer: DiagnosisTransferViewModelInput;
}

export interface DiagnosisContextViewModelInput {
  patientRM: string;
  patientAge: number | null;
  patientGender: string;
  pregnancyLabel: string;
  allergySummary: string;
  chronicTherapySummary: string;
  chronicDiagnosisSummary?: string;
}

export interface DiagnosisPrimaryViewModelInput {
  code: string;
  name: string;
  displayLabel: string;
  confidenceLabel: string;
  isSelected: boolean;
  isSelectionBlocked: boolean;
  isInsufficient: boolean;
  missingEvidence: string[];
  reviewItems: string[];
  redFlags: string[];
}

export interface DiagnosisEvidenceViewModelInput {
  supports: string[];
  against: string[];
  missing: string[];
  review: string[];
  redFlags: string[];
  doNotMiss: string[];
}

export interface DiagnosisHistoryView {
  label: 'Kronis' | 'Berulang';
  count: number;
  visitsConsidered: number;
  lastSeen: string;
  engineAgrees: boolean;
  engineSource: 'mira' | 'legacy' | null;
}

export interface DiagnosisCandidateViewModelInput {
  id: string;
  rank: number;
  code: string;
  name: string;
  displayLabel: string;
  confidenceLabel: string;
  source: DiagnosisSourceView;
  isSelected: boolean;
  isSelectionBlocked: boolean;
  supports: string[];
  against: string[];
  missing: string[];
  review: string[];
  history?: DiagnosisHistoryView;
}

export interface DiagnosisSelectedViewModelInput {
  key: string;
  displayLabel: string;
  sourceLabel: string;
}

export interface DiagnosisTherapyViewModelInput {
  state: string;
  hasDiagnosisBasis: boolean;
  selectedDiagnosisCount: number;
  selectedMedicationCount: number;
  candidateMedicationCount: number;
  manualMedicationAvailable: boolean;
  reviewOnly: boolean;
  diagnosisBasisLabel: string;
  groups: DiagnosisTherapyGroupViewModelInput[];
}

export interface DiagnosisTherapyGroupViewModelInput {
  diagnosisKey: string;
  diagnosisLabel: string;
  sourceLabel: string;
  statusText: string;
  detailItems: string[];
  medications: DiagnosisMedicationViewModelInput[];
}

export interface DiagnosisMedicationViewModelInput {
  key: string;
  name: string;
  /** Regimen role when the prescription service sent one. */
  role?: 'utama' | 'adjuvant' | 'vitamin';
  doseLine: string;
  rationale: string;
  safetyLabel: string;
  contraindications: string[];
  isSelected: boolean;
  sourceLabel: string;
}

export interface DiagnosisTransferViewModelInput {
  state: string;
  diagnosisReady: boolean;
  resepReady: boolean;
  canAutoFill: boolean;
  selectedDiagnosisLabel: string | null;
  selectedMedicationCount: number;
  candidateMedicationCount: number;
  reasonLabels: string[];
  error: string;
  resultSummary: string | null;
  readinessMessage: string | null;
  steps: DiagnosisTransferStepViewModelInput[];
  /** The step the last run was for; both RME pages share one transfer state. */
  lastStep?: string;
}

export interface DiagnosisTransferStepViewModelInput {
  key: string;
  label: string;
  state: string;
  detail: string;
  reason: string | null;
  message: string | null;
}

export interface DiagnosisPageViewModel {
  context: DiagnosisContextView;
  primary: DiagnosisPrimaryView;
  evidence: DiagnosisEvidenceView;
  candidates: DiagnosisCandidateView[];
  selectedDiagnoses: DiagnosisSelectedView[];
  therapy: DiagnosisTherapyView;
  transfer: DiagnosisTransferView;
}

export interface DiagnosisContextView {
  patientSummary: string;
  allergySummary: string;
  chronicTherapySummary: string;
  chronicDiagnosisSummary: string;
}

export interface DiagnosisPrimaryView {
  canLock: boolean;
  isInsufficient: boolean;
  candidateLabel: string;
  confidenceLabel: string;
  safestNextAction: string;
  primaryCtaLabel: string;
  missingEvidence: string[];
}

export interface DiagnosisEvidenceView {
  supports: string[];
  against: string[];
  missing: string[];
  review: string[];
  redFlags: string[];
  doNotMiss: string[];
}

export interface DiagnosisCandidateView {
  id: string;
  rank: number;
  code: string;
  name: string;
  displayLabel: string;
  confidenceLabel: string;
  source: DiagnosisSourceView;
  isSelected: boolean;
  isSelectionBlocked: boolean;
  supports: string[];
  against: string[];
  missing: string[];
  review: string[];
  history?: DiagnosisHistoryView;
}

export interface DiagnosisSelectedView {
  key: string;
  displayLabel: string;
  sourceLabel: string;
}

export interface DiagnosisTherapyView {
  state: string;
  hasDiagnosisBasis: boolean;
  selectedDiagnosisCount: number;
  selectedMedicationCount: number;
  candidateMedicationCount: number;
  manualMedicationAvailable: boolean;
  reviewOnly: boolean;
  diagnosisBasisLabel: string;
  groups: DiagnosisTherapyGroupView[];
}

export interface DiagnosisTherapyGroupView {
  diagnosisKey: string;
  diagnosisLabel: string;
  sourceLabel: string;
  statusText: string;
  detailItems: string[];
  medications: DiagnosisMedicationView[];
}

export interface DiagnosisMedicationView {
  key: string;
  name: string;
  role?: 'utama' | 'adjuvant' | 'vitamin';
  doseLine: string;
  rationale: string;
  safetyLabel: string;
  contraindications: string[];
  isSelected: boolean;
  sourceLabel: string;
}

export interface DiagnosisTransferView {
  state: string;
  diagnosisReady: boolean;
  resepReady: boolean;
  canAutoFill: boolean;
  selectedDiagnosisLabel: string | null;
  medicationSelectionLabel: string;
  reasonLabels: string[];
  error: string;
  resultSummary: string | null;
  readinessMessage: string | null;
  steps: DiagnosisTransferStepView[];
  lastStep?: string;
}

export interface DiagnosisTransferStepView {
  key: string;
  label: string;
  state: string;
  detail: string;
  reason: string | null;
  message: string | null;
}

export function createDiagnosisPageViewModel(
  input: DiagnosisPageViewModelInput
): DiagnosisPageViewModel {
  return {
    context: buildContextView(input.context),
    primary: buildPrimaryView(input.primary),
    evidence: buildEvidenceView(input.evidence),
    candidates: buildCandidateViews(input.candidates),
    selectedDiagnoses: buildSelectedDiagnosisViews(input.selectedDiagnoses),
    therapy: buildTherapyView(input.therapy),
    transfer: buildTransferView(input.transfer),
  };
}

function buildContextView(input: DiagnosisContextViewModelInput): DiagnosisContextView {
  const ageLabel = input.patientAge === null ? '-' : `${input.patientAge}th`;

  return {
    patientSummary: `RM ${input.patientRM} · ${ageLabel} · ${input.patientGender} · ${input.pregnancyLabel}`,
    allergySummary: input.allergySummary,
    chronicTherapySummary: input.chronicTherapySummary,
    chronicDiagnosisSummary: input.chronicDiagnosisSummary || '',
  };
}

function buildPrimaryView(input: DiagnosisPrimaryViewModelInput | null): DiagnosisPrimaryView {
  if (!input) {
    return {
      canLock: false,
      isInsufficient: false,
      candidateLabel: 'Belum ada diagnosis kerja',
      confidenceLabel: 'Pending review',
      safestNextAction: '',
      primaryCtaLabel: 'Lengkapi Data Diagnosis',
      missingEvidence: [],
    };
  }

  if (input.isInsufficient) {
    return {
      canLock: false,
      isInsufficient: true,
      candidateLabel: 'Data diagnosis belum lengkap',
      confidenceLabel: input.confidenceLabel,
      safestNextAction:
        'Lengkapi data diagnosis dan bukti klinis sebelum menetapkan diagnosis utama.',
      primaryCtaLabel: 'Lengkapi Data Diagnosis',
      missingEvidence: copyStrings(input.missingEvidence),
    };
  }

  return {
    canLock: !input.isSelectionBlocked,
    isInsufficient: false,
    candidateLabel: input.displayLabel,
    confidenceLabel: input.confidenceLabel,
    safestNextAction: '',
    primaryCtaLabel: input.isSelected ? 'Batalkan Diagnosis Utama' : 'Pilih Diagnosis Utama',
    missingEvidence: copyStrings(input.missingEvidence),
  };
}

function buildEvidenceView(input: DiagnosisEvidenceViewModelInput): DiagnosisEvidenceView {
  return {
    supports: copyStrings(input.supports),
    against: copyStrings(input.against),
    missing: copyStrings(input.missing),
    review: copyStrings(input.review),
    redFlags: copyStrings(input.redFlags),
    doNotMiss: copyStrings(input.doNotMiss),
  };
}

function buildCandidateViews(input: DiagnosisCandidateViewModelInput[]): DiagnosisCandidateView[] {
  return input.map((candidate) => ({
    id: candidate.id,
    rank: candidate.rank,
    code: candidate.code,
    name: candidate.name,
    displayLabel: candidate.displayLabel,
    confidenceLabel: candidate.confidenceLabel,
    source: candidate.source,
    isSelected: candidate.isSelected,
    isSelectionBlocked: candidate.isSelectionBlocked,
    supports: copyStrings(candidate.supports),
    against: copyStrings(candidate.against),
    missing: copyStrings(candidate.missing),
    review: copyStrings(candidate.review),
    history: candidate.history ? { ...candidate.history } : undefined,
  }));
}

function buildSelectedDiagnosisViews(
  input: DiagnosisSelectedViewModelInput[]
): DiagnosisSelectedView[] {
  return input.map((diagnosis) => ({
    key: diagnosis.key,
    displayLabel: diagnosis.displayLabel,
    sourceLabel: diagnosis.sourceLabel,
  }));
}

function buildTherapyView(input: DiagnosisTherapyViewModelInput): DiagnosisTherapyView {
  return {
    state: input.state,
    hasDiagnosisBasis: input.hasDiagnosisBasis,
    selectedDiagnosisCount: input.selectedDiagnosisCount,
    selectedMedicationCount: input.selectedMedicationCount,
    candidateMedicationCount: input.candidateMedicationCount,
    manualMedicationAvailable: input.manualMedicationAvailable,
    reviewOnly: input.reviewOnly,
    diagnosisBasisLabel: input.diagnosisBasisLabel,
    groups: input.groups.map((group) => ({
      diagnosisKey: group.diagnosisKey,
      diagnosisLabel: group.diagnosisLabel,
      sourceLabel: group.sourceLabel,
      statusText: group.statusText,
      detailItems: copyStrings(group.detailItems),
      medications: group.medications.map((medication) => ({
        key: medication.key,
        name: medication.name,
        role: medication.role,
        doseLine: medication.doseLine,
        rationale: medication.rationale,
        safetyLabel: medication.safetyLabel,
        contraindications: copyStrings(medication.contraindications),
        isSelected: medication.isSelected,
        sourceLabel: medication.sourceLabel,
      })),
    })),
  };
}

function buildTransferView(input: DiagnosisTransferViewModelInput): DiagnosisTransferView {
  return {
    state: input.state,
    diagnosisReady: input.diagnosisReady,
    resepReady: input.resepReady,
    canAutoFill: input.canAutoFill,
    selectedDiagnosisLabel: input.selectedDiagnosisLabel,
    medicationSelectionLabel: `${input.selectedMedicationCount}/${input.candidateMedicationCount}`,
    reasonLabels: copyStrings(input.reasonLabels),
    error: input.error,
    resultSummary: input.resultSummary,
    readinessMessage: input.readinessMessage,
    steps: input.steps.map((step) => ({
      key: step.key,
      label: step.label,
      state: step.state,
      detail: step.detail,
      reason: step.reason,
      message: step.message,
    })),
    ...(input.lastStep ? { lastStep: input.lastStep } : {}),
  };
}

function copyStrings(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0).map((item) => item.trim());
}
