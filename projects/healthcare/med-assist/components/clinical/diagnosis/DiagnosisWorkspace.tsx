import type { ReactNode } from 'react';

import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisCandidateView, DiagnosisPageViewModel } from './diagnosisViewModel';
import { RMETransferPanel } from './RMETransferPanel';
import { StagedSection } from './StagedSection';
import { TherapyReviewPanel } from './TherapyReviewPanel';

const MAX_CLINICAL_SIGNAL_ITEMS = 10;

const CLINICAL_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'HT', pattern: /\b(ht|hipertensi|darah tinggi|tensi tinggi)\b/i },
  { label: 'DM', pattern: /\b(dm|diabetes|kencing manis|gula darah)\b/i },
  { label: 'Pusing', pattern: /\bpusing\b|nyeri kepala|sakit kepala/i },
  { label: 'Demam', pattern: /\bdemam\b|febris|panas badan/i },
  { label: 'Batuk', pattern: /\bbatuk\b/i },
  { label: 'Sesak', pattern: /\bsesak\b|napas berat|nafas berat/i },
  { label: 'Nyeri dada', pattern: /nyeri dada|dada sakit/i },
  { label: 'Nyeri kaki', pattern: /nyeri\s*kaki|kaki nyeri|sakit kaki/i },
  { label: 'Nyeri perut', pattern: /nyeri perut|sakit perut/i },
  { label: 'Mual', pattern: /\bmual\b/i },
  { label: 'Muntah', pattern: /\bmuntah\b/i },
  { label: 'Diare', pattern: /\bdiare\b|mencret/i },
  { label: 'Lemas', pattern: /\blemas\b/i },
  { label: 'Nafsu makan turun', pattern: /nafsu makan (menurun|turun|berkurang)/i },
];

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

