import type { CSSProperties, ReactElement } from "react";

import type {
  FramingMedia,
  FramingNarrative,
} from "../../content/production-narrative";
import { frameVariables, sceneFraming } from "../../modules/motion/framing";
import { PrologueVideoSequence } from "./prologue-video-sequence";
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
         * Jalur footage bersifat opsional dan hanya boleh aktif bila medianya
         * benar-benar Kediri kontemporer serta lolos kurasi. Poster menjaga cat
         * pertama dan fallback tanpa-JS identik dengan versi statis; timeline
         * prologueReveal tetap menyapu satu .stage-surface tanpa source swap.
         */
        <PrologueVideoSequence
          videoPath={media.videoPath}
          poster={media.path}
          altText={media.altText}
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
          <div className="stage-surface prologue-surface" data-motion="surface">
            {narrative.media ? (
              <FramingStage
                media={narrative.media}
                framing="prologue"
                surface
              />
            ) : null}
          </div>
          {/*
           * Babak Judul Sinematik di Layar Gelap (direktif Chief 2026-09-04):
           * Setelah layar pertama memudar ke kegelapan, muncul teks monumental
           * sebelum masuk ke footage video 1.
           */}
          <div
            className="prologue-cinematic-title"
            data-motion="cinematic-title"
          >
            <span className="cinematic-title-eyebrow">SEJARAH KEDIRI</span>
            <h2 className="cinematic-title-heading">
              Kediri: A Century of History, Kings, and Industry
            </h2>
          </div>
          {/*
           * Pembuka bertahap (direktif Chief 2026-09-04): dua babak footage
           * dan satu naskah era Daha, semuanya di dalam panggung yang sama.
           * Footage-nya dekoratif dan default-nya `opacity: 0` lewat CSS,
           * sehingga tanpa JavaScript tidak ada satu pun yang berkedip; yang
           * membuatnya tampak hanyalah timeline `prologueReveal`. Naskahnya
           * historis, jadi ia tetap terbaca pada alur statis (mobile,
           * reduced motion, tanpa JavaScript).
           */}
          {narrative.overture ? (
            <div className="prologue-overture" data-motion="overture">
              <div
                className="prologue-overture-clip"
                data-motion="overture-city"
              >
                <video
                  src={narrative.overture.city.videoPath}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={narrative.overture.city.altText}
                />
                <div
                  className="prologue-overture-present"
                  data-motion="overture-present"
                >
                  <div className="overture-present-brand">
                    {/* biome-ignore lint/performance/noImgElement: logomark SVG statis lokal, tanpa loader tambahan. */}
                    <img
                      src="/static/sentra-logomark.svg"
                      alt=""
                      className="overture-present-logo"
                      width={36}
                      height={36}
                    />
                    <span
                      className="overture-present-text"
                      data-motion="present-text"
                    >
                      {"Sentra Artificial Intelligence Present"
                        .split("")
                        .map((char, index) => (
                          <span
                            // biome-ignore lint/suspicious/noArrayIndexKey: string sumbernya literal statis — urutan karakter tetap, tidak pernah di-reorder.
                            key={`typing-${index}-${char}`}
                            className="typing-char"
                            style={
                              char === " " ? { width: "0.45em" } : undefined
                            }
                          >
                            {char === " " ? "\u00A0" : char}
                          </span>
                        ))}
                      <span className="typing-cursor" aria-hidden="true">
                        |
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="prologue-overture-clip"
                data-motion="overture-life"
              >
                <video
                  src={narrative.overture.life.videoPath}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={narrative.overture.life.altText}
                />
              </div>
              <div
                className="prologue-overture-copy"
                data-motion="overture-copy"
              >
                {narrative.overture.copy.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}
          <div className="prologue-material-world" aria-hidden="true">
            <span className="prologue-city-veil" data-motion="city-veil" />
            <svg
              className="prologue-water-field"
              data-motion="water-field"
              viewBox="0 0 1600 900"
              preserveAspectRatio="none"
            >
              <title>Garis abstrak aliran Brantas</title>
              <path d="M-80 590 C180 520 330 680 610 602 S1080 500 1680 610" />
              <path d="M-120 650 C210 570 390 735 735 636 S1210 560 1710 664" />
              <path d="M-90 716 C260 648 500 785 850 704 S1310 650 1690 735" />
              <path d="M-60 780 C300 730 580 830 970 770 S1390 742 1660 802" />
            </svg>
            <span className="prologue-horizon" data-motion="horizon" />
            <span className="prologue-copper-field" data-motion="copper" />
            {narrative.portal ? (
              <span className="prologue-portal" data-motion="portal">
                <span className="prologue-portal-date">
                  {narrative.portal.date}
                </span>
                <span className="prologue-portal-label">
                  {narrative.portal.label}
                </span>
              </span>
            ) : null}
          </div>
          <div className="stage-plate">
            <div className="stage-context" data-motion="context">
              <p className="eyebrow" data-motion="eyebrow">
                {narrative.eyebrow}
              </p>
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
          <SceneHandoff kind="water-copper" phase="outgoing" />
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
