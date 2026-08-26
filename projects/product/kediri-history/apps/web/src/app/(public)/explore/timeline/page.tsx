import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../../components/site-footer";
import { SiteNav } from "../../../../components/site-nav";
import { listEventsChronologically } from "../../../../content/queries";

/**
 * Kronologi informasional lengkap.
 *
 * Ini juga cadangan tanpa JavaScript untuk overlay Timeline di Journey: setiap
 * peristiwa dapat ditautkan, dan setiap baris menyambung ke pengalaman,
 * geografi, dan bukti (UX Bible bagian 20).
 */
export const metadata = {
  title: "Kronologi",
  description:
    "Kronologi sejarah Kediri yang dapat ditelusuri, dari 879 hingga hari ini.",
};

export default async function TimelinePage(): Promise<ReactElement> {
  const events = await listEventsChronologically();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="archive-header">
          <p className="eyebrow">Explore</p>
          <h1 className="title-page">Kronologi</h1>
          <p className="lead measure">
            Setiap peristiwa yang sudah melewati tinjauan, berurut waktu.
            Presisi tanggalnya ditampilkan apa adanya: tahun tetap tahun, dan
            tidak pernah dipertajam menjadi tanggal yang tidak diketahui.
          </p>
        </header>

        {events.length === 0 ? (
          <p className="prose measure">Belum ada peristiwa yang diterbitkan.</p>
        ) : (
          <ol className="record-list">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/archive/events/${event.slug}`}>
                  <span className="record-meta">
                    {event.chronology.display} · {event.chronology.precision}
                  </span>
                  <span className="record-title">{event.name}</span>
                  <span className="prose">{event.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
