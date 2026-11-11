import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../../components/site-footer";
import { SiteNav } from "../../../../components/site-nav";
import { listPlaces } from "../../../../content/queries";

/**
 * Tempat: di mana sejarah masih berdiri hari ini.
 *
 * Peta adalah alat eksplorasi, bukan inti naratif (UX Bible bagian 21), dan
 * geografi spekulatif kuno tidak pernah memakai bahasa kepastian yang sama
 * dengan penanda lokasi modern.
 */
export const metadata = {
  title: "Tempat",
  description:
    "Sungai, jembatan, situs, dan bangunan tempat sejarah Kediri masih dapat dikunjungi.",
  alternates: { canonical: "/explore/places" },
};

export default async function PlacesPage(): Promise<ReactElement> {
  const places = await listPlaces();
  const standing = places.filter((place) => place.modernLocation);
  const historical = places.filter((place) => !place.modernLocation);

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Explore</p>
          <h1 className="title-page">Tempat</h1>
          <p className="lead measure">
            Sebagian tempat masih dapat didatangi. Sebagian lagi hanya bertahan
            dalam teks, nama, dan ingatan. Keduanya tidak ditampilkan seolah
            sama pastinya.
          </p>
        </header>

        <section aria-labelledby="standing">
          <h2 id="standing" className="title-scene">
            Masih berdiri
          </h2>
          {standing.length === 0 ? (
            <p className="prose measure">Belum ada tempat yang diterbitkan.</p>
          ) : (
            <ul className="record-list">
              {standing.map((place) => (
                <li key={place.id}>
                  <Link href={`/archive/places/${place.slug}`}>
                    <span className="record-title">{place.name}</span>
                    <span className="record-meta">{place.placeType}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="remembered">
          <h2 id="remembered" className="title-scene">
            Diketahui lewat teks dan ingatan
          </h2>
          {historical.length === 0 ? (
            <p className="prose measure">Belum ada catatan.</p>
          ) : (
            <ul className="record-list">
              {historical.map((place) => (
                <li key={place.id}>
                  <Link href={`/archive/places/${place.slug}`}>
                    <span className="record-title">{place.name}</span>
                    <span className="record-meta">
                      {[place.placeType, place.historicalCertainty]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
