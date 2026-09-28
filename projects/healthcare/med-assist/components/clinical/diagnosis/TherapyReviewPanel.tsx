import type { ReactNode } from 'react';

import {
  formatClinicalText,
  formatSafetyLabel,
  formatSourceLabel,
  isDiagnosisChosen,
  isInsufficientDiagnosisLabel,
} from './diagnosisDisplayUtils';
import type {
  DiagnosisMedicationView,
  DiagnosisSelectedView,
  DiagnosisTherapyGroupView,
} from './diagnosisViewModel';
import type {
  DiagnosisManualMedicationDraftView,
  DiagnosisPageProps,
} from './diagnosisPageProps';
import { StagedSection } from './StagedSection';

export function TherapyReviewPanel({
  viewModel,
  showManualMedicationInput,
  manualMedicationDraft,
  manualMedicationOptions,
  onRemoveDiagnosis,
  onSelectAllMedications,
  onClearMedications,
  onToggleManualMedicationInput,
  onManualMedicationDraftChange,
  onAddManualMedication,
  onToggleMedication,
  onRemoveManualMedication,
}: Pick<
  DiagnosisPageProps,
  | 'viewModel'
  | 'showManualMedicationInput'
  | 'manualMedicationDraft'
  | 'manualMedicationOptions'
  | 'onRemoveDiagnosis'
  | 'onSelectAllMedications'
  | 'onClearMedications'
  | 'onToggleManualMedicationInput'
  | 'onManualMedicationDraftChange'
  | 'onAddManualMedication'
  | 'onToggleMedication'
  | 'onRemoveManualMedication'
>) {
  const selectedDiagnoses = getClinicalSelectedDiagnoses(viewModel.selectedDiagnoses);
  const therapyGroups = viewModel.primary.isInsufficient
    ? []
    : viewModel.therapy.groups.filter(
        (group) => !isInsufficientDiagnosisLabel(group.diagnosisLabel)
      );
  const hasDiagnosisBasis = !viewModel.primary.isInsufficient && therapyGroups.length > 0;
  const chosen = isDiagnosisChosen(viewModel);
  const status = !chosen
    ? 'pilih diagnosis dulu'
    : viewModel.therapy.state === 'loading'
      ? 'Memuat terapi'
      : hasDiagnosisBasis
        ? `${viewModel.therapy.selectedMedicationCount}/${viewModel.therapy.candidateMedicationCount} obat dipilih`
        : 'belum ada rekomendasi';

  return (
    <StagedSection
      label="Therapy + Resep"
      stageIndex={2}
      open={chosen}
      header={<SectionHeader title="Therapy + Resep" status={status} />}
    >
      {viewModel.therapy.diagnosisBasisLabel ? (
        <StaticField
          value={`Basis: ${formatClinicalText(viewModel.therapy.diagnosisBasisLabel)}`}
        />
      ) : null}

      {selectedDiagnoses.length > 0 ? (
        <SelectedDiagnosisList items={selectedDiagnoses} onRemoveDiagnosis={onRemoveDiagnosis} />
      ) : null}

      <div className="action-bar action-bar--tri-tabs diagnosis-action-bar">
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={viewModel.therapy.candidateMedicationCount === 0}
          onClick={onSelectAllMedications}
        >
          Pilih semua
        </button>
        <button
          type="button"
          className="action-btn action-btn--secondary"
          disabled={viewModel.therapy.selectedMedicationCount === 0}
          onClick={onClearMedications}
        >
          Reset
        </button>
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={onToggleManualMedicationInput}
        >
          {showManualMedicationInput ? 'Tutup Obat Manual' : 'Input Obat Manual'}
        </button>
      </div>

      {showManualMedicationInput ? (
        <ManualMedicationForm
          draft={manualMedicationDraft}
          options={manualMedicationOptions}
          onChange={onManualMedicationDraftChange}
          onSubmit={onAddManualMedication}
        />
      ) : null}

      {hasDiagnosisBasis ? (
        <div className="diagnosis-list">
          {therapyGroups.map((group) => (
            <TherapyGroup
              key={group.diagnosisKey}
              group={group}
              onToggleMedication={onToggleMedication}
              onRemoveManualMedication={onRemoveManualMedication}
            />
          ))}
        </div>
      ) : null}
    </StagedSection>
  );
}

