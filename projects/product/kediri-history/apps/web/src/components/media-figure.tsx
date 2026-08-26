import type { ReactElement } from "react";

import type { MediaDto } from "../content/dto";

/**
 * Media dengan provenance-nya terpasang.
 *
 * Bila arsip tidak menyediakan gambar, ketiadaan yang jujur dapat diterima
 * (Visual Evidence Bible bagian 21) — komponen ini tidak pernah menampilkan
 * pengganti yang mengesankan sebuah bukti ada.
 */
export function MediaFigure({
  media,
}: {
  readonly media: MediaDto | undefined;
}): ReactElement | null {
  if (!media) return null;
  return (
    <figure className="media-figure">
      {/* biome-ignore lint/performance/noImgElement: derivatif publik dilayani
          dari object storage dengan dimensi yang sudah tersimpan di CMS, dan
          alt text-nya wajib. Pengoptimal gambar Next akan menambah lapisan
          proxy yang tidak memecahkan masalah nyata di sini. */}
      <img
        src={media.url}
        alt={media.altText}
        width={media.width}
        height={media.height}
        loading="lazy"
        decoding="async"
      />
      <figcaption>
        {media.caption ? <span className="prose">{media.caption}</span> : null}
        <span className="record-meta">
          {[media.institution, media.creditLine, media.visualEvidenceClass]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {media.uncertaintyNote ? (
          <span className="record-meta">
            Tidak menetapkan: {media.uncertaintyNote}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
