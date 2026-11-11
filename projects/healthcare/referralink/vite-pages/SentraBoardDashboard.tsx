import {
  Application,
  Earth,
  Favorite,
  Information,
  OverflowMenuHorizontal,
  Search,
  Time,
  UserMultiple,
} from '@carbon/icons-react'
import { useEffect, useState } from 'react'

import {
  SENTRABOARD_REFERENCE_SNAPSHOT,
  loadCentralInformation,
  type CentralInformationSnapshot,
  type CentralMetricIcon,
} from '../services/centralInformation'

type SentraBoardDashboardProps = {
  onOpenMedLink: () => void
}

function SectionTitle({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 className="db01-dashboard__section-title" id={id}>
      {children}
      <Information size={14} aria-hidden="true" />
    </h2>
  )
}

function MetricIcon({ icon }: { icon: CentralMetricIcon }) {
  switch (icon) {
    case 'member':
      return <UserMultiple size={23} aria-hidden="true" />
    case 'apps':
      return <Application size={23} aria-hidden="true" />
    case 'website':
      return <Earth size={23} aria-hidden="true" />
    case 'hours':
      return <Time size={23} aria-hidden="true" />
  }
}

export default function SentraBoardDashboard({ onOpenMedLink }: SentraBoardDashboardProps) {
  const [snapshot, setSnapshot] = useState<CentralInformationSnapshot>(
    SENTRABOARD_REFERENCE_SNAPSHOT
  )

  useEffect(() => {
    let active = true

    loadCentralInformation().then(
      (nextSnapshot) => {
        if (active) setSnapshot(nextSnapshot)
      },
      () => {
        // Keep the reference snapshot visible if a future central provider is unavailable.
      }
    )

    return () => {
      active = false
    }
  }, [])

  return (
    <main id="main-content" className="db01-dashboard db01-operational-page">
      <header className="db01-dashboard__topbar">
        <Favorite size={18} aria-hidden="true" />
        <span>SentraBoard · Ringkasan</span>
      </header>

      <div className="db01-dashboard__content">
        <section className="db01-dashboard__hero" aria-labelledby="sentraboard-heading">
          <div>
            <h1 id="sentraboard-heading">{snapshot.hero.title}</h1>
            <p>{snapshot.hero.weather}</p>
          </div>
          <button type="button" className="db01-dashboard__medlink-button" onClick={onOpenMedLink}>
            <img src="/images/logomedlink.png" alt="" />
            {snapshot.hero.actionLabel}
          </button>
        </section>

        <section className="db01-dashboard__section" aria-labelledby="sentraverse-title">
          <SectionTitle id="sentraverse-title">Sentraverse</SectionTitle>
          <div className="db01-dashboard__metrics">
            {snapshot.metrics.map((metric) => (
              <article className="db01-dashboard__metric" key={metric.id}>
                <MetricIcon icon={metric.icon} />
                <p>{metric.label}</p>
                <div className="db01-dashboard__metric-value">
                  <span
                    className={`db01-dashboard__metric-mark db01-dashboard__metric-mark--${metric.tone}`}
                    aria-hidden="true"
                  />
                  <strong>{metric.value}</strong>
                </div>
                <small>{metric.trend}</small>
              </article>
            ))}
          </div>
        </section>

        <section
          className="db01-dashboard__section db01-dashboard__section--notes"
          aria-labelledby="airmanship-title"
        >
          <SectionTitle id="airmanship-title">Catatan Airmanship Anda</SectionTitle>
          <div className="db01-dashboard__notes">
            {snapshot.notes.map((note) => (
              <article className="db01-dashboard__note" key={note.id}>
                <div className="db01-dashboard__document" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <span />
                </div>
                <h3>{note.title}</h3>
                <p>{note.byline}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="db01-dashboard__recent" aria-labelledby="recent-activity-title">
          <h2 id="recent-activity-title">Aktivitas terbaru</h2>
          <div>
            {snapshot.activities.map((activity) => (
              <article key={activity.id}>
                <Search size={17} aria-hidden="true" />
                <h3>{activity.label}</h3>
                <OverflowMenuHorizontal
                  className="db01-dashboard__recent-action"
                  size={18}
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
