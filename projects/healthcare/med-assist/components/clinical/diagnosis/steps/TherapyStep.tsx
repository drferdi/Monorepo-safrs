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
> & { onSkip: () => void };

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
  chronicTherapySummary,
  onToggleMedication,
  onRemoveManualMedication,
}: {
  medication: DiagnosisMedicationView;
  chronicTherapySummary: string;
  onToggleMedication: (key: string) => void;
  onRemoveManualMedication: (key: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="dx-flow-row"
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
      <span>
        {medication.name} · {formatClinicalText(medication.doseLine)}
      </span>
      <span>
        {medicationStatusWord(medication, chronicTherapySummary)}
        {medication.sourceLabel === 'MANUAL' ? (
          <button
            type="button"
            className="dx-flow-link"
            onClick={(event) => {
              event.stopPropagation();
              onRemoveManualMedication(medication.key);
            }}
          >
            hapus
          </button>
        ) : null}
      </span>
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
  onSkip,
}: Props) {
  const chronicTherapySummary = viewModel.context.chronicTherapySummary;
  const therapyGroups = viewModel.primary.isInsufficient
    ? []
    : viewModel.therapy.groups.filter((group) => !isInsufficientDiagnosisLabel(group.diagnosisLabel));

  return (
    <section className="dx-flow-step" aria-label="Terapi">
      <h2 className="dx-flow-step__heading">Terapi apa?</h2>

      {viewModel.selectedDiagnoses.length > 0 ? (
        <p className="dx-flow-muted">
          {`Basis: ${viewModel.selectedDiagnoses.map((diagnosis) => diagnosis.displayLabel).join(', ')}`}{' '}
          {viewModel.selectedDiagnoses.map((diagnosis) => (
            <button
              key={diagnosis.key}
              type="button"
              className="dx-flow-link"
              onClick={() => onRemoveDiagnosis(diagnosis.key)}
            >
              hapus
            </button>
          ))}
        </p>
      ) : null}

      <div className="dx-flow-links">
        <button type="button" className="dx-flow-link" onClick={onToggleManualMedicationInput}>
          + Obat
        </button>
        <button
          type="button"
          className="dx-flow-link"
          disabled={viewModel.therapy.candidateMedicationCount === 0}
          onClick={onSelectAllMedications}
        >
          Pilih semua
        </button>
        <button
          type="button"
          className="dx-flow-link"
          disabled={viewModel.therapy.selectedMedicationCount === 0}
          onClick={onClearMedications}
        >
          Reset
        </button>
        <button type="button" className="dx-flow-link" onClick={onSkip}>
          Lanjut tanpa obat
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

      {therapyGroups.map((group) =>
        group.medications.map((medication) => (
          <MedicationRow
            key={medication.key}
            medication={medication}
            chronicTherapySummary={chronicTherapySummary}
            onToggleMedication={onToggleMedication}
            onRemoveManualMedication={onRemoveManualMedication}
          />
        ))
      )}
    </section>
  );
}
