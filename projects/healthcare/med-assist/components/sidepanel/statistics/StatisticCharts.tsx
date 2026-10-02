import type {
  Phase1ShiftOverview,
  Phase2ShiftOverview,
  StatisticCountItem,
} from '@/lib/statistics/types';

export function DonutLikeList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: StatisticCountItem[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <article className="statistic-panel">
      <h3 className="statistic-panel__title">{title}</h3>
      <p className="statistic-panel__subtitle">{subtitle}</p>
      {items.length === 0 ? (
        <div className="statistic-empty">Tidak ada data</div>
      ) : (
        <div className="statistic-list">
          {items.map((item) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.label} className="statistic-list__row">
                <span className="statistic-list__label">{item.label}</span>
                <span className="statistic-list__value">
                  {item.count} · {percent}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function ComparisonPanel({ baru, lama }: { baru: number; lama: number }) {
  return (
    <article className="statistic-panel">
      <h3 className="statistic-panel__title">Jenis Kunjungan</h3>
      <p className="statistic-panel__subtitle">Perbandingan pasien baru dan lama</p>
      <div className="statistic-compare">
        <div className="statistic-compare__item">
          <span className="statistic-compare__label">Baru</span>
          <span className="statistic-compare__value">{baru}</span>
        </div>
        <div className="statistic-compare__item">
          <span className="statistic-compare__label">Lama</span>
          <span className="statistic-compare__value">{lama}</span>
        </div>
      </div>
    </article>
  );
}

export function RankedBars({
  title,
  subtitle,
  items,
  limit = 7,
}: {
  title: string;
  subtitle: string;
  items: StatisticCountItem[];
  limit?: number;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <article className="statistic-panel">
      <h3 className="statistic-panel__title">{title}</h3>
      <p className="statistic-panel__subtitle">{subtitle}</p>
      {items.length === 0 ? (
        <div className="statistic-empty">Tidak ada data</div>
      ) : (
        <div className="statistic-bars">
          {items.slice(0, limit).map((item) => (
            <div key={item.label} className="statistic-bars__row">
              <div className="statistic-bars__meta">
                <span className="statistic-bars__label">{item.label}</span>
                <span className="statistic-bars__value">{item.count}</span>
              </div>
              <div className="statistic-bars__track">
                <div
                  className="statistic-bars__fill"
                  style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Phase2Panels({ phase2 }: { phase2?: Phase2ShiftOverview }) {
  if (!phase2) {
    return (
      <div className="statistic-grid statistic-grid--phase2">
        <article className="statistic-panel">
          <h3 className="statistic-panel__title">Rujukan dan Farmasi</h3>
          <p className="statistic-panel__subtitle">
            Fase 2 aktif saat data tambahan berhasil dimuat
          </p>
          <div className="statistic-empty">Fase 2</div>
        </article>
      </div>
    );
  }

  return (
    <div className="statistic-grid statistic-grid--phase2">
      <RankedBars
        title="RS Tujuan Rujukan"
        subtitle="Rumah sakit tujuan yang paling sering dipilih"
        items={phase2.rujukanHariIni.rsTujuanTerbanyak}
      />
      <article className="statistic-panel">
        <h3 className="statistic-panel__title">Stok Rendah</h3>
        <p className="statistic-panel__subtitle">Obat yang perlu perhatian cepat</p>
        {phase2.stokRendah.length === 0 ? (
          <div className="statistic-empty">Tidak ada stok rendah terdeteksi</div>
        ) : (
          <div className="statistic-list">
            {phase2.stokRendah.slice(0, 5).map((item) => (
              <div key={`${item.namaObat}-${item.ruangan}`} className="statistic-list__row">
                <span className="statistic-list__label">
                  {item.namaObat} · {item.ruangan}
                </span>
                <span className="statistic-list__value">
                  {item.stok} · {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export function StatisticCharts({
  phase1,
  phase2,
}: {
  phase1: Phase1ShiftOverview;
  phase2?: Phase2ShiftOverview;
}) {
  return (
    <>
      <div className="statistic-grid statistic-grid--panels">
        <DonutLikeList
          title="Status Pelayanan"
          subtitle="Posisi pasien dalam alur layanan"
          items={phase1.statusPelayanan}
        />
        <ComparisonPanel
          baru={phase1.kunjunganBaruVsLama.baru}
          lama={phase1.kunjunganBaruVsLama.lama}
        />
      </div>
      <div className="statistic-grid statistic-grid--panels">
        <RankedBars
          title="Beban per Ruangan"
          subtitle="Jumlah pasien berdasarkan ruangan daftar"
          items={phase1.pasienPerRuangan}
        />
        <RankedBars
          title="Beban per Dokter"
          subtitle="Jumlah pasien berdasarkan dokter"
          items={phase1.pasienPerDokter}
        />
      </div>
      <Phase2Panels phase2={phase2} />
    </>
  );
}
