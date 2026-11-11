import { StatisticFigure } from './StatisticCharts';

interface StatisticCardsProps {
  totalPasien: number;
  belumSelesai: number;
  rujukanHariIni: number;
  bpjsBermasalah: number;
  kunjunganBaru: number;
  kunjunganLama: number;
}

export function StatisticCards(props: StatisticCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatisticFigure label="Total Pasien" value={props.totalPasien} note="terdaftar hari ini" />
      <StatisticFigure
        label="Belum Selesai"
        value={props.belumSelesai}
        note="masih dalam alur layanan"
      />
      <StatisticFigure
        label="Kunjungan Baru"
        value={props.kunjunganBaru}
        note={`${props.kunjunganLama} kunjungan lama`}
      />
      <StatisticFigure label="Rujukan Hari Ini" value={props.rujukanHariIni} note="rujukan eksternal" />
      <StatisticFigure
        label="BPJS Bermasalah"
        value={props.bpjsBermasalah}
        note="status perlu tindak lanjut"
      />
    </div>
  );
}
