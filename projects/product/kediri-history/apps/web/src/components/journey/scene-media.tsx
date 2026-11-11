import type { CSSProperties, ReactElement } from "react";

import type { SceneDto } from "../../content/dto";
import { frameVariables, sceneFraming } from "../../modules/motion/framing";

/**
 * Custom property jendela bingkai untuk kedua breakpoint sekaligus.
 *
 * Dirender server, jadi crop sudah benar pada cat pertama dan tidak ada
 * pergeseran layout ketika JavaScript menyusul. CSS yang memilih varian mana
 * yang dipakai; komponen ini tidak pernah menebak lebar viewport.
 */
function framingStyle(slug: string | undefined): CSSProperties | undefined {
  const framing = sceneFraming(slug);
  if (!framing) return undefined;

  const desktop = frameVariables(framing, framing.desktop);
  const mobile = frameVariables(framing, framing.mobile);

  return {
    "--frame-zoom-d": desktop["--frame-zoom"],
    "--frame-x-d": desktop["--frame-x"],
    "--frame-y-d": desktop["--frame-y"],
    "--frame-zoom-m": mobile["--frame-zoom"],
    "--frame-x-m": mobile["--frame-x"],
    "--frame-y-m": mobile["--frame-y"],
    "--frame-pos-d": framing.objectPositionDesktop,
    "--frame-pos-m": framing.objectPositionMobile,
  } as CSSProperties;
}

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
      <div
        className="stage-media"
        data-media-state="ready"
        style={framingStyle(scene.slug)}
      >
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
        style={framingStyle(scene.slug)}
      >
        {slot.videoPath ? (
          /*
           * Slot video (direktif Chief 2026-08-28). Poster = citra slot,
           * sehingga cat pertama dan fallback identik dengan versi statis.
           * Kamera GSAP (dolly, mask --lit, transisi keluar) menyapunya
           * lewat .stage-surface persis seperti citra.
           *
           * TANPA autoPlay: pemutaran dimiliki island motion
           * (modules/motion/media-gate.ts), yang baru menghidupkannya ketika
           * scene benar-benar di layar. Tanpa JavaScript, poster — yaitu citra
           * scene itu sendiri — sudah menjadi komposisi yang utuh.
           */
          <video
            src={slot.videoPath}
            poster={slot.expectedPath}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={slot.altText}
          />
        ) : (
          /* biome-ignore lint/performance/noImgElement: slot statis harus menerima aset produksi tanpa konfigurasi loader tambahan. */
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
        )}
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
