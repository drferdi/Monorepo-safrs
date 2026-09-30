// components/clinical/diagnosis/useRecurrentDiagnoses.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRecurrentDiagnoses } from './useRecurrentDiagnoses';

import type { VisitRecord } from '@/lib/iskandar-diagnosis-engine/visit-history-store';

const visits = [
  { patient_id: 'RM-SYN-1', encounter_id: 'a', timestamp: '2026-08-01', vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }, keluhan_utama: '', diagnosa: { icd_x: 'I10', nama: 'Hipertensi' }, source: 'scrape' },
  { patient_id: 'RM-SYN-1', encounter_id: 'b', timestamp: '2026-05-01', vitals: { sbp: 0, dbp: 0, hr: 0, rr: 0, temp: 0, glucose: 0 }, keluhan_utama: '', diagnosa: { icd_x: 'I10', nama: 'Hipertensi' }, source: 'scrape' },
] as VisitRecord[];

describe('useRecurrentDiagnoses', () => {
  it('loads the store once per RM and keeps a stable array identity across re-renders', async () => {
    const calls: string[] = [];
    const load = async (rm: string) => (calls.push(rm), visits);
    const today = () => new Date('2026-09-28');
    const { result, rerender } = renderHook(({ rm }) => useRecurrentDiagnoses(rm, { load, today }), { initialProps: { rm: 'RM-SYN-1' } });
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    expect(result.current.loaded).toBe(true);
    const first = result.current.candidates;
    rerender({ rm: 'RM-SYN-1' });
    expect(result.current.candidates).toBe(first);
    expect(calls).toEqual(['RM-SYN-1']);
  });

  it('returns an empty list for an empty RM or a failing store', async () => {
    const { result } = renderHook(() => useRecurrentDiagnoses('', { load: async () => { throw new Error('no db'); } }));
    expect(result.current.candidates).toEqual([]);
  });

  it('returns an empty list when the store fails for a real RM, whether it rejects or throws', async () => {
    const calls: string[] = [];
    const rejecting = renderHook(() =>
      useRecurrentDiagnoses('RM-SYN-1', {
        load: async (rm) => {
          calls.push(rm);
          throw new Error('no db');
        },
      })
    );
    const throwing = renderHook(() =>
      useRecurrentDiagnoses('RM-SYN-2', {
        load: (rm) => {
          calls.push(rm);
          throw new Error('no db');
        },
      })
    );
    await waitFor(() => expect(calls).toEqual(['RM-SYN-1', 'RM-SYN-2']));
    await waitFor(() => expect(rejecting.result.current.loaded).toBe(true));
    await waitFor(() => expect(throwing.result.current.loaded).toBe(true));
    expect(rejecting.result.current.candidates).toEqual([]);
    expect(throwing.result.current.candidates).toEqual([]);
  });

  it('re-reads when the RM changes and ignores the stale answer for the previous RM', async () => {
    let releaseFirst: (value: VisitRecord[]) => void = () => undefined;
    const load = vi.fn((rm: string) =>
      rm === 'RM-OLD'
        ? new Promise<VisitRecord[]>((resolve) => {
            releaseFirst = resolve;
          })
        : Promise.resolve([] as VisitRecord[])
    );
    const today = () => new Date('2026-09-28');
    const { result, rerender } = renderHook(({ rm }) => useRecurrentDiagnoses(rm, { load, today }), {
      initialProps: { rm: 'RM-OLD' },
    });
    rerender({ rm: 'RM-NEW' });
    releaseFirst(visits);
    await waitFor(() => expect(load).toHaveBeenCalledWith('RM-NEW'));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.candidates).toEqual([]);
  });

  it('never shows the previous RM history while the next RM is still loading', async () => {
    const load = (rm: string) =>
      rm === 'RM-SYN-1' ? Promise.resolve(visits) : new Promise<VisitRecord[]>(() => undefined);
    const today = () => new Date('2026-09-28');
    const { result, rerender } = renderHook(({ rm }) => useRecurrentDiagnoses(rm, { load, today }), {
      initialProps: { rm: 'RM-SYN-1' },
    });
    await waitFor(() => expect(result.current.candidates).toHaveLength(1));
    rerender({ rm: 'RM-SYN-2' });
    expect(result.current).toEqual({ candidates: [], loaded: false });
  });

  // Chief, 2026-09-30: with no blood pressure in the RME yet, the request carries the latest
  // visit's reading, read with the history both requests wait for (so both keep one case key).
  it('gives the latest visit blood pressure with the same read, and none without one', async () => {
    const withBp = [
      { ...visits[0], timestamp: '2026-09-16', vitals: { ...visits[0].vitals, sbp: 150, dbp: 95 } },
      ...visits,
    ] as VisitRecord[];
    const today = () => new Date(2026, 8, 28);
    const { result } = renderHook(() => useRecurrentDiagnoses('RM-SYN-1', { load: async () => withBp, today }));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.previousBloodPressure).toEqual({ systolic: 150, diastolic: 95, when: '12 hari lalu' });

    const none = renderHook(() => useRecurrentDiagnoses('RM-SYN-2', { load: async () => visits, today }));
    await waitFor(() => expect(none.result.current.loaded).toBe(true));
    expect(none.result.current.previousBloodPressure).toBeUndefined();
  });
});