export interface DiagnosisWorkspaceProps {
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

export function DiagnosisWorkspace({
  viewModel,
  phase,
  errorMessage,
  complaintSummary,
  secondaryComplaint,
  showManualDiagnosisInput,
  manualIcd,
  manualName,
  showManualMedicationInput,
  manualMedicationDraft,
  manualMedicationOptions,
  triage,
  onCompleteData,
  onTogglePrimaryCandidate,
  onToggleManualDiagnosisInput,
  onManualIcdChange,
  onManualNameChange,
  onSubmitManualDiagnosis,
  onToggleCandidate,
  onRemoveDiagnosis,
  onSelectAllMedications,
  onClearMedications,
  onToggleManualMedicationInput,
  onManualMedicationDraftChange,
  onAddManualMedication,
  onToggleMedication,
  onRemoveManualMedication,
  onAutoFillRME,
  onTransferDiagnosis,
  onTransferResep,
  onTransferAnamnesa,
  onRetryTransfer,
  onCancelTransfer,
}: DiagnosisWorkspaceProps) {
  const clinicalCandidateCount = getClinicalCandidates(viewModel.candidates).length;
  const hasDifferentialSet = clinicalCandidateCount > 0;
  const visibleErrorMessage = getVisibleErrorMessage(errorMessage);
  const safetyItems = getVisibleSafetyItems(viewModel.evidence.redFlags, viewModel.evidence.doNotMiss);

  return (
    <div
      className="diagnosis-content clinical-form-stack clinical-form-stack--v2 flex flex-col gap-3"
      data-testid="diagnosis-workspace"
      data-diagnosis-view-state={viewModel.primary.isInsufficient ? 'insufficient' : 'review'}
      data-diagnosis-selected-count={viewModel.therapy.selectedDiagnosisCount}
      data-diagnosis-medication-count={viewModel.transfer.medicationSelectionLabel}
      data-diagnosis-transfer-state={viewModel.transfer.state}
    >
      <ClinicalContextPanel
        viewModel={viewModel}
        complaintSummary={complaintSummary}
        secondaryComplaint={secondaryComplaint}
      />

      {phase === 'loading' ? (
        <section className="form-group diagnosis-block" aria-live="polite">
          <SectionHeader title="Diagnosis Utama" />
          <ReadOnlyPanel>Menyusun diagnosis banding...</ReadOnlyPanel>
        </section>
      ) : null}

      {phase === 'error' ? (
        <section className="form-group diagnosis-block" aria-live="polite">
          <SectionHeader title="Diagnosis Utama" status="Gagal" />
          <ReadOnlyPanel tone="danger">
            {errorMessage || 'Terjadi kesalahan saat memuat data.'}
          </ReadOnlyPanel>
        </section>
      ) : null}

      {phase === 'ready' ? (
        <>
          {visibleErrorMessage ? (
            <ReadOnlyPanel tone="warning">{visibleErrorMessage}</ReadOnlyPanel>
          ) : null}
          <MainDiagnosisSection
            viewModel={viewModel}
            showManualDiagnosisInput={showManualDiagnosisInput}
            manualIcd={manualIcd}
            manualName={manualName}
            onCompleteData={onCompleteData}
            onTogglePrimaryCandidate={onTogglePrimaryCandidate}
            onToggleManualDiagnosisInput={onToggleManualDiagnosisInput}
            onManualIcdChange={onManualIcdChange}
            onManualNameChange={onManualNameChange}
            onSubmitManualDiagnosis={onSubmitManualDiagnosis}
          />
          <DifferentialDiagnosisSection
            viewModel={viewModel}
            hasDifferentialSet={hasDifferentialSet}
            onToggleCandidate={onToggleCandidate}
          />
          {triage ? (
            <TriageSummarySection triage={triage} safetyItems={safetyItems} />
          ) : null}
          <SupportingExamSection viewModel={viewModel} showSafetyItems={!triage} />
          <TherapyReviewPanel
            viewModel={viewModel}
            showManualMedicationInput={showManualMedicationInput}
            manualMedicationDraft={manualMedicationDraft}
            manualMedicationOptions={manualMedicationOptions}
            onRemoveDiagnosis={onRemoveDiagnosis}
            onSelectAllMedications={onSelectAllMedications}
            onClearMedications={onClearMedications}
            onToggleManualMedicationInput={onToggleManualMedicationInput}
            onManualMedicationDraftChange={onManualMedicationDraftChange}
            onAddManualMedication={onAddManualMedication}
            onToggleMedication={onToggleMedication}
            onRemoveManualMedication={onRemoveManualMedication}
          />
          <EducationSection viewModel={viewModel} />
          <RMETransferPanel
            viewModel={viewModel}
            onAutoFillRME={onAutoFillRME}
            onTransferDiagnosis={onTransferDiagnosis}
            onTransferResep={onTransferResep}
            onTransferAnamnesa={onTransferAnamnesa}
            onRetryTransfer={onRetryTransfer}
            onCancelTransfer={onCancelTransfer}
          />
        </>
      ) : null}
    </div>
  );
}

function ClinicalContextPanel({
  viewModel,
  complaintSummary,
  secondaryComplaint,
}: {
  viewModel: DiagnosisPageViewModel;
  complaintSummary: string;
  secondaryComplaint?: string;
}) {
  return (
    <section className="form-group diagnosis-block" aria-label="Clinical Finding">
      <SectionHeader title="Clinical Finding" />
      <ClinicalSignalPanel
        complaintSummary={complaintSummary}
        secondaryComplaint={secondaryComplaint}
        allergySummary={viewModel.context.allergySummary}
        chronicDiagnosisSummary={viewModel.context.chronicDiagnosisSummary}
      />
    </section>
  );
}

function ClinicalSignalPanel({
  complaintSummary,
  secondaryComplaint,
  allergySummary,
  chronicDiagnosisSummary,
}: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}) {
  const signals = buildClinicalSignals({
    complaintSummary,
    secondaryComplaint,
    allergySummary,
    chronicDiagnosisSummary,
  });

  return (
    <ReadOnlyPanel>
      <strong>Sinyal klinis</strong>
      <div className="diagnosis-context__grid" data-testid="diagnosis-clinical-signals">
        {signals.map((signal) => (
          <span key={signal} className="diagnosis-chip">
            {signal}
          </span>
        ))}
      </div>
    </ReadOnlyPanel>
  );
}

