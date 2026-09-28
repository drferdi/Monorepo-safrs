import { act, render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRecurrentSuggestion,
  ClinicalDifferential,
  resolveBaseSuggestions,
} from './ClinicalDifferential';
import type { DiagnosisWorkspaceProps } from './diagnosis/DiagnosisWorkspace';

import type { RecurrentDiagnosisCandidate } from '@/lib/clinical/recurrent-diagnosis';
import { auditLogger } from '@/lib/iskandar-diagnosis-engine/audit-logger';
import type {
  ClinicalFact,
  ClinicalReasoningFactKey,
  ReasoningEvidencePack,
} from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-evidence';
import {
  buildDifferentialCandidatesFromEvidencePack,
  getAssistDiagnosisPacks,
} from '@/lib/iskandar-diagnosis-engine/clinical-reasoning-differential';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  recurrent: { candidates: [], loaded: true } as {
    candidates: RecurrentDiagnosisCandidate[];
    loaded: boolean;
  },
  workspace: [] as DiagnosisWorkspaceProps[],
}));

// ClinicalDifferential imports the extension messaging client, which refuses to load outside
// a browser extension.
vi.mock('@/utils/messaging', () => ({ sendMessage: mocks.sendMessage }));
vi.mock('./diagnosis/useRecurrentDiagnoses', () => ({
  useRecurrentDiagnoses: () => mocks.recurrent,
}));
vi.mock('./diagnosis/DiagnosisWorkspace', () => ({
  DiagnosisWorkspace: (props: DiagnosisWorkspaceProps) => {
    mocks.workspace.push(props);
    return null;
  },
}));

function fact(key: ClinicalReasoningFactKey, overrides: Partial<ClinicalFact> = {}): ClinicalFact {
  const acuteDeterioration =
    key !== 'baseline_or_planning_risk_context' && key !== 'treatment_response_good';

  return {
    key,
    label: key.replace(/_/g, ' '),
    category:
      key === 'baseline_or_planning_risk_context'
        ? 'baseline_planning_context'
        : key === 'treatment_response_good' || key === 'treatment_response_poor'
          ? 'treatment_response'
          : key === 'infection_or_physiologic_burden'
            ? 'infection_or_physiologic_burden'
            : 'acute_deterioration',
    severity: key === 'critical_deterioration' ? 'critical' : 'high',
    value: true,
    acuteDeterioration,
    trajectoryIds:
      key === 'respiratory_worsening'
        ? ['T-45']
        : key === 'infection_or_physiologic_burden'
          ? ['T-16', 'T-54', 'T-50']
          : key === 'hemodynamic_instability'
            ? ['T-46']
            : key === 'shock_watch'
              ? ['T-59']
              : key === 'critical_deterioration'
                ? ['T-13']
                : key === 'baseline_or_planning_risk_context'
                  ? ['T-25', 'T-38', 'T-58']
                  : key === 'treatment_response_poor'
                    ? ['T-52']
                    : ['T-51'],
    evidence: [`${key} evidence`],
    sourceRefs: [`trajectory_signal:${key}`],
    ...overrides,
  };
}

function makePack(facts: ClinicalFact[]): ReasoningEvidencePack {
  return {
    clinicalFacts: facts,
    activeTrajectorySignals: [],
    redFlags: [
      {
        id: 'clinical-red-flag',
        severity: 'critical',
        source: 'physiological',
        title: 'Critical trajectory support',
        rationale: 'Critical signal must remain visible.',
      },
    ],
    driverContributions: [],
    missingCriticalInputs: ['Auskultasi paru belum terdokumentasi'],
    trajectoryCoverage: [],
    sourceMap: facts.flatMap((item) =>
      item.sourceRefs.map((sourceRef) => ({
        sourceRef,
        targetFactKeys: [item.key],
      }))
    ),
    safetyDominance: {
      criticalAlert: facts.some((item) => item.key === 'critical_deterioration'),
      mustNotMissPresent: facts.some(
        (item) => item.key === 'critical_deterioration' || item.key === 'shock_watch'
      ),
      unstablePatient: facts.some((item) => item.acuteDeterioration && item.severity !== 'low'),
      treatmentResponseConflict:
        facts.some((item) => item.key === 'treatment_response_good') &&
        facts.some((item) => item.key === 'treatment_response_poor'),
    },
    therapySupportReady: false,
    therapySupportRequirement: 'physician_selected_working_diagnosis_required',
  };
}

