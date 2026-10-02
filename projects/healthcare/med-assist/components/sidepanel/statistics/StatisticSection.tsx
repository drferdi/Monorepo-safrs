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
    <div className="ct-v2-layout flex flex-col gap-3">
      <DailyStatisticPanel />

      <section className="ct-v2-panel flex flex-col gap-3" aria-labelledby="statistic-heading">
        <div className="ct-v2-panel-head">
          <h2 id="statistic-heading" className="ttv-section-title">
            Statistic
          </h2>
        </div>
        <p className="diagnosis-row-meta">Ringkasan operasional shift dari data RME hari ini</p>
        <div className="flex">
          <button
            type="button"
            className="action-btn action-btn--secondary"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Muat ulang data RME
          </button>
        </div>

        {isLoading ? <p className="text-small text-muted">Memuat ringkasan dari RME...</p> : null}
        {error ? <p className="diagnosis-warning">{error}</p> : null}
        {!isLoading && !error && !snapshot ? (
          <p className="text-small text-muted">Belum ada data yang bisa diringkas untuk tampilan ini</p>
        ) : null}

        {snapshot ? (
          <StatisticCards
            totalPasien={snapshot.phase1.totalPasien}
            belumSelesai={snapshot.phase2?.pasienBelumSelesaiTotal ?? 0}
            rujukanHariIni={snapshot.phase2?.rujukanHariIni.total ?? 0}
            bpjsBermasalah={snapshot.phase2?.bpjsBermasalah ?? 0}
            kunjunganBaru={snapshot.phase1.kunjunganBaruVsLama.baru}
            kunjunganLama={snapshot.phase1.kunjunganBaruVsLama.lama}
          />
        ) : null}
        {snapshot?.partialSources?.length ? (
          <p className="diagnosis-row-meta">
            Sebagian statistik belum tersedia karena sumber data belum dimuat:{' '}
            {snapshot.partialSources.join(', ')}
          </p>
        ) : null}
      </section>

      {snapshot ? <StatisticCharts phase1={snapshot.phase1} phase2={snapshot.phase2} /> : null}
    </div>
  );
}
