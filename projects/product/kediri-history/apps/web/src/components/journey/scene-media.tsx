import type { ReactElement } from "react";

import type { SceneDto } from "../../content/dto";

/**
 * Satu slot visual dominan per scene.
 *
 * Slot ini sengaja stabil sebelum aset final tersedia: mengganti placeholder
 * dengan gambar produksi tidak mengubah struktur halaman, anchor, naskah,
 * ataupun koreografi. Media terbit dari CMS selalu menang atas snapshot lokal.
 */
export function SceneMedia({
  scene,
  editorialPreview,
}: {
  readonly scene: SceneDto;
  readonly editorialPreview: boolean;
}): ReactElement | null {
  const media = scene.heroMedia;
  const slot = scene.mediaSlot;

  if (media) {
    return (
      <div className="stage-media" data-media-state="ready">
        {/* biome-ignore lint/performance/noImgElement: URL media CMS bersifat dinamis dan tidak boleh dibatasi host build-time. */}
        <img
          src={media.url}
          alt={media.altText}
          width={media.width ?? 1600}
          height={media.height ?? 900}
        />
        <span className="stage-media-shade" aria-hidden="true" />
      </div>
    );
  }

  if (editorialPreview && slot?.ready) {
    const mobilePath = slot.expectedPath.replace(/\.webp$/u, "-w768.webp");
    // Scene pertama adalah komposisi pembuka; sisanya dimuat saat mendekat.
    // Jangan mengunduh sebelas abad sebelum 879 tampil (UX Bible bagian 31).
    const isOpeningScene = scene.order === 1;
    return (
      <div
        className="stage-media"
        data-media-slot={slot.key}
        data-media-state="ready"
      >
        {/* biome-ignore lint/performance/noImgElement: slot statis harus menerima aset produksi tanpa konfigurasi loader tambahan. */}
        <img
          src={slot.expectedPath}
          srcSet={`${mobilePath} 768w, ${slot.expectedPath} 1536w`}
          sizes="100vw"
          alt={slot.altText}
          width="1536"
          height="1024"
          loading={isOpeningScene ? "eager" : "lazy"}
          fetchPriority={isOpeningScene ? "high" : undefined}
          decoding="async"
        />
        <span className="stage-media-shade" aria-hidden="true" />
      </div>
    );
  }

  if (!slot) return null;

  return (
    <div
      className="stage-media stage-media--pending"
      data-media-slot={slot.key}
      data-media-state="pending"
      data-expected-path={slot.expectedPath}
    >
      <div className="media-slot-card">
        <span>Scene {String(scene.order).padStart(2, "0")}</span>
        <strong>{scene.title}</strong>
        <small>{slot.label}</small>
      </div>
    </div>
  );
}

const VISUAL_LABELS = {
  V0_primary_object: "Objek primer",
  V1_documentary_historical_image: "Dokumentasi historis",
  V2_verified_contemporary_documentation:
    "Dokumentasi kontemporer terverifikasi",
  V3_evidence_constrained_reconstruction: "Rekonstruksi berbasis bukti",
  V4_artistic_interpretation: "Interpretasi artistik",
  V5_folklore_visualization: "Visualisasi folklor",
} as const;

/** Label selalu mengikuti media yang benar-benar dirender. */
export function sceneMediaLabel(
  scene: SceneDto,
  editorialPreview: boolean,
): string | undefined {
  if (scene.heroMedia) {
    return scene.heroMedia.visualEvidenceClass
      ? VISUAL_LABELS[scene.heroMedia.visualEvidenceClass]
      : "Media terbit";
  }
  if (editorialPreview && scene.mediaSlot?.ready) {
    return scene.mediaSlot.label;
  }
  return undefined;
}