describe('ClinicalDifferential legacy helpers replacement', () => {
  it('exposes the current Assist-local candidate packs instead of ICD fallback helpers', () => {
    expect(getAssistDiagnosisPacks().map((pack) => pack.id)).toEqual([
      'pack-pneumonia-bronchopneumonia',
      'pack-sepsis-concern',
      'pack-asthma-exacerbation',
      'pack-bronchiolitis',
      'pack-hypertensive-crisis',
    ]);
  });

  it('builds must-not-miss respiratory candidates from trajectory evidence without confidence math', () => {
    const candidates = buildDifferentialCandidatesFromEvidencePack(
      makePack([
        fact('respiratory_worsening'),
        fact('infection_or_physiologic_burden'),
        fact('critical_deterioration'),
      ])
    );

    const pneumonia = candidates.find((item) => item.id === 'candidate-pneumonia-bronchopneumonia');
    expect(pneumonia).toMatchObject({
      category: 'must_not_miss',
      fitBand: 'must_not_miss',
      requiresPhysicianSelectionForTherapy: true,
    });
    expect(pneumonia?.trajectorySignalsLinked).toEqual(
      expect.arrayContaining(['T-45', 'T-16', 'T-54', 'T-50', 'T-13'])
    );
    expect(pneumonia?.missingToConfirm).toEqual(
      expect.arrayContaining(['Auskultasi paru terarah', 'SpO2 repeat / oxygen response'])
    );
    expect(Object.keys(pneumonia || {})).not.toEqual(
      expect.arrayContaining(['confidence', 'probability', 'percentage', 'icdCode'])
    );
  });
});

