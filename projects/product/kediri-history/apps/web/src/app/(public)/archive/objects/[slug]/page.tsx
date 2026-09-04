import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { MediaFigure } from "../../../../../components/media-figure";
import { SiteFooter } from "../../../../../components/site-footer";
import { SiteNav } from "../../../../../components/site-nav";
import { getArtifactBySlug } from "../../../../../content/queries";

/**
 * Catatan objek.
 *
 * Untuk objek penting, pengunjung harus dapat melihat: objek, tanggal,
 * institusi, inventaris, jenis bukti, apa yang ditopangnya, dan apa yang tidak
 * ditetapkannya (Visual Evidence Bible bagian 15).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = await getArtifactBySlug(slug);
  if (!artifact) return { title: "Objek tidak ditemukan" };
  return {
    title: artifact.name,
    description: artifact.summary,
    alternates: { canonical: `/archive/objects/${artifact.slug}` },
  };
}

export default async function ObjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ReactElement> {
  const { slug } = await params;
  const artifact = await getArtifactBySlug(slug);
  if (!artifact) notFound();

  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Objek</p>
          <h1 className="title-page">{artifact.name}</h1>
          {artifact.summary ? (
            <p className="lead measure">{artifact.summary}</p>
          ) : null}
        </header>

        {artifact.media.length > 0 ? (
          artifact.media.map((media) => (
            <MediaFigure key={media.id} media={media} />
          ))
        ) : (
          <p className="prose measure">
            Belum ada citra yang bersih hak untuk objek ini. Ketiadaan yang
            jujur lebih baik daripada gambar pengganti yang menyesatkan.
          </p>
        )}

        <dl className="metadata">
          <div>
            <dt>Jenis</dt>
            <dd>{artifact.artifactType}</dd>
          </div>
          {artifact.chronology ? (
            <div>
              <dt>Kronologi</dt>
              <dd>
                {artifact.chronology.display} · presisi{" "}
                {artifact.chronology.precision}
              </dd>
            </div>
          ) : null}
          {artifact.holdingInstitution ? (
            <div>
              <dt>Institusi</dt>
              <dd>{artifact.holdingInstitution}</dd>
            </div>
          ) : null}
          {artifact.inventoryNumber ? (
            <div>
              <dt>Inventaris</dt>
              <dd>{artifact.inventoryNumber}</dd>
            </div>
          ) : null}
          {artifact.provenance ? (
            <div>
              <dt>Provenance</dt>
              <dd>{artifact.provenance}</dd>
            </div>
          ) : null}
          {artifact.transcription ? (
            <div>
              <dt>Transkripsi</dt>
              <dd className="prose">{artifact.transcription}</dd>
            </div>
          ) : null}
          {artifact.translation ? (
            <div>
              <dt>Terjemahan</dt>
              <dd className="prose">{artifact.translation}</dd>
            </div>
          ) : null}
        </dl>
      </main>
      <SiteFooter />
    </div>
  );
}