function MainDiagnosisSection({
  viewModel,
  showManualDiagnosisInput,
  manualIcd,
  manualName,
  onCompleteData,
  onTogglePrimaryCandidate,
  onToggleManualDiagnosisInput,
  onManualIcdChange,
  onManualNameChange,
  onSubmitManualDiagnosis,
}: Pick<
  DiagnosisWorkspaceProps,
  | 'viewModel'
  | 'showManualDiagnosisInput'
  | 'manualIcd'
  | 'manualName'
  | 'onCompleteData'
  | 'onTogglePrimaryCandidate'
  | 'onToggleManualDiagnosisInput'
  | 'onManualIcdChange'
  | 'onManualNameChange'
  | 'onSubmitManualDiagnosis'
>) {
  const primary = viewModel.primary;
  const statusLabel = primary.isInsufficient
    ? undefined
    : formatConfidenceLabel(primary.confidenceLabel);
  const primaryTitle = primary.isInsufficient
    ? 'Data belum cukup untuk menetapkan diagnosis utama'
    : formatClinicalText(primary.candidateLabel);
  const primarySelected =
    viewModel.candidates.find((candidate) => candidate.rank === 1)?.isSelected === true;

  return (
    <section
      className="form-group diagnosis-block"
      data-testid="clinical-diagnosis-primary-card"
      data-selected={primarySelected ? 'true' : 'false'}
      aria-label="Diagnosis Utama"
    >
      <SectionHeader title="Diagnosis Utama" status={statusLabel} />
      <ReadOnlyPanel tone={primary.isInsufficient ? 'warning' : 'primary'}>
        <strong>{primaryTitle}</strong>
        {!primary.isInsufficient ? (
          <EvidenceTally
            supports={viewModel.evidence.supports}
            against={viewModel.evidence.against}
            missing={viewModel.evidence.missing}
          />
        ) : null}
        {primary.safestNextAction ? (
          <span>{formatClinicalText(primary.safestNextAction)}</span>
        ) : null}
      </ReadOnlyPanel>

      {primary.isInsufficient && primary.missingEvidence.length > 0 ? (
        <LineList title="Perlu dilengkapi" items={primary.missingEvidence} tone="warning" />
      ) : null}

      <div className="diagnosis-primary-actions">
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={primary.isInsufficient ? onCompleteData : onTogglePrimaryCandidate}
          disabled={!primary.isInsufficient && !primary.canLock}
        >
          {primary.primaryCtaLabel}
        </button>
        <button
          type="button"
          className="diagnosis-text-button"
          onClick={onToggleManualDiagnosisInput}
        >
          {showManualDiagnosisInput ? 'Tutup diagnosis manual' : 'Diagnosis manual ›'}
        </button>
      </div>

      {!primary.isInsufficient ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Alasan</summary>
          <div className="diagnosis-evidence-grid">
            <LineList title="Mendukung" items={viewModel.evidence.supports} />
            <LineList title="Yang tidak mendukung" items={viewModel.evidence.against} />
            <LineList title="Catatan" items={viewModel.evidence.review} />
          </div>
        </details>
      ) : null}

      {showManualDiagnosisInput ? (
        <div className="diagnosis-form-grid">
          <input
            value={manualIcd}
            onChange={(event) => onManualIcdChange(event.target.value)}
            placeholder="ICD-X manual (contoh: I10)"
            className="neu-select diagnosis-input"
          />
          <input
            value={manualName}
            onChange={(event) => onManualNameChange(event.target.value)}
            placeholder="Nama diagnosis manual (opsional)"
            className="neu-select diagnosis-input"
          />
          <button
            type="button"
            className="btn-ac-inline btn-ac-inline--sharp"
            onClick={onSubmitManualDiagnosis}
          >
            Gunakan diagnosis manual
          </button>
        </div>
      ) : null}
    </section>
  );
}

function DifferentialDiagnosisSection({
  viewModel,
  hasDifferentialSet,
  onToggleCandidate,
}: {
  viewModel: DiagnosisPageViewModel;
  hasDifferentialSet: boolean;
  onToggleCandidate: (id: string) => void;
}) {
  const clinicalCandidates = getClinicalCandidates(viewModel.candidates);
  const hasComparableDifferential = clinicalCandidates.length > 0;
  const title = 'Diagnosis Banding';

  return (
    <section
      className="form-group diagnosis-block diagnosis-differential-section"
      aria-label={title}
    >
      <SectionHeader title={title} />
      <div className="diagnosis-list">
        {hasComparableDifferential ? (
          clinicalCandidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              hasDifferentialSet={hasDifferentialSet}
              onToggleCandidate={onToggleCandidate}
            />
          ))
        ) : (
          <ReadOnlyPanel>Belum ada diagnosis banding pembanding dari data saat ini.</ReadOnlyPanel>
        )}
      </div>
    </section>
  );
}

