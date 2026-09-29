import type { AssessmentSnapshot } from './assessmentDelta';
import type { ChronicMedicationView, InteractionCheckView } from './tatalaksana';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

import type { BedsideFindingRecord } from '@/types/api';

export interface DiagnosisManualMedicationDraftView {
  nama_obat: string;
  dosis: string;
  aturan_pakai: string;
  durasi: string;
  rationale: string;
}

export type DiagnosisTriageOutcome =
  'emergency' | 'urgent_review' | 'refer' | 'insufficient' | 'treat_locally';

export interface DiagnosisTriageView {
  outcome: DiagnosisTriageOutcome;
  headline: string;
  tone: 'default' | 'primary' | 'warning' | 'danger';
  firedCriteria: string[];
  referralGuidance: string | null;
}

export interface DiagnosisNextBestActionView {
  kind: BedsideFindingRecord['kind'];
  item: string;
  reason: string;
}

/** What MIRA asks for next: its next best actions (best first) and what it still lacks. */
export interface DiagnosisEnginePlanView {
  actions: DiagnosisNextBestActionView[];
  missing: string[];
}

/** One patient-education point for the chosen diagnoses; ticked means the doctor gave it. */
export interface DiagnosisEducationItemView {
  key: string;
  text: string;
  isSelected: boolean;
}

/** The assessment shown when the doctor last pressed "Simpan", and what was recorded then. */
export interface PreviousAssessment {
  snapshot: AssessmentSnapshot;
  finding: BedsideFindingRecord;
}

export interface DiagnosisPageProps {
  viewModel: DiagnosisPageViewModel;
  phase: 'loading' | 'error' | 'ready';
  errorMessage: string;
  complaintSummary: string;
  secondaryComplaint?: string;
  showManualDiagnosisInput: boolean;
  manualIcd: string;
  manualName: string;
  showManualMedicationInput: boolean;
  manualMedicationDraft: DiagnosisManualMedicationDraftView;
  manualMedicationOptions: string[];
  triage?: DiagnosisTriageView | null;
  recurrentOnlyMessage?: string;
  /** MIRA's plan; its first action is the next best step, none hides the section. */
  enginePlan?: DiagnosisEnginePlanView | null;
  /** Next best step results the doctor ticked for this request, shown in the Temuan receipt. */
  bedsideFindings: BedsideFindingRecord[];
  /** Set after a finding is recorded, so the page can show what the engine changed. */
  previousAssessment?: PreviousAssessment | null;
  /** Records a result with the assessment shown at that moment; the page asks the engine again. */
  onRecordBedsideFinding: (record: BedsideFindingRecord, shown: AssessmentSnapshot) => void;
  onCompleteData: () => void;
  onTogglePrimaryCandidate: () => void;
  onToggleManualDiagnosisInput: () => void;
  onManualIcdChange: (value: string) => void;
  onManualNameChange: (value: string) => void;
  onSubmitManualDiagnosis: () => void;
  onToggleCandidate: (id: string) => void;
  onRemoveDiagnosis: (key: string) => void;
  onSelectAllMedications: () => void;
  onClearMedications: () => void;
  onToggleManualMedicationInput: () => void;
  onManualMedicationDraftChange: (
    field: keyof DiagnosisManualMedicationDraftView,
    value: string
  ) => void;
  onAddManualMedication: () => void;
  onToggleMedication: (key: string) => void;
  onRemoveManualMedication: (key: string) => void;
  /** Education for the chosen diagnoses; the ticked points go to the RME's edukasi field. */
  education: DiagnosisEducationItemView[];
  onToggleEducation: (key: string) => void;
  /** Tatalaksana: the patient's chronic medications from the visit history. */
  chronicMedications: ChronicMedicationView[];
  /** Drug interactions over the chronic and the proposed medications (local DDInter). */
  interactionCheck: InteractionCheckView;
  /** The patient's allergies, for the contraindication check. */
  allergies: string[];
  /** Tindak lanjut: the follow-up interval ("3 hari"), sent to the RME as "Kontrol 3 hari". */
  controlAfter: string;
  onControlAfterChange: (value: string) => void;
  /** Red flags of the chosen diagnoses, for the Safety net row "Segera kembali". */
  safetyNet: string[];
  /** Removes a proposal from the page and from the prescription ("Hapus"). */
  onDismissMedication: (key: string) => void;
  onAutoFillRME: () => void;
  onTransferDiagnosis: () => void;
  onTransferResep: () => void;
  onTransferAnamnesa: () => void;
  onRetryTransfer: () => void;
  onCancelTransfer: () => void;
}
