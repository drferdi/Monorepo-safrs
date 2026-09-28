import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ClinicalReasoningWorkbench,
  type ClinicalReasoningWorkbenchProps,
} from './ClinicalReasoningWorkbench';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const { mockSaveScrapedVisits, mockSendMessage, mockUseRecurrentDiagnoses } = vi.hoisted(() => {
  // One object, so the workbench's memos stay stable across renders.
  const noHistory = { candidates: [], loaded: true };
  return {
    mockSaveScrapedVisits: vi.fn<(records: unknown[]) => Promise<number>>(),
    mockSendMessage: vi.fn<(type: string, payload?: unknown) => Promise<{ started: boolean; hash: string }>>(
      async () => ({ started: true, hash: 'k' })
    ),
    mockUseRecurrentDiagnoses: vi.fn((_rm: string) => noHistory),
  };
});

vi.mock('@/lib/iskandar-diagnosis-engine/visit-history-store', () => ({
  saveScrapedVisits: mockSaveScrapedVisits,
}));
vi.mock('@/utils/messaging', () => ({ sendMessage: mockSendMessage }));
vi.mock('@/components/clinical/diagnosis/useRecurrentDiagnoses', () => ({
  useRecurrentDiagnoses: mockUseRecurrentDiagnoses,
}));
vi.mock('@/components/clinical/ClinicalTrajectory', () => ({ ClinicalTrajectory: () => null }));

function visit(index: number): VisitRecord {
  return {
    patient_id: 'RM-WB-001',
    encounter_id: `wb-enc-${index}`,
    timestamp: `2026-0${index}-10`,
    vitals: { sbp: 150, dbp: 95, hr: 88, rr: 18, temp: 36.8, glucose: 0 },
    keluhan_utama: 'Kontrol',
    diagnosa: { icd_x: 'I10', nama: 'Hipertensi esensial' },
    source: 'scrape',
  };
}

const VISITS = [visit(7), visit(5)];

function props(over: Partial<ClinicalReasoningWorkbenchProps> = {}): ClinicalReasoningWorkbenchProps {
  return {
    vitals: { sbp: '150', dbp: '95', hr: '88', rr: '18', temp: '36.8', spo2: '98', glucose: '' },
    symptomText: 'Nyeri kepala',
    allergies: [],
    pregnancyStatus: null,
    disabilityType: '',
    obesityConfirmation: '',
    autosenPreset: '',
    patient: { name: 'Tn. Sentra', gender: 'L', age: 57, rm: 'RM-WB-001', dob: '1969-03-10', bpjsStatus: 'aktif', kelurahan: 'Cempaka Putih' },
    clinicalContext: { facilityName: '', payerLabel: '', specialConditions: [], pregnancyRisk: '' },
    chronicHistorySummary: '',
    anamnesaDraft: null,
    emergencyAlerts: [],
    prefetchedVisitHistory: { visits: VISITS, diagnostics: [], status: 'ready' },
    ...over,
  };
}

const prefetchCalls = () => mockSendMessage.mock.calls.filter(([type]) => type === 'prefetchDiagnosis');
const hookRms = () => mockUseRecurrentDiagnoses.mock.calls.map(([rm]) => rm);

describe('ClinicalReasoningWorkbench visit persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('writes the scanned rows once per patient and reads history and prefetches only after the write', async () => {
    let finishWrite: (saved: number) => void = () => undefined;
    mockSaveScrapedVisits.mockImplementation(
      () => new Promise<number>((resolve) => { finishWrite = resolve; })
    );
    const { rerender } = render(<ClinicalReasoningWorkbench {...props()} />);
    rerender(<ClinicalReasoningWorkbench {...props()} />);

    expect(mockSaveScrapedVisits).toHaveBeenCalledTimes(1);
    expect(mockSaveScrapedVisits).toHaveBeenCalledWith(VISITS);
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });
    expect(prefetchCalls()).toHaveLength(0);
    expect(hookRms().every((rm) => rm === '')).toBe(true);

    await act(async () => {
      finishWrite(2);
    });
    expect(hookRms().at(-1)).toBe('RM-WB-001');
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(prefetchCalls()).toHaveLength(1);

    rerender(<ClinicalReasoningWorkbench {...props()} />);
    expect(mockSaveScrapedVisits).toHaveBeenCalledTimes(1);
  });

  it('still reads history and prefetches when the write fails', async () => {
    mockSaveScrapedVisits.mockRejectedValue(new Error('no IndexedDB'));
    render(<ClinicalReasoningWorkbench {...props()} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(hookRms().at(-1)).toBe('RM-WB-001');
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(prefetchCalls()).toHaveLength(1);
  });

  it('has nothing to write without scanned rows and goes straight to the history read', async () => {
    render(<ClinicalReasoningWorkbench {...props({ prefetchedVisitHistory: null })} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSaveScrapedVisits).not.toHaveBeenCalled();
    expect(hookRms().at(-1)).toBe('RM-WB-001');
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(prefetchCalls()).toHaveLength(1);
  });

  it('writes the next patient rows when the RM changes', async () => {
    mockSaveScrapedVisits.mockResolvedValue(2);
    const { rerender } = render(<ClinicalReasoningWorkbench {...props()} />);
    await act(async () => {
      await Promise.resolve();
    });
    const next = [{ ...visit(6), patient_id: 'RM-WB-002', encounter_id: 'wb-enc-next' }];
    rerender(
      <ClinicalReasoningWorkbench
        {...props({
          patient: { ...props().patient, rm: 'RM-WB-002' },
          prefetchedVisitHistory: { visits: next, diagnostics: [], status: 'ready' },
        })}
      />
    );
    expect(mockSaveScrapedVisits).toHaveBeenCalledTimes(2);
    expect(mockSaveScrapedVisits).toHaveBeenLastCalledWith(next);
  });
});