function CandidateRow({
  candidate,
  hasDifferentialSet,
  onToggleCandidate,
}: {
  candidate: DiagnosisCandidateView;
  hasDifferentialSet: boolean;
  onToggleCandidate: (id: string) => void;
}) {
  const rankLabel = resolveCandidateRankLabel(candidate, hasDifferentialSet);
  const confidenceLabel =
    candidate.code === 'R69'
      ? 'Data belum cukup'
      : formatConfidenceLabel(candidate.confidenceLabel);

  return (
    <article
      className="neu-select diagnosis-candidate-row"
      data-testid="diagnosis-candidate-row"
      data-selected={candidate.isSelected ? 'true' : 'false'}
    >
      <div className="diagnosis-row-head">
        <span className="diagnosis-rank-label">{rankLabel}</span>
        <span className="diagnosis-row-meta">{confidenceLabel}</span>
      </div>
      <div className="diagnosis-row-title">{formatClinicalText(candidate.displayLabel)}</div>
      <EvidenceTally
        supports={candidate.supports}
        against={candidate.against}
        missing={candidate.missing}
      />
      {hasDifferentialSet ? (
        <button
          type="button"
          className="btn-ac-inline btn-ac-inline--sharp"
          disabled={candidate.isSelectionBlocked}
          onClick={() => onToggleCandidate(candidate.id)}
        >
          Pilih
        </button>
      ) : null}
      <details className="diagnosis-details diagnosis-details--inline">
        <summary>Alasan</summary>
        <div className="diagnosis-evidence-grid">
          <LineList title="Mendukung" items={candidate.supports} />
          <LineList title="Yang tidak mendukung" items={candidate.against} />
          <LineList title="Data kurang" items={candidate.missing} tone="warning" />
          <LineList title="Catatan" items={candidate.review} />
        </div>
      </details>
    </article>
  );
}

const REFERRAL_ITEM_START = /^(\s+\S|\s*\d+[.)]\s|\s*[-•·]\s)/;

