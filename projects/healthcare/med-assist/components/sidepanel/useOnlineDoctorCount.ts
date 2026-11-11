import { useEffect, useState } from 'react';

const REFRESH_MS = 60_000;

/**
 * Number of doctors MedBoard lists as online (GET /api/doctors/online), the same list the
 * "Kirim ke dokter" picker shows, refreshed every minute. Zero when MedBoard is unreachable.
 */
export function useOnlineDoctorCount(load: () => Promise<readonly unknown[]>): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      load()
        .then((doctors) => {
          if (active) setCount(doctors.length);
        })
        .catch(() => {
          if (active) setCount(0);
        });
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);

  return count;
}
