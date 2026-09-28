import type { DiagnosisPageViewModel } from './diagnosisViewModel';

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
  onAutoFillRME: () => void;
  onTransferDiagnosis: () => void;
  onTransferResep: () => void;
  onTransferAnamnesa: () => void;
  onRetryTransfer: () => void;
  onCancelTransfer: () => void;
}
