import { motion } from 'framer-motion';

import { formatClinicalText, isInsufficientDiagnosisLabel } from '../diagnosisDisplayUtils';
import type { DiagnosisManualMedicationDraftView, DiagnosisPageProps } from '../diagnosisPageProps';
import type { DiagnosisMedicationView, DiagnosisPageViewModel } from '../diagnosisViewModel';

type Props = Pick<
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
> & { onConfirm: () => void; onSkip: () => void };

export function therapySummary(viewModel: DiagnosisPageViewModel): string {
  const names = viewModel.therapy.groups.flatMap((group) =>
    group.medications.filter((medication) => medication.isSelected).map((medication) => medication.name)
  );
  if (names.length === 0) return 'belum ada obat';
  const head = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${head}, +${names.length - 2}` : head;
}

function isChronicMedication(name: string, chronicTherapySummary: string): boolean {
  const firstWord = name.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return false;
  return chronicTherapySummary.toLowerCase().includes(firstWord);
}

function medicationStatusWord(
  medication: DiagnosisMedicationView,
  chronicTherapySummary: string
): string {
  if (medication.sourceLabel === 'MANUAL') return 'manual';
  if (isChronicMedication(medication.name, chronicTherapySummary)) return 'lanjut';
  return medication.isSelected ? 'dipilih' : 'usulan';
}

function MedicationRow({
  medication,
  index,
  chronicTherapySummary,
  onToggleMedication,
  onRemoveManualMedication,
}: {
  medication: DiagnosisMedicationView;
  index: number;
  chronicTherapySummary: string;
  onToggleMedication: (key: string) => void;
  onRemoveManualMedication: (key: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06 }}
      whileTap={{ scale: 0.985 }}
      role="button"
      tabIndex={0}
      className="neu-select diagnosis-medication-row"
      data-testid="dx-flow-med"
      aria-pressed={medication.isSelected}
      onClick={() => onToggleMedication(medication.key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleMedication(medication.key);
        }
      }}
    >
      <div className="min-w-0">
        <div className="diagnosis-row-title">{medication.name}</div>
        <div className="diagnosis-row-meta">{formatClinicalText(medication.doseLine)}</div>
      </div>
      <span className="diagnosis-rank-label">
        {medicationStatusWord(medication, chronicTherapySummary)}
        {medication.sourceLabel === 'MANUAL' ? (
          <button
            type="button"
            className="diagnosis-text-button"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveManualMedication(medication.key);
            }}
          >
            hapus
          </button>
        ) : null}
      </span>
    </motion.div>
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

export function TherapyStep({
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
  onConfirm,
  onSkip,
}: Props) {
  const chronicTherapySummary = viewModel.context.chronicTherapySummary;
  const therapyGroups = viewModel.primary.isInsufficient
    ? []
    : viewModel.therapy.groups.filter((group) => !isInsufficientDiagnosisLabel(group.diagnosisLabel));

  return (
    <section className="ct-v2-panel flex flex-col gap-3" aria-label="Terapi">
      <div className="ct-v2-panel-head">
        <h2 className="ttv-section-title">Terapi</h2>
        <span className="ttv-label">3 / 4</span>
      </div>

      {viewModel.selectedDiagnoses.length > 0 ? (
        <p className="text-small text-muted flex flex-wrap items-center gap-2">
          <span>{`Basis: ${viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.displayLabel).join(', ')}`}</span>
          {viewModel.selectedDiagnoses.map((diagnosis) => (
            <button
              key={diagnosis.key}
              type="button"
              className="diagnosis-text-button"
              onClick={() => onRemoveDiagnosis(diagnosis.key)}
            >
              hapus
            </button>
          ))}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="diagnosis-text-button" onClick={onToggleManualMedicationInput}>
          + Obat
        </button>
        <button
          type="button"
          className="diagnosis-text-button"
          disabled={viewModel.therapy.candidateMedicationCount === 0}
          onClick={onSelectAllMedications}
        >
          Pilih semua
        </button>
        <button
          type="button"
          className="diagnosis-text-button"
          disabled={viewModel.therapy.selectedMedicationCount === 0}
          onClick={onClearMedications}
        >
          Reset
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

      <div className="diagnosis-list">
        {therapyGroups.flatMap((group) => group.medications).map((medication, index) => (
            <MedicationRow
              key={medication.key}
              medication={medication}
              index={index}
              chronicTherapySummary={chronicTherapySummary}
              onToggleMedication={onToggleMedication}
              onRemoveManualMedication={onRemoveManualMedication}
            />
        ))}
      </div>

      <div className="flex">
        {viewModel.therapy.selectedMedicationCount > 0 ? (
          <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onConfirm}>
            Lanjut
          </button>
        ) : (
          <button type="button" className="btn-ac-inline btn-ac-inline--sharp" onClick={onSkip}>
            Lanjut tanpa obat
          </button>
        )}
      </div>
    </section>
  );
}
