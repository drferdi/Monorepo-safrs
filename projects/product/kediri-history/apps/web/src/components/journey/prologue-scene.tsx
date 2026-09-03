import type { CSSProperties, ReactElement } from "react";

import type {
  FramingMedia,
  FramingNarrative,
} from "../../content/production-narrative";
import { frameVariables, sceneFraming } from "../../modules/motion/framing";
import { PrologueVideoSequence } from "./prologue-video-sequence";
import { SceneMotion } from "./scene-motion";

/**
 * Prolog dan Finale memakai citra yang sama, jadi keduanya memakai pengarahan
 * bingkai yang sama: manifest scene 00, tanpa crop, hanya object-position.
 */
const PROLOGUE_FRAMING_SLUG = "2026-prologue";

function prologueFramingStyle(): CSSProperties | undefined {
  const framing = sceneFraming(PROLOGUE_FRAMING_SLUG);
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
 * Bingkai yang dipakai Prolog dan Finale. Prolog menaruhnya di dalam stage
 * sebagai satu dunia visual; Finale tetap dapat menaruhnya sebagai frame
 * mandiri ketika halaman kembali ke 2026.
 */
export function FramingStage({
  media,
  framing,
  surface = false,
}: {
  readonly media: FramingMedia;
  readonly framing: "prologue" | "finale";
  readonly surface?: boolean;
}): ReactElement {
  return (
    <div
      className={surface ? "stage-media" : "framing-stage"}
      data-framing={framing}
      style={prologueFramingStyle()}
    >
      {media.videoPath && framing === "prologue" ? (
        /*
         * Video pembuka (direktif Chief 2026-08-28). Poster = citra prolog,
         * jadi cat pertama dan fallback tanpa-JS identik dengan versi statis.
         * Sentuhan GSAP-nya diwarisi dari timeline prologueReveal: video ini
         * hidup di dalam .stage-surface, sehingga dolly, mask cahaya --lit,
         * dan transisi keluar menyapunya persis seperti citra.
         */
        <PrologueVideoSequence
          firstVideoPath={media.videoPath}
          continuationVideoPath={media.continuationVideoPath}
          poster={media.path}
          altText={media.altText}
          continuationAltText={media.continuationAltText}
          label={media.label}
          labelDetail={media.labelDetail}
        />
      ) : (
        /* biome-ignore lint/performance/noImgElement: aset pratinjau lokal disajikan route sendiri tanpa loader tambahan. */
        <img
          src={media.path}
          srcSet={`${media.path.replace(/\.webp$/u, "-w768.webp")} 768w, ${media.path} 1536w`}
          sizes="100vw"
          alt={media.altText}
          width="1536"
          height="1024"
          loading={framing === "prologue" ? "eager" : "lazy"}
          fetchPriority={framing === "prologue" ? "high" : undefined}
          decoding="async"
        />
      )}
      <span className="stage-media-shade" aria-hidden="true" />
    </div>
  );
}

/**
 * Scene 00 — satu stage Prolog, bukan hero lalu readout narasi kedua.
 *
 * Naskah tetap server-rendered penuh. Saat motion aktif, beat yang sama
 * dipadatkan ke dalam satu pelat di atas citra dan dibuka oleh satu timeline;
 * saat mobile/reduced/tanpa-JS, pelat kembali menjadi alur vertikal utuh.
 */
export function PrologueScene({
  narrative,
}: {
  readonly narrative: FramingNarrative;
}): ReactElement {
  const body = (
    <section
      className="prologue-scene"
      id="prologue-2026"
      data-scene="prologue"
      data-scene-type="hero"
      data-choreography="prologueReveal"
      aria-label="Pembuka perjalanan sejarah Kediri"
    >
      <div className="scene-shot prologue-shot">
        <div className="prologue-stage" data-motion="stage">
          <div className="stage-void" aria-hidden="true" />
          <div className="prologue-opening" data-motion="opening">
            <p className="prologue-opening-copy">
              Dari jejak yang tercatat, Kediri tumbuh di tepi Brantas. Sebelum
              menjadi kota hari ini, namanya telah hadir dalam perjalanan Jawa.
            </p>
          </div>
          <div className="stage-surface prologue-surface" data-motion="surface">
            {narrative.media ? (
              <FramingStage
                media={narrative.media}
                framing="prologue"
                surface
              />
            ) : null}
          </div>
          <div className="stage-plate">
            <div className="stage-context" data-motion="context">
              <p className="eyebrow">{narrative.eyebrow}</p>
              <h1
                className="title-scene"
                id="prologue-2026-title"
                data-motion="title"
              >
                {narrative.title}
              </h1>
            </div>
            <p
              className="master-line prologue-lead"
              data-motion="master"
              data-editorial-role="lead-line"
            >
              {narrative.masterLine}
            </p>
            <div className="prologue-passages stage-passages">
              {narrative.paragraphs.map((paragraph, index) => (
                <div
                  className="stage-beat"
                  data-motion="passage"
                  data-beat-index={index}
                  key={paragraph}
                >
                  <p>{paragraph}</p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="prologue-scroll-cue"
            data-motion="scroll-cue"
            aria-hidden="true"
          >
            <span className="scroll-cue-text">Gulir untuk Memulai</span>
            <svg
              className="scroll-cue-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="M12 5v14M5 12l7 7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div
          className="scene-pin-space prologue-pin-space"
          aria-hidden="true"
        />
      </div>
    </section>
  );

  return <SceneMotion choreographyKey="prologueReveal">{body}</SceneMotion>;
}
