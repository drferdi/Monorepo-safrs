import { useState, type ReactNode } from 'react';

import type {
  Phase1ShiftOverview,
  Phase2ShiftOverview,
  StatisticCountItem,
} from '@/lib/statistics/types';

/** Accordion state for one group of panels: opening one closes the open one. */
export type PanelToggle = { expanded: boolean; onToggle: () => void };

export function useAccordion(initial: string | null) {
  const [open, setOpen] = useState<string | null>(initial);
  return (id: string): PanelToggle => ({
    expanded: open === id,
    onToggle: () => setOpen((current) => (current === id ? null : id)),
  });
}

/**
 * A side-panel panel as on the Diagnosis and Trajectory pages: title left, quiet label right.
 * Given a toggle it is an accordion item; its content appears and goes in place, nothing slides.
 */
export function StatisticPanel({
  title,
  label,
  toggle,
  children,
}: {
  title: string;
  label?: string;
  toggle?: PanelToggle;
  children: ReactNode;
}) {
  return (
    <section className="ct-v2-panel flex flex-col gap-3">
      <div className="ct-v2-panel-head">
        <h3 className="ttv-section-title flex-1">
          {toggle ? (
            <button
              type="button"
              className="statistic-accordion__trigger"
              aria-expanded={toggle.expanded}
              onClick={toggle.onToggle}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        {label ? <span className="ttv-label">{label}</span> : null}
      </div>
      {!toggle || toggle.expanded ? children : null}
    </section>
  );
}

/** One figure: label above, value in the TTV value scale, note below. */
export function StatisticFigure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1" aria-label={label}>
      <span className="ttv-label">{label}</span>
      <span className="statistic-figure">{value}</span>
      {note ? <span className="diagnosis-row-meta">{note}</span> : null}
    </div>
  );
}

function Empty() {
  return <p className="text-small text-muted">Tidak ada data</p>;
}

export type StatisticRow = { label: string; value: string };

/** Each count with its share of the whole: "12 · 40%". */
export function shareRows(items: StatisticCountItem[]): StatisticRow[] {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return items.map((item) => ({
    label: item.label,
    value: `${item.count} · ${total > 0 ? Math.round((item.count / total) * 100) : 0}%`,
  }));
}

export type SubmenuSection = { id: string; title: string; label: string; rows: StatisticRow[] };

/**
 * Sections on one rail, as the lab sidebar sub-menu: the open title carries the accent tick and its
 * rows hang on a branch. One section open at a time; content appears in place, nothing slides or draws.
 */
export function StatisticSubmenu({
  sections,
  initial,
}: {
  sections: SubmenuSection[];
  initial: string;
}) {
  const panel = useAccordion(initial);
  return (
    <section className="ct-v2-panel">
      <div className="statistic-submenu">
        {sections.map((section) => {
          const toggle = panel(section.id);
          return (
            <div
              key={section.id}
              className="statistic-submenu__section"
              data-open={toggle.expanded ? 'true' : undefined}
            >
              <div className="ct-v2-panel-head">
                <h3 className="ttv-section-title flex-1">
                  <button
                    type="button"
                    className="statistic-accordion__trigger"
                    aria-expanded={toggle.expanded}
                    onClick={toggle.onToggle}
                  >
                    {section.title}
                  </button>
                </h3>
                {toggle.expanded ? <span className="ttv-label">{section.label}</span> : null}
              </div>
              {toggle.expanded ? (
                section.rows.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="statistic-submenu__branch">
                    {section.rows.map((row) => (
                      <li key={row.label} className="statistic-submenu__item statistic-row">
                        <span className="statistic-row__label">{row.label}</span>
                        <span className="statistic-row__value">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DonutLikeList({
  title,
  subtitle,
  items,
  toggle,
}: {
  title: string;
  subtitle: string;
  items: StatisticCountItem[];
  toggle?: PanelToggle;
}) {
  return (
    <StatisticPanel title={title} label={subtitle} toggle={toggle}>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {shareRows(items).map((row) => (
            <div key={row.label} className="statistic-row">
              <span className="statistic-row__label">{row.label}</span>
              <span className="statistic-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </StatisticPanel>
  );
}

export function RankedBars({
  title,
  subtitle,
  items,
  limit = 7,
  toggle,
  children,
}: {
  title: string;
  subtitle: string;
  items: StatisticCountItem[];
  limit?: number;
  toggle?: PanelToggle;
  /** A note under the bars. */
  children?: ReactNode;
}) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <StatisticPanel title={title} label={subtitle} toggle={toggle}>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, limit).map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="statistic-row">
                <span className="statistic-row__label">{item.label}</span>
                <span className="statistic-row__value">{item.count}</span>
              </div>
              <div className="statistic-meter">
                <div
                  className="statistic-meter__fill"
                  style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {children}
    </StatisticPanel>
  );
}

function Phase2Panels({
  phase2,
  panel,
}: {
  phase2: Phase2ShiftOverview;
  panel: (id: string) => PanelToggle;
}) {
  return (
    <>
      <RankedBars
        title="RS Tujuan Rujukan"
        subtitle="rujukan hari ini"
        items={phase2.rujukanHariIni.rsTujuanTerbanyak}
        toggle={panel('rujukan')}
      />
      <StatisticPanel title="Stok Rendah" label="perlu perhatian" toggle={panel('stok')}>
        {phase2.stokRendah.length === 0 ? (
          <p className="text-small text-muted">Tidak ada stok rendah terdeteksi</p>
        ) : (
          <div className="flex flex-col gap-2">
            {phase2.stokRendah.slice(0, 5).map((item) => (
              <div key={`${item.namaObat}-${item.ruangan}`} className="statistic-row">
                <span className="statistic-row__label">
                  {item.namaObat} · {item.ruangan}
                </span>
                <span className="statistic-row__value">
                  {item.stok} · {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </StatisticPanel>
    </>
  );
}

export function StatisticCharts({
  phase1,
  phase2,
}: {
  phase1: Phase1ShiftOverview;
  phase2?: Phase2ShiftOverview;
}) {
  const panel = useAccordion('status');
  return (
    <>
      <DonutLikeList
        title="Status Pelayanan"
        subtitle="alur layanan"
        items={phase1.statusPelayanan}
        toggle={panel('status')}
      />
      <RankedBars
        title="Beban per Ruangan"
        subtitle="ruangan daftar"
        items={phase1.pasienPerRuangan}
        toggle={panel('ruangan')}
      />
      <RankedBars
        title="Beban per Dokter"
        subtitle="dokter"
        items={phase1.pasienPerDokter}
        toggle={panel('dokter')}
      />
      {phase2 ? <Phase2Panels phase2={phase2} panel={panel} /> : null}
    </>
  );
}
