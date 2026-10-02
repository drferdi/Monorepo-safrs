import { useEffect, useMemo, useState } from 'react';

import {
  DonutLikeList,
  RankedBars,
  StatisticFigure,
  StatisticPanel,
  useAccordion,
} from './StatisticCharts';

import { PixelLoader } from '@/components/clinical/diagnosis/PixelLoader';
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

export function DailyStatisticPanel() {
  const [date, setDate] = useState(todayIso);
  const [report, setReport] = useState<DailyServiceReport | null>(null);
  const [previous, setPrevious] = useState<DailyServiceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allDiseases, setAllDiseases] = useState(false);
  const panel = useAccordion('dpjp');

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
  const untracked = stats
    ? [
        stats.pelayananTanpaDiagnosa > 0 ? `${stats.pelayananTanpaDiagnosa} pelayanan tanpa diagnosis` : '',
        stats.diagnosaTanpaKode > 0 ? `${stats.diagnosaTanpaKode} diagnosis tanpa kode ICD` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const fetchedTime = report
    ? new Date(report.fetchedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="flex flex-col gap-3">
      <section className="ct-v2-panel flex flex-col gap-3">
        <div className="ct-v2-panel-head">
          <div className="flex items-center gap-2">
            {isLoading ? <PixelLoader tone="accent" /> : null}
            <h2 className="ttv-section-title">Statistik Harian</h2>
          </div>
          {report ? <span className="ttv-label">diambil {fetchedTime}</span> : null}
        </div>
        <p className="diagnosis-row-meta">
          Laporan Harian Pelayanan Pasien ePuskesmas, tanpa identitas pasien
        </p>
        <div className="flex flex-wrap items-center gap-2">
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
            className="action-btn action-btn--primary"
            onClick={handleLoad}
            disabled={isLoading}
          >
            Muat statistik harian
          </button>
          <button
            type="button"
            className="action-btn action-btn--secondary"
            onClick={handleDownload}
            disabled={!report || report.rows.length === 0}
          >
            Unduh CSV
          </button>
        </div>

        {isLoading ? (
          <p className="text-small text-muted">Memuat laporan harian dari RME...</p>
        ) : null}
        {error ? <p className="diagnosis-warning">{error}</p> : null}
        {!isLoading && !error && !report ? (
          <p className="text-small text-muted">
            Belum ada statistik tersimpan untuk {displayDate(date)}. Tekan Muat statistik harian.
          </p>
        ) : null}
        {report && report.rows.length === 0 ? (
          <p className="text-small text-muted">Tidak ada pelayanan tercatat pada {displayDate(date)}</p>
        ) : null}

        {stats && stats.totalPelayanan > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <StatisticFigure
              label="Pelayanan"
              value={stats.totalPelayanan}
              note={
                change !== null && previous
                  ? `${change >= 0 ? '+' : ''}${change} dari ${displayDate(previous.date)}`
                  : 'baris laporan hari itu'
              }
            />
            <StatisticFigure
              label="Laki-laki / Perempuan"
              value={`${stats.jenisKelamin.lakiLaki} / ${stats.jenisKelamin.perempuan}`}
            />
            <StatisticFigure
              label="Kunjungan Baru"
              value={stats.kunjungan.baru}
              note={`${stats.kunjungan.lama} kunjungan lama`}
            />
            <StatisticFigure
              label="Kasus Baru"
              value={stats.kasusDiagnosisUtama.baru}
              note={`diagnosis utama · ${stats.kasusDiagnosisUtama.lama} kasus lama`}
            />
          </div>
        ) : null}
      </section>

      {stats && stats.totalPelayanan > 0 ? (
        <>
          <RankedBars
            title="10 Besar Penyakit"
            subtitle="ICD-10 · semua diagnosis"
            items={stats.topPenyakit}
            limit={allDiseases ? 10 : 5}
          >
            {stats.topPenyakit.length > 5 ? (
              <div className="flex">
                <button
                  type="button"
                  className="diagnosis-text-button inline-flex items-center gap-1"
                  aria-expanded={allDiseases}
                  onClick={() => setAllDiseases((value) => !value)}
                >
                  Lihat 10 besar
                  <span aria-hidden="true">{allDiseases ? '⌃' : '⌄'}</span>
                </button>
              </div>
            ) : null}
            {untracked ? <p className="diagnosis-row-meta">{untracked}</p> : null}
          </RankedBars>
          <RankedBars
            title="Pasien per DPJP"
            subtitle="pelayanan per dokter"
            items={stats.perDpjp}
            limit={10}
            toggle={panel('dpjp')}
          />
          <DonutLikeList
            title="Poli / Ruangan"
            subtitle="tempat pelayanan"
            items={stats.perPoli}
            toggle={panel('poli')}
          />
          <DonutLikeList
            title="Asuransi"
            subtitle="penjamin"
            items={stats.perAsuransi}
            toggle={panel('asuransi')}
          />
          <DonutLikeList
            title="Kelompok Umur"
            subtitle="tahun"
            items={stats.kelompokUmur}
            toggle={panel('umur')}
          />
          <StatisticPanel title="Waktu Layanan" label="median" toggle={panel('waktu')}>
            <div className="flex flex-col gap-2">
              {(
                [
                  ['Antrean', stats.medianMenit.antrean],
                  ['Pemeriksaan', stats.medianMenit.pemeriksaan],
                  ['Pelayanan obat', stats.medianMenit.pelayananObat],
                ] satisfies Array<[string, number | null]>
              ).map(([label, value]) => (
                <div key={label} className="statistic-row">
                  <span className="statistic-row__label">{label}</span>
                  <span className="statistic-row__value">{minutes(value)}</span>
                </div>
              ))}
            </div>
          </StatisticPanel>
        </>
      ) : null}
    </div>
  );
}