describe('recurrent suggestions', () => {
  it('builds a suggestion tagged with the history label', () => {
    const s = buildRecurrentSuggestion({ icd: 'I10', name: 'Hipertensi', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', label: 'Kronis' });
    expect(s).toMatchObject({ rank: 0, icd_x: 'I10', nama: 'Hipertensi', confidence: 0.9, engine_tag: 'Kronis' });
    expect(buildRecurrentSuggestion({ icd: 'J06.9', name: 'ISPA', count: 2, visitsConsidered: 4, lastSeen: '2026-08-12', label: 'Berulang' }).confidence).toBe(0.6);
  });

  it('does not use the UI fallback list when history candidates exist', () => {
    const fallback = () => [{ rank: 1, icd_x: 'R69', nama: 'x', confidence: 0.1, rationale: '' }];
    expect(resolveBaseSuggestions([], true, fallback)).toEqual([]);
    expect(resolveBaseSuggestions([], false, fallback)).toHaveLength(1);
  });
});

describe('recurrent candidates on the diagnosis page', () => {
  const HYPERTENSION: RecurrentDiagnosisCandidate = { icd: 'I10', name: 'Hipertensi', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', label: 'Kronis' };
  const DIABETES: RecurrentDiagnosisCandidate = { icd: 'E11.9', name: 'Diabetes melitus tipe 2', count: 2, visitsConsidered: 5, lastSeen: '2026-07-01', label: 'Kronis' };

  afterEach(() => {
    mocks.recurrent = { candidates: [], loaded: true };
    mocks.workspace.length = 0;
    mocks.sendMessage.mockReset();
    vi.restoreAllMocks();
  });

  // Passed explicitly: the component's `allergies = []` default is a new array per render and
  // re-runs its triage effect forever (production always passes the prop).
  const NO_ALLERGIES: string[] = [];
  const VITALS = { sbp: 150, dbp: 95, hr: 80, rr: 18, temp: 36.7, glucose: 0 };

  function renderPage(engineSuggestions: Array<Record<string, unknown>>) {
    mocks.sendMessage.mockImplementation(async (type: string) =>
      type === 'getSuggestions'
        ? { success: true, data: { diagnosis_suggestions: engineSuggestions } }
        : { success: false }
    );
    const page = () =>
      createElement(ClinicalDifferential, {
        keluhanUtama: 'kontrol rutin',
        patientAge: 58,
        patientGender: 'L',
        patientRM: 'RM-SYN-9',
        allergies: NO_ALLERGIES,
        vitals: VITALS,
        onBack: () => undefined,
      });
    const view = render(page());
    return { rerender: () => view.rerender(page()) };
  }

  const getSuggestionsCalls = () =>
    mocks.sendMessage.mock.calls.filter(([type]) => type === 'getSuggestions');

  const latest = () => mocks.workspace[mocks.workspace.length - 1];
  const ready = () => waitFor(() => expect(latest()?.phase).toBe('ready'));

  it('offers the history row instead of the UI fallback when the engine finds nothing', async () => {
    mocks.recurrent = { candidates: [HYPERTENSION], loaded: true };
    renderPage([]);
    await ready();

    const candidates = latest().viewModel.candidates;
    expect(candidates.map((item) => item.code)).toEqual(['I10']);
    expect(candidates[0].history).toEqual({ label: 'Kronis', count: 3, visitsConsidered: 5, lastSeen: '2026-08-12', engineAgrees: false, engineSource: null });
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      'getSuggestions',
      expect.objectContaining({ recurrent_diagnoses: [{ icd: 'I10', name: 'Hipertensi' }] })
    );
    expect(getSuggestionsCalls()).toHaveLength(1);
  });

  it('keeps the UI fallback when the record has no history and the engine finds nothing', async () => {
    renderPage([]);
    await ready();

    const candidates = latest().viewModel.candidates;
    expect(candidates.map((item) => item.code)).toEqual(['R69']);
    expect(candidates[0].history).toBeUndefined();
  });

  it('merges an engine code into the history row by ICD root and keeps the MIRA tag', async () => {
    mocks.recurrent = { candidates: [DIABETES], loaded: true };
    renderPage([{ rank: 1, icd_x: 'E11', nama: 'Diabetes melitus tipe 2', confidence: 0.7, rationale: 'MIRA rationale', engine_tag: 'MIRA' }]);
    await ready();

    const candidates = latest().viewModel.candidates;
    expect(candidates).toHaveLength(1);
    expect(candidates[0].code).toBe('E11');
    expect(candidates[0].displayLabel).toContain('MIRA');
    expect(candidates[0].history).toMatchObject({ label: 'Kronis', engineAgrees: true, engineSource: 'mira' });
  });

  it('audits the pick of a history row with its history in metadata, and not the un-pick', async () => {
    const log = vi.spyOn(auditLogger, 'log').mockResolvedValue(undefined);
    mocks.recurrent = { candidates: [HYPERTENSION], loaded: true };
    renderPage([]);
    await ready();

    const id = latest().viewModel.candidates[0].id;
    act(() => latest().onToggleCandidate(id));
    await waitFor(() => expect(latest().viewModel.candidates[0].isSelected).toBe(true));
    act(() => latest().onToggleCandidate(id));
    await waitFor(() => expect(latest().viewModel.candidates[0].isSelected).toBe(false));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('suggestion_selected', {
      session_id: 'rm-RM-SYN-9',
      suggestions: [{ icd10_code: 'I10', confidence: 0.9 }],
      metadata: { selected_icd: 'I10', source: 'riwayat', history_label: 'Kronis', history_count: 3, visits_considered: 5 },
    });
  });

  it('widens the display cap by the history-only rows so the last MIRA row (cannot-miss) stays', async () => {
    mocks.recurrent = { candidates: [HYPERTENSION], loaded: true };
    renderPage([
      { rank: 1, icd_x: 'A09', nama: 'Gastroenteritis', confidence: 0.6, rationale: '', engine_tag: 'MIRA' },
      { rank: 2, icd_x: 'J06.9', nama: 'ISPA', confidence: 0.5, rationale: '', engine_tag: 'MIRA' },
      { rank: 3, icd_x: 'K29.7', nama: 'Gastritis', confidence: 0.4, rationale: '', engine_tag: 'MIRA' },
      { rank: 4, icd_x: 'K35.8', nama: 'Apendisitis akut', confidence: 0.3, rationale: '', engine_tag: 'MIRA' },
      { rank: 5, icd_x: 'K65.0', nama: 'Peritonitis akut', confidence: 0.2, rationale: '', engine_tag: 'MIRA · jangan terlewat' },
    ]);
    await ready();

    const candidates = latest().viewModel.candidates;
    expect(candidates.map((item) => item.code)).toEqual(['I10', 'A09', 'J06.9', 'K29.7', 'K35.8', 'K65.0']);
    expect(candidates[5].displayLabel).toMatch(/jangan terlewat$/);
  });

  it('keeps the agreed history row first and a second engine code on the same root as its own row', async () => {
    mocks.recurrent = { candidates: [DIABETES], loaded: true };
    renderPage([
      { rank: 1, icd_x: 'A09', nama: 'Gastroenteritis', confidence: 0.8, rationale: '', engine_tag: 'MIRA' },
      { rank: 2, icd_x: 'E11', nama: 'Diabetes melitus tipe 2', confidence: 0.7, rationale: '', engine_tag: 'MIRA' },
      { rank: 3, icd_x: 'E11.9', nama: 'Diabetes melitus tipe 2 tanpa komplikasi', confidence: 0.5, rationale: '', engine_tag: 'MIRA' },
    ]);
    await ready();

    const candidates = latest().viewModel.candidates;
    expect(candidates.map((item) => item.code)).toEqual(['E11', 'A09', 'E11.9']);
    expect(candidates[0].history).toMatchObject({ label: 'Kronis', engineAgrees: true, engineSource: 'mira' });
  });

  it('sends getSuggestions once, after the visit store has answered', async () => {
    mocks.recurrent = { candidates: [HYPERTENSION], loaded: false };
    const page = renderPage([]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(getSuggestionsCalls()).toHaveLength(0);

    mocks.recurrent = { candidates: [HYPERTENSION], loaded: true };
    page.rerender();
    await ready();
    expect(getSuggestionsCalls()).toHaveLength(1);
    expect(getSuggestionsCalls()[0][1]).toMatchObject({ recurrent_diagnoses: [{ icd: 'I10', name: 'Hipertensi' }] });
  });
});
