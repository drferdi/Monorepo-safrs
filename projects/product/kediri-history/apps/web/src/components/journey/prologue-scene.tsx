import type { CSSProperties, ReactElement } from "react";

import type {
  FramingMedia,
  FramingNarrative,
} from "../../content/production-narrative";
import { frameVariables, sceneFraming } from "../../modules/motion/framing";
import { SceneHandoff } from "./scene-handoff";
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

const FIRST_SCENE_SLUG = "879-first-mark";

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
        <video
          src={media.videoPath}
          poster={media.path}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={media.altText}
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
  editorialPreview,
}: {
  readonly narrative: FramingNarrative;
  readonly editorialPreview: boolean;
}): ReactElement {
  const beats =
    narrative.beatGroups?.map((group) =>
      group
        .map((index) => narrative.paragraphs[index])
        .filter((line): line is string => line !== undefined),
    ) ?? narrative.paragraphs.map((paragraph) => [paragraph]);

  const body = (
    <section
      className="prologue-scene"
      id="prologue-2026"
      data-scene="prologue"
      data-scene-type="hero"
      data-choreography="prologueReveal"
      aria-labelledby="prologue-2026-title"
    >
      <div className="scene-shot prologue-shot">
        <div className="prologue-stage" data-motion="stage">
          <div className="stage-void" aria-hidden="true" />
          <div className="stage-surface prologue-surface" data-motion="surface">
            {narrative.media ? (
              <FramingStage
                media={narrative.media}
                framing="prologue"
                surface
              />
            ) : null}
          </div>
          <span
            className="prologue-water-line"
            data-motion="water-line"
            aria-hidden="true"
          />
          <SceneHandoff kind="water-copper" phase="outgoing" />
          <p className="stage-visual-label">
            {narrative.media?.label ?? "Visualisasi artistik"}
          </p>

          <div className="stage-plate prologue-plate">
            {/*
             * Direktif runtime 2026-08-28: chrome "Prolog · 2026 · judul"
             * berhenti tampil sebagai kotak visual di panggung — kalimat
             * pemikul (masterLine) membawa maknanya secara sinematik. Eyebrow
             * dan h1 tetap ada untuk pembaca layar (aria-labelledby, urutan
             * DOM); yang berhenti hanyalah kotaknya.
             */}
            <div className="prologue-context" data-motion="context">
              <p className="visually-hidden">Prolog · 2026</p>
              <h1
                className="visually-hidden"
                id="prologue-2026-title"
                data-motion="title"
              >
                {narrative.title}
              </h1>
            </div>

            <p
              className="master-line scene-lead-line prologue-lead"
              data-motion="master"
              data-editorial-role="lead-line"
            >
              {narrative.masterLine}
            </p>

            <div className="stage-passages prologue-passages">
              {beats.map((beat, index) => (
                <div
                  className="stage-beat"
                  data-motion="passage"
                  data-beat-index={index}
                  key={beat.join("|")}
                >
                  {beat.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ))}
            </div>

            {/*
             * Disclosure tata kelola tetap ADA (tidak dihapus) tetapi tidak
             * lagi mengambil ruang visual di panggung sinematik — pembaca
             * layar dan pandangan sumber tetap melihatnya (direktif runtime
             * 2026-08-28).
             */}
            {editorialPreview ? (
              <aside className="visually-hidden" data-motion="metadata">
                <strong>Pratinjau editorial lokal</strong>
                <span>
                  Naskah dan media di stage ini adalah bahan komposisi; build
                  produksi hanya menerbitkan relasi CMS yang telah lolos bukti
                  dan tata kelola.
                </span>
              </aside>
            ) : null}

            <nav
              className="scene-actions prologue-actions"
              aria-label="Aksi prolog"
              data-motion="metadata"
            >
              <a href={`#${FIRST_SCENE_SLUG}`}>Mulai dari tanda pertama</a>
            </nav>
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
