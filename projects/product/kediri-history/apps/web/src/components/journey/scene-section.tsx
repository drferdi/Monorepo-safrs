import Link from "next/link";
import type { ReactElement } from "react";

import type { SceneDto } from "../../content/dto";
import { ClaimRecord } from "../evidence/claim-record";
import {
  dominantEvidenceClass,
  EvidenceClassBadge,
} from "../evidence/evidence-badge";
import { MediaFigure } from "../media-figure";
import { BridgeGeometry } from "./bridge-geometry";
import { SceneMotion } from "./scene-motion";

/**
 * Satu scene Journey, dirender sebagai dokumen sejarah yang lengkap.
 *
 * Ini Server Component. Seluruh sejarahnya ada di HTML sebelum satu baris
 * JavaScript berjalan; SceneMotion hanya membungkusnya dengan `display:
 * contents` dan menempelkan gerak. Journey tidak pernah menjadi satu pohon
 * klien raksasa hanya karena ada animasi (Technical Bible bagian 23).
 *
 * Enam lapis fungsional scene (UX Bible bagian 6) hadir semua di HTML: kanvas
 * historis, tanggal dan judul, ketukan naratif, badge evidence, navigasi scene,
 * dan lapisan explore.
 *
 * Atribut data-motion adalah kontrak antara markup dan koreografi. Motion
 * memilih target lewat atribut ini, bukan lewat kelas presentasi, sehingga
 * mendesain ulang tampilan tidak diam-diam mematahkan gerak.
 *
 * Bukti dibuka dengan elemen <details> asli, bukan modal buatan. Alasannya
 * bukan kemalasan: elemen asli tetap bekerja tanpa JavaScript, sudah dapat
 * diakses keyboard dan pembaca layar, dan tidak merusak tombol Back — yang
 * oleh UX Bible bagian 17 disebut sakral.
 */
export function SceneSection({
  scene,
  nextSceneSlug,
}: {
  readonly scene: SceneDto;
  readonly nextSceneSlug?: string;
}): ReactElement {
  const badgeClass =
    scene.evidenceBadgeMode === "hidden"
      ? undefined
      : dominantEvidenceClass(scene.featuredClaims);
  const event = scene.primaryEvent;

  const body = (
    <section
      className="scene"
      id={scene.slug}
      data-scene-type={scene.sceneType}
      aria-labelledby={`${scene.slug}-title`}
    >
      <time
        dateTime={String(event?.chronology.startYear ?? "")}
        data-motion="date"
      >
        {scene.dateDisplay}
      </time>

      <h2
        className="title-scene"
        id={`${scene.slug}-title`}
        data-motion="title"
      >
        {scene.title}
      </h2>
      {scene.subtitle ? (
        <p className="lead" data-motion="body">
          {scene.subtitle}
        </p>
      ) : null}

      {scene.narrativeShort ? (
        <p className="narrative" data-motion="body">
          {scene.narrativeShort}
        </p>
      ) : null}

      {scene.choreographyKey === "bridgeConstruction" ? (
        <BridgeGeometry />
      ) : null}

      <MediaFigure media={scene.heroMedia} />

      {badgeClass ? (
        <p>
          <EvidenceClassBadge evidenceClass={badgeClass} />
        </p>
      ) : null}

      {scene.featuredClaims.length > 0 ? (
        <details className="evidence-disclosure">
          <summary>Lihat bukti</summary>
          <div>
            {scene.featuredClaims.map((claim) => (
              <ClaimRecord key={claim.id} claim={claim} />
            ))}
          </div>
        </details>
      ) : null}

      <nav className="scene-actions" aria-label={`Aksi untuk ${scene.title}`}>
        {event ? (
          <Link href={`/archive/events/${event.slug}`}>
            Catatan arsip lengkap
          </Link>
        ) : null}
        {nextSceneSlug ? (
          <a href={`#${nextSceneSlug}`}>Bab berikutnya</a>
        ) : null}
      </nav>
    </section>
  );

  // Tanpa choreographyKey, tidak ada island klien sama sekali. Scene yang
  // belum punya koreografi tetap merupakan dokumen sejarah yang lengkap.
  if (!scene.choreographyKey) return body;

  return (
    <SceneMotion choreographyKey={scene.choreographyKey}>{body}</SceneMotion>
  );
}
