interface StatisticCardsProps {
  totalPasien: number;
  belumSelesai: number;
  rujukanHariIni: number;
  bpjsBermasalah: number;
}

const CARD_DEFS: Array<{
  key: keyof StatisticCardsProps;
  title: string;
  subtitle: string;
  tone: 'primary' | 'warning' | 'critical' | 'neutral';
}> = [
  { key: 'totalPasien', title: 'Total Pasien', subtitle: 'terdaftar hari ini', tone: 'primary' },
  {
    key: 'belumSelesai',
    title: 'Belum Selesai',
    subtitle: 'masih dalam alur layanan',
    tone: 'warning',
  },
  {
    key: 'rujukanHariIni',
    title: 'Rujukan Hari Ini',
    subtitle: 'external referral tercatat',
    tone: 'critical',
  },
  {
    key: 'bpjsBermasalah',
    title: 'BPJS Bermasalah',
    subtitle: 'status perlu tindak lanjut',
    tone: 'neutral',
  },
];

export function StatisticCards(props: StatisticCardsProps) {
  return (
    <div className="statistic-grid statistic-grid--cards">
      {CARD_DEFS.map((card) => (
        <article
          key={card.key}
          className={`statistic-card statistic-card--${card.tone}`}
          aria-label={card.title}
        >
          <div className="statistic-card__title">{card.title}</div>
          <div className="statistic-card__value">{props[card.key]}</div>
          <div className="statistic-card__subtitle">{card.subtitle}</div>
        </article>
      ))}
    </div>
  );
}
