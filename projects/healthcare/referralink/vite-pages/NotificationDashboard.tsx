import { Notification as NotificationIcon, Time } from '@carbon/icons-react'

import { useLogbookRecords } from '../hooks/useLogbookRecords'
import { SYNTHETIC_DATA_GUARDRAIL } from '../services/uiCopy'

type NotificationDashboardProps = {
  onOpenLogbook: () => void
}

export default function NotificationDashboard({ onOpenLogbook }: NotificationDashboardProps) {
  const { records, loading } = useLogbookRecords()
  const recentRecords = records.slice(0, 8)

  return (
    <main id="main-content" className="db01-operational-page">
      <header className="db01-operational-topbar">
        <NotificationIcon size={20} aria-hidden="true" />
        <span>Notifikasi · Sinyal ruang kerja</span>
      </header>
      <div className="db01-operational-content">
        <section className="db01-operational-hero">
          <div>
            <p className="db01-operational-eyebrow">Sinyal aktivitas lokal</p>
            <h1>Notifikasi</h1>
            <p>Tinjau aktivitas MEDLINK terbaru dan lanjutkan dari Logbook.</p>
          </div>
          <button
            type="button"
            className="db01-operational-button db01-operational-button--secondary"
            onClick={onOpenLogbook}
          >
            Buka Logbook
          </button>
        </section>
        <p className="db01-operational-note">{SYNTHETIC_DATA_GUARDRAIL}</p>
        <section className="db01-operational-panel db01-notification-list" aria-live="polite">
          {loading ? (
            <p className="db01-operational-empty" role="status">
              Memuat notifikasi…
            </p>
          ) : null}
          {!loading && recentRecords.length === 0 ? (
            <div className="db01-notification-empty">
              <NotificationIcon size={28} aria-hidden="true" />
              <h2>Belum ada notifikasi baru</h2>
              <p>Jalankan analisis MEDLINK untuk membuat sinyal aktivitas lokal.</p>
              <button
                type="button"
                className="db01-operational-button db01-operational-button--primary"
                onClick={onOpenLogbook}
              >
                Lihat Logbook
              </button>
            </div>
          ) : null}
          {recentRecords.map((record) => (
            <article className="db01-notification-item" key={record.id}>
              <span className="db01-notification-item__icon" aria-hidden="true">
                {record.status === 'completed' ? '✓' : '!'}
              </span>
              <div>
                <strong>
                  {record.status === 'completed'
                    ? 'Analisis tersedia'
                    : 'Analisis memerlukan perhatian'}
                </strong>
                <p>
                  Status {record.status} · urgensi {record.urgency ?? 'tidak tersedia'}
                </p>
              </div>
              <span className="db01-notification-item__time">
                <Time size={14} aria-hidden="true" />
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(record.createdAt))}
              </span>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
