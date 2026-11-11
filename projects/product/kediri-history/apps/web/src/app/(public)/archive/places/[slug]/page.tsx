import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../../../components/site-footer";
import { SiteNav } from "../../../../../components/site-nav";
import { getPlaceBySlug } from "../../../../../content/queries";

/**
 * Catatan tempat.
 *
 * Geografi modern dan geografi historis tidak pernah berbicara dengan bahasa
 * kepastian yang sama (Technical Bible bagian 8): koordinat modern muncul
 * hanya ketika tempatnya memang masih berdiri, dan lokasi historis selalu
 * membawa tingkat kepastiannya.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return { title: "Tempat tidak ditemukan" };
  return {
    title: place.name,
    description: place.summary,
    alternates: { canonical: `/archive/places/${place.slug}` },
  };
}

const CERTAINTY_COPY: Record<string, string> = {
  precise: "Diketahui persis",
  approximate_zone: "Zona perkiraan",
  disputed: "Diperdebatkan di kalangan ahli",
  unknown: "Tidak diketahui",
};

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Tempat</p>
          <h1 className="title-page">{place.name}</h1>
          <p className="archive-label">{place.placeType}</p>
          {place.summary ? (
            <p className="lead measure">{place.summary}</p>
          ) : null}
        </header>

        <dl className="metadata">
          {place.aliases.length > 0 ? (
            <div>
              <dt>Alias</dt>
              <dd>{place.aliases.join(" · ")}</dd>
            </div>
          ) : null}
          <div>
            <dt>Lokasi historis</dt>
            <dd>
              {CERTAINTY_COPY[place.historicalCertainty ?? "unknown"] ??
                place.historicalCertainty}
              {place.historicalDescription
                ? ` — ${place.historicalDescription}`
                : ""}
            </dd>
          </div>
          {place.modernLocation ? (
            <div>
              <dt>Koordinat kini</dt>
              <dd>
                {place.modernLocation.latitude.toFixed(5)},{" "}
                {place.modernLocation.longitude.toFixed(5)}
              </dd>
            </div>
          ) : null}
        </dl>
      </main>
      <SiteFooter />
    </div>
  );
}
