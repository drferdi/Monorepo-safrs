import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TherapyStep, therapySummary } from './TherapyStep';
import type { DiagnosisPageViewModel } from '../diagnosisViewModel';

function vm(): DiagnosisPageViewModel {
  const med = (key: string, name: string, isSelected: boolean, sourceLabel = 'PROPOSAL') => ({ key, name, doseLine: '1x1 | Sesudah makan | 30 hari', rationale: '', safetyLabel: 'safe', contraindications: [], isSelected, sourceLabel });
  return {
    context: { patientSummary: '', allergySummary: '', chronicTherapySummary: 'Amlodipin 10 mg', chronicDiagnosisSummary: '' },
    primary: { canLock: true, isInsufficient: false, candidateLabel: 'I10 - Hipertensi', confidenceLabel: 'High confidence', safestNextAction: '', primaryCtaLabel: '', missingEvidence: [] },
    evidence: { supports: [], against: [], missing: [], review: [], redFlags: [], doNotMiss: [] },
    candidates: [],
    selectedDiagnoses: [{ key: 'suggested:1:I10', displayLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem' }],
    therapy: { state: 'ready', hasDiagnosisBasis: true, selectedDiagnosisCount: 1, selectedMedicationCount: 1, candidateMedicationCount: 3, manualMedicationAvailable: false, reviewOnly: true, diagnosisBasisLabel: 'I10', groups: [{ diagnosisKey: 'suggested:1:I10', diagnosisLabel: 'I10 - Hipertensi', sourceLabel: 'Rekomendasi sistem', statusText: 'ready', detailItems: [], medications: [med('amlodipin', 'Amlodipin 10 mg', true), med('kandesartan', 'Kandesartan 8 mg', false), med('manual-1', 'Vitamin B', false, 'MANUAL')] }] },
    transfer: { state: 'idle', diagnosisReady: true, resepReady: false, canAutoFill: false, selectedDiagnosisLabel: 'I10', medicationSelectionLabel: '1/3', reasonLabels: [], error: '', resultSummary: null, readinessMessage: null, steps: [] },
  };
}

const handlers = () => ({ onRemoveDiagnosis: vi.fn(), onSelectAllMedications: vi.fn(), onClearMedications: vi.fn(), onToggleManualMedicationInput: vi.fn(), onManualMedicationDraftChange: vi.fn(), onAddManualMedication: vi.fn(), onToggleMedication: vi.fn(), onRemoveManualMedication: vi.fn() });

describe('TherapyStep', () => {
  it('asks "Terapi apa?" and shows one row per medication with one status word', () => {
    const h = handlers();
    render(<TherapyStep viewModel={vm()} showManualMedicationInput={false} manualMedicationDraft={{ nama_obat: '', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' }} manualMedicationOptions={['Sesudah makan']} {...h} />);
    expect(screen.getByRole('heading', { name: 'Terapi apa?' })).toBeInTheDocument();
    const rows = screen.getAllByTestId('dx-flow-med');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Amlodipin 10 mg');
    expect(rows[0]).toHaveTextContent('lanjut');
    expect(rows[1]).toHaveTextContent('usulan');
    expect(rows[2]).toHaveTextContent('manual');
    fireEvent.click(rows[1]);
    expect(h.onToggleMedication).toHaveBeenCalledWith('kandesartan');
    expect(screen.queryByText(/Hanya untuk ditinjau/)).toBeNull();
  });

  it('opens the manual form from "+ Obat" and summarises selected medications', () => {
    const h = handlers();
    render(<TherapyStep viewModel={vm()} showManualMedicationInput={false} manualMedicationDraft={{ nama_obat: '', dosis: '', aturan_pakai: 'Sesudah makan', durasi: '', rationale: '' }} manualMedicationOptions={['Sesudah makan']} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Obat' }));
    expect(h.onToggleManualMedicationInput).toHaveBeenCalledTimes(1);
    expect(therapySummary(vm())).toBe('Amlodipin 10 mg');
  });
});