export function splitReferralGuidance(text: string): string[] {
  const items: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const cleaned = line.replace(/^\s*(\d+[.)]|[-•·])\s*/, '').trim();
    if (index === 0 || REFERRAL_ITEM_START.test(line) || items.length === 0) {
      items.push(cleaned);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${cleaned}`;
    }
  });
  return items;
}

function TriageSummarySection({
  triage,
  safetyItems,
}: {
  triage: DiagnosisTriageView;
  safetyItems: string[];
}) {
  const listTone =
    triage.tone === 'danger' ? 'danger' : triage.tone === 'warning' ? 'warning' : 'default';

  return (
    <section className="form-group diagnosis-block" aria-label="Triase & Rujukan">
      <SectionHeader title="Triase & Rujukan" status={triage.headline} />
      {triage.firedCriteria.length > 0 ? (
        <details className="diagnosis-details diagnosis-details--inline diagnosis-details--triage">
          <summary>Alasan</summary>
          <LineList title="Dasar keputusan" items={triage.firedCriteria} tone={listTone} />
        </details>
      ) : null}
      {triage.referralGuidance ? (
        <details className="diagnosis-details diagnosis-details--inline diagnosis-details--triage">
          <summary>Indikasi rujukan</summary>
          <LineList title="Indikasi rujukan" items={splitReferralGuidance(triage.referralGuidance)} />
        </details>
      ) : null}
      {safetyItems.length > 0 ? (
        <details className="diagnosis-details diagnosis-details--inline diagnosis-details--triage">
          <summary>{`Tanda bahaya (${safetyItems.length})`}</summary>
          <LineList title="Tanda bahaya" items={safetyItems} tone="danger" />
        </details>
      ) : null}
    </section>
  );
}

function SupportingExamSection({
  viewModel,
  showSafetyItems,
}: {
  viewModel: DiagnosisPageViewModel;
  showSafetyItems: boolean;
}) {
  const isInsufficient = viewModel.primary.isInsufficient;
  const examItems = getVisibleExamItems(viewModel.evidence.missing);
  const needsExam = !isInsufficient && examItems.length > 0;
  const safetyItems = getVisibleSafetyItems(
    viewModel.evidence.redFlags,
    viewModel.evidence.doNotMiss
  );
  const items = needsExam ? examItems : ['Tidak rutin dari data saat ini.'];
  const examStatus = isInsufficient
    ? 'menunggu diagnosis'
    : needsExam
      ? `${examItems.length} disarankan`
      : 'Tidak rutin';

  return (
    <StagedSection
      label="Pemeriksaan Penunjang"
      stageIndex={1}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="Pemeriksaan Penunjang" status={examStatus} />}
    >
      {isInsufficient ? (
        <ReadOnlyPanel>Lengkapi data diagnosis lebih dulu.</ReadOnlyPanel>
      ) : (
        <LineList
          title={needsExam ? 'Pemeriksaan' : 'Catatan'}
          items={items}
          tone={needsExam ? 'warning' : 'default'}
        />
      )}
      {showSafetyItems && safetyItems.length > 0 ? (
        <LineList title="Tanda bahaya" items={safetyItems} tone="danger" />
      ) : null}
    </StagedSection>
  );
}

function EducationSection({ viewModel }: { viewModel: DiagnosisPageViewModel }) {
  const isInsufficient = viewModel.primary.isInsufficient;
  const examKeys = new Set(
    getVisibleExamItems(viewModel.evidence.missing).map((item) => item.toLowerCase())
  );
  const reviewItems = viewModel.evidence.review.filter(
    (item) => !examKeys.has(cleanClinicalSummary(item).toLowerCase())
  );
  const educationItems =
    reviewItems.length > 0
      ? reviewItems.slice(0, 3)
      : ['Edukasi disesuaikan setelah diagnosis utama dipilih.'];
  const status = isInsufficient
    ? 'menunggu diagnosis'
    : reviewItems.length > 0
      ? `${reviewItems.length} catatan`
      : 'belum ada';

  return (
    <StagedSection
      label="Edukasi"
      stageIndex={3}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="Edukasi" status={status} />}
    >
      {isInsufficient ? (
        <ReadOnlyPanel>
          Edukasi final mengikuti diagnosis utama setelah data dilengkapi.
        </ReadOnlyPanel>
      ) : (
        <LineList title="Edukasi pasien" items={educationItems} />
      )}
      {reviewItems.length > educationItems.length ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Rincian edukasi</summary>
          <LineList title="Catatan tambahan" items={reviewItems.slice(educationItems.length)} />
        </details>
      ) : null}
    </StagedSection>
  );
}

function EvidenceTally({
  supports,
  against,
  missing,
}: {
  supports: string[];
  against: string[];
  missing: string[];
}) {
  const entries = [
    { key: 'support', sign: '+', count: supports.length, label: 'mendukung' },
    { key: 'against', sign: '−', count: against.length, label: 'tidak mendukung' },
    { key: 'missing', sign: '?', count: missing.length, label: 'data kurang' },
  ].filter((entry) => entry.count > 0);

  if (entries.length === 0) return null;

  return (
    <div className="diagnosis-tally">
      {entries.map((entry) => (
        <span
          key={entry.key}
          className={`diagnosis-tally__item diagnosis-tally__item--${entry.key}`}
        >
          <span className="diagnosis-tally__count">
            {entry.sign}
            {entry.count}
          </span>{' '}
          {entry.label}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ title, status }: { title: string; status?: string }) {
  return (
    <div className="form-group-header form-group-header--cta">
      <div className="form-group-header__title-block">
        <div className="console-label console-label-prominent">{title}</div>
      </div>
      {status ? <span className="field-extracted-indicator">{status}</span> : null}
    </div>
  );
}

function ReadOnlyPanel({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'warning' | 'danger';
}) {
  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      {children}
    </div>
  );
}

function LineList({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'warning' | 'danger';
}) {
  const safeItems = items.map(cleanClinicalSummary).filter(Boolean);
  if (safeItems.length === 0) return null;

  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      <div className="diagnosis-list-title">{title}</div>
      <ul className="diagnosis-line-list">
        {safeItems.map((item) => (
          <li key={`${title}-${item}`}>{formatClinicalText(item)}</li>
        ))}
      </ul>
    </div>
  );
}

function resolveCandidateRankLabel(
  candidate: DiagnosisCandidateView,
  hasDifferentialSet: boolean
): string {
  const differentialRank = Math.max(candidate.rank - 1, 1);
  if (!hasDifferentialSet) return `Banding ${differentialRank}`;
  return `Banding ${differentialRank}`;
}

function getClinicalCandidates(candidates: DiagnosisCandidateView[]): DiagnosisCandidateView[] {
  return candidates.filter((candidate) => candidate.code !== 'R69' && candidate.rank > 1);
}

function getVisibleExamItems(items: string[]): string[] {
  return dedupeSignals(
    items.map(cleanClinicalSummary).filter((item) => item && !isGenericDiagnosisUiText(item))
  ).slice(0, 4);
}

function getVisibleSafetyItems(redFlags: string[], doNotMissItems: string[]): string[] {
  return dedupeSignals(
    [...redFlags, ...doNotMissItems]
      .map(cleanClinicalSummary)
      .map((item) => item.replace(/^Do not miss:\s*/i, '').trim())
      .filter((item) => item && !isGenericDiagnosisUiText(item) && !isChronicRiskContextOnly(item))
  );
}

function isGenericDiagnosisUiText(value: string): boolean {
  return (
    value.length > 96 ||
    /^(gejala khas belum menonjol|dukungan tanda vital belum dominan|correlate with examination)$/i.test(
      value
    ) ||
    /^(pemeriksaan penunjang wajib segera|evaluasi lebih lanjut terhadap|pertimbangkan konsultasi dengan spesialis|kriteria rujukan)/i.test(
      value
    )
  );
}

function isChronicRiskContextOnly(value: string): boolean {
  return /^riwayat penyakit kronis\b/i.test(value);
}

function buildClinicalSignals({
  complaintSummary,
  secondaryComplaint,
  allergySummary,
  chronicDiagnosisSummary,
}: {
  complaintSummary: string;
  secondaryComplaint?: string;
  allergySummary: string;
  chronicDiagnosisSummary: string;
}): string[] {
  const sourceText =
    `${complaintSummary} ${secondaryComplaint || ''} ${chronicDiagnosisSummary}`.trim();
  const signals: string[] = [];

  for (const item of CLINICAL_SIGNAL_PATTERNS) {
    if (item.pattern.test(sourceText)) {
      signals.push(item.label);
    }
  }

  const cleanedAllergy = cleanClinicalSummary(allergySummary);
  if (cleanedAllergy && !/tidak ada alergi/i.test(cleanedAllergy)) {
    signals.push(`Alergi: ${cleanedAllergy}`);
  }

  const cleanedChronicDiagnosis = cleanClinicalSummary(chronicDiagnosisSummary);
  if (cleanedChronicDiagnosis) {
    for (const diagnosis of cleanedChronicDiagnosis.split(',')) {
      const signal = shortenClinicalSignal(formatClinicalText(diagnosis));
      if (signal) signals.push(signal);
    }
  }

  if (signals.length === 0 && sourceText) {
    signals.push(shortenClinicalSignal(formatClinicalText(sourceText)));
  }

  return dedupeSignals(signals).slice(0, MAX_CLINICAL_SIGNAL_ITEMS);
}

function cleanClinicalSummary(value: string): string {
  return formatClinicalText(value).replace(/\s+/g, ' ').trim();
}

function shortenClinicalSignal(value: string): string {
  const [firstSentence = value] = value.split(/[.;]/);
  return firstSentence.length > 48
    ? `${firstSentence.slice(0, 45).trim()}...`
    : firstSentence.trim();
}

function dedupeSignals(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function getVisibleErrorMessage(message: string): string {
  const cleaned = message.trim();
  if (!cleaned) return '';

  if (
    /Diagnosis lokal digunakan|Bridge|Dashboard|Crew|Automation Token|fallback|canonical/i.test(
      cleaned
    )
  ) {
    return '';
  }

  return formatClinicalText(cleaned);
}

function formatConfidenceLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    high: 'Tinggi',
    moderate: 'Sedang',
    low: 'Rendah',
    'insufficient data': 'Data belum cukup',
    'pending review': 'Belum ditinjau',
    'manual review': 'Review manual',
    'very high confidence': 'Sangat tinggi',
    'high confidence': 'Tinggi',
    'moderate confidence': 'Sedang',
    'low confidence': 'Rendah',
  };

  return labels[normalized] || formatClinicalText(value);
}

function formatClinicalText(value: string): string {
  return value
    .replace(/Confirmed: Not Pregnant/g, 'Tidak hamil terkonfirmasi')
    .replace(/Confirmed: Pregnant/g, 'Hamil terkonfirmasi')
    .replace(/Pending review/g, 'Belum ditinjau')
    .replace(/Insufficient data/g, 'Data belum cukup')
    .replace(/High confidence/g, 'Keyakinan tinggi')
    .replace(/Moderate confidence/g, 'Keyakinan sedang')
    .replace(/Low confidence/g, 'Keyakinan rendah')
    .replace(/Correlate with examination/g, '')
    .replace(/Criteria Reference/g, 'Kriteria rujukan')
    .replace(/Data insufficient/g, 'Data belum cukup')
    .trim();
}
