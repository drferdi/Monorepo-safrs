import { useEffect, useMemo, useState } from 'react';

import { DonutLikeList, RankedBars } from './StatisticCharts';

import { readDailyReport, readPreviousDailyReport } from '@/lib/statistics/daily-cache';
import { dailyRowsToCsv } from '@/lib/statistics/daily-csv';
import { buildDailyStatistics } from '@/lib/statistics/daily-statistics';
import type { DailyServiceReport } from '@/lib/statistics/types';
import { sendMessage } from '@/utils/messaging';

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-01" → "01-10-2026", as ePuskesmas writes dates. */
function displayDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('-');
}

function minutes(value: number | null): string {
  return value === null ? '–' : `${value} menit`;
}

function DailyCard({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <article className="statistic-card statistic-card--primary" aria-label={title}>
      <div className="statistic-card__title">{title}</div>
      <div className="statistic-card__value">{value}</div>
      <div className="statistic-card__subtitle">{note}</div>
    </article>
  );
}

export function DailyStatisticPanel() {
  const [date, setDate] = useState(todayIso);
  const [report, setReport] = useState<DailyServiceReport | null>(null);
  const [previous, setPrevious] = useState<DailyServiceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReport(null);
    setError(null);
    void Promise.all([readDailyReport(date), readPreviousDailyReport(date)]).then(
      ([stored, before]) => {
        if (!active) return;
        // A day loaded from the RME while the store was being read stays.
        setReport((loaded) => loaded ?? stored);
        setPrevious(before);
      }
    );
    return () => {
      active = false;
    };
  }, [date]);

  const stats = useMemo(
    () => (report ? buildDailyStatistics(report.date, report.rows) : null),
    [report]
  );

  const handleLoad = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReport(await sendMessage('collectDailyStatistics', { date }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Gagal memuat laporan harian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([dailyRowsToCsv(report.rows)], { type: 'text/csv;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `statistik-harian-${report.date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const change = stats && previous ? stats.totalPelayanan - previous.rows.length : null;
  const fetchedTime = report
    ? new Date(report.fetchedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="statistic-board">
      <div className="statistic-board__header">
        <div>
          <h2 className="statistic-board__title">Statistik Harian</h2>
          <p className="statistic-board__subtitle">
            Laporan Harian Pelayanan Pasien ePuskesmas, tanpa identitas pasien
          </p>
        </div>
        <div className="statistic-daily__controls">
          <input
            type="date"
            className="statistic-daily__date"
            aria-label="Tanggal statistik"
            value={date}
            max={todayIso()}
            onChange={(event) => event.target.value && setDate(event.target.value)}
          />
          <button
            type="button"
            className="statistic-board__refresh"
            onClick={handleLoad}
            disabled={isLoading}
          >
            Muat statistik harian
          </button>
          <button
            type="button"
            className="statistic-board__refresh"
            onClick={handleDownload}
            disabled={!report || report.rows.length === 0}
          >
            Unduh CSV
          </button>
        </div>
      </div>

      {isLoading ? <div className="statistic-empty">Memuat laporan harian dari RME...</div> : null}
      {error ? <div className="statistic-empty">{error}</div> : null}
      {!isLoading && !error && !report ? (
        <div className="statistic-empty">
          Belum ada statistik tersimpan untuk {displayDate(date)}. Tekan Muat statistik harian.
        </div>
      ) : null}
      {report && report.rows.length === 0 ? (
        <div className="statistic-empty">Tidak ada pelayanan tercatat pada {displayDate(date)}</div>
      ) : null}

      {stats && stats.totalPelayanan > 0 ? (
        <>
          <div className="statistic-grid statistic-grid--cards">
            <DailyCard
              title="Pelayanan"
              value={stats.totalPelayanan}
              note={
                change !== null && previous
                  ? `${change >= 0 ? '+' : ''}${change} dari ${displayDate(previous.date)}`
                  : 'baris laporan hari itu'
              }
            />
            <DailyCard title="Laki-laki" value={stats.jenisKelamin.lakiLaki} note="pelayanan" />
            <DailyCard title="Perempuan" value={stats.jenisKelamin.perempuan} note="pelayanan" />
            <DailyCard
              title="Kunjungan Baru"
              value={stats.kunjungan.baru}
              note={`${stats.kunjungan.lama} kunjungan lama`}
            />
            <DailyCard
              title="Kasus Baru"
              value={stats.kasusDiagnosisUtama.baru}
              note={`diagnosis utama · ${stats.kasusDiagnosisUtama.lama} kasus lama`}
            />
          </div>
          <div className="statistic-grid statistic-grid--panels">
            <RankedBars
              title="10 Besar Penyakit"
              subtitle="semua diagnosis, menurut kode ICD-10"
              items={stats.topPenyakit}
              limit={10}
            />
            <RankedBars
              title="Pasien per DPJP"
              subtitle="pelayanan per dokter / tenaga medis"
              items={stats.perDpjp}
              limit={10}
            />
            <DonutLikeList title="Poli / Ruangan" subtitle="tempat pelayanan" items={stats.perPoli} />
            <DonutLikeList title="Asuransi" subtitle="penjamin pelayanan" items={stats.perAsuransi} />
            <DonutLikeList title="Kelompok Umur" subtitle="umur dalam tahun" items={stats.kelompokUmur} />
            <article className="statistic-panel">
              <h3 className="statistic-panel__title">Waktu Layanan</h3>
              <p className="statistic-panel__subtitle">median per pelayanan</p>
              <div className="statistic-list">
                {(
                  [
                    ['Antrean', stats.medianMenit.antrean],
                    ['Pemeriksaan', stats.medianMenit.pemeriksaan],
                    ['Pelayanan obat', stats.medianMenit.pelayananObat],
                  ] satisfies Array<[string, number | null]>
                ).map(([label, value]) => (
                  <div key={label} className="statistic-list__row">
                    <span className="statistic-list__label">{label}</span>
                    <span className="statistic-list__value">{minutes(value)}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div className="statistic-partial">
            Diambil {fetchedTime}
            {stats.pelayananTanpaDiagnosa > 0
              ? ` · ${stats.pelayananTanpaDiagnosa} pelayanan tanpa diagnosis`
              : ''}
            {stats.diagnosaTanpaKode > 0
              ? ` · ${stats.diagnosaTanpaKode} diagnosis tanpa kode ICD`
              : ''}
          </div>
        </>
      ) : null}
    </div>
  );
}
