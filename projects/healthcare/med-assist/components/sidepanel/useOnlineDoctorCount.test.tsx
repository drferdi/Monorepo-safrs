import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useOnlineDoctorCount } from './useOnlineDoctorCount';

const doctor = (id: string) => ({ id, name: id, role: 'dokter' });

describe('useOnlineDoctorCount', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts the doctors MedBoard lists as online, the same list the forwarding picker shows', async () => {
    const load = vi.fn(async () => [doctor('dr. A'), doctor('dr. B')]);
    const { result } = renderHook(() => useOnlineDoctorCount(load));
    await waitFor(() => expect(result.current).toBe(2));
  });

  it('shows zero when MedBoard cannot be reached or the user is not signed in', async () => {
    const load = vi.fn(async () => {
      throw new Error('Unauthorized');
    });
    const { result } = renderHook(() => useOnlineDoctorCount(load));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it('refreshes every minute and stops when the panel closes', async () => {
    vi.useFakeTimers();
    const load = vi
      .fn<() => Promise<ReturnType<typeof doctor>[]>>()
      .mockResolvedValueOnce([doctor('dr. A')])
      .mockResolvedValue([doctor('dr. A'), doctor('dr. B'), doctor('dr. C')]);
    const { result, unmount } = renderHook(() => useOnlineDoctorCount(load));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(result.current).toBe(3);

    unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