function SelectedDiagnosisList({
  items,
  onRemoveDiagnosis,
}: {
  items: DiagnosisSelectedView[];
  onRemoveDiagnosis: (key: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="diagnosis-list">
      {items.map((item) => (
        <div key={item.key} className="neu-select diagnosis-selected-row">
          <div>
            <div className="diagnosis-row-title">{formatClinicalText(item.displayLabel)}</div>
            <div className="diagnosis-row-meta">{formatSourceLabel(item.sourceLabel)}</div>
          </div>
          <button
            type="button"
            className="btn-ac-inline btn-ac-inline--sharp"
            onClick={() => onRemoveDiagnosis(item.key)}
          >
            Hapus
          </button>
        </div>
      ))}
    </div>
  );
}

function ManualMedicationForm({
  draft,
  options,
  onChange,
  onSubmit,
}: {
  draft: DiagnosisManualMedicationDraftView;
  options: string[];
  onChange: (field: keyof DiagnosisManualMedicationDraftView, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="diagnosis-form-grid">
      <input
        value={draft.nama_obat}
        onChange={(event) => onChange('nama_obat', event.target.value)}
        placeholder="Nama obat manual"
        className="neu-select diagnosis-input"
      />
      <input
        value={draft.dosis}
        onChange={(event) => onChange('dosis', event.target.value)}
        placeholder="Dosis (contoh: 3x1)"
        className="neu-select diagnosis-input"
      />
      <select
        value={draft.aturan_pakai}
        onChange={(event) => onChange('aturan_pakai', event.target.value)}
        className="neu-select diagnosis-input"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <input
        value={draft.durasi}
        onChange={(event) => onChange('durasi', event.target.value)}
        placeholder="Durasi (contoh: 3 hari)"
        className="neu-select diagnosis-input"
      />
      <input
        value={draft.rationale}
        onChange={(event) => onChange('rationale', event.target.value)}
        placeholder="Catatan klinis singkat (opsional)"
        className="neu-select diagnosis-input"
      />
      <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onSubmit}>
        Tambah obat manual
      </button>
    </div>
  );
}

function TherapyGroup({
  group,
  onToggleMedication,
  onRemoveManualMedication,
}: {
  group: DiagnosisTherapyGroupView;
  onToggleMedication: (key: string) => void;
  onRemoveManualMedication: (key: string) => void;
}) {
  return (
    <div className="form-group diagnosis-therapy-group">
      <StaticField
        value={`${formatClinicalText(group.diagnosisLabel)} | ${formatSourceLabel(group.sourceLabel)} | ${formatClinicalText(group.statusText)}`}
      />
      <div className="diagnosis-medication-list">
        {group.medications.length > 0 ? (
          group.medications.map((medication) => (
            <MedicationRow
              key={medication.key}
              medication={medication}
              onToggleMedication={onToggleMedication}
              onRemoveManualMedication={onRemoveManualMedication}
            />
          ))
        ) : (
          <ReadOnlyPanel>Belum ada paket terapi farmakologi terstruktur.</ReadOnlyPanel>
        )}
      </div>
      <details className="diagnosis-details diagnosis-details--inline">
        <summary>Rincian farmakologi</summary>
        <LineList title="Perlu review" items={group.detailItems} />
      </details>
    </div>
  );
}

function MedicationRow({
  medication,
  onToggleMedication,
  onRemoveManualMedication,
}: {
  medication: DiagnosisMedicationView;
  onToggleMedication: (key: string) => void;
  onRemoveManualMedication: (key: string) => void;
}) {
  return (
    <label className="neu-select diagnosis-medication-row">
      <input
        type="checkbox"
        checked={medication.isSelected}
        onChange={() => onToggleMedication(medication.key)}
      />
      <span className="diagnosis-medication-row__body">
        <span className="diagnosis-row-title">{medication.name}</span>
        <span className="diagnosis-row-meta">
          {formatClinicalText(medication.doseLine)} | {formatSafetyLabel(medication.safetyLabel)} |{' '}
          {formatSourceLabel(medication.sourceLabel)}
        </span>
        {medication.rationale ? (
          <span className="diagnosis-row-meta">{formatClinicalText(medication.rationale)}</span>
        ) : null}
        {medication.contraindications.length > 0 ? (
          <span className="diagnosis-warning">
            Kontraindikasi: {medication.contraindications.map(formatClinicalText).join('; ')}
          </span>
        ) : null}
      </span>
      {medication.sourceLabel === 'MANUAL' ? (
        <button
          type="button"
          className="btn-ac-inline btn-ac-inline--sharp"
          onClick={(event) => {
            event.preventDefault();
            onRemoveManualMedication(medication.key);
          }}
        >
          Hapus
        </button>
      ) : null}
    </label>
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

function StaticField({ value }: { value: string }) {
  return (
    <div className="neu-select field-summary-prominent select-prominent diagnosis-static-field">
      {value}
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
  const safeItems = items.map(formatClinicalText).filter(Boolean);
  if (safeItems.length === 0) return null;

  return (
    <div
      className={`neu-textarea neu-textarea--symptom diagnosis-readonly-field diagnosis-readonly-field--${tone}`}
    >
      <div className="diagnosis-list-title">{title}</div>
      <ul className="diagnosis-line-list">
        {safeItems.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function getClinicalSelectedDiagnoses(items: DiagnosisSelectedView[]): DiagnosisSelectedView[] {
  return items.filter((item) => !isInsufficientDiagnosisLabel(item.displayLabel));
}
