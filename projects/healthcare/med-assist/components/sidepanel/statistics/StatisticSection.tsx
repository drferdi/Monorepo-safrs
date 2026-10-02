import { useEffect, useState } from 'react';

import { DailyStatisticPanel } from './DailyStatisticPanel';
import { StatisticCards } from './StatisticCards';
import { StatisticCharts } from './StatisticCharts';

import { readShiftOverviewCache } from '@/lib/statistics/cache';
import type { ShiftOverviewSnapshot } from '@/lib/statistics/types';
import { sendMessage } from '@/utils/messaging';

export function StatisticSection() {
  const [snapshot, setSnapshot] = useState<ShiftOverviewSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readShiftOverviewCache().then((cached) => {
      if (cached) setSnapshot(cached);
    });
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sendMessage('collectShiftOverview', {
        phases: ['phase1', 'phase2'],
      });
      setSnapshot(result);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Gagal memuat statistic');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="statistic-board" aria-labelledby="statistic-heading">
      <DailyStatisticPanel />

      <div className="statistic-board__header">
        <div>
          <h2 id="statistic-heading" className="statistic-board__title">
            Statistic
          </h2>
          <p className="statistic-board__subtitle">
            Ringkasan operasional shift dari data RME hari ini
          </p>
        </div>
        <button type="button" className="statistic-board__refresh" onClick={handleRefresh}>
          Muat ulang data RME
        </button>
      </div>

      {isLoading ? <div className="statistic-empty">Memuat ringkasan dari RME...</div> : null}
      {error ? <div className="statistic-empty">{error}</div> : null}

      {!isLoading && !error && !snapshot ? (
        <div className="statistic-empty">Belum ada data yang bisa diringkas untuk tampilan ini</div>
      ) : null}

      {snapshot ? (
        <>
          <StatisticCards
            totalPasien={snapshot.phase1.totalPasien}
            belumSelesai={snapshot.phase2?.pasienBelumSelesaiTotal ?? 0}
            rujukanHariIni={snapshot.phase2?.rujukanHariIni.total ?? 0}
            bpjsBermasalah={snapshot.phase2?.bpjsBermasalah ?? 0}
          />
          <StatisticCharts phase1={snapshot.phase1} phase2={snapshot.phase2} />
          {snapshot.partialSources?.length ? (
            <div className="statistic-partial">
              Sebagian statistik belum tersedia karena sumber data belum dimuat:{' '}
              {snapshot.partialSources.join(', ')}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
