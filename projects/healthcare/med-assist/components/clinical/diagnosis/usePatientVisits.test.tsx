import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePatientVisits } from './usePatientVisits';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const record = { patient_id: 'RM-1', encounter_id: 'e1', timestamp: '2026-09-10', vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }, keluhan_utama: '', source: 'scrape' } satisfies VisitRecord;

describe('usePatientVisits', () => {
  it('reads the stored visits for the RM', async () => {
    const load = vi.fn(async () => [record]);
    const { result } = renderHook(() => usePatientVisits('RM-1', load));
    await waitFor(() => expect(result.current).toEqual([record]));
    expect(load).toHaveBeenCalledWith('RM-1');
  });

  it('answers with no visits when the store fails', async () => {
    const load = vi.fn(async (): Promise<VisitRecord[]> => {
      throw new Error('no store');
    });
    const { result } = renderHook(() => usePatientVisits('RM-1', load));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
