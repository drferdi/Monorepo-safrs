import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { RecordLinks } from "../../../../../components/archive/record-links";
import { ClaimRecord } from "../../../../../components/evidence/claim-record";
import { SiteFooter } from "../../../../../components/site-footer";
import { SiteNav } from "../../../../../components/site-nav";
import { getEventBySlug } from "../../../../../content/queries";

/**
 * Catatan peristiwa.
 *
 * Inilah yang membuktikan sejarah bekerja tanpa bioskop: dengan JavaScript
 * dimatikan, pengunjung tetap dapat membuka Hantang, melihat tanggal dan
 * maknanya, melihat apa yang ditopang dan tidak ditopang buktinya, menelusuri
 * provenance, dan berpindah ke catatan terkait (Master Implementation Plan
 * Phase 8).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Peristiwa tidak ditemukan" };
  return { title: event.name, description: event.summary };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Peristiwa</p>
          <h1 className="title-page">{event.name}</h1>
          <p className="archive-label">
            {event.chronology.display} · presisi {event.chronology.precision}
          </p>
          <p className="lead measure">{event.summary}</p>
        </header>

        {event.aliases.length > 0 ? (
          <p className="archive-label">
            Juga dikenal: {event.aliases.join(" · ")}
          </p>
        ) : null}

        {event.claims.length > 0 ? (
          <section aria-labelledby="evidence">
            <h2 id="evidence" className="title-scene">
              Bukti
            </h2>
            {event.claims.map((claim) => (
              <ClaimRecord key={claim.id} claim={claim} />
            ))}
          </section>
        ) : (
          <p className="prose measure">
            Belum ada klaim terbit yang tertaut ke peristiwa ini.
          </p>
        )}

        <RecordLinks
          heading="Orang"
          items={event.people.map((person) => ({
            href: `/archive/people/${person.slug}`,
            title: person.name,
            meta: person.aliases.join(" · "),
          }))}
        />
        <RecordLinks
          heading="Tempat"
          items={event.places.map((place) => ({
            href: `/archive/places/${place.slug}`,
            title: place.name,
            meta: place.placeType,
          }))}
        />
        <RecordLinks
          heading="Objek"
          items={event.artifacts.map((artifact) => ({
            href: `/archive/objects/${artifact.slug}`,
            title: artifact.name,
            meta: [artifact.holdingInstitution, artifact.inventoryNumber]
              .filter(Boolean)
              .join(" · "),
          }))}
        />

        <p>
          <Link href={`/journey#${slug}`}>Lihat ini di dalam Journey</Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
